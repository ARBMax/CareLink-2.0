"""
CareLink 2.0 — Background Scheduler
Manages background recurring tasks:
- Periodic stats broadcast over WebSocket
- External disaster feed polling (GDACS / Twitter)
- 7-day TTL cleanup for telemetry audit logs
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone, timedelta
from loguru import logger
import asyncio

from core.firebase import get_db, COLLECTION_TELEMETRY_LOGS
from core.websocket_manager import ws_manager, WSEvent
from routers.stats import get_kpis
from scrapers.news_scraper import NewsScraper

scheduler = AsyncIOScheduler()
_news_scraper = NewsScraper()


async def broadcast_kpi_heartbeat():
    """Periodically push latest KPI statistics to all open browser sessions."""
    try:
        if ws_manager.connection_count > 0:
            kpis = await get_kpis()
            await ws_manager.broadcast_event(
                event=WSEvent.STATS_UPDATE,
                data=kpis,
                source="scheduler",
            )
    except Exception as exc:
        logger.warning("KPI heartbeat broadcast failed: {}", exc)


async def poll_news_feeds_job():
    """Check GDACS/UN OCHA RSS feeds for new crisis declarations."""
    try:
        await _news_scraper.poll_and_ingest()
    except Exception as exc:
        logger.warning("Feed poll job failed: {}", exc)


async def purge_expired_telemetry():
    """Enforce 7-day TTL policy on Collection 4: telemetry_logs."""
    db = get_db()
    if not db:
        return

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    try:
        docs = (
            db.collection(COLLECTION_TELEMETRY_LOGS)
            .where("timestamp", "<", cutoff.isoformat())
            .limit(50)
            .stream()
        )
        count = 0
        for doc in docs:
            doc.reference.delete()
            count += 1
        if count > 0:
            logger.info("Purged {} expired telemetry logs (> 7 days)", count)
    except Exception as exc:
        logger.warning("Telemetry log purge skipped or failed: {}", exc)


def start_scheduler():
    """Start APScheduler background jobs."""
    if not scheduler.running:
        # Every 15 seconds: push stats heartbeat
        scheduler.add_job(
            broadcast_kpi_heartbeat,
            trigger=IntervalTrigger(seconds=15),
            id="kpi_heartbeat",
            replace_existing=True,
        )
        # Every 5 minutes: poll disaster feeds
        scheduler.add_job(
            poll_news_feeds_job,
            trigger=IntervalTrigger(minutes=5),
            id="feed_poller",
            replace_existing=True,
        )
        # Every 24 hours: purge expired telemetry
        scheduler.add_job(
            purge_expired_telemetry,
            trigger=IntervalTrigger(hours=24),
            id="telemetry_purge",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("⏰ Background scheduler started (heartbeat, feed poller, TTL purge)")


def stop_scheduler():
    """Gracefully shutdown scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("⏰ Background scheduler stopped")
