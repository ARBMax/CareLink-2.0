"""
CareLink 2.0 — Telemetry Log Model
Collection 4: telemetry_logs
Ingests timestamped sensor packets, telemetry source metadata, alert severity levels,
and automated AI skill-matching scoring records.
"""
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
import uuid


class TelemetryLevel(str, Enum):
    CRITICAL = "CRITICAL"
    WARN     = "WARN"
    INFO     = "INFO"
    SUCCESS  = "SUCCESS"
    AUDIT    = "AUDIT"   # Human operator actions (dispatch confirmations, overrides)


class SensorType(str, Enum):
    SATELLITE    = "SATELLITE"
    GROUND       = "GROUND_SENSOR"
    SOCIAL       = "SOCIAL_MEDIA"
    RADIO        = "FIELD_RADIO"
    DRONE        = "DRONE_FEED"
    WHATSAPP     = "WHATSAPP"
    AI_PIPELINE  = "AI_PIPELINE"
    SCHEDULER    = "SCHEDULER"
    MANUAL       = "MANUAL"


class SensorPacket(BaseModel):
    """
    Raw telemetry packet as received from external sensor / signal source,
    before AI processing. Stored for audit and reprocessing.
    """
    sensor_id:    str              = Field(..., description="Unique sensor ID, e.g. SAT-SENTINEL-2")
    sensor_type:  SensorType
    raw_value:    str              = Field(..., description="Raw reading or raw text content")
    unit:         Optional[str]   = Field(None, description="Unit of measurement, e.g. 'ppm', 'km²', '°C'")
    confidence:   float           = Field(default=1.0, ge=0.0, le=1.0,
                                         description="Sensor reliability confidence 0–1")
    latitude:     Optional[float] = None
    longitude:    Optional[float] = None
    raw_payload:  Optional[dict]  = None   # Full raw JSON from sensor (for audit)


class AIMatchRecord(BaseModel):
    """
    Audit record of Groq's volunteer-to-incident match scoring.
    Written every time the match service runs, for full auditability.
    """
    incident_id:    str
    volunteer_id:   str
    groq_score:     int           = Field(..., ge=0, le=100, description="Groq computed match score 0–100")
    skill_overlap:  list[str]     = Field(default_factory=list,
                                          description="Skills matched between volunteer and incident")
    match_reasons:  list[str]     = Field(default_factory=list,
                                          description="Groq's natural language reasoning for score")
    model_used:     str           = Field(default="llama-3.3-70b-versatile",
                                          description="Groq model used for scoring")
    prompt_tokens:  int           = 0
    response_tokens: int          = 0
    completion_ms:  int           = 0     # Groq inference latency in milliseconds


class TelemetryLog(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    id:        str      = Field(default_factory=lambda: f"log-{uuid.uuid4().hex[:8]}")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Severity & Source Metadata ────────────────────────────────────────────
    level:       TelemetryLevel
    source:      str        = Field(..., description="Human-readable source name, e.g. 'Satellite Sentinel-2'")
    source_type: SensorType = Field(default=SensorType.AI_PIPELINE,
                                    description="Category of the source system")
    message:     str        = Field(..., description="Human-readable log message")

    # ── Entity Links ──────────────────────────────────────────────────────────
    incident_id:  Optional[str] = None
    volunteer_id: Optional[str] = None
    arc_id:       Optional[str] = None

    # ── Structured Payloads ───────────────────────────────────────────────────
    sensor_packet:    Optional[SensorPacket]  = None   # Raw sensor data if applicable
    ai_match_record:  Optional[AIMatchRecord] = None   # AI match audit if applicable
    metadata:         Optional[dict]          = None   # Arbitrary key-value metadata

    # ── Lifecycle Flags ───────────────────────────────────────────────────────
    is_new:   bool = True    # Cleared after first read by frontend
    ttl_days: int  = 7       # Firestore TTL policy field


# ── Request / Response Schemas ────────────────────────────────────────────────

class TelemetryLogCreate(BaseModel):
    """POST /api/telemetry — manual log creation (for testing / admin)."""
    level:       TelemetryLevel
    source:      str
    source_type: SensorType = SensorType.MANUAL
    message:     str
    incident_id:  Optional[str] = None
    volunteer_id: Optional[str] = None
    metadata:     Optional[dict] = None


class TelemetryFeedResponse(BaseModel):
    logs:    list[TelemetryLog]
    total:   int
    has_more: bool
