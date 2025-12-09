"""
Main FastAPI application entry point.
Orchestrates the entire backend server including API endpoints,
WebSocket connections, and agent coordination.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from contextlib import asynccontextmanager

from api.routes import chat, exploration, test_design, bdd, code_gen, verification, ci_cd, monitoring, maintenance, metrics
from services.websocket_manager import WebSocketManager
from services.agent_orchestrator import AgentOrchestrator
from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for application startup and shutdown.
    TODO: Initialize database, load models, connect to browser runner
    """
    logger.info("🚀 Starting QA Agent Backend Server...")
    
    # TODO: Initialize database connection
    # TODO: Load LLM models
    # TODO: Connect to browser runner RPC
    # TODO: Initialize agent orchestrator
    
    yield
    
    # TODO: Cleanup resources
    logger.info("🛑 Shutting down QA Agent Backend Server...")


app = FastAPI(
    title="QA Agent Backend API",
    description="AI-powered testing agent backend",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
ws_manager = WebSocketManager()

# Agent orchestrator
orchestrator = AgentOrchestrator()


# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(exploration.router, prefix="/api/exploration", tags=["Exploration"])
app.include_router(test_design.router, prefix="/api/test-design", tags=["Test Design"])
app.include_router(bdd.router, prefix="/api/bdd", tags=["BDD Generation"])
app.include_router(code_gen.router, prefix="/api/code-generation", tags=["Code Generation"])
app.include_router(verification.router, prefix="/api/verification", tags=["Verification"])
app.include_router(ci_cd.router, prefix="/api/ci-cd", tags=["CI/CD Integration"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Maintenance"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])


@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "online",
        "service": "QA Agent Backend",
        "version": "0.1.0"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    TODO: Check database, LLM, and browser runner connectivity
    """
    # TODO: Verify all services are healthy
    return {
        "status": "healthy",
        "database": "connected",  # TODO: actual check
        "llm": "connected",  # TODO: actual check
        "browser_runner": "connected"  # TODO: actual check
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time communication with frontend.
    Handles chat messages, progress updates, and live browser feed.
    """
    await ws_manager.connect(websocket)
    
    try:
        while True:
            # TODO: Receive message from frontend
            data = await websocket.receive_json()
            
            # TODO: Route message to appropriate handler
            # TODO: Send response back to frontend
            
            logger.info(f"Received WebSocket message: {data}")
            
            # Placeholder echo response
            await ws_manager.send_personal_message(
                {"type": "echo", "data": data},
                websocket
            )
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
