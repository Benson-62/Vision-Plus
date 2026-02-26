import json
from typing import Dict, Any
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user email to a list of active WebSocket connections (for multi-tab/device)
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, email: str):
        if email not in self.active_connections:
            self.active_connections[email] = []
        self.active_connections[email].append(websocket)
        logger.info(f"User {email} connected. Connections for user: {len(self.active_connections[email])}")

    def disconnect(self, websocket: WebSocket, email: str):
        if email in self.active_connections:
            if websocket in self.active_connections[email]:
                self.active_connections[email].remove(websocket)
            if len(self.active_connections[email]) == 0:
                del self.active_connections[email]
            logger.info(f"User {email} disconnected.")

    async def send_personal_message(self, message_data: dict, email: str):
        if email in self.active_connections:
            dead_sockets = []
            sent_at_least_one = False
            for ws in self.active_connections[email]:
                try:
                    await ws.send_json(message_data)
                    sent_at_least_one = True
                except Exception as e:
                    logger.error(f"Failed to send personal message to a websocket of {email}: {e}")
                    dead_sockets.append(ws)
            
            for ws in dead_sockets:
                self.disconnect(ws, email)
                
            return sent_at_least_one
        return False

    async def broadcast(self, message_data: dict):
        """Send a JSON message to all connected users."""
        for email, sockets in self.active_connections.items():
            dead_sockets = []
            for ws in sockets:
                try:
                    await ws.send_json(message_data)
                except Exception as e:
                    logger.error(f"Failed to broadcast to a {email} tab: {e}")
                    dead_sockets.append(ws)
                    
            for ws in dead_sockets:
                self.disconnect(ws, email)

manager = ConnectionManager()

from .db import notifications_collection
from datetime import datetime

async def send_system_notification(email: str, title: str, message: str):
    """Utility to instantly store and push a system notification to a user."""
    notif_doc = {
        "user_email": email,
        "title": title,
        "message": message,
        "type": "system",
        "read": False,
        "timestamp": datetime.utcnow().isoformat()
    }
    res = notifications_collection.insert_one(notif_doc)
    notif_doc["_id"] = str(res.inserted_id)
    await manager.send_personal_message(notif_doc, email)
