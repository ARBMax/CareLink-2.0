"""
CareLink 2.0 — Active Dispatches & Logistics REST Router
Collection 3: dispatch_arcs
Tracks origin-to-destination transit waypoints, transport modalities,
dispatch progress percentages, and live ETA updates.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
from loguru import logger
import uuid

from core.firebase import get_db, COLLECTION_DISPATCH_ARCS, COLLECTION_INCIDENTS, COLLECTION_VOLUNTEERS
from core.websocket_manager import ws_manager, WSEvent
from models.dispatch_arc import (
    DispatchArc, DispatchCreate, DispatchProgressUpdate,
    TransportMode, ArcStatus, Waypoint, WaypointType
)
from models.volunteer import ReadinessStatus
from routers.incidents import _IN_MEMORY_INCIDENTS
from routers.volunteers import _IN_MEMORY_VOLUNTEERS

router = APIRouter(prefix="/dispatch", tags=["Active Dispatches & Logistics"])

_IN_MEMORY_DISPATCHES: dict[str, DispatchArc] = {}

# Seed initial active dispatch arc
_seed_arc = DispatchArc(
    id="arc-init-001",
    incident_id="inc-fld-001",
    volunteer_id="vol-001",
    from_coords=_IN_MEMORY_VOLUNTEERS["vol-001"].home_base_coords,
    to_coords=_IN_MEMORY_INCIDENTS["inc-fld-001"].coords,
    from_name=_IN_MEMORY_VOLUNTEERS["vol-001"].home_base_name,
    to_name=_IN_MEMORY_INCIDENTS["inc-fld-001"].location_name,
    transport_mode=TransportMode.AIR_CHARTER,
    status=ArcStatus.EN_ROUTE,
    progress_pct=42,
    color="#14b8a6",
    departed_at=datetime.now(timezone.utc) - timedelta(hours=3),
    eta_destination=datetime.now(timezone.utc) + timedelta(hours=4),
    cargo_manifest=["Emergency Trauma Kits", "Portable Sterilization Units"],
    waypoints=[
        Waypoint(
            coords=_IN_MEMORY_VOLUNTEERS["vol-001"].home_base_coords,
            name="Geneva Cointrin (Origin)",
            type=WaypointType.ORIGIN,
            eta=datetime.now(timezone.utc) - timedelta(hours=3),
            arrived_at=datetime.now(timezone.utc) - timedelta(hours=3),
        ),
        Waypoint(
            coords=_IN_MEMORY_INCIDENTS["inc-fld-001"].coords,
            name="Osmani Intl Sylhet (Destination)",
            type=WaypointType.DESTINATION,
            eta=datetime.now(timezone.utc) + timedelta(hours=4),
        ),
    ],
)
_IN_MEMORY_DISPATCHES[_seed_arc.id] = _seed_arc


@router.get("", response_model=list[DispatchArc])
async def list_dispatches(incident_id: Optional[str] = None):
    """Retrieve all active logistics and dispatch arcs."""
    db = get_db()
    items: list[DispatchArc] = []

    if db:
        try:
            query = db.collection(COLLECTION_DISPATCH_ARCS)
            if incident_id:
                query = query.where("incident_id", "==", incident_id)
            docs = query.stream()
            for doc in docs:
                items.append(DispatchArc(**doc.to_dict()))
        except Exception as exc:
            logger.warning("Firestore dispatch list failed: {}. Using in-memory fallback.", exc)
            items = []

    if not items:
        items = list(_IN_MEMORY_DISPATCHES.values())
        if incident_id:
            items = [d for d in items if d.incident_id == incident_id]

    return items


@router.get("/{arc_id}", response_model=DispatchArc)
async def get_dispatch(arc_id: str):
    """Get single dispatch route details."""
    db = get_db()
    if db:
        try:
            doc = db.collection(COLLECTION_DISPATCH_ARCS).document(arc_id).get()
            if doc.exists:
                return DispatchArc(**doc.to_dict())
        except Exception as exc:
            logger.warning("Firestore get dispatch failed: {}", exc)

    if arc_id in _IN_MEMORY_DISPATCHES:
        return _IN_MEMORY_DISPATCHES[arc_id]

    raise HTTPException(status_code=404, detail="Dispatch arc not found")


@router.post("", response_model=DispatchArc, status_code=201)
async def create_dispatch(payload: DispatchCreate):
    """
    Launch a new dispatch mission:
    - Verifies incident and volunteer existence
    - Auto-generates waypoints if not provided
    - Updates volunteer state to MOBILIZING
    - Broadcasts DISPATCH_NEW to globe & dashboard
    """
    # 1. Lookup volunteer
    volunteer = _IN_MEMORY_VOLUNTEERS.get(payload.volunteer_id)
    # 2. Lookup incident
    incident = _IN_MEMORY_INCIDENTS.get(payload.incident_id)

    if not volunteer:
        raise HTTPException(status_code=404, detail=f"Volunteer {payload.volunteer_id} not found")
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {payload.incident_id} not found")

    from_coords = volunteer.current_coords or volunteer.home_base_coords
    to_coords = incident.coords
    now = datetime.now(timezone.utc)
    eta = now + timedelta(hours=max(1.0, volunteer.eta_hours or 4.0))

    waypoints = payload.waypoints
    if not waypoints:
        waypoints = [
            Waypoint(
                coords=from_coords,
                name=f"{volunteer.home_base_name} (Origin)",
                type=WaypointType.ORIGIN,
                eta=now,
                arrived_at=now,
            ),
            Waypoint(
                coords=to_coords,
                name=f"{incident.location_name} (Destination)",
                type=WaypointType.DESTINATION,
                eta=eta,
            ),
        ]

    arc = DispatchArc(
        id=f"arc-{uuid.uuid4().hex[:8]}",
        incident_id=incident.id,
        volunteer_id=volunteer.id,
        from_coords=from_coords,
        to_coords=to_coords,
        from_name=volunteer.home_base_name,
        to_name=incident.location_name,
        waypoints=waypoints,
        transport_mode=payload.transport_mode,
        status=ArcStatus.EN_ROUTE,
        progress_pct=5,
        color="#14b8a6",
        departed_at=now,
        eta_destination=eta,
        cargo_manifest=payload.cargo_manifest or incident.extracted_needs[:3],
        created_at=now,
    )

    _IN_MEMORY_DISPATCHES[arc.id] = arc

    # Update volunteer state
    volunteer.readiness_status = ReadinessStatus.MOBILIZING
    volunteer.active_incident = incident.id
    if incident.id not in incident.assigned_volunteers:
        incident.assigned_volunteers.append(volunteer.id)

    # Persist to Firestore if available
    db = get_db()
    if db:
        try:
            db.collection(COLLECTION_DISPATCH_ARCS).document(arc.id).set(arc.model_dump(mode="json"))
            db.collection(COLLECTION_VOLUNTEERS).document(volunteer.id).update({
                "readiness_status": ReadinessStatus.MOBILIZING.value,
                "active_incident": incident.id,
            })
            db.collection(COLLECTION_INCIDENTS).document(incident.id).update({
                "assigned_volunteers": incident.assigned_volunteers,
            })
        except Exception as exc:
            logger.warning("Firestore dispatch persist failed: {}", exc)

    # WebSocket Broadcast
    await ws_manager.broadcast_event(
        event=WSEvent.DISPATCH_NEW,
        data=arc.model_dump(mode="json"),
    )

    return arc


@router.patch("/{arc_id}/progress", response_model=DispatchArc)
async def update_dispatch_progress(arc_id: str, update: DispatchProgressUpdate):
    """Update progress percentage, ETA, or arrival status for a transit arc."""
    if arc_id not in _IN_MEMORY_DISPATCHES:
        raise HTTPException(status_code=404, detail="Dispatch arc not found")

    arc = _IN_MEMORY_DISPATCHES[arc_id]
    arc.progress_pct = update.progress_pct

    if update.status:
        arc.status = update.status
    elif update.progress_pct >= 100:
        arc.status = ArcStatus.ARRIVED
        arc.arrived_at = datetime.now(timezone.utc)

    if update.eta_destination:
        arc.eta_destination = update.eta_destination
    if update.notes:
        arc.notes = update.notes

    # Broadcast progress
    await ws_manager.broadcast_event(
        event=WSEvent.DISPATCH_PROGRESS,
        data={
            "arc_id": arc.id,
            "progress_pct": arc.progress_pct,
            "status": arc.status.value,
            "eta_destination": arc.eta_destination.isoformat() if arc.eta_destination else None,
        },
    )

    return arc
