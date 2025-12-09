"""
Data models for API and database.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PhaseStatus(str, Enum):
    """Status of a phase"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class SessionModel(BaseModel):
    """Session data model"""
    session_id: str
    created_at: datetime
    current_phase: int = 1
    url: Optional[str] = None
    status: PhaseStatus = PhaseStatus.NOT_STARTED
    
    # TODO: Add more session fields


class ElementModel(BaseModel):
    """Element information model"""
    tag: str
    id: Optional[str] = None
    xpath: str
    css_selector: str
    text_content: Optional[str] = None
    role: str
    attributes: Dict[str, str] = Field(default_factory=dict)
    visual_hash: Optional[str] = None
    
    # TODO: Add more fields


class TestCaseModel(BaseModel):
    """Test case model"""
    id: str
    title: str
    description: str
    priority: str
    steps: List[str]
    expected_results: List[str]
    covered_elements: List[str]
    coverage_status: str
    
    # TODO: Add more fields


class MetricsModel(BaseModel):
    """Metrics model"""
    session_id: Optional[str] = None
    phase: Optional[int] = None
    tokens_used: int = 0
    response_time_ms: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # TODO: Add more metrics


# TODO: Add more models for other data structures
