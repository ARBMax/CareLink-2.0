"""
CareLink 2.0 — WebSocket Connection Manager
Manages all active WS client connections and broadcasts events to all of them.
"""
from fastapi import WebSocket
from loguru import logger
import json
from datetime import datetime, timezone
from typing import Any


class ConnectionManager:
    """
    Thread-safe WebSocket connection pool.
    All CareLink UI clients connect here and receive push events.
    """

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("🔌 WS client connected. Total: {}", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a disconnected WebSocket from the pool."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("🔌 WS client disconnected. Total: {}", len(self.active_connections))

    async def broadcast(
        self,
        event: str,
        payload: Any,
        source: str = "system",
    ) -> None:
        """
        Broadcast a typed event to all connected clients.

        Event envelope:
        {
            "event":     "NEW_INCIDENT" | "NEW_LOG" | "DISPATCH_UPDATE" |
                         "STATS_UPDATE" | "VOLUNTEER_UPDATE",
            "payload":   { ...typed object },
            "timestamp": "2026-09-22T08:17:42Z",
            "source":    "gemini_pipeline" | "groq_pipeline" | "manual" | "scheduler"
        }
        """
        message = json.dumps(
            {
                "event": event,
                "payload": payload,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": source,
            },
            default=str,  # Handles datetime, UUID, etc.
        )
        dead_connections: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as exc:
                logger.warning("WS send failed, dropping connection: {}", exc)
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    async def send_personal(self, websocket: WebSocket, event: str, payload: Any) -> None:
        """Send a message to a single client only."""
        message = json.dumps(
            {
                "event": event,
                "payload": payload,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "system",
            },
            default=str,
        )
        await websocket.send_text(message)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

    @property
    def active_connections_count(self) -> int:
        return len(self.active_connections)

    async def broadcast_event(self, event: str, data: Any, source: str = "system") -> None:
        """Alias for broadcast with data argument name."""
        await self.broadcast(event=event, payload=data, source=source)


# ── Singleton instance ────────────────────────────────────────────────────────
# Import this everywhere: `from core.websocket_manager import ws_manager`
ws_manager = ConnectionManager()


# ── WS Event Type Constants ───────────────────────────────────────────────────
class WSEvent:
    NEW_INCIDENT      = "NEW_INCIDENT"
    INCIDENT_NEW      = "NEW_INCIDENT"
    UPDATE_INCIDENT   = "UPDATE_INCIDENT"
    INCIDENT_UPDATE   = "UPDATE_INCIDENT"
    NEW_LOG           = "NEW_LOG"
    DISPATCH_UPDATE   = "DISPATCH_UPDATE"
    DISPATCH_NEW      = "DISPATCH_NEW"
    DISPATCH_PROGRESS = "DISPATCH_PROGRESS"
    VOLUNTEER_UPDATE  = "VOLUNTEER_UPDATE"
    VOLUNTEER_STATUS  = "VOLUNTEER_STATUS"
    STATS_UPDATE      = "STATS_UPDATE"
    PIPELINE_STATUS   = "PIPELINE_STATUS"   # Gemini/Groq processing progress
    MATCH_FOUND       = "MATCH_FOUND"

