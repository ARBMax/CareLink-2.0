"""
CareLink 2.0 — News & RSS Disaster Feed Scraper
Monitors UN OCHA ReliefWeb, GDACS (Global Disaster Alert and Coordination System),
and international wire feeds for catastrophe alerts.
"""
from loguru import logger
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional

from services.ingestion_pipeline import IngestionPipeline


GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"
RELIEFWEB_API_URL = "https://api.reliefweb.int/v1/disasters?appname=carelink&limit=5"


class NewsScraper:
    """
    Polls authoritative disaster RSS feeds (GDACS, ReliefWeb)
    and routes new disaster declarations into the pipeline.
    """

    def __init__(self, pipeline: Optional[IngestionPipeline] = None):
        self.pipeline = pipeline or IngestionPipeline()
        self.seen_alerts: set[str] = set()

    async def poll_gdacs_alerts(self) -> list[str]:
        """Fetch active alerts from Global Disaster Alert and Coordination System RSS."""
        alerts: list[str] = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(GDACS_RSS_URL)
                if res.status_code == 200:
                    root = ET.fromstring(res.text)
                    for item in root.findall(".//item"):
                        title = item.findtext("title", "")
                        desc = item.findtext("description", "")
                        link = item.findtext("link", "")
                        guid = item.findtext("guid", link)

                        if guid not in self.seen_alerts:
                            self.seen_alerts.add(guid)
                            summary = f"GDACS Alert: {title}. {desc}"
                            alerts.append(summary)
        except Exception as exc:
            logger.warning("GDACS RSS poll skipped or failed: {}", exc)

        return alerts

    async def poll_and_ingest(self):
        """Poll feeds and ingest any newly detected catastrophic alerts."""
        alerts = await self.poll_gdacs_alerts()
        for alert_text in alerts:
            try:
                await self.pipeline.run(
                    raw_posts=[alert_text],
                    source="GDACS / UN OCHA RSS",
                )
            except Exception as exc:
                logger.error("Failed to ingest GDACS alert: {}", exc)
