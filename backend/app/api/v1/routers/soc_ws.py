from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from app.core.ws_manager import manager
from app.core.security import decode_token
import logging
import json
logger = logging.getLogger(__name__)
router = APIRouter()
@router.websocket("/ws/soc")
async def soc_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None)
):
    logger.info(f"WS Handshake attempt from {websocket.client}. Token present: {bool(token)}")
    user_info = {"id": "anonymous", "name": "Anonymous", "role": "viewer"}
    if token:
        payload = decode_token(token)
        if payload and "sub" in payload:
            user_info["id"] = payload["sub"]
            user_info["name"] = payload.get("email", payload["sub"])
        else:
            logger.warning(f"WS Handshake: Invalid token from {websocket.client}")
    await manager.connect(websocket, user_info["id"])
    logger.info(f"WS connection established for user: {user_info['id']}")
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            action = data.get("action")
            room = data.get("room")
            if action == "join" and room:
                await manager.join_room(room, websocket, user_info)
            elif action == "leave" and room:
                await manager.leave_room(room, websocket)
            elif action == "typing" and room:
                # Broadcast typing status to room (exclude self)
                await manager.broadcast_to_room(room, {
                    "type": "typing",
                    "user": user_info,
                    "is_typing": data.get("is_typing", False)
                }, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_info["id"])
        logger.info(f"Client {user_info['id']} disconnected from SOC WS")
    except Exception as e:
        manager.disconnect(websocket, user_info["id"])
        logger.error(f"WS error for {user_info['id']}: {e}")