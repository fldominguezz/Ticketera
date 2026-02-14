from typing import List, Dict, Set, Any
from fastapi import WebSocket
import logging
logger = logging.getLogger(__name__)
class ConnectionManager:
    def __init__(self):
        # General active connections
        self.active_connections: List[WebSocket] = []
        # User -> [WebSockets]
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # Room -> {websocket: user_info}
        # Rooms can be "ticket:{uuid}", "dashboard", etc.
        self.rooms: Dict[str, Dict[WebSocket, dict]] = {}
    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        # Remove from all rooms
        self._remove_from_all_rooms(websocket)
    def _remove_from_all_rooms(self, websocket: WebSocket):
        for room_id in list(self.rooms.keys()):
            if websocket in self.rooms[room_id]:
                user_info = self.rooms[room_id].pop(websocket)
                # Notify others in room about departure
                # We need to run this async, but we are in sync method. 
                # Ideally disconnect should be async or managed better.
                # For now, we skip broadcasting departure on disconnect to avoid async/sync issues in this tight loop,
                # or we assume the caller handles logic.
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
    async def join_room(self, room_id: str, websocket: WebSocket, user_info: dict):
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        self.rooms[room_id][websocket] = user_info
        # Notify others in the room
        await self.broadcast_to_room(room_id, {
            "type": "presence",
            "action": "joined",
            "user": user_info,
            "active_users": list(self.rooms[room_id].values())
        }, exclude=websocket)
        # Send current room state to the joiner
        await self.send_personal_message({
            "type": "presence",
            "action": "state",
            "active_users": list(self.rooms[room_id].values())
        }, websocket)
    async def leave_room(self, room_id: str, websocket: WebSocket):
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            user_info = self.rooms[room_id].pop(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
            else:
                # Notify others
                await self.broadcast_to_room(room_id, {
                    "type": "presence",
                    "action": "left",
                    "user": user_info,
                    "active_users": list(self.rooms[room_id].values())
                })
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception:
            pass
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass
    async def broadcast_to_room(self, room_id: str, message: dict, exclude: WebSocket = None):
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass
    async def send_to_user(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass
manager = ConnectionManager()