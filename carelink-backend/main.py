"""
CareLink 2.0 — FastAPI Backend Application Entry Point
Decision OS for Global Humanitarian Disaster Response.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from core.config import get_settings
from core.firebase import init_firebase
from scheduler.jobs import start_scheduler, stop_scheduler
from routers import health, incidents, volunteers, dispatch, ingest, match, stats, websocket


# Setup structured logging
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("🚀 Starting CareLink 2.0 Decision OS Backend")
    logger.info("Environment: {}", settings.environment)
    logger.info("FastAPI Host: {}:{}", settings.host, settings.port)
    logger.info("=" * 60)


    # Initialize Firebase Admin
    init_firebase()

    # Start background scheduler jobs
    start_scheduler()

    yield

    # Stop background scheduler
    stop_scheduler()

    logger.info("🛑 Shutting down CareLink Backend")



def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="CareLink 2.0 API",
        description=(
            "Humanitarian Decision OS — AI-assisted crisis response coordination. "
            "Integrates Gemini 2.0 Flash for signal ingestion & triage, and Groq LLaMA 3.3 for structured extraction & volunteer matching."
        ),
        version="2.0.0",
        lifespan=lifespan,
    )

    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS if hasattr(settings, "CORS_ORIGINS") else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount REST Routers
    app.include_router(health.router, prefix="/api")
    app.include_router(incidents.router, prefix="/api")
    app.include_router(volunteers.router, prefix="/api")
    app.include_router(dispatch.router, prefix="/api")
    app.include_router(ingest.router, prefix="/api")
    app.include_router(match.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")

    # Mount WebSocket Gateway
    app.include_router(websocket.router)

    @app.get("/")
    async def root():
        return {
            "name": "CareLink 2.0 Decision OS",
            "version": "2.0.0",
            "status": "operational",
            "docs": "/docs",
            "websocket": "/ws",
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)

