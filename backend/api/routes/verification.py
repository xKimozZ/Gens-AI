"""
Verification API endpoints (Phase 5).
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class VerifyRequest(BaseModel):
    session_id: str
    test_files: List[str]


@router.post("/execute")
async def execute_tests(request: VerifyRequest):
    """
    Execute tests and collect evidence.
    
    TODO: Call orchestrator.phase5_verify()
    TODO: Return test report
    """
    # TODO: Implement
    return {"report": None}


@router.get("/report/{session_id}")
async def get_test_report(session_id: str):
    """
    Get test execution report.
    
    TODO: Return test report with evidence
    """
    # TODO: Implement
    return {"report": None}


@router.get("/evidence/{test_name}")
async def get_test_evidence(test_name: str):
    """
    Get evidence for specific test.
    
    TODO: Return screenshots, videos, logs
    """
    # TODO: Implement
    return {"evidence": None}
