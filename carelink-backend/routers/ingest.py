"""
CareLink 2.0 — Ingest Router
Orchestrates AI Ingestion Pipeline (Gemini Flash → Groq LLaMA 3)
for raw text feeds, social media streams, field reports, and telemetry sensor packets.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
from loguru import logger
import uuid

from core.firebase import get_db, COLLECTION_TELEMETRY_LOGS
from core.websocket_manager import ws_manager, WSEvent
from models.incident import Incident
from models.telemetry_log import TelemetryLog, TelemetryLevel, SensorPacket
from services.ingestion_pipeline import IngestionPipeline
from services.gemini_service import GeminiIngestionService
from services.groq_service import GroqProcessingService

router = APIRouter(prefix="/ingest", tags=["AI Signal Ingestion"])

# Lazy pipeline instantiation
_pipeline: Optional[IngestionPipeline] = None


def get_pipeline() -> IngestionPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = IngestionPipeline()
    return _pipeline


class TextIngestRequest(BaseModel):
    posts: list[str] = Field(..., description="Raw text signals/posts/messages")
    source: str = Field(default="Twitter", description="Signal origin e.g. Twitter, Telegram, Radio")
    source_url: Optional[str] = None


class ImageIngestRequest(BaseModel):
    image_url: str = Field(..., description="Image URL or public disaster photo URI")
    caption: str = Field(default="", description="Accompanying eyewitness text")
    source: str = Field(default="Field Drone", description="Source device/reporter")


class SensorIngestRequest(BaseModel):
    sensor_id: str
    sensor_type: str = "SATELLITE"
    raw_value: str
    unit: Optional[str] = None
    confidence: float = 0.95
    level: TelemetryLevel = TelemetryLevel.INFO
    incident_id: Optional[str] = None


@router.post("/text", response_model=dict)
async def ingest_text(payload: TextIngestRequest):
    """
    Run raw texts/posts through the two-stage AI pipeline:
    1. Gemini Flash filters relevance & extracts location + preliminary facts
    2. Groq LLaMA 3 extracts structured NER, severity score (0-100), and summary
    3. Saves Incident & TelemetryLog to Firestore
    4. Broadcasts NEW_INCIDENT via WebSocket
    """
    if not payload.posts:
        raise HTTPException(status_code=400, detail="Empty posts list provided")

    pipeline = get_pipeline()
    try:
        incident = await pipeline.run(
            raw_posts=payload.posts,
            source=payload.source,
            source_url=payload.source_url,
        )
        return {
            "status": "success",
            "incident": incident.model_dump(mode="json"),
            "pipeline_stages": ["Gemini-2.0-Flash", "Groq-LLaMA-3.3-70B"],
        }
    except Exception as exc:
        logger.error("Ingestion pipeline failed: {}", exc)
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(exc)}")


@router.post("/image", response_model=dict)
async def ingest_image(payload: ImageIngestRequest):
    """
    Multimodal disaster damage triage:
    Gemini Flash inspects disaster imagery (structural collapse, flood levels, fire perimeter),
    followed by Groq structuring for response mobilization.
    """
    pipeline = get_pipeline()
    try:
        # Use Gemini image analysis
        analysis = await pipeline.gemini.analyze_disaster_image(
            image_url=payload.image_url,
            context=payload.caption,
        )

        # Ingest synthesized observation through pipeline
        synthesis = f"Visual assessment [{payload.source}]: {payload.caption}. Detected: {analysis.get('damage_assessment', '')}. Urgent needs: {', '.join(analysis.get('visible_needs', []))}."
        incident = await pipeline.run(
            raw_posts=[synthesis],
            source=payload.source,
            image_urls=[payload.image_url],
        )

        return {
            "status": "success",
            "visual_triage": analysis,
            "incident": incident.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.error("Multimodal image ingest failed: {}", exc)
        raise HTTPException(status_code=500, detail=f"Multimodal error: {str(exc)}")


@router.post("/sensor", response_model=TelemetryLog)
async def ingest_sensor(payload: SensorIngestRequest):
    """
    Ingest real-time sensor packets (Satellite Sentinel-2 SAR radar, seismic sensors, river gauges)
    directly into Collection 4: telemetry_logs.
    """
    packet = SensorPacket(
        sensor_id=payload.sensor_id,
        sensor_type=payload.sensor_type,
        raw_value=payload.raw_value,
        unit=payload.unit,
        confidence=payload.confidence,
    )

    log_entry = TelemetryLog(
        id=f"log-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.now(timezone.utc),
        level=payload.level,
        source=f"{payload.sensor_type} [{payload.sensor_id}]",
        source_type=payload.sensor_type,
        message=f"Sensor telemetry received: {payload.raw_value} {payload.unit or ''}".strip(),
        incident_id=payload.incident_id,
        sensor_packet=packet,
        ttl_days=7,
    )

    db = get_db()
    if db:
        try:
            db.collection(COLLECTION_TELEMETRY_LOGS).document(log_entry.id).set(log_entry.model_dump(mode="json"))
        except Exception as exc:
            logger.warning("Failed to store telemetry log in Firestore: {}", exc)

    await ws_manager.broadcast_event(
        event=WSEvent.NEW_LOG,
        data=log_entry.model_dump(mode="json"),
    )

    return log_entry
