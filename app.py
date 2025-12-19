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

# Mount static files for serving test evidence (screenshots, videos)
TESTS_DIR = os.path.join(os.path.dirname(__file__), "tests")
EVIDENCE_DIR = os.path.join(TESTS_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=EVIDENCE_DIR), name="evidence")


@app.get("/api/evidence/{run_id}/{file_type}/{filename}")
async def get_evidence_file(run_id: str, file_type: str, filename: str):
    """Serve evidence files (screenshots, videos, logs) for test runs."""
    file_path = os.path.join(EVIDENCE_DIR, run_id, file_type, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Evidence file not found")


@app.get("/api/evidence/latest")
async def get_latest_evidence():
    """Get list of evidence from the most recent test run."""
    import glob
    import json
    
    run_dirs = sorted(glob.glob(os.path.join(EVIDENCE_DIR, "run_*")), reverse=True)
    if not run_dirs:
        return {"success": True, "data": {"runs": []}}
    
    latest_run = run_dirs[0]
    run_id = os.path.basename(latest_run)
    
    evidence = {
        "run_id": run_id,
        "screenshots": [],
        "videos": [],
        "action_logs": []
    }
    
    # Collect screenshots
    screenshots_dir = os.path.join(latest_run, "screenshots")
    if os.path.exists(screenshots_dir):
        for f in glob.glob(os.path.join(screenshots_dir, "*.png")):
            evidence["screenshots"].append({
                "name": os.path.basename(f),
                "url": f"/api/evidence/{run_id}/screenshots/{os.path.basename(f)}"
            })
    
    # Collect videos
    videos_dir = os.path.join(latest_run, "videos")
    if os.path.exists(videos_dir):
        for f in glob.glob(os.path.join(videos_dir, "*.webm")):
            evidence["videos"].append({
                "name": os.path.basename(f),
                "url": f"/api/evidence/{run_id}/videos/{os.path.basename(f)}"
            })
    
    # Collect action logs
    logs_dir = os.path.join(latest_run, "logs")
    if os.path.exists(logs_dir):
        for f in glob.glob(os.path.join(logs_dir, "*.json")):
            evidence["action_logs"].append({
                "name": os.path.basename(f),
                "url": f"/api/evidence/{run_id}/logs/{os.path.basename(f)}"
            })
    
    return {"success": True, "data": evidence}


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
    
    Expects test_cases, url, suite_name, and optional custom_instructions in request body.
    Optional: run_tests (bool) to enable actual test execution for verification.
    """
    try:
        test_cases = request.get("test_cases", [])
        url = request.get("url", "")
        suite_name = request.get("suite_name", "TestSuite")
        elements = request.get("elements", [])
        custom_instructions = request.get("custom_instructions", "")
        run_tests = request.get("run_tests", False)  # Enable test execution
        headless = request.get("headless", True)  # Headless browser mode
        
        # Debug logging
        print(f"[DEBUG] /api/generate-code received run_tests={run_tests} (type: {type(run_tests).__name__})")
        print(f"[DEBUG] Full request keys: {list(request.keys())}")
        
        if not test_cases:
            raise HTTPException(status_code=400, detail="No test cases provided")
        
        result = agent_instance.generate_code(
            test_cases, 
            url, 
            suite_name, 
            elements, 
            custom_instructions,
            use_llm=True,
            run_tests=run_tests,
            headless=headless
        )
        
        # Extract code from result dict
        code = result.get("code", "") if isinstance(result, dict) else result
        execution_log = result.get("execution_log") if isinstance(result, dict) else None
        
        # Get latest metrics
        metrics = agent_instance.get_metrics()[-1] if agent_instance.get_metrics() else {}
        
        # Build response data
        response_data = {"code": code}
        
        # Add execution log if available
        if execution_log:
            # Extract run_id from evidence_dir path
            evidence_run_id = None
            if execution_log.evidence_dir:
                evidence_run_id = os.path.basename(execution_log.evidence_dir)
            
            response_data["execution_log"] = {
                "total_tests": execution_log.total_tests,
                "passed": execution_log.passed,
                "failed": execution_log.failed,
                "errors": execution_log.errors,
                "duration": execution_log.duration,
                "all_passed": execution_log.all_passed,
                "success_rate": execution_log.success_rate,
                "evidence_run_id": evidence_run_id,
                "test_results": [
                    {
                        "test_name": r.test_name,
                        "passed": r.passed,
                        "duration": r.duration,
                        "error_message": r.error_message,
                        "error_type": r.error_type,
                        "line_number": r.line_number,
                        "screenshot_url": f"/api/evidence/{evidence_run_id}/screenshots/{os.path.basename(r.screenshot_path)}" if r.screenshot_path and evidence_run_id else None,
                        "video_url": f"/api/evidence/{evidence_run_id}/videos/{os.path.basename(r.video_path)}" if r.video_path and evidence_run_id else None,
                        "action_log_url": f"/api/evidence/{evidence_run_id}/logs/{os.path.basename(r.action_log_path)}" if r.action_log_path and evidence_run_id else None,
                    }
                    for r in execution_log.test_results
                ],
                "screenshots": [
                    f"/api/evidence/{evidence_run_id}/screenshots/{os.path.basename(s)}" 
                    for s in execution_log.screenshots
                ] if evidence_run_id else [],
                "videos": [
                    f"/api/evidence/{evidence_run_id}/videos/{os.path.basename(v)}" 
                    for v in execution_log.videos
                ] if evidence_run_id else [],
                "summary": str(execution_log)
            }
        
        return AgentResponse(
            success=True,
            data=response_data,
            metrics=metrics
        )
    
    except Exception as e:
        import traceback
        print(f"❌ Code generation error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/review-tests")
async def review_tests(request: Dict[str, Any]) -> AgentResponse:
    """
    Phase 4: Review test execution and refactor based on critique.
    
    Expects:
        - code: Current test code
        - execution_log: Results from test run
        - critique: User's feedback/critique
        - action: 'analyze', 'refactor', or 'explain'
    """
    try:
        code = request.get("code", "")
        execution_log = request.get("execution_log", {})
        critique = request.get("critique", "")
        action = request.get("action", "analyze")
        
        if not code:
            raise HTTPException(status_code=400, detail="No code provided")
        
        # Build context for the LLM
        test_results_summary = ""
        if execution_log:
            test_results_summary = f"""
Test Execution Summary:
- Total: {execution_log.get('total_tests', 0)} tests
- Passed: {execution_log.get('passed', 0)}
- Failed: {execution_log.get('failed', 0)}
- Errors: {execution_log.get('errors', 0)}
- Success Rate: {execution_log.get('success_rate', 0):.1f}%

Test Results:
"""
            for r in execution_log.get('test_results', []):
                status = "✅ PASSED" if r.get('passed') else "❌ FAILED"
                test_results_summary += f"  {status}: {r.get('test_name')}\n"
                if not r.get('passed') and r.get('error_message'):
                    test_results_summary += f"    Error: {r.get('error_type')}: {r.get('error_message')[:200]}\n"
        
        # Build prompt based on action
        if action == "analyze":
            prompt = f"""Analyze the following test execution results and provide insights:

{test_results_summary}

User Critique/Question:
{critique}

Provide a detailed analysis including:
1. What tests are failing and why
2. Potential root causes
3. Suggestions for improvement
4. Any patterns in the failures"""

        elif action == "refactor":
            prompt = f"""Refactor the following test code based on the execution results and user feedback:

Current Code:
```python
{code[:5000]}
```

{test_results_summary}

User Feedback:
{critique}

Requirements:
1. Fix the failing tests based on the error messages
2. Address the user's feedback
3. Improve locator reliability if needed
4. Add better error handling
5. Return ONLY the complete refactored Python code, no explanations"""

        elif action == "explain":
            prompt = f"""Explain the test execution results in simple terms:

{test_results_summary}

User Question:
{critique}

Provide a clear, user-friendly explanation of:
1. What happened during the test run
2. Why certain tests might have failed
3. What the error messages mean
4. Recommended next steps"""
        
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
        
        # Call LLM for analysis/refactoring
        from core.llm_provider import init_model
        model = init_model("openai")
        
        messages = [
            {"role": "system", "content": "You are an expert test automation engineer helping users understand and improve their Playwright tests."},
            {"role": "user", "content": prompt}
        ]
        
        result = model(messages)
        
        # Extract response content
        response_text = ""
        if hasattr(result, 'content'):
            response_text = result.content
        elif isinstance(result, dict):
            response_text = result.get('content') or result.get('text', '')
        else:
            response_text = str(result)
        
        return AgentResponse(
            success=True,
            data={
                "action": action,
                "response": response_text,
                "refactored_code": response_text if action == "refactor" else None
            },
            metrics={}
        )
    
    except Exception as e:
        import traceback
        print(f"❌ Review error: {traceback.format_exc()}")
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


# Mount static files directory with proper MIME types
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
