"""
CareLink 2.0 — Volunteer / Responder Model
Collection 2: volunteers
Stores identities, live GPS home-base positions, credentialed skill tags,
medical/SAR certifications, spoken languages, and real-time readiness status.
"""
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
import uuid

from models.incident import GeoCoords


class ReadinessStatus(str, Enum):
    STANDBY     = "STANDBY"
    MOBILIZING  = "MOBILIZING"
    DISPATCHED  = "DISPATCHED"
    ON_SITE     = "ON_SITE"
    UNAVAILABLE = "UNAVAILABLE"


class Volunteer(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    id:             str  = Field(default_factory=lambda: f"vol-{uuid.uuid4().hex[:8]}")
    name:           str
    callsign:       str  = Field(..., description="Operational callsign, e.g. Apex-Medic")
    avatar_initials: str = Field(..., max_length=3, description="2–3 letter avatar, e.g. ER")
    role:           str  = Field(..., description="Job title / specialist role")
    organization:   str  = Field(..., description="Employing org, e.g. Doctors Across Borders")

    # ── Live GPS Positions ────────────────────────────────────────────────────
    home_base_name:   str             = Field(..., description="Human-readable home base, e.g. Geneva, Switzerland")
    home_base_coords: GeoCoords       = Field(..., description="Live GPS home-base coordinates")
    current_coords:   Optional[GeoCoords] = Field(None, description="Updated when dispatched / en-route")

    # ── Credentialed Skill Tags ───────────────────────────────────────────────
    skills:         list[str] = Field(default_factory=list,
                                      description="Operational skills, e.g. ['Trauma Surgery', 'USAR']")
    certifications: list[str] = Field(default_factory=list,
                                      description="Formal certifications, e.g. ['ATLS Master', 'INSARAG TL']")

    # ── Languages ─────────────────────────────────────────────────────────────
    languages: list[str] = Field(default_factory=list,
                                 description="Spoken languages, e.g. ['English', 'French', 'Arabic']")

    # ── Real-time Readiness ───────────────────────────────────────────────────
    readiness_status: ReadinessStatus = ReadinessStatus.STANDBY
    active_incident:  Optional[str]   = Field(None, description="incidentId if currently dispatched")

    # ── Computed Matching Fields (updated by Groq match service) ─────────────
    match_score:  int   = Field(default=0, ge=0, le=100,
                                description="Latest Groq-computed match score 0–100")
    distance_km:  float = Field(default=0.0, ge=0.0,
                                description="Distance to current active incident (km)")
    eta_hours:    float = Field(default=0.0, ge=0.0,
                                description="Estimated travel time to incident (hours)")

    # ── Experience & History ──────────────────────────────────────────────────
    experience_years:  int = Field(default=0, ge=0)
    past_missions:     int = Field(default=0, ge=0)

    # ── Contact (optional, not exposed to frontend) ───────────────────────────
    contact_email: Optional[str] = None

    # ── Timestamps ────────────────────────────────────────────────────────────
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        use_enum_values = True


# ── Request / Response Schemas ────────────────────────────────────────────────

class VolunteerCreate(BaseModel):
    name:             str
    callsign:         str
    avatar_initials:  str
    role:             str
    organization:     str
    home_base_name:   str
    home_base_coords: GeoCoords
    skills:           list[str] = []
    certifications:   list[str] = []
    languages:        list[str] = []
    experience_years: int = 0
    past_missions:    int = 0
    contact_email:    Optional[str] = None


class VolunteerStatusUpdate(BaseModel):
    """Used for PATCH /api/volunteers/{id}/status"""
    readiness_status:  ReadinessStatus
    active_incident:   Optional[str] = None
    current_coords:    Optional[GeoCoords] = None


class ScoredVolunteer(BaseModel):
    """Returned by POST /api/match — extends Volunteer with Groq scoring"""
    volunteer:      Volunteer
    computed_score: int   = Field(..., ge=0, le=100)
    match_reasons:  list[str] = Field(default_factory=list,
                                      description="Groq's explanation of skill alignment")
    rank:           int   = Field(..., ge=1, description="1 = best match")
    skill_overlap:  list[str] = Field(default_factory=list,
                                      description="Skills matching incident requiredSkills")


class VolunteerListResponse(BaseModel):
    volunteers: list[Volunteer]
    total:      int
