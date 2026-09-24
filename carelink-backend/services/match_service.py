"""
CareLink 2.0 — Match Service
Coordinates matching volunteers to incidents using geospatial calculations (Haversine)
and Groq-powered AI skill/certification matching.
"""
from loguru import logger
from datetime import datetime, timezone
import math
import uuid

from core.firebase import get_db, COLLECTION_VOLUNTEERS, COLLECTION_INCIDENTS, COLLECTION_TELEMETRY_LOGS
from core.websocket_manager import ws_manager, WSEvent
from models.incident import Incident, GeoCoords
from models.volunteer import Volunteer, ScoredVolunteer, ReadinessStatus
from models.telemetry_log import TelemetryLog, TelemetryLevel, AIMatchRecord
from services.groq_service import GroqProcessingService


def haversine_distance(coord1: GeoCoords, coord2: GeoCoords) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(coord2.lat - coord1.lat)
    dlng = math.radians(coord2.lng - coord1.lng)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(coord1.lat)) *
         math.cos(math.radians(coord2.lat)) *
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def estimate_transit_hours(distance_km: float, speed_kmh: float = 350.0) -> float:
    """
    Estimate transit hours including logistics/deployment overhead.
    Default speed ~350 km/h representing charter air or rapid response helo/plane.
    """
    if distance_km <= 0:
        return 0.5
    transit = distance_km / speed_kmh
    overhead = 1.0  # 1 hour mobilization overhead
    return round(transit + overhead, 1)


# Built-in seed/mock volunteers for development or when database is empty
MOCK_VOLUNTEER_POOL = [
    Volunteer(
        id="vol-001",
        name="Dr. Elena Rostova",
        callsign="ALBATROSS-1",
        role="Lead Trauma Surgeon",
        organization="MSF International",
        home_base_name="Geneva, Switzerland",
        home_base_coords=GeoCoords(lat=46.2044, lng=6.1432),
        skills=["Trauma Surgery", "Triage Management", "Field Hospital Operations"],
        certifications=["ATLS Master", "WHO EMT-2 Lead"],
        languages=["en", "fr", "ru"],
        readiness_status=ReadinessStatus.STANDBY,
        experience_years=14,
        past_missions=22,
        avatar_initials="ER",
        contact_email="elena.rostova@msf-carelink.org",
        registered_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
    ),
    Volunteer(
        id="vol-002",
        name="Marcus Vance",
        callsign="VANGUARD-4",
        role="USAR Team Leader",
        organization="Team Rubicon",
        home_base_name="London, United Kingdom",
        home_base_coords=GeoCoords(lat=51.5074, lng=-0.1278),
        skills=["USAR", "Structural Triage", "Heavy Rescue", "Confined Space"],
        certifications=["INSARAG Team Leader", "FEMA USAR Specialist"],
        languages=["en", "es"],
        readiness_status=ReadinessStatus.STANDBY,
        experience_years=11,
        past_missions=18,
        avatar_initials="MV",
        contact_email="m.vance@rubicon-carelink.org",
        registered_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
    ),
    Volunteer(
        id="vol-003",
        name="Amina Al-Mansoor",
        callsign="OASIS-LEAD",
        role="WASH Coordinator",
        organization="Oxfam Disaster Relief",
        home_base_name="Amman, Jordan",
        home_base_coords=GeoCoords(lat=31.9454, lng=35.9284),
        skills=["Water Purification", "Hygiene Promotion", "Epidemic Control"],
        certifications=["UN WASH Coordination", "Water Quality Specialist"],
        languages=["ar", "en", "fr"],
        readiness_status=ReadinessStatus.STANDBY,
        experience_years=8,
        past_missions=12,
        avatar_initials="AA",
        contact_email="amina.mansoor@oxfam-carelink.org",
        registered_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
    ),
    Volunteer(
        id="vol-004",
        name="Captain David O'Connor",
        callsign="PELICAN-9",
        role="Disaster Logistics & Aviation Lead",
        organization="WFP Logistics Cluster",
        home_base_name="Rome, Italy",
        home_base_coords=GeoCoords(lat=41.9028, lng=12.4964),
        skills=["Air Charter Logistics", "Supply Chain", "Air Drop Coordination"],
        certifications=["ICAO Air Ops", "Logistics Cluster Coordinator"],
        languages=["en", "it"],
        readiness_status=ReadinessStatus.STANDBY,
        experience_years=16,
        past_missions=27,
        avatar_initials="DO",
        contact_email="david.oconnor@wfp-carelink.org",
        registered_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
    ),
    Volunteer(
        id="vol-005",
        name="Sarah Jenkins",
        callsign="KESTREL-2",
        role="Emergency Communications Engineer",
        organization="Télécoms Sans Frontières",
        home_base_name="Pau, France",
        home_base_coords=GeoCoords(lat=43.2951, lng=-0.3708),
        skills=["Satellite Comms", "Mesh Networks", "Field Radio", "BGAN Deploy"],
        certifications=["ITU Disaster Comms", "Cisco Network Specialist"],
        languages=["en", "fr", "es"],
        readiness_status=ReadinessStatus.STANDBY,
        experience_years=7,
        past_missions=9,
        avatar_initials="SJ",
        contact_email="sarah.jenkins@tsf-carelink.org",
        registered_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
    ),
]


