"""
CareLink 2.0 — Incidents REST Router
Collection 1: incidents
Provides endpoints for retrieving, filtering, creating, and updating crisis incidents.
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
from loguru import logger
import uuid

from core.firebase import get_db, COLLECTION_INCIDENTS, COLLECTION_TELEMETRY_LOGS
from core.websocket_manager import ws_manager, WSEvent
from models.incident import (
    Incident, IncidentCreate, IncidentStatusUpdate, IncidentListResponse,
    IncidentCategory, UrgencyLevel, IncidentStatus, IncidentRegion, IncidentSource, GeoCoords
)
from models.telemetry_log import TelemetryLog, TelemetryLevel

router = APIRouter(prefix="/incidents", tags=["Incidents"])

# In-memory store for fallback/dev when Firestore is not yet configured with credentials
_IN_MEMORY_INCIDENTS: dict[str, Incident] = {}

# Seed data for immediate rich visual feedback
_SEED_INCIDENTS = [
    Incident(
        id="inc-fld-001",
        code="FLD-2026-088",
        title="Severe Flash Flooding & Landslides — Sylhet Basin",
        category=IncidentCategory.FLOOD,
        urgency=UrgencyLevel.CRITICAL,
        status=IncidentStatus.IN_RESPONSE,
        coords=GeoCoords(lat=24.8949, lng=91.8687),
        location_name="Sylhet Division",
        country="Bangladesh",
        region=IncidentRegion.ASIA_PACIFIC,
        severity_score=94,
        population_affected=420000,
        casualties_confirmed=18,
        casualties_missing=45,
        displaced_count=130000,
        description="Monsoon surge breached Surma river embankments. Multiple sub-districts completely submerged. Urgent need for shallow-draft boats and potable water purification units.",
        extracted_needs=["Water Purification", "Amphibious Evacuation Boats", "Emergency Tents", "Cholera Treatment Kits"],
        required_skills=["USAR", "Water Purification", "Trauma Surgery", "Field Radio"],
        needs_verified=True,
        assigned_volunteers=["vol-001", "vol-003"],
        active_matches_pending=2,
        source=IncidentSource.SATELLITE_TELEMETRY,
        ai_confidence=0.96,
        timestamp=datetime.now(timezone.utc),
    ),
    Incident(
        id="inc-eqk-002",
        code="EQK-2026-014",
        title="M7.2 Epicenter Rupture — Eastern Anatolia Fault Zone",
        category=IncidentCategory.EARTHQUAKE,
        urgency=UrgencyLevel.CRITICAL,
        status=IncidentStatus.PENDING_DISPATCH,
        coords=GeoCoords(lat=37.5858, lng=36.9371),
        location_name="Kahramanmaraş Region",
        country="Turkey",
        region=IncidentRegion.MIDDLE_EAST,
        severity_score=98,
        population_affected=850000,
        casualties_confirmed=142,
        casualties_missing=310,
        displaced_count=450000,
        description="Shallow strike-slip rupture collapsed 120+ multi-story residential blocks. Sub-zero temperatures overnight. High priority for INSARAG heavy search teams and acoustic listening gear.",
        extracted_needs=["Heavy Acoustic Listening Gear", "Trauma Surgeons", "Mobile Blood Banks", "Thermal Imaging Drones"],
        required_skills=["USAR", "Structural Triage", "Trauma Surgery", "K9 Search"],
        needs_verified=True,
        assigned_volunteers=["vol-002"],
        active_matches_pending=4,
        source=IncidentSource.UN_OCHA,
        ai_confidence=0.99,
        timestamp=datetime.now(timezone.utc),
    ),
    Incident(
        id="inc-cyc-003",
        code="CYC-2026-003",
        title="Super Cyclone 'Elora' Cat 5 Coastal Landfall",
        category=IncidentCategory.CYCLONE,
        urgency=UrgencyLevel.HIGH,
        status=IncidentStatus.IN_RESPONSE,
        coords=GeoCoords(lat=-18.1416, lng=178.4419),
        location_name="Viti Levu Outer Islands",
        country="Fiji",
        region=IncidentRegion.ASIA_PACIFIC,
        severity_score=87,
        population_affected=95000,
        casualties_confirmed=4,
        casualties_missing=12,
        displaced_count=28000,
        description="Sustained winds 260 km/h with 4.5m storm surges. Island airstrip disabled. Ground communications down; satellite BGAN terminals required.",
        extracted_needs=["Satellite Terminals (BGAN)", "High-Capacity Tarpaulins", "Desalination Kits"],
        required_skills=["Satellite Comms", "Logistics Coordination", "Field Radio"],
        needs_verified=False,
        assigned_volunteers=["vol-005"],
        active_matches_pending=1,
        source=IncidentSource.FIELD_RADIO,
        ai_confidence=0.91,
        timestamp=datetime.now(timezone.utc),
    ),
]

for inc in _SEED_INCIDENTS:
    _IN_MEMORY_INCIDENTS[inc.id] = inc


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    urgency: Optional[UrgencyLevel] = None,
    category: Optional[IncidentCategory] = None,
    status: Optional[IncidentStatus] = None,
    region: Optional[IncidentRegion] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """Retrieve filtered crises incidents."""
    db = get_db()
    items: list[Incident] = []

    if db:
        try:
            query = db.collection(COLLECTION_INCIDENTS)
            if urgency:
                query = query.where("urgency", "==", urgency.value)
            if category:
                query = query.where("category", "==", category.value)
            if status:
                query = query.where("status", "==", status.value)
            if region:
                query = query.where("region", "==", region.value)

            docs = query.stream()
            for doc in docs:
                items.append(Incident(**doc.to_dict()))
        except Exception as exc:
            logger.warning("Firestore list failed: {}. Falling back to in-memory store.", exc)
            items = []

    if not items:
        # Fallback to in-memory store
        items = list(_IN_MEMORY_INCIDENTS.values())
        if urgency:
            items = [i for i in items if i.urgency == urgency]
        if category:
            items = [i for i in items if i.category == category]
        if status:
            items = [i for i in items if i.status == status]
        if region:
            items = [i for i in items if i.region == region]

    # Sort by timestamp desc
    items.sort(key=lambda x: x.timestamp, reverse=True)

    total = len(items)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated = items[start_idx:end_idx]

    return IncidentListResponse(
        incidents=paginated,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    """Retrieve detailed crisis record by ID."""
    db = get_db()
    if db:
        try:
            doc = db.collection(COLLECTION_INCIDENTS).document(incident_id).get()
            if doc.exists:
                return Incident(**doc.to_dict())
        except Exception as exc:
            logger.warning("Firestore get incident failed: {}", exc)

    if incident_id in _IN_MEMORY_INCIDENTS:
        return _IN_MEMORY_INCIDENTS[incident_id]

    raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")


@router.post("", response_model=Incident, status_code=201)
async def create_incident(payload: IncidentCreate):
    """Create a new crisis incident manually."""
    inc_id = f"inc-{uuid.uuid4().hex[:8]}"
    prefix_map = {
        IncidentCategory.EARTHQUAKE: "EQK",
        IncidentCategory.FLOOD: "FLD",
        IncidentCategory.CYCLONE: "CYC",
        IncidentCategory.WILDFIRE: "WLF",
        IncidentCategory.FAMINE_DROUGHT: "DRT",
        IncidentCategory.MEDICAL_OUTBREAK: "MED",
        IncidentCategory.INFRASTRUCTURE_COLLAPSE: "COL",
    }
    code = f"{prefix_map.get(payload.category, 'INC')}-2026-{uuid.uuid4().hex[:3].upper()}"

    incident = Incident(
        id=inc_id,
        code=code,
        title=payload.title,
        category=payload.category,
        urgency=payload.urgency,
        coords=payload.coords,
        location_name=payload.location_name,
        country=payload.country,
        region=payload.region,
        severity_score=payload.severity_score,
        population_affected=payload.population_affected,
        casualties_confirmed=payload.casualties_confirmed,
        casualties_missing=payload.casualties_missing,
        displaced_count=payload.displaced_count,
        description=payload.description,
        extracted_needs=payload.extracted_needs,
        required_skills=payload.required_skills,
        source=payload.source,
        source_url=payload.source_url,
        media_urls=payload.media_urls,
        timestamp=datetime.now(timezone.utc),
    )

    _IN_MEMORY_INCIDENTS[incident.id] = incident

    db = get_db()
    if db:
        try:
            db.collection(COLLECTION_INCIDENTS).document(incident.id).set(incident.model_dump(mode="json"))
        except Exception as exc:
            logger.warning("Failed to persist incident to Firestore: {}", exc)

    # Broadcast event
    await ws_manager.broadcast_event(
        event=WSEvent.INCIDENT_NEW,
        data=incident.model_dump(mode="json"),
    )

    return incident


@router.patch("/{incident_id}/status", response_model=Incident)
async def update_incident_status(incident_id: str, update: IncidentStatusUpdate):
    """Update resolution status of an incident."""
    incident: Optional[Incident] = None

    db = get_db()
    if db:
        try:
            doc_ref = db.collection(COLLECTION_INCIDENTS).document(incident_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["status"] = update.status.value
                if update.status == IncidentStatus.RESOLVED:
                    data["resolved_at"] = datetime.now(timezone.utc).isoformat()
                doc_ref.set(data)
                incident = Incident(**data)
        except Exception as exc:
            logger.warning("Firestore status update failed: {}", exc)

    if not incident:
        if incident_id not in _IN_MEMORY_INCIDENTS:
            raise HTTPException(status_code=404, detail="Incident not found")
        incident = _IN_MEMORY_INCIDENTS[incident_id]
        incident.status = update.status
        if update.status == IncidentStatus.RESOLVED:
            incident.resolved_at = datetime.now(timezone.utc)
        _IN_MEMORY_INCIDENTS[incident_id] = incident

    await ws_manager.broadcast_event(
        event=WSEvent.INCIDENT_UPDATE,
        data=incident.model_dump(mode="json"),
    )

    return incident
