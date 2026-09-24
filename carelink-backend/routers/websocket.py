"""
CareLink 2.0 — WebSocket Router
Real-time full-duplex communication channel for live dashboard updates,
globe 3D marker animations, telemetry log streaming, and dispatch events.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger
import json

from core.websocket_manager import ws_manager, WSEvent
from routers.incidents import _IN_MEMORY_INCIDENTS
from routers.volunteers import _IN_MEMORY_VOLUNTEERS
from routers.dispatch import _IN_MEMORY_DISPATCHES

router = APIRouter(tags=["WebSocket Gateway"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    CareLink real-time telemetry and push gateway.
    Connect here from React client: ws://localhost:8000/ws
    """
    await ws_manager.connect(websocket)

    # Send initial synchronization snapshot
    try:
        await ws_manager.send_personal(
            websocket=websocket,
            event="INIT_SYNC",
            payload={
                "message": "CareLink 2.0 Mission Control connected",
                "active_incidents_count": len(_IN_MEMORY_INCIDENTS),
                "active_volunteers_count": len(_IN_MEMORY_VOLUNTEERS),
                "active_dispatches_count": len(_IN_MEMORY_DISPATCHES),
            },
        )
    except Exception as exc:
        logger.warning("Failed to send initial sync to WS client: {}", exc)

    try:
        while True:
            # Listen for client heartbeat or commands
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                cmd = msg.get("action")
                if cmd == "PING":
                    await ws_manager.send_personal(websocket, "PONG", {"status": "alive"})
                elif cmd == "SUBSCRIBE_INCIDENT":
                    inc_id = msg.get("incident_id")
                    await ws_manager.send_personal(
                        websocket, "SUBSCRIBED", {"incident_id": inc_id, "status": "active"}
                    )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.error("WebSocket runtime error: {}", exc)
        ws_manager.disconnect(websocket)