class MatchService:
    """
    Coordinates volunteer matching with disaster incidents.
    Combines Geo distance filtering with Groq LLM skill & certification scoring.
    """

    def __init__(self, groq_service: GroqProcessingService | None = None):
        self.groq_service = groq_service or GroqProcessingService()

    async def get_available_volunteers(self) -> list[Volunteer]:
        """Fetch available volunteers from Firestore or return seed pool."""
        db = get_db()
        volunteers: list[Volunteer] = []
        if db:
            try:
                docs = (
                    db.collection(COLLECTION_VOLUNTEERS)
                    .where("readiness_status", "in", [ReadinessStatus.STANDBY.value, ReadinessStatus.MOBILIZING.value])
                    .stream()
                )
                for doc in docs:
                    volunteers.append(Volunteer(**doc.to_dict()))
            except Exception as exc:
                logger.warning("Failed to fetch volunteers from Firestore: {}. Using seed pool.", exc)

        if not volunteers:
            volunteers = list(MOCK_VOLUNTEER_POOL)

        return volunteers

    async def match_volunteers_for_incident(
        self,
        incident: Incident,
        max_results: int = 5,
    ) -> tuple[list[ScoredVolunteer], list[AIMatchRecord]]:
        """
        Rank volunteers against an incident:
        1. Calculate Haversine distance and ETA for each candidate.
        2. Score candidates using Groq LLaMA 3.
        3. Save AI match audit logs.
        4. Broadcast match event via WebSockets.
        """
        candidates = await self.get_available_volunteers()
        if not candidates:
            return [], []

        # 1. Update distance & ETA for each candidate relative to this incident
        for vol in candidates:
            base_coords = vol.current_coords or vol.home_base_coords
            vol.distance_km = haversine_distance(base_coords, incident.coords)
            vol.eta_hours = estimate_transit_hours(vol.distance_km)

        # 2. Call Groq for AI matching
        incident_summary_dict = {
            "id": incident.id,
            "title": incident.title,
            "category": incident.category,
            "urgency": incident.urgency,
            "location_name": incident.location_name,
            "country": incident.country,
            "extracted_needs": incident.extracted_needs,
            "required_skills": incident.required_skills,
            "severity_score": incident.severity_score,
            "population_affected": incident.population_affected,
        }

        try:
            scored_volunteers, audit_records = await self.groq_service.score_volunteer_match(
                incident_data=incident_summary_dict,
                volunteers=candidates,
            )
        except Exception as exc:
            logger.warning("Groq matching call failed, using heuristic fallback: {}", exc)
            scored_volunteers = self._heuristic_fallback(incident, candidates)
            audit_records = []

        # Trim to top results
        top_matches = scored_volunteers[:max_results]

        # 3. Persist audit records to Firestore
        db = get_db()
        if db and audit_records:
            for record in audit_records:
                try:
                    log_id = f"audit-{uuid.uuid4().hex[:8]}"
                    log_item = TelemetryLog(
                        id=log_id,
                        timestamp=datetime.now(timezone.utc),
                        level=TelemetryLevel.AUDIT,
                        source="Groq Smart Match Engine",
                        source_type="AI_ENGINE",
                        message=f"Scored {record.volunteer_id} ({record.groq_score}/100) for incident {record.incident_id}",
                        incident_id=record.incident_id,
                        volunteer_id=record.volunteer_id,
                        ai_match_record=record,
                    )
                    db.collection(COLLECTION_TELEMETRY_LOGS).document(log_id).set(log_item.model_dump(mode="json"))
                except Exception as exc:
                    logger.warning("Failed to save audit telemetry: {}", exc)

        # 4. Broadcast match event via WebSocket
        await ws_manager.broadcast_event(
            event=WSEvent.MATCH_FOUND,
            data={
                "incident_id": incident.id,
                "matches": [
                    {
                        "volunteer_id": sv.volunteer.id,
                        "name": sv.volunteer.name,
                        "score": sv.computed_score,
                        "rank": sv.rank,
                        "match_reasons": sv.match_reasons,
                        "eta_hours": sv.volunteer.eta_hours,
                    }
                    for sv in top_matches
                ],
            },
        )

        return top_matches, audit_records

    def _heuristic_fallback(self, incident: Incident, volunteers: list[Volunteer]) -> list[ScoredVolunteer]:
        """Rule-based heuristic when Groq is unreachable."""
        req_skills_set = {s.lower() for s in incident.required_skills}
        results: list[ScoredVolunteer] = []

        for vol in volunteers:
            vol_skills_set = {s.lower() for s in vol.skills}
            overlap = req_skills_set.intersection(vol_skills_set)
            skill_score = (len(overlap) / max(1, len(req_skills_set))) * 50.0

            # Proximity: max 25 pts for <= 500km, decaying to 0 at 10,000km
            dist_score = max(0.0, 25.0 * (1.0 - min(vol.distance_km, 10000.0) / 10000.0))

            # Experience: max 15 pts for 20+ missions
            exp_score = min(15.0, (vol.past_missions / 20.0) * 15.0)

            # Language: 10 pts
            lang_score = 10.0 if "en" in vol.languages else 5.0

            total_score = int(round(skill_score + dist_score + exp_score + lang_score))

            reasons = []
            if overlap:
                reasons.append(f"Matching skills: {', '.join(list(overlap)[:3])}")
            reasons.append(f"ETA ~{vol.eta_hours}h ({vol.distance_km} km away)")

            results.append(
                ScoredVolunteer(
                    volunteer=vol,
                    computed_score=min(100, max(0, total_score)),
                    match_reasons=reasons,
                    rank=0,
                    skill_overlap=list(overlap),
                )
            )

        results.sort(key=lambda s: s.computed_score, reverse=True)
        for idx, sv in enumerate(results):
            sv.rank = idx + 1

        return results
