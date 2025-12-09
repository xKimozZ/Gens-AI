"""
WebSocket connection manager for real-time communication with frontend.
"""

from typing import List
from fastapi import WebSocket


class WebSocketManager:
    """
    Manage WebSocket connections.
    TODO: Implement connection pooling and broadcasting
    """
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        """
        Accept new WebSocket connection.
        
        TODO: Accept connection
        TODO: Add to active connections
        TODO: Send welcome message
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        """
        Remove WebSocket connection.
        
        TODO: Remove from active connections
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send message to specific client.
        
        TODO: Send JSON message to websocket
        """
        await websocket.send_json(message)
        
    async def broadcast(self, message: dict):
        """
        Broadcast message to all connected clients.
        
        TODO: Send to all active connections
        """
        for connection in self.active_connections:
            await connection.send_json(message)
            
    async def send_progress_update(self, phase: str, progress: int, message: str):
        """
        Send progress update to all clients.
        
        TODO: Format progress message
        TODO: Broadcast to all clients
        """
        await self.broadcast({
            "type": "progress",
            "phase": phase,
            "progress": progress,
            "message": message
        })
        
    async def send_error(self, error: str, websocket: WebSocket = None):
        """
        Send error message.
        
        TODO: If websocket specified, send to that client
        TODO: Otherwise broadcast
        """
        message = {"type": "error", "message": error}
        if websocket:
            await self.send_personal_message(message, websocket)
        else:
            await self.broadcast(message)
