"""
LLM Client for interacting with local or free-tier language models.
Enforces constraint: NO paid APIs.
"""

from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod
import json

from config.settings import settings


class BaseLLMClient(ABC):
    """Base class for LLM clients"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """Generate text from prompt"""
        pass
    
    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        schema: Dict[str, Any],
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate structured JSON output"""
        pass


class OllamaClient(BaseLLMClient):
    """
    Client for local Ollama models.
    TODO: Implement Ollama API integration
    """
    
    def __init__(self, api_url: str, model: str):
        self.api_url = api_url
        self.model = model
        
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """
        Generate text using Ollama.
        
        TODO: POST to {api_url}/api/generate
        TODO: Include prompt, system_prompt, temperature
        TODO: Stream or await response
        TODO: Return generated text
        """
        pass
    
    async def generate_structured(
        self,
        prompt: str,
        schema: Dict[str, Any],
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate JSON output.
        
        TODO: Add JSON schema to prompt
        TODO: Generate response
        TODO: Parse JSON
        TODO: Validate against schema
        TODO: Return parsed JSON
        """
        pass


class HuggingFaceClient(BaseLLMClient):
    """
    Client for Hugging Face models (free tier).
    TODO: Implement HF Inference API integration
    """
    
    def __init__(self, model: str):
        self.model = model
        
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """
        Generate using HF Inference API.
        
        TODO: Call HF Inference API (free tier)
        TODO: Handle rate limits
        TODO: Return generated text
        """
        pass
    
    async def generate_structured(
        self,
        prompt: str,
        schema: Dict[str, Any],
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate JSON output.
        
        TODO: Add JSON schema to prompt
        TODO: Generate response
        TODO: Parse and validate JSON
        TODO: Return parsed JSON
        """
        pass


class LLMClientFactory:
    """Factory to create appropriate LLM client based on configuration"""
    
    @staticmethod
    def create() -> BaseLLMClient:
        """
        Create LLM client based on settings.
        
        TODO: Check settings.LLM_PROVIDER
        TODO: Return appropriate client instance
        """
        provider = settings.LLM_PROVIDER.lower()
        
        if provider == "ollama" or provider == "local":
            return OllamaClient(
                api_url=settings.LLM_API_URL,
                model=settings.LLM_MODEL
            )
        elif provider == "huggingface":
            return HuggingFaceClient(model=settings.LLM_MODEL)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")


class PromptTemplates:
    """Templates for various LLM prompts"""
    
    @staticmethod
    def exploration_analysis_prompt(dom_structure: str, url: str) -> str:
        """Prompt for analyzing page structure during exploration"""
        return f"""
You are analyzing a web page for test automation purposes.

URL: {url}

DOM Structure (simplified):
{dom_structure}

Task: Identify all interactive elements (buttons, inputs, links, etc.) and describe their purpose.

Output format (JSON):
{{
  "elements": [
    {{
      "selector": "...",
      "type": "...",
      "purpose": "..."
    }}
  ]
}}
"""
    
    @staticmethod
    def test_case_generation_prompt(page_description: str) -> str:
        """Prompt for generating test cases"""
        return f"""
You are a QA expert designing test cases.

Page Description:
{page_description}

Task: Generate a comprehensive list of test cases for this page.

Output format (JSON):
{{
  "test_cases": [
    {{
      "title": "...",
      "priority": "high/medium/low",
      "steps": ["..."],
      "expected_result": "..."
    }}
  ]
}}
"""
    
    @staticmethod
    def bdd_generation_prompt(
        test_case: str,
        existing_steps: List[str]
    ) -> str:
        """Prompt for generating BDD scenarios"""
        return f"""
You are writing BDD scenarios in Gherkin format.

Test Case:
{test_case}

Existing Step Definitions (REUSE when possible):
{json.dumps(existing_steps, indent=2)}

Task: Write a Gherkin scenario for this test case, reusing existing steps when applicable.

Output format:
Scenario: <name>
  Given <step>
  When <step>
  Then <step>
"""
    
    @staticmethod
    def code_generation_prompt(
        scenario: str,
        page_objects: List[str]
    ) -> str:
        """Prompt for generating test code"""
        return f"""
You are generating Playwright test code in Python.

BDD Scenario:
{scenario}

Available Page Objects:
{json.dumps(page_objects, indent=2)}

Task: Generate Python test code using pytest and Playwright, following POM pattern.

Generate only the test function code.
"""
    
    @staticmethod
    def healing_prompt(
        old_element: str,
        current_page_elements: List[str]
    ) -> str:
        """Prompt for self-healing"""
        return f"""
You are helping repair a broken test locator.

Old Element (no longer found):
{old_element}

Current Page Elements:
{json.dumps(current_page_elements, indent=2)}

Task: Identify which current element most likely matches the old element.

Output format (JSON):
{{
  "matched_element_index": <index>,
  "confidence": <0.0-1.0>,
  "reasoning": "..."
}}
"""


# TODO: Add more prompt templates for each phase
