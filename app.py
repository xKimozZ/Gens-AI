"""
FastAPI Backend - Web Testing Agent API
Exposes agent functionality via REST endpoints.
"""

import os
from typing import Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agent import TestingAgent


# Request/Response Models
class ExploreRequest(BaseModel):
    url: str


class ChatMessage(BaseModel):
    message: str
    context: Dict[str, Any] = {}


class AgentResponse(BaseModel):
    success: bool
    data: Any
    metrics: Dict[str, Any]


# Global agent instance
agent_instance = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize agent on startup"""
    global agent_instance
    
    model_provider = os.getenv("MODEL_PROVIDER", "huggingface")
    print(f"🚀 Initializing agent with provider: {model_provider}")
    
    agent_instance = TestingAgent(model_provider=model_provider)
    
    yield
    
    print("🛑 Shutting down agent")


# FastAPI App
app = FastAPI(
    title="Web Testing Agent API",
    description="AI-powered web testing assistant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Serve frontend"""
    return FileResponse("frontend/index.html")


@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    """Serve CSS/JS files"""
    if file_path in ["style.css", "script.js"]:
        return FileResponse(f"frontend/{file_path}")
    return {"error": "Not found"}


@app.post("/api/explore")
async def explore_page(request: ExploreRequest) -> AgentResponse:
    """
    Phase 1: Explore a web page
    
    Returns structured page data and metrics.
    """
    try:
        result = agent_instance.explore_page(request.url)
        
        return AgentResponse(
            success=True,
            data={
                "url": result.url,
                "title": result.title,
                "elements": result.elements,
                "structure": result.structure
            },
            metrics={
                "phase": result.metrics.phase,
                "response_time": result.metrics.response_time,
                "tokens_used": result.metrics.tokens_used
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/design-tests")
async def design_tests(request: Dict[str, Any]) -> AgentResponse:
    """
    Phase 2: Design test cases based on exploration
    
    Expects exploration data in request body.
    """
    try:
        # Reconstruct exploration result from request
        from agent import ExplorationResult, Metrics
        
        exploration = ExplorationResult(
            url=request.get("url", ""),
            title=request.get("title", ""),
            elements=request.get("elements", []),
            structure=request.get("structure", ""),
            metrics=Metrics(phase="exploration", tokens_used=0, 
                          response_time=0, timestamp="")
        )
        
        result = agent_instance.design_tests(exploration)
        
        return AgentResponse(
            success=True,
            data={
                "test_cases": result.test_cases,
                "coverage_score": result.coverage_score
            },
            metrics={
                "phase": result.metrics.phase,
                "response_time": result.metrics.response_time,
                "tokens_used": result.metrics.tokens_used
            }
        )
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error in design_tests: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(message: ChatMessage) -> AgentResponse:
    """
    General chat endpoint for human-in-the-loop interaction
    
    Can handle follow-up questions or refinement requests.
    """
    try:
        # Use agent to process message
        response = agent_instance.agent.run(message.message)
        
        return AgentResponse(
            success=True,
            data={"response": str(response)},
            metrics={"phase": "chat", "response_time": 0, "tokens_used": 0}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics")
async def get_metrics():
    """
    Get all collected metrics
    
    Returns per-phase timing and token usage.
    """
    try:
        metrics = agent_instance.get_metrics()
        
        # Calculate aggregates
        total_time = sum(m["response_time"] for m in metrics)
        total_tokens = sum(m["tokens_used"] for m in metrics)
        
        return {
            "success": True,
            "data": {
                "per_phase": metrics,
                "totals": {
                    "total_response_time": total_time,
                    "total_tokens": total_tokens,
                    "avg_response_time": total_time / len(metrics) if metrics else 0
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reset")
async def reset_agent():
    """Reset agent state"""
    try:
        agent_instance.reset()
        return {"success": True, "message": "Agent reset complete"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_provider": os.getenv("MODEL_PROVIDER", "huggingface")
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
