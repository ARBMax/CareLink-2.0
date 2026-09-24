"""
CareLink 2.0 — Smart Match Engine REST Router
Matches certified volunteers/responders to disaster incidents
using geospatial proximity and Groq LLaMA 3 skill/certification alignment.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from loguru import logger

from core.firebase import get_db, COLLECTION_INCIDENTS, COLLECTION_TELEMETRY_LOGS
from models.incident import Incident
from models.volunteer import ScoredVolunteer
from models.telemetry_log import TelemetryLog
from services.match_service import MatchService
from routers.incidents import _IN_MEMORY_INCIDENTS

router = APIRouter(prefix="/match", tags=["Smart Match Engine"])

_match_service: Optional[MatchService] = None


def get_match_service() -> MatchService:
    global _match_service
    if _match_service is None:
        _match_service = MatchService()
    return _match_service


class MatchRequest(BaseModel):
    incident_id: str = Field(..., description="Target incident ID to match responders for")
    max_results: int = Field(default=5, ge=1, le=20, description="Max responders to return")


class MatchResponse(BaseModel):
    incident_id: str
    incident_title: str
    required_skills: list[str]
    matches: list[ScoredVolunteer]
    engine: str = "Groq LLaMA-3.3-70B + Haversine Geo"


@router.post("", response_model=MatchResponse)
async def match_volunteers(payload: MatchRequest):
    """
    Run the AI Smart Match Engine:
    - Calculates distance (km) and travel ETA (hours) for available responders
    - Scores skill overlap, experience, and certifications via Groq
    - Stores audit trail in Collection 4: telemetry_logs
    - Broadcasts match notifications via WebSocket
    """
    # 1. Lookup Incident
    incident: Optional[Incident] = None
    db = get_db()
    if db:
        try:
            doc = db.collection(COLLECTION_INCIDENTS).document(payload.incident_id).get()
            if doc.exists:
                incident = Incident(**doc.to_dict())
        except Exception as exc:
            logger.warning("Firestore lookup for incident failed: {}", exc)

    if not incident:
        incident = _IN_MEMORY_INCIDENTS.get(payload.incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {payload.incident_id} not found")

    # 2. Run match service
    service = get_match_service()
    scored_volunteers, _ = await service.match_volunteers_for_incident(
        incident=incident,
        max_results=payload.max_results,
    )

    return MatchResponse(
        incident_id=incident.id,
        incident_title=incident.title,
        required_skills=incident.required_skills,
        matches=scored_volunteers,
    )


@router.get("/audit/{incident_id}")
async def get_match_audit_trail(incident_id: str):
    """Retrieve Groq scoring audit records and token consumption for an incident."""
    db = get_db()
    audits = []
    if db:
        try:
            docs = (
                db.collection(COLLECTION_TELEMETRY_LOGS)
                .where("incident_id", "==", incident_id)
                .where("level", "==", "AUDIT")
                .stream()
            )
            for doc in docs:
                audits.append(doc.to_dict())
        except Exception as exc:
            logger.warning("Failed to query audit trail: {}", exc)

    return {
        "incident_id": incident_id,
        "audit_records": audits,
        "count": len(audits),
    }
