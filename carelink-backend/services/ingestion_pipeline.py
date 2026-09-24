"""
CareLink 2.0 — Ingestion Pipeline Orchestrator
Coordinates the full Gemini → Groq → Firestore → WebSocket flow.

Stage 1: Gemini Flash   — relevance filter + raw signal extraction
Stage 2: Groq LLaMA 3  — NER + severity + summary
Stage 3: Firestore      — persist Incident + TelemetryLog
Stage 4: WebSocket      — broadcast to all React clients

Expected total latency: 1.5–2.5s end-to-end.
"""
from loguru import logger
from datetime import datetime, timezone
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
import asyncio
import uuid

from core.firebase import get_db, COLLECTION_INCIDENTS, COLLECTION_TELEMETRY_LOGS
from core.websocket_manager import ws_manager, WSEvent
from models.incident import (
    Incident, IncidentCreate, IncidentCategory, UrgencyLevel,
    IncidentStatus, IncidentSource, GeoCoords
)
from models.telemetry_log import TelemetryLog, TelemetryLevel, SensorType
from services.gemini_service import GeminiIngestionService, RawSignalBatch
from services.groq_service import GroqProcessingService, EntityBundle


# ── Geocoder (fallback if Gemini couldn't extract coords) ────────────────────
_geocoder = Nominatim(user_agent="carelink-backend/2.0")


async def _geocode_location(location_name: str) -> GeoCoords | None:
    """Try to geocode a place name string to lat/lng. Returns None on failure."""
    try:
        result = await asyncio.to_thread(
            _geocoder.geocode, location_name, timeout=3
        )
        if result:
            return GeoCoords(lat=result.latitude, lng=result.longitude)
    except GeocoderTimedOut:
        logger.warning("Geocoder timed out for: {}", location_name)
    except Exception as exc:
        logger.warning("Geocode failed for '{}': {}", location_name, exc)
    return None


async def _generate_incident_code(category: IncidentCategory) -> str:
    """Generate a unique incident code, e.g. FLD-2026-042."""
    prefix_map = {
        IncidentCategory.EARTHQUAKE:              "EQ",
        IncidentCategory.FLOOD:                   "FLD",
        IncidentCategory.CYCLONE:                 "CYC",
        IncidentCategory.WILDFIRE:                "WLF",
        IncidentCategory.FAMINE_DROUGHT:          "DRT",
        IncidentCategory.MEDICAL_OUTBREAK:        "MED",
        IncidentCategory.INFRASTRUCTURE_COLLAPSE: "COL",
    }
    prefix = prefix_map.get(category, "INC")
    year = datetime.now(timezone.utc).year
    suffix = uuid.uuid4().hex[:3].upper()
    return f"{prefix}-{year}-{suffix}"


