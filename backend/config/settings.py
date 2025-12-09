"""
Configuration settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings with defaults.
    TODO: Add validation for required fields
    """
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./storage/qa_agent.db"
    
    # Browser Runner Configuration
    BROWSER_RUNNER_HOST: str = "localhost"
    BROWSER_RUNNER_PORT: int = 8001
    BROWSER_RUNNER_PROTOCOL: str = "ws"
    
    # LLM Configuration
    LLM_PROVIDER: str = "local"
    LLM_MODEL: str = "llama2"
    LLM_API_URL: str = "http://localhost:11434"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2048
    
    # Embedding Model Configuration
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # Storage Paths
    STORAGE_ROOT: str = "./storage"
    KNOWLEDGE_BASE_PATH: str = "./storage/knowledge_base"
    VISUAL_SIGNATURES_PATH: str = "./storage/visual_signatures"
    VERSIONS_PATH: str = "./storage/versions"
    METRICS_PATH: str = "./storage/metrics"
    
    # Generated Tests Output
    GENERATED_TESTS_PATH: str = "./generated_tests"
    GENERATED_PAGES_PATH: str = "./generated_tests/pages"
    GENERATED_FEATURES_PATH: str = "./generated_tests/features"
    GENERATED_TESTS_PATH_PYTEST: str = "./generated_tests/tests"
    
    # Safety & Guardrails
    ENABLE_GUARDRAILS: bool = True
    BLOCKED_KEYWORDS: List[str] = ["delete", "remove", "drop", "truncate", "system", "os", "subprocess"]
    
    # Metrics & Observability
    ENABLE_METRICS: bool = True
    METRICS_INTERVAL_SECONDS: int = 60
    
    # Parallel Agents Configuration
    ENABLE_PARALLEL_AGENTS: bool = False
    MAX_PARALLEL_AGENTS: int = 3
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/backend.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
