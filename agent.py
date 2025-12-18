"""
Web Testing Agent - Core Logic
Handles exploration and test design phases using smolagents framework.
LLM is hot-swappable via MODEL_PROVIDER environment variable.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

from smolagents import (
    Tool,
    CodeAgent,
    HfApiModel,
    ToolCallingAgent,
)
from playwright.sync_api import sync_playwright


@dataclass
class Metrics:
    """Track metrics per phase"""
    phase: str
    tokens_used: int
    response_time: float
    timestamp: str


@dataclass
class ExplorationResult:
    """Structured output from exploration phase"""
    url: str
    title: str
    elements: List[Dict[str, Any]]
    structure: str
    metrics: Metrics


@dataclass
class TestDesignResult:
    """Structured output from test design phase"""
    test_cases: List[Dict[str, Any]]
    coverage_score: float
    metrics: Metrics


class PageExplorerTool(Tool):
    """Custom tool for deep page exploration using Playwright"""
    
    name = "page_explorer"
    description = """Explores a web page and extracts detailed information.
    Input: URL as string
    Output: JSON with page structure, elements, and locators"""
    
    inputs = {
        "url": {
            "type": "string",
            "description": "The URL to explore"
        }
    }
    output_type = "string"
    
    def forward(self, url: str) -> str:
        """Execute page exploration"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)  # Visible browser
            page = browser.new_page()
            
            try:
                page.goto(url, wait_until="networkidle")
                
                # Extract comprehensive page data
                result = {
                    "url": url,
                    "title": page.title(),
                    "elements": self._extract_elements(page),
                    "page_structure": self._analyze_structure(page)
                }
                
                browser.close()
                return json.dumps(result, indent=2)
                
            except Exception as e:
                browser.close()
                return json.dumps({"error": str(e)})
    
    def _extract_elements(self, page) -> List[Dict]:
        """Extract interactive elements with smart locators"""
        elements = []
        
        # Get all interactive elements
        interactive_selectors = [
            "button", "a", "input", "select", "textarea",
            "[role='button']", "[onclick]", "[type='submit']"
        ]
        
        for selector in interactive_selectors:
            els = page.query_selector_all(selector)
            for el in els[:50]:  # Limit to 50 elements per type
                try:
                    element_data = {
                        "tag": el.evaluate("el => el.tagName.toLowerCase()"),
                        "text": el.inner_text()[:100] if el.inner_text() else "",
                        "type": el.get_attribute("type") or "",
                        "id": el.get_attribute("id") or "",
                        "class": el.get_attribute("class") or "",
                        "name": el.get_attribute("name") or "",
                        "placeholder": el.get_attribute("placeholder") or "",
                        "aria_label": el.get_attribute("aria-label") or "",
                        "role": el.get_attribute("role") or "",
                        "href": el.get_attribute("href") or "",
                        "visible": el.is_visible(),
                        "locator_strategy": self._determine_best_locator(el)
                    }
                    elements.append(element_data)
                except:
                    continue
        
        return elements
    
    def _determine_best_locator(self, element) -> str:
        """Determine the most reliable locator for an element"""
        # Priority: testid > id > name > aria-label > text > css
        test_id = element.get_attribute("data-testid")
        if test_id:
            return f"[data-testid='{test_id}']"
        
        elem_id = element.get_attribute("id")
        if elem_id:
            return f"#{elem_id}"
        
        name = element.get_attribute("name")
        if name:
            return f"[name='{name}']"
        
        aria_label = element.get_attribute("aria-label")
        if aria_label:
            return f"[aria-label='{aria_label}']"
        
        text = element.inner_text()[:30] if element.inner_text() else None
        if text:
            return f"text='{text}'"
        
        return "css=unknown"
    
    def _analyze_structure(self, page) -> str:
        """Analyze high-level page structure"""
        return page.evaluate("""() => {
            const structure = {
                forms: document.querySelectorAll('form').length,
                buttons: document.querySelectorAll('button').length,
                inputs: document.querySelectorAll('input').length,
                links: document.querySelectorAll('a').length,
                has_nav: !!document.querySelector('nav'),
                has_header: !!document.querySelector('header'),
                has_footer: !!document.querySelector('footer')
            };
            return JSON.stringify(structure);
        }()""")


