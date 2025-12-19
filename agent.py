"""
Web Testing Agent - Core Logic
Handles exploration and test design phases using smolagents framework.
LLM is hot-swappable via MODEL_PROVIDER environment variable.

This is the main entry point. The code has been refactored into modules:
- models.py: Data classes (Metrics, ExplorationResult, TestDesignResult)
- core/llm_provider.py: LLM initialization
- core/testing_agent.py: Main TestingAgent class
- tools/page_explorer.py: PageExplorerTool for Playwright
- parsers/test_parser.py: Test case parsing utilities
- generators/code_generator.py: Code generation utilities
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Re-export main classes for backward compatibility
from models import Metrics, ExplorationResult, TestDesignResult
from core.testing_agent import TestingAgent
from tools.page_explorer import PageExplorerTool


# CLI Demo (for testing)
if __name__ == "__main__":
    # Example usage
    provider = os.getenv("MODEL_PROVIDER", "huggingface")
    agent = TestingAgent(model_provider=provider)
    
    # Test workflow
    url = "https://demo.playwright.dev/todomvc"
    exploration = agent.explore_page(url)
    test_design = agent.design_tests(exploration)
    
    print("\n📊 METRICS:")
    for metric in agent.get_metrics():
        print(f"  {metric['phase']}: {metric['response_time']:.2f}s")
    
    print(f"\n🎯 Generated {len(test_design.test_cases)} test cases")
