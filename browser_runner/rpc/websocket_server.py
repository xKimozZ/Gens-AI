"""
WebSocket RPC server for browser runner.
"""

from aiohttp import web, WSMsgType
import json
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class WebSocketServer:
    """
    WebSocket server for RPC communication with backend.
    """
    
    def __init__(self, browser_service):
        """
        Initialize WebSocket server.
        
        Args:
            browser_service: Reference to BrowserRunnerService
        """
        self.browser_service = browser_service
        self.connections: Dict[str, web.WebSocketResponse] = {}
        
    def setup_routes(self, app: web.Application):
        """
        Setup WebSocket routes.
        
        TODO: Add WebSocket endpoint
        """
        app.router.add_get('/ws', self.websocket_handler)
        app.router.add_get('/health', self.health_check)
        
    async def health_check(self, request):
        """Health check endpoint"""
        return web.json_response({"status": "healthy", "service": "browser_runner"})
        
    async def websocket_handler(self, request):
        """
        Handle WebSocket connections.
        
        TODO: Accept connection
        TODO: Handle messages
        TODO: Send responses
        """
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        connection_id = id(ws)
        self.connections[connection_id] = ws
        
        logger.info(f"New WebSocket connection: {connection_id}")
        
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    await self.handle_message(ws, msg.data)
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
        finally:
            del self.connections[connection_id]
            logger.info(f"WebSocket connection closed: {connection_id}")
        
        return ws
        
    async def handle_message(self, ws: web.WebSocketResponse, data: str):
        """
        Handle incoming WebSocket message.
        
        TODO: Parse JSON message
        TODO: Route to browser service
        TODO: Send response
        """
        try:
            message = json.loads(data)
            command = message.get("command")
            params = message.get("params", {})
            request_id = message.get("id")
            
            # Process command
            result = await self.browser_service.handle_command(command, params)
            
            # Send response
            response = {
                "id": request_id,
                "result": result
            }
            
            await ws.send_json(response)
            
        except json.JSONDecodeError:
            await ws.send_json({"error": "Invalid JSON"})
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await ws.send_json({"error": str(e)})
            
    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast message to all connections.
        
        TODO: Send to all connected clients
        """
        for ws in self.connections.values():
            await ws.send_json(message)
