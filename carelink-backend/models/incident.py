"""
CareLink 2.0 — Incident Model
Collection 1: incidents
Mirrors the TypeScript Incident type exactly for seamless frontend ↔ backend parity.
"""
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
import uuid


class UrgencyLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"
    RESOLVED = "RESOLVED"


class IncidentCategory(str, Enum):
    EARTHQUAKE              = "EARTHQUAKE"
    FLOOD                   = "FLOOD"
    CYCLONE                 = "CYCLONE"
    WILDFIRE                = "WILDFIRE"
    FAMINE_DROUGHT          = "FAMINE_DROUGHT"
    MEDICAL_OUTBREAK        = "MEDICAL_OUTBREAK"
    INFRASTRUCTURE_COLLAPSE = "INFRASTRUCTURE_COLLAPSE"


class IncidentStatus(str, Enum):
    PENDING_DISPATCH = "PENDING_DISPATCH"
    IN_RESPONSE      = "IN_RESPONSE"
    CONTAINED        = "CONTAINED"
    RESOLVED         = "RESOLVED"


class IncidentRegion(str, Enum):
    ASIA_PACIFIC = "Asia-Pacific"
    AMERICAS     = "Americas"
    AFRICA       = "Africa"
    MIDDLE_EAST  = "Middle East"
    EUROPE       = "Europe"


class IncidentSource(str, Enum):
    SATELLITE_TELEMETRY = "Satellite Telemetry"
    FIELD_RADIO         = "Field Radio"
    WHATSAPP_HOTLINE    = "WhatsApp Hotline"
    UN_OCHA             = "UN OCHA"
    CROWDSOURCED_DRONE  = "Crowdsourced Drone"
    TWITTER             = "Twitter"
    NEWS_FEED           = "News Feed"
    MANUAL              = "Manual Entry"


class GeoCoords(BaseModel):
    lat: float = Field(..., ge=-90,  le=90,  description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


class Incident(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    id:            str   = Field(default_factory=lambda: f"inc-{uuid.uuid4().hex[:8]}")
    code:          str   = Field(...,  description="Human-readable code, e.g. CYC-2026-088")
    title:         str
    category:      IncidentCategory
    urgency:       UrgencyLevel
    status:        IncidentStatus = IncidentStatus.PENDING_DISPATCH

    # ── Location ──────────────────────────────────────────────────────────────
    coords:        GeoCoords     # geocoordinates [lat, lng]
    location_name: str
    country:       str
    region:        IncidentRegion

    # ── Severity Metrics ──────────────────────────────────────────────────────
    severity_score:       int   = Field(..., ge=0, le=100, description="0–100 severity score")
    population_affected:  int   = Field(default=0, ge=0)
    casualties_confirmed: int   = Field(default=0, ge=0, description="Confirmed deaths")
    casualties_missing:   int   = Field(default=0, ge=0, description="Missing persons")
    displaced_count:      int   = Field(default=0, ge=0, description="Internally displaced persons")

    # ── Situational Needs (Groq-extracted + human-verified) ───────────────────
    description:      str        = ""
    extracted_needs:  list[str]  = Field(default_factory=list)  # e.g. ["Water Purification"]
    required_skills:  list[str]  = Field(default_factory=list)  # e.g. ["Trauma Surgery"]
    needs_verified:   bool       = False   # human operator has reviewed and confirmed

    # ── Response Tracking ─────────────────────────────────────────────────────
    assigned_volunteers:    list[str] = Field(default_factory=list)  # volunteer IDs
    active_matches_pending: int       = 0
    resolved_at:            Optional[datetime] = None

    # ── Timestamps ────────────────────────────────────────────────────────────
    timestamp:  datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Source & AI Metadata ──────────────────────────────────────────────────
    source:          IncidentSource = IncidentSource.MANUAL
    source_url:      Optional[str]  = None
    media_urls:      list[str]      = Field(default_factory=list)
    ai_confidence:   float          = Field(default=0.0, ge=0.0, le=1.0,
                                            description="Gemini confidence score (0–1)")

    class Config:
        use_enum_values = True


# ── Request/Response schemas ──────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    """Used for POST /api/incidents (manual Field Report form submission)."""
    title:                str
    category:             IncidentCategory
    urgency:              UrgencyLevel
    coords:               GeoCoords
    location_name:        str
    country:              str
    region:               IncidentRegion
    severity_score:       int = Field(..., ge=0, le=100)
    population_affected:  int = 0
    casualties_confirmed: int = 0
    casualties_missing:   int = 0
    displaced_count:      int = 0
    description:          str = ""
    extracted_needs:      list[str] = []
    required_skills:      list[str] = []
    source:               IncidentSource = IncidentSource.MANUAL
    source_url:           Optional[str] = None
    media_urls:           list[str] = []


class IncidentStatusUpdate(BaseModel):
    """Used for PATCH /api/incidents/{id}/status"""
    status: IncidentStatus


class IncidentListResponse(BaseModel):
    incidents: list[Incident]
    total:     int
    page:      int
    per_page:  int
