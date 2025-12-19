"""
LLM Provider
Hot-swappable LLM initialization for different providers.
"""

import os
from typing import Any


def init_model(provider: str) -> Any:
    """
    Hot-swappable LLM initialization.
    
    Args:
        provider: "huggingface", "openai", or "ollama"
    
    Returns:
        Initialized model instance
    """
    if provider == "openai":
        # Works with OpenAI API or compatible endpoints
        from smolagents import OpenAIServerModel
        return OpenAIServerModel(
            model_id=os.getenv("MODEL_NAME", "gpt-5-mini"),
            api_key=os.getenv("OPENAI_API_KEY"),
            api_base=os.getenv("API_BASE")
        )
    
    elif provider == "huggingface":
        from smolagents import InferenceClientModel
        return InferenceClientModel(
            model_id=os.getenv("MODEL_NAME", "meta-llama/Llama-3.3-70B-Instruct"),
            token=os.getenv("HF_TOKEN")
        )
    
    elif provider == "ollama":
        # Ollama uses OpenAI-compatible API
        from smolagents import OpenAIServerModel
        return OpenAIServerModel(
            model_id=os.getenv("MODEL_NAME", "llama3.2"),
            api_base="http://localhost:11434/v1",
            api_key="ollama"  # Dummy key for local
        )
    
    else:
        raise ValueError(f"Unknown provider: {provider}")
