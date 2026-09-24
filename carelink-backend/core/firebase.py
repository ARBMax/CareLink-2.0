"""
CareLink 2.0 — Firebase Client Initialisation
Provides Firestore db and RTDB references as singletons.
"""
import firebase_admin
from firebase_admin import credentials, firestore, db as rtdb
from loguru import logger
from core.config import get_settings

_app: firebase_admin.App | None = None
_firestore_client = None


def init_firebase() -> None:
    """Initialise Firebase Admin SDK. Safe to call multiple times (idempotent)."""
    global _app, _firestore_client
    if _app is not None:
        return

    settings = get_settings()
    if not settings.firebase_private_key or not settings.firebase_client_email:
        logger.warning("⚠️  Firebase credentials not provided in .env — running in offline/in-memory mode.")
        return

    try:
        cred = credentials.Certificate(settings.firebase_credentials_dict)
        _app = firebase_admin.initialize_app(
            cred,
            {"databaseURL": settings.firebase_database_url or f"https://{settings.firebase_project_id}-default-rtdb.firebaseio.com"},
        )
        _firestore_client = firestore.client()
        logger.info("✅ Firebase initialised — project: {}", settings.firebase_project_id)
    except Exception as exc:
        logger.warning("⚠️  Firebase init failed: {}. Continuing in offline/in-memory mode.", exc)


def get_db():
    """Return the Firestore client or None if offline."""
    return _firestore_client



def get_rtdb():
    """Return the Firebase RTDB reference for real-time fan-out."""
    return rtdb.reference("/")


# ── Firestore Collection References ──────────────────────────────────────────
# Use these constants everywhere to avoid typos in collection names.

COLLECTION_INCIDENTS      = "incidents"
COLLECTION_VOLUNTEERS     = "volunteers"
COLLECTION_DISPATCH_ARCS  = "dispatch_arcs"
COLLECTION_TELEMETRY_LOGS = "telemetry_logs"
COLLECTION_STATS          = "stats"
COLLECTION_SOCIAL_SIGNALS = "social_signals"   # Raw Gemini outputs (TTL: 24h)
