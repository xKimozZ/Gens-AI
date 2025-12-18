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
        
        # Get desired test count
        desired_count = request.get("desired_test_count", 12)
        
        result = agent_instance.design_tests(exploration, desired_count)
        
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
        import time
        start = time.time()
        
        # Build context-aware prompt WITHOUT tool calling
        import json
        context = message.context
        test_cases = context.get('test_cases', [])
        elements = context.get('elements', [])
        structure = context.get('structure', '')
        
        # Format elements for AI
        elements_summary = "\n".join([f"- {el.get('tag', 'element')} (id='{el.get('id', '')}', text='{el.get('text', '')[:30]}')" 
                                      for el in elements[:20]])
        
        system_prompt = f"""You are a test design assistant with access to page structure.

URL: {context.get('url', 'unknown')}
Page Structure: {structure}
Visible Elements:
{elements_summary}

Current test suite has {len(test_cases)} tests.

When user asks to add/modify/delete tests:
1. Generate/modify the test cases based on available elements
2. Return response in this EXACT format:

<RESPONSE>
Done! I [describe what you did].
</RESPONSE>

<TEST_CASES>
[Return complete JSON array of test cases]
</TEST_CASES>

Each test case must have: id, name, description, steps (array), expected_outcome, priority.
DO NOT use tools or explore URLs."""
        
        user_prompt = f"""Current tests: {json.dumps(test_cases, indent=2)}

User request: {message.message}"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Use model directly, not agent (to avoid tool calling)
        response = agent_instance.model(messages)
        
        # Extract actual content from ChatMessage
        if hasattr(response, 'content'):
            response_text = response.content
        else:
            response_text = str(response)
        
        elapsed = time.time() - start
        
        # Extract token usage from response object
        tokens_used = 0
        try:
            if hasattr(response, 'raw') and hasattr(response.raw, 'usage'):
                usage = response.raw.usage
                tokens_used = getattr(usage, 'total_tokens', 0)
        except:
            tokens_used = len(response_text.split())  # Fallback
        
        # Parse response for structured data
        import re
        response_match = re.search(r'<RESPONSE>(.*?)</RESPONSE>', response_text, re.DOTALL)
        tests_match = re.search(r'<TEST_CASES>(.*?)</TEST_CASES>', response_text, re.DOTALL)
        
        data = {"response": response_text}  # Default to full text
        
        if response_match and tests_match:
            try:
                modified_tests = json.loads(tests_match.group(1).strip())
                data = {
                    "response": response_match.group(1).strip(),
                    "modified_tests": modified_tests
                }
            except json.JSONDecodeError as e:
                print(f"⚠️ Failed to parse test cases: {e}")
                data = {"response": response_text}
        
        return AgentResponse(
            success=True,
            data=data,
            metrics={"phase": "chat", "response_time": elapsed, "tokens_used": tokens_used}
        )
    
    except Exception as e:
        import traceback
        print(f"❌ Chat error: {traceback.format_exc()}")
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


@app.post("/api/generate-code")
async def generate_code(request: Dict[str, Any]) -> AgentResponse:
    """
    Phase 3: Generate Playwright Python code from test cases
    
    Expects test_cases, url, and suite_name in request body.
    """
    try:
        test_cases = request.get("test_cases", [])
        url = request.get("url", "")
        suite_name = request.get("suite_name", "TestSuite")
        elements = request.get("elements", [])
        
        if not test_cases:
            raise HTTPException(status_code=400, detail="No test cases provided")
        
        code = agent_instance.generate_code(test_cases, url, suite_name, elements)
        
        # Get latest metrics
        metrics = agent_instance.get_metrics()[-1] if agent_instance.get_metrics() else {}
        
        return AgentResponse(
            success=True,
            data={"code": code},
            metrics=metrics
        )
    
    except Exception as e:
        import traceback
        print(f"❌ Code generation error: {traceback.format_exc()}")
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


# Static file serving - MUST be last to not override API routes
@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    """Serve CSS/JS files"""
    if file_path in ["style.css", "script.js"]:
        return FileResponse(f"frontend/{file_path}")
    return {"error": "Not found", "path": file_path}


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
