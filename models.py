"""
Data Models for Web Testing Agent
Contains all dataclasses used across the application.
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Any


@dataclass
class Metrics:
    """Track metrics per phase"""
    phase: str
    tokens_used: int
    response_time: float
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class ExplorationResult:
    """Structured output from exploration phase"""
    url: str
    title: str
    elements: List[Dict[str, Any]]
    structure: str
    metrics: Metrics

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "url": self.url,
            "title": self.title,
            "elements": self.elements,
            "structure": self.structure,
            "metrics": self.metrics.to_dict()
        }


@dataclass
class TestDesignResult:
    """Structured output from test design phase"""
    test_cases: List[Dict[str, Any]]
    coverage_score: float
    metrics: Metrics

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "test_cases": self.test_cases,
            "coverage_score": self.coverage_score,
            "metrics": self.metrics.to_dict()
        }
