"""
CareLink 2.0 — WhatsApp Field Hotline Ingestion
Handles inbound field reports from responders and citizens via WhatsApp Business API webhook.
Supports text, location pins, and disaster audio/image attachments.
"""
from loguru import logger
from datetime import datetime, timezone
from typing import Optional

from services.ingestion_pipeline import IngestionPipeline


class WhatsAppScraper:
    """
    Ingests eyewitness crisis reports submitted via WhatsApp hotline.
    """

    def __init__(self, pipeline: Optional[IngestionPipeline] = None):
        self.pipeline = pipeline or IngestionPipeline()

    async def handle_incoming_message(
        self,
        sender_phone: str,
        message_text: str,
        media_url: Optional[str] = None,
        location: Optional[dict] = None,
    ):
        """
        Process an incoming WhatsApp message:
        Extracts location pin if shared, runs through Gemini & Groq pipeline.
        """
        logger.info("Processing WhatsApp field report from [REDACTED...{}]", sender_phone[-4:])

        payload_text = message_text
        if location:
            payload_text += f" [GPS Location: {location.get('latitude')}, {location.get('longitude')}]"

        try:
            incident = await self.pipeline.run(
                raw_posts=[payload_text],
                source="WhatsApp Emergency Hotline",
                image_urls=[media_url] if media_url else None,
            )
            return incident
        except Exception as exc:
            logger.error("Failed to ingest WhatsApp message: {}", exc)
            return None
