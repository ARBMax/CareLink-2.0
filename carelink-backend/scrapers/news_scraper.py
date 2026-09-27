"""
CareLink 2.0 — News & RSS Disaster Feed Scraper
Monitors UN OCHA ReliefWeb, GDACS, and NewsAPI for catastrophe alerts.
"""
from loguru import logger
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote_plus

import asyncio
from core.config import get_settings
from services.ingestion_pipeline import IngestionPipeline


GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"
NEWS_API_BASE = "https://newsapi.org/v2/everything"


class NewsScraper:
    """
    Polls authoritative disaster feeds and news sources to route new
    disaster declarations into the pipeline.
    """

    def __init__(self, pipeline: Optional[IngestionPipeline] = None):
        self.pipeline = pipeline or IngestionPipeline()
        self.seen_alerts: set[str] = set()
        self.settings = get_settings()

    async def poll_gdacs_alerts(self) -> list[dict]:
        """Fetch active alerts from GDACS RSS."""
        alerts: list[dict] = []
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
                        pub_date_str = item.findtext("pubDate", "")

                        dt = None
                        if pub_date_str:
                            from email.utils import parsedate_to_datetime
                            try:
                                dt = parsedate_to_datetime(pub_date_str)
                            except Exception:
                                pass

                        if guid not in self.seen_alerts:
                            self.seen_alerts.add(guid)
                            alerts.append({
                                "text": f"GDACS Alert: {title}. {desc}",
                                "date": dt,
                                "source": "GDACS"
                            })
        except Exception as exc:
            logger.warning("GDACS RSS poll skipped or failed: {}", exc)
        return alerts

    async def poll_news_api(self) -> list[dict]:
        """Fetch breaking disaster news via NewsAPI."""
        if not self.settings.news_api_key or self.settings.news_api_key.startswith("your_"):
            return []

        alerts: list[dict] = []
        query = quote_plus("earthquake OR flood OR hurricane OR tsunami OR wildfire OR disaster")
        url = f"{NEWS_API_BASE}?q={query}&language=en&sortBy=publishedAt&pageSize=50&apiKey={self.settings.news_api_key}"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    articles = data.get("articles", [])
                    for article in articles:
                        url_id = article.get("url", "")
                        if url_id and url_id not in self.seen_alerts:
                            self.seen_alerts.add(url_id)
                            title = article.get("title", "")
                            desc = article.get("description", "")
                            pub_at = article.get("publishedAt", "")
                            
                            dt = None
                            if pub_at:
                                try:
                                    dt = datetime.fromisoformat(pub_at.replace('Z', '+00:00'))
                                except Exception:
                                    pass

                            alerts.append({
                                "text": f"Breaking News: {title}. {desc}",
                                "date": dt,
                                "source": "NewsAPI"
                            })
        except Exception as exc:
            logger.warning("NewsAPI poll skipped or failed: {}", exc)
        return alerts

    async def poll_and_ingest(self):
        """Poll feeds and ingest any newly detected catastrophic alerts."""
        alerts = await self.poll_gdacs_alerts()
        alerts.extend(await self.poll_news_api())
        
        for alert in alerts:
            try:
                await self.pipeline.run(
                    raw_posts=[alert["text"]],
                    source=f"Real-Time Feed ({alert['source']})",
                    incident_date=alert["date"]
                )
            except Exception as exc:
                logger.error("Failed to ingest alert: {}", exc)
            
            # Slow drip to avoid Gemini Free Tier 429 Rate Limits (5 req/min)
            await asyncio.sleep(15)
