"""
CareLink 2.0 — Dispatch Arc / Active Logistics Model
Collection 3: dispatch_arcs
Tracks origin-to-destination transit waypoints, transport modalities,
dispatch progress percentages, and ETA updates.
"""
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
import uuid

from models.incident import GeoCoords


class TransportMode(str, Enum):
    AIR_CHARTER   = "AIR_CHARTER"
    MEDICAL_HELO  = "MEDICAL_HELO"
    AMPHIBIOUS    = "AMPHIBIOUS"
    GROUND_CONVOY = "GROUND_CONVOY"
    FIXED_WING    = "FIXED_WING"


class ArcStatus(str, Enum):
    ESTABLISHING = "ESTABLISHING"
    EN_ROUTE     = "EN_ROUTE"
    ARRIVED      = "ARRIVED"
    ABORTED      = "ABORTED"


class WaypointType(str, Enum):
    ORIGIN      = "ORIGIN"
    WAYPOINT    = "WAYPOINT"      # Intermediate stop (refuelling, customs, etc.)
    DESTINATION = "DESTINATION"


class Waypoint(BaseModel):
    """A single point in the full transit route."""
    coords:     GeoCoords
    name:       str                         # e.g. "Dubai International — Refuelling"
    type:       WaypointType
    eta:        datetime                    # Estimated arrival at this waypoint
    arrived_at: Optional[datetime] = None  # Actual arrival (null if not yet reached)
    notes:      Optional[str]      = None  # e.g. "Customs clearance required"


class DispatchArc(BaseModel):
    # ── Identity ──────────────────────────────────────────────────────────────
    id:           str = Field(default_factory=lambda: f"arc-{uuid.uuid4().hex[:8]}")
    incident_id:  str = Field(..., description="Linked Incident ID")
    volunteer_id: str = Field(..., description="Linked Volunteer ID")

    # ── Origin → Destination ──────────────────────────────────────────────────
    from_coords:  GeoCoords
    to_coords:    GeoCoords
    from_name:    str                       # e.g. "Singapore Hub"
    to_name:      str                       # e.g. "Chittagong Coastal Belt"

    # ── Full Waypoint Route ───────────────────────────────────────────────────
    waypoints: list[Waypoint] = Field(
        default_factory=list,
        description="Ordered list: ORIGIN → intermediate WPs → DESTINATION"
    )

    # ── Transport & Modality ──────────────────────────────────────────────────
    transport_mode: TransportMode = TransportMode.AIR_CHARTER
    status:         ArcStatus     = ArcStatus.ESTABLISHING

    # ── Progress & ETA ────────────────────────────────────────────────────────
    progress_pct:      int            = Field(default=0, ge=0, le=100,
                                             description="Overall dispatch progress 0–100%")
    departed_at:       Optional[datetime] = None
    eta_destination:   Optional[datetime] = None   # ← live ETA to final destination
    arrived_at:        Optional[datetime] = None

    # ── Cargo ─────────────────────────────────────────────────────────────────
    cargo_manifest: list[str] = Field(
        default_factory=list,
        description="Relief items being transported, e.g. ['Water Purification Units', 'RIBs']"
    )

    # ── Visualisation ─────────────────────────────────────────────────────────
    color: str = Field(default="#14b8a6", description="Globe arc colour (hex)")

    # ── Metadata ──────────────────────────────────────────────────────────────
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes:      Optional[str] = None

    class Config:
        use_enum_values = True


# ── Request / Response Schemas ────────────────────────────────────────────────

class DispatchCreate(BaseModel):
    """POST /api/dispatch — trigger a new dispatch."""
    incident_id:    str
    volunteer_id:   str
    transport_mode: TransportMode = TransportMode.AIR_CHARTER
    cargo_manifest: list[str] = []
    waypoints:      list[Waypoint] = []   # Optional: backend can auto-generate


class DispatchProgressUpdate(BaseModel):
    """PATCH /api/dispatch/{id}/progress — update flight progress."""
    progress_pct:    int                   = Field(..., ge=0, le=100)
    status:          Optional[ArcStatus]   = None
    current_coords:  Optional[GeoCoords]   = None
    eta_destination: Optional[datetime]    = None
    notes:           Optional[str]         = None
