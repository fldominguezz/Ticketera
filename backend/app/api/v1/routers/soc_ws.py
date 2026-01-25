from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.ws_manager import manager
from app.core.security import decode_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/soc")
async def soc_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None)
):
    user_id = "anonymous"
    if token:
        payload = decode_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            
    await manager.connect(websocket, user_id)
    logger.info(f"Client {user_id} connected to SOC WS")
    try:
        while True:
            # We can receive ping or small messages if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"Client {user_id} disconnected from SOC WS")
