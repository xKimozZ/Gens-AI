"""
Test Design API endpoints (Phase 2).
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class DesignRequest(BaseModel):
    session_id: str
    requirements: Optional[List[str]] = None


class RefineRequest(BaseModel):
    session_id: str
    feedback: str


@router.post("/generate")
async def generate_test_cases(request: DesignRequest):
    """
    Generate test cases.
    
    TODO: Call orchestrator.phase2_design_tests()
    TODO: Return test cases and coverage map
    """
    # TODO: Implement
    return {"test_cases": [], "coverage_map": None}


@router.post("/refine")
async def refine_test_cases(request: RefineRequest):
    """
    Refine test cases based on feedback.
    
    TODO: Get current test cases
    TODO: Call designer.refine_test_cases()
    TODO: Return updated test cases
    """
    # TODO: Implement
    return {"test_cases": []}


@router.get("/coverage/{session_id}")
async def get_coverage_map(session_id: str):
    """
    Get coverage visualization.
    
    TODO: Get coverage map from context
    TODO: Return annotated screenshot
    """
    # TODO: Implement
    return {"coverage_map": None}