class IngestionPipeline:
    """
    Orchestrates the full signal → incident pipeline.
    Instantiate once at startup and reuse across requests.
    """

    def __init__(self):
        self.gemini = GeminiIngestionService()
        self.groq   = GroqProcessingService()
        logger.info("✅ IngestionPipeline ready")

    async def run(
        self,
        raw_posts:  list[str],
        source:     str = "Manual",
        source_url: str | None = None,
        image_urls: list[str] | None = None,
    ) -> Incident:
        """
        Full pipeline execution:

        1. Gemini: Filter relevant posts              (~300ms)
        2. Gemini: Extract raw signals from batch     (~500ms)
        3. Groq:   NER + severity score               (~400ms)
        4. Groq:   Generate incident summary          (~300ms)
        5. Resolve geocoordinates (Gemini hint → Nominatim fallback)
        6. Firestore: Persist Incident document
        7. Firestore: Persist TelemetryLog entry
        8. WebSocket: Broadcast NEW_INCIDENT to all clients
        9. Return: Fully typed Incident object

        Total expected latency: 1.5–2.5s
        """
        pipeline_start = datetime.now(timezone.utc)

        # ── Broadcast pipeline start ──────────────────────────────────────────
        await ws_manager.broadcast(
            WSEvent.PIPELINE_STATUS,
            {"stage": "gemini_scanning", "message": "📡 Gemini scanning social signals…"},
            source="gemini_pipeline",
        )

        # ── Stage 1a: Gemini relevance filter ────────────────────────────────
        logger.info("Pipeline Stage 1a: Gemini relevance filter ({} posts)", len(raw_posts))
        relevant_posts = await self.gemini.filter_relevant_posts(raw_posts)
        if not relevant_posts:
            raise ValueError("No disaster-relevant signals found in the provided posts.")

        # ── Stage 1b: Gemini signal extraction ───────────────────────────────
        logger.info("Pipeline Stage 1b: Gemini signal extraction")
        signal_batch: RawSignalBatch = await self.gemini.extract_raw_signals(relevant_posts)

        # ── Broadcast Groq stage ──────────────────────────────────────────────
        await ws_manager.broadcast(
            WSEvent.PIPELINE_STATUS,
            {"stage": "groq_processing", "message": "⚡ Groq extracting structured entities…"},
            source="groq_pipeline",
        )

        # ── Stage 2a: Groq NER + severity ────────────────────────────────────
        logger.info("Pipeline Stage 2a: Groq NER extraction")
        entities: EntityBundle = await self.groq.extract_named_entities(signal_batch)

        # ── Stage 2b: Groq summary ────────────────────────────────────────────
        logger.info("Pipeline Stage 2b: Groq summary generation")
        summary_obj = await self.groq.generate_incident_summary(entities)

        # ── Stage 3: Geocoordinates resolution ───────────────────────────────
        coords: GeoCoords | None = None

        # Try Gemini's coords hint first
        for signal in signal_batch.signals:
            if signal.coords_hint:
                coords = signal.coords_hint
                break

        # Fallback: Nominatim geocoding
        if coords is None and entities.primary_location:
            coords = await _geocode_location(entities.primary_location)

        # Last resort: zero island (will show on globe at 0,0 for manual correction)
        if coords is None:
            logger.warning("Could not resolve coordinates — defaulting to 0,0")
            coords = GeoCoords(lat=0.0, lng=0.0)

        # ── Stage 4: Build Incident object ───────────────────────────────────
        code = await _generate_incident_code(entities.disaster_category)
        incident = Incident(
            code=code,
            title=summary_obj.short_title,
            category=entities.disaster_category,
            urgency=entities.urgency_level,
            status=IncidentStatus.PENDING_DISPATCH,
            coords=coords,
            location_name=entities.primary_location or "Unknown",
            country=entities.locations[0] if entities.locations else "Unknown",
            region="Asia-Pacific",   # TODO: derive from coords via reverse-geocode
            severity_score=entities.severity_score,
            population_affected=entities.population_affected,
            casualties_confirmed=entities.casualties_confirmed,
            casualties_missing=entities.casualties_missing,
            displaced_count=entities.displaced_count,
            description=summary_obj.summary,
            extracted_needs=entities.extracted_needs,
            required_skills=entities.required_skills,
            source=IncidentSource.TWITTER if "twitter" in source.lower() else IncidentSource.MANUAL,
            source_url=source_url,
            media_urls=image_urls or [],
            ai_confidence=min(
                1.0,
                sum(s.confidence for s in signal_batch.signals if hasattr(s, "confidence")) / max(1, len(signal_batch.signals))
                if signal_batch.signals else 0.8
            ),
        )

        # ── Stage 5: Persist to Firestore ────────────────────────────────────
        db = get_db()
        if db:
            await asyncio.to_thread(
                db.collection(COLLECTION_INCIDENTS).document(incident.id).set,
                incident.model_dump(mode="json"),
            )
        from routers.incidents import _IN_MEMORY_INCIDENTS
        _IN_MEMORY_INCIDENTS[incident.id] = incident
        logger.info("✅ Incident persisted: {} — {}", incident.code, incident.title)

        # ── Stage 6: Emit TelemetryLog ────────────────────────────────────────
        elapsed_ms = int((datetime.now(timezone.utc) - pipeline_start).total_seconds() * 1000)
        log = TelemetryLog(
            level=TelemetryLevel.CRITICAL if entities.urgency_level == UrgencyLevel.CRITICAL else TelemetryLevel.WARN,
            source="AI Ingestion Pipeline",
            source_type=SensorType.AI_PIPELINE,
            message=(
                f"New incident ingested via pipeline: [{incident.code}] {incident.title} "
                f"({incident.country}). Severity: {incident.severity_score}/100. "
                f"Pipeline latency: {elapsed_ms}ms."
            ),
            incident_id=incident.id,
        )
        if db:
            await asyncio.to_thread(
                db.collection(COLLECTION_TELEMETRY_LOGS).document(log.id).set,
                log.model_dump(mode="json"),
            )


        # ── Stage 7: WebSocket broadcast ─────────────────────────────────────
        await ws_manager.broadcast(
            WSEvent.NEW_INCIDENT,
            incident.model_dump(mode="json"),
            source="gemini_pipeline",
        )
        await ws_manager.broadcast(
            WSEvent.NEW_LOG,
            log.model_dump(mode="json"),
            source="groq_pipeline",
        )

        total_ms = int((datetime.now(timezone.utc) - pipeline_start).total_seconds() * 1000)
        logger.info("🏁 Pipeline complete in {}ms. Incident: {}", total_ms, incident.code)
        return incident
