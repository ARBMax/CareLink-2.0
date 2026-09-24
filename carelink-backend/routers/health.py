"""
CareLink 2.0 — Health and System Status Router
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import os

from core.config import get_settings
from core.firebase import get_db
from core.websocket_manager import ws_manager

router = APIRouter(prefix="/health", tags=["System Health"])


@router.get("")
async def health_check():
    """Returns backend system status and dependency connectivity."""
    settings = get_settings()
    db = get_db()

    firebase_connected = db is not None
    gemini_configured = bool(settings.gemini_api_key and not settings.gemini_api_key.startswith("your_"))
    groq_configured = bool(settings.groq_api_key and not settings.groq_api_key.startswith("your_"))

    return {
        "status": "healthy",
        "service": "CareLink-Backend-2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.environment,
        "active_ws_connections": ws_manager.active_connections_count,

        "dependencies": {
            "firebase_firestore": "connected" if firebase_connected else "offline_mock_mode",
            "gemini_api": "configured" if gemini_configured else "mock_fallback",
            "groq_api": "configured" if groq_configured else "mock_fallback",
        },
    }