class TestingAgent:
    """Main agent orchestrator for web testing workflow"""
    
    def __init__(self, model_provider: str = "huggingface"):
        """
        Initialize agent with hot-swappable LLM.
        
        Args:
            model_provider: "huggingface", "openai", or "ollama"
        """
        self.model = self._init_model(model_provider)
        self.explorer_tool = PageExplorerTool()
        
        # Initialize agent with tools
        self.agent = ToolCallingAgent(
            tools=[self.explorer_tool],
            model=self.model,
            max_steps=5
        )
        
        self.metrics_log = []
    
    def _init_model(self, provider: str):
        """Hot-swappable LLM initialization"""
        if provider == "openai":
            # Works with OpenAI API or compatible endpoints (Ollama, etc.)
            from smolagents import OpenAIServerModel
            return OpenAIServerModel(
                model_id=os.getenv("MODEL_NAME", "gpt-4o-mini"),
                api_key=os.getenv("OPENAI_API_KEY"),
                api_base=os.getenv("API_BASE", "https://api.openai.com/v1")
            )
        
        elif provider == "huggingface":
            return HfApiModel(
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
    
    def explore_page(self, url: str) -> ExplorationResult:
        """Phase 1: Explore and understand the page"""
        print(f"\n🔍 PHASE 1: Exploring {url}")
        start_time = time.time()
        
        prompt = f"""Explore the web page at {url} and provide a comprehensive analysis.

Use the page_explorer tool to gather data, then summarize:
1. What is this page about?
2. What are the key interactive elements?
3. What user workflows are possible?

Be specific and detailed."""
        
        # Run agent
        result = self.agent.run(prompt)
        
        # Extract metrics (placeholder - smolagents doesn't expose token count easily)
        elapsed = time.time() - start_time
        metrics = Metrics(
            phase="exploration",
            tokens_used=0,  # TODO: Add token counting wrapper
            response_time=elapsed,
            timestamp=datetime.now().isoformat()
        )
        
        self.metrics_log.append(asdict(metrics))
        
        # Parse exploration data
        exploration_data = {
            "url": url,
            "title": "Explored Page",  # Extract from tool result
            "elements": [],  # Parse from tool output
            "structure": str(result),
            "metrics": metrics
        }
        
        print(f"✅ Exploration complete in {elapsed:.2f}s")
        return ExplorationResult(**exploration_data)
    
    def design_tests(self, exploration: ExplorationResult) -> TestDesignResult:
        """Phase 2: Design test cases based on exploration"""
        print(f"\n📋 PHASE 2: Designing test cases")
        start_time = time.time()
        
        prompt = f"""Based on this page exploration data:

{exploration.structure}

Design a comprehensive test plan. For each test case, specify:
1. Test case name
2. Description
3. Steps to execute
4. Expected outcome
5. Priority (High/Medium/Low)

Generate at least 5-10 test cases that cover the main functionality."""
        
        # Run agent for test design
        result = self.agent.run(prompt)
        
        elapsed = time.time() - start_time
        metrics = Metrics(
            phase="test_design",
            tokens_used=0,  # TODO: Add token counting
            response_time=elapsed,
            timestamp=datetime.now().isoformat()
        )
        
        self.metrics_log.append(asdict(metrics))
        
        # Parse test cases (in real impl, parse structured output)
        test_cases = self._parse_test_cases(str(result))
        
        design_result = TestDesignResult(
            test_cases=test_cases,
            coverage_score=0.0,  # Calculate based on elements covered
            metrics=metrics
        )
        
        print(f"✅ Test design complete in {elapsed:.2f}s")
        print(f"   Generated {len(test_cases)} test cases")
        
        return design_result
    
    def _parse_test_cases(self, llm_output: str) -> List[Dict]:
        """Parse test cases from LLM output"""
        # Simple parsing - in production, use structured output
        test_cases = []
        
        # This is a placeholder - enhance with better parsing
        lines = llm_output.split('\n')
        for i, line in enumerate(lines):
            if 'test' in line.lower() and i < 10:  # Simple heuristic
                test_cases.append({
                    "id": i + 1,
                    "name": line.strip(),
                    "description": "Auto-generated test case",
                    "steps": [],
                    "expected": "Should complete successfully",
                    "priority": "Medium"
                })
        
        return test_cases if test_cases else [
            {"id": 1, "name": "Sample Test", "description": "Placeholder", 
             "steps": [], "expected": "Pass", "priority": "High"}
        ]
    
    def get_metrics(self) -> List[Dict]:
        """Return all collected metrics"""
        return self.metrics_log
    
    def reset(self):
        """Reset agent state"""
        self.metrics_log = []
        print("🔄 Agent reset complete")


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
