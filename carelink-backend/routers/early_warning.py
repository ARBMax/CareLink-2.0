"""
CareLink 2.0 — Early Warning REST Router
Serves real-time risk alerts sourced from GDACS, NewsAPI, and Groq AI scoring.
"""
from fastapi import APIRouter, Query, BackgroundTasks
from loguru import logger

from services.early_warning_service import get_early_warning_service

router = APIRouter(prefix="/early-warning", tags=["Early Warning System"])


@router.get("/alerts", response_model=dict)
async def get_early_warning_alerts(
    force_refresh: bool = Query(default=False, description="Force a live re-fetch from GDACS/NewsAPI"),
    background_tasks: BackgroundTasks = None,
):
    """
    Return the current list of predictive risk alerts.

    - Served from an in-memory cache (refreshed every 10 minutes automatically).
    - Pass ?force_refresh=true to trigger an immediate live re-fetch.
    - Each alert contains: type, region, country, riskLevel, riskScore,
      timeframe, trigger, affectedPopulation, signals, recommendedActions.
    """
    svc = get_early_warning_service()

    try:
        alerts = await svc.get_alerts(force_refresh=force_refresh)
        return {
            "status":       "ok",
            "count":        len(alerts),
            "cache_age_min": round(svc.cache_age_minutes(), 1),
            "alerts":       [a.to_dict() for a in alerts],
        }
    except Exception as exc:
        logger.error("Early warning alerts endpoint failed: {}", exc)
        return {
            "status":  "error",
            "message": str(exc),
            "count":   0,
            "alerts":  [],
        }


@router.post("/refresh", response_model=dict)
async def trigger_early_warning_refresh():
    """
    Manually trigger a background re-fetch and Groq re-scoring of all feeds.
    The updated alerts will be broadcast via WebSocket (EARLY_WARNING_UPDATE)
    and will be available on the next GET /alerts call.
    """
    svc = get_early_warning_service()
    try:
        alerts = await svc.refresh_alerts()
        return {
            "status":  "refreshed",
            "count":   len(alerts),
            "alerts":  [a.to_dict() for a in alerts],
        }
    except Exception as exc:
        logger.error("Early warning refresh endpoint failed: {}", exc)
        return {"status": "error", "message": str(exc), "count": 0, "alerts": []}


@router.get("/status", response_model=dict)
async def get_early_warning_status():
    """Returns cache metadata — useful for debugging data freshness."""
    svc = get_early_warning_service()
    return {
        "cached_alert_count": len(svc._cache),
        "cache_age_minutes":  round(svc.cache_age_minutes(), 1),
        "groq_enabled":       svc._groq is not None,
        "cache_ttl_minutes":  svc.CACHE_TTL_MINUTES,
    }
