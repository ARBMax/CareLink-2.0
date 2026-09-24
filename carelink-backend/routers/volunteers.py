"""
CareLink 2.0 — Volunteers & Responders REST Router
Collection 2: volunteers
Provides endpoints for managing responders, live GPS positioning, and readiness states.
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
from loguru import logger
import uuid

from core.firebase import get_db, COLLECTION_VOLUNTEERS
from core.websocket_manager import ws_manager, WSEvent
from models.incident import GeoCoords
from models.volunteer import (
    Volunteer, VolunteerCreate, VolunteerStatusUpdate,
    VolunteerListResponse, ReadinessStatus
)
from services.match_service import MOCK_VOLUNTEER_POOL

router = APIRouter(prefix="/volunteers", tags=["Responders & Volunteers"])

# In-memory store fallback
_IN_MEMORY_VOLUNTEERS: dict[str, Volunteer] = {v.id: v for v in MOCK_VOLUNTEER_POOL}


@router.get("", response_model=VolunteerListResponse)
async def list_volunteers(
    status: Optional[ReadinessStatus] = None,
    skill: Optional[str] = None,
    organization: Optional[str] = None,
):
    """Retrieve all responders with optional filtering."""
    db = get_db()
    items: list[Volunteer] = []

    if db:
        try:
            query = db.collection(COLLECTION_VOLUNTEERS)
            if status:
                query = query.where("readiness_status", "==", status.value)
            docs = query.stream()
            for doc in docs:
                v = Volunteer(**doc.to_dict())
                items.append(v)
        except Exception as exc:
            logger.warning("Firestore volunteer list failed: {}. Using fallback.", exc)
            items = []

    if not items:
        items = list(_IN_MEMORY_VOLUNTEERS.values())
        if status:
            items = [v for v in items if v.readiness_status == status]

    if skill:
        skill_lower = skill.lower()
        items = [v for v in items if any(skill_lower in s.lower() for s in v.skills)]

    if organization:
        org_lower = organization.lower()
        items = [v for v in items if org_lower in v.organization.lower()]

    return VolunteerListResponse(
        volunteers=items,
        total=len(items),
    )


@router.get("/{volunteer_id}", response_model=Volunteer)
async def get_volunteer(volunteer_id: str):
    """Retrieve detailed volunteer record by ID."""
    db = get_db()
    if db:
        try:
            doc = db.collection(COLLECTION_VOLUNTEERS).document(volunteer_id).get()
            if doc.exists:
                return Volunteer(**doc.to_dict())
        except Exception as exc:
            logger.warning("Firestore get volunteer failed: {}", exc)

    if volunteer_id in _IN_MEMORY_VOLUNTEERS:
        return _IN_MEMORY_VOLUNTEERS[volunteer_id]

    raise HTTPException(status_code=404, detail=f"Volunteer {volunteer_id} not found")


@router.post("", response_model=Volunteer, status_code=201)
async def create_volunteer(payload: VolunteerCreate):
    """Register a new certified responder."""
    vol_id = f"vol-{uuid.uuid4().hex[:8]}"
    vol = Volunteer(
        id=vol_id,
        name=payload.name,
        callsign=payload.callsign,
        avatar_initials=payload.avatar_initials,
        role=payload.role,
        organization=payload.organization,
        home_base_name=payload.home_base_name,
        home_base_coords=payload.home_base_coords,
        skills=payload.skills,
        certifications=payload.certifications,
        languages=payload.languages,
        experience_years=payload.experience_years,
        past_missions=payload.past_missions,
        contact_email=payload.contact_email,
        readiness_status=ReadinessStatus.STANDBY,
        registered_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
    )

    _IN_MEMORY_VOLUNTEERS[vol.id] = vol

    db = get_db()
    if db:
        try:
            db.collection(COLLECTION_VOLUNTEERS).document(vol.id).set(vol.model_dump(mode="json"))
        except Exception as exc:
            logger.warning("Failed to persist volunteer to Firestore: {}", exc)

    return vol


@router.patch("/{volunteer_id}/status", response_model=Volunteer)
async def update_volunteer_status(volunteer_id: str, update: VolunteerStatusUpdate):
    """Update volunteer readiness status and active assignment."""
    vol: Optional[Volunteer] = None

    db = get_db()
    if db:
        try:
            doc_ref = db.collection(COLLECTION_VOLUNTEERS).document(volunteer_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["readiness_status"] = update.readiness_status.value
                data["last_active"] = datetime.now(timezone.utc).isoformat()
                if update.active_incident is not None:
                    data["active_incident"] = update.active_incident
                if update.current_coords is not None:
                    data["current_coords"] = update.current_coords.model_dump()
                doc_ref.set(data)
                vol = Volunteer(**data)
        except Exception as exc:
            logger.warning("Firestore volunteer update failed: {}", exc)

    if not vol:
        if volunteer_id not in _IN_MEMORY_VOLUNTEERS:
            raise HTTPException(status_code=404, detail="Volunteer not found")
        vol = _IN_MEMORY_VOLUNTEERS[volunteer_id]
        vol.readiness_status = update.readiness_status
        vol.last_active = datetime.now(timezone.utc)
        if update.active_incident is not None:
            vol.active_incident = update.active_incident
        if update.current_coords is not None:
            vol.current_coords = update.current_coords
        _IN_MEMORY_VOLUNTEERS[volunteer_id] = vol

    await ws_manager.broadcast_event(
        event=WSEvent.VOLUNTEER_STATUS,
        data={
            "volunteer_id": vol.id,
            "readiness_status": vol.readiness_status.value,
            "active_incident": vol.active_incident,
        },
    )

    return vol


@router.patch("/{volunteer_id}/gps", response_model=Volunteer)
async def update_volunteer_gps(volunteer_id: str, coords: GeoCoords):
    """Update live GPS location of a mobilized or en-route volunteer."""
    if volunteer_id not in _IN_MEMORY_VOLUNTEERS:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    vol = _IN_MEMORY_VOLUNTEERS[volunteer_id]
    vol.current_coords = coords
    vol.last_active = datetime.now(timezone.utc)

    db = get_db()
    if db:
        try:
            db.collection(COLLECTION_VOLUNTEERS).document(volunteer_id).update({
                "current_coords": coords.model_dump(),
                "last_active": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as exc:
            logger.warning("Firestore GPS update failed: {}", exc)

    return vol
