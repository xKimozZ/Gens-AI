"""
Exploration API endpoints (Phase 1).
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ExploreRequest(BaseModel):
    session_id: str
    url: str
    strategy: Optional[str] = "comprehensive"


@router.post("/explore")
async def explore_page(request: ExploreRequest):
    """
    Trigger page exploration.
    
    TODO: Call orchestrator.phase1_explore()
    TODO: Return structured representation
    """
    # TODO: Implement
    return {"status": "exploring", "url": request.url}


@router.get("/representation/{session_id}")
async def get_representation(session_id: str):
    """
    Get structured representation for session.
    
    TODO: Retrieve from context
    TODO: Return representation
    """
    # TODO: Implement
    return {"representation": None}
