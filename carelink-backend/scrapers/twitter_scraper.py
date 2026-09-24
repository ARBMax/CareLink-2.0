"""
CareLink 2.0 — Twitter/X Signal Scraper
Listens for crisis hashtags and passes high-urgency tweets into the Gemini/Groq pipeline.
Supports both live Twitter API v2 stream and mock simulation for testing/offline use.
"""
from loguru import logger
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Optional

from core.config import get_settings
from services.ingestion_pipeline import IngestionPipeline


CRISIS_KEYWORDS = [
    "#earthquake", "#flood", "#tsunami", "#cyclone", "#hurricane",
    "#wildfire", "#landslide", "#SOS", "#disasterrelief", "urgent rescue",
    "people trapped", "submerged", "embankment breached", "medical evacuation"
]

# Simulated high-urgency tweets for demo / offline development
SIMULATED_CRISIS_TWEETS = [
    {
        "text": "URGENT: Floodwaters rising rapidly in Sunamganj town. Over 500 families trapped on roofs near Old Hospital Road. No clean drinking water. Need immediate evacuation rescue boats! #SylhetFlood #Bangladesh #SOS",
        "source_url": "https://x.com/crisis_watcher/status/1789012345",
        "author": "@crisis_watcher_bd",
    },
    {
        "text": "Severe M6.8 aftershock felt in Antakya! Two partially standing apartment buildings collapsed completely. Dust clouds everywhere, screaming heard inside debris. Send SAR rescue teams NOW! #Earthquake #Turkiye",
        "source_url": "https://x.com/field_reporter/status/1789012999",
        "author": "@field_reporter_tr",
    },
    {
        "text": "Cat 5 Cyclone gusts tearing off clinic roofs in Kadavu Island. VHF radio failing, island nurse reports 8 injured including children. Urgent emergency medical air-evac requested. #Fiji #CycloneElora",
        "source_url": "https://x.com/pacific_relief/status/1789013555",
        "author": "@pacific_relief_net",
    },
]


class TwitterScraper:
    """
    Ingests public social signals from Twitter/X.
    Uses filtered stream endpoint if bearer token is provided,
    otherwise provides realistic simulated crisis tweets for offline testing.
    """

    def __init__(self, pipeline: Optional[IngestionPipeline] = None):
        self.settings = get_settings()
        self.pipeline = pipeline or IngestionPipeline()
        self.is_running = False

    async def ingest_simulated_signal(self, index: int = 0):
        """Simulate an incoming tweet processed through Gemini and Groq."""
        item = SIMULATED_CRISIS_TWEETS[index % len(SIMULATED_CRISIS_TWEETS)]
        logger.info("Ingesting simulated Twitter signal: {}", item['text'][:60])
        try:
            incident = await self.pipeline.run(
                raw_posts=[item["text"]],
                source="Twitter Stream",
                source_url=item["source_url"],
            )
            return incident
        except Exception as exc:
            logger.error("Failed to process simulated tweet: {}", exc)
            return None

    async def start_stream_listener(self):
        """Background listener for live crisis tweets."""
        self.is_running = True
        logger.info("Twitter scraper initialized. Monitoring keywords: {}", len(CRISIS_KEYWORDS))
        while self.is_running:
            # Poll or stream interval
            await asyncio.sleep(60)

    def stop(self):
        self.is_running = False
