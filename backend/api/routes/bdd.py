"""
BDD Generation API endpoints (Phase 3).
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class BDDGenerateRequest(BaseModel):
    session_id: str
    feature_name: str
    existing_features_dir: Optional[str] = None


@router.post("/generate")
async def generate_bdd(request: BDDGenerateRequest):
    """
    Generate BDD feature file.
    
    TODO: Call orchestrator.phase3_generate_bdd()
    TODO: Return feature
    """
    # TODO: Implement
    return {"feature": None}


@router.get("/existing-steps")
async def get_existing_steps(features_dir: str):
    """
    Get existing steps from feature files.
    
    TODO: Analyze existing features
    TODO: Return step library
    """
    # TODO: Implement
    return {"steps": []}
