"""
Web Testing Agent - Core Logic
Handles exploration and test design phases using smolagents framework.
LLM is hot-swappable via MODEL_PROVIDER environment variable.
"""

import os
import json
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor

from smolagents import (
    Tool,
    CodeAgent,
    ToolCallingAgent,
)
from playwright.async_api import async_playwright


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
    
    def __init__(self):
        super().__init__()
        self.last_result = None  # Cache last exploration result
    
    def forward(self, url: str) -> str:
        """Execute page exploration"""
        # Run async code in a separate thread to avoid event loop conflicts
        def run_in_thread():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self._async_forward(url))
            finally:
                loop.close()
        
        with ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            try:
                return future.result(timeout=60)  # 60 second timeout
            except TimeoutError:
                return json.dumps({"error": "Page exploration timed out after 60 seconds"})
    
    async def _async_forward(self, url: str) -> str:
        """Async implementation of page exploration"""
        print(f"[PageExplorer] Starting exploration of {url}")
        
        try:
            async with async_playwright() as p:
                print(f"[PageExplorer] Launching browser...")
                browser = await p.chromium.launch(headless=False)
                page = await browser.new_page()
                print(f"[PageExplorer] Browser launched, navigating...")
                
                # Set page timeout to 30 seconds
                page.set_default_timeout(30000)
                
                # Navigate with timeout
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                print(f"[PageExplorer] Navigation complete, extracting elements...")
                
                # Extract comprehensive page data
                elements = await self._extract_elements(page)
                print(f"[PageExplorer] Extracted {len(elements)} elements, analyzing structure...")
                
                structure = await self._analyze_structure(page)
                print(f"[PageExplorer] Structure analyzed, closing browser...")
                
                result = {
                    "url": url,
                    "title": await page.title(),
                    "elements": elements,
                    "page_structure": structure
                }
                
                # Cache result for later access
                self.last_result = result
                
                print(f"[PageExplorer] Returning results (browser will auto-close)")
                return json.dumps(result, indent=2)
                
        except asyncio.TimeoutError as e:
            print(f"[PageExplorer] Timeout error: {str(e)}")
            return json.dumps({"error": f"Page load timed out: {str(e)}"})
        except Exception as e:
            print(f"[PageExplorer] Error occurred: {str(e)}")
            import traceback
            traceback.print_exc()
            return json.dumps({"error": f"Error during exploration: {str(e)}"})
    
    async def _extract_elements(self, page) -> List[Dict]:
        """Extract interactive elements with smart locators"""
        elements = []
        
        # Get all interactive elements (reduced for speed)
        interactive_selectors = [
            "button", "a", "input"
        ]
        
        for selector in interactive_selectors:
            try:
                els = await page.query_selector_all(selector)
                for el in els[:20]:  # Reduced to 20 elements per type for speed
                    try:
                        # Get text content once with timeout
                        text_content = await asyncio.wait_for(el.inner_text(), timeout=1.0)
                        
                        element_data = {
                            "tag": await el.evaluate("el => el.tagName.toLowerCase()"),
                            "text": text_content[:100] if text_content else "",
                            "type": await el.get_attribute("type") or "",
                            "id": await el.get_attribute("id") or "",
                            "name": await el.get_attribute("name") or "",
                            "visible": await el.is_visible(),
                        }
                        elements.append(element_data)
                    except (asyncio.TimeoutError, Exception):
                        continue
            except Exception:
                continue
        
        return elements
    
    async def _determine_best_locator(self, element) -> str:
        """Determine the most reliable locator for an element"""
        # Priority: testid > id > name > aria-label > text > css
        test_id = await element.get_attribute("data-testid")
        if test_id:
            return f"[data-testid='{test_id}']"
        
        elem_id = await element.get_attribute("id")
        if elem_id:
            return f"#{elem_id}"
        
        name = await element.get_attribute("name")
        if name:
            return f"[name='{name}']"
        
        aria_label = await element.get_attribute("aria-label")
        if aria_label:
            return f"[aria-label='{aria_label}']"
        
        try:
            text_content = await element.inner_text()
            if text_content:
                text = text_content[:30]
                return f"text='{text}'"
        except:
            pass
        
        return "css=unknown"
    
    async def _analyze_structure(self, page) -> str:
        """Analyze high-level page structure"""
        return await page.evaluate("""
            () => {
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
            }
        """)


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
            # Works with OpenAI API or compatible endpoints
            from smolagents import OpenAIServerModel
            return OpenAIServerModel(
                model_id=os.getenv("MODEL_NAME", "gpt-4o-mini"),
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
        
        # Run agent - catch errors since we only need tool output
        try:
            result = self.agent.run(prompt)
        except Exception as e:
            print(f"⚠️ Agent run had an error (this is OK, we have the tool output): {str(e)[:100]}")
            result = None
        
        # Extract metrics
        elapsed = time.time() - start_time
        metrics = Metrics(
            phase="exploration",
            tokens_used=0,  # TODO: Add token counting wrapper
            response_time=elapsed,
            timestamp=datetime.now().isoformat()
        )
        
        self.metrics_log.append(asdict(metrics))
        
        # Parse tool output from agent's step logs
        # The page_explorer tool returns complete JSON regardless of agent completion
        tool_output = None
        
        # Debug: Check agent structure
        print(f"[DEBUG] Agent has step_logs: {hasattr(self.agent, 'step_logs')}")
        if hasattr(self.agent, 'step_logs'):
            print(f"[DEBUG] step_logs is None: {self.agent.step_logs is None}")
            if self.agent.step_logs is not None:
                print(f"[DEBUG] step_logs length: {len(self.agent.step_logs)}")
        
        # Try multiple parsing strategies
        if hasattr(self.agent, 'step_logs') and self.agent.step_logs:
            print(f"[DEBUG] Found {len(self.agent.step_logs)} step logs")
            for i, step in enumerate(self.agent.step_logs):
                print(f"[DEBUG] Step {i} type: {type(step).__name__}")
                
                # Strategy 1: Check for tool_calls attribute
                if hasattr(step, 'tool_calls') and step.tool_calls:
                    print(f"[DEBUG] Step {i} has {len(step.tool_calls)} tool calls")
                    for j, tool_call in enumerate(step.tool_calls):
                        if hasattr(tool_call, '__dict__'):
                            print(f"[DEBUG] Tool call {j} dict: {list(tool_call.__dict__.keys())}")
                        tool_name = getattr(tool_call, 'name', getattr(tool_call, 'tool_name', None))
                        print(f"[DEBUG] Tool call {j} name: {tool_name}")
                        
                        if tool_name == 'page_explorer':
                            obs = getattr(tool_call, 'observations', getattr(tool_call, 'output', None))
                            if obs:
                                print(f"[DEBUG] Found observations, length: {len(str(obs))}")
                                try:
                                    tool_output = json.loads(obs)
                                    print(f"✓ Extracted {len(tool_output.get('elements', []))} elements from tool output")
                                    break
                                except Exception as e:
                                    print(f"⚠️ Failed to parse: {e}")
                
                # Strategy 2: Check if step itself is a dict
                if isinstance(step, dict):
                    print(f"[DEBUG] Step {i} is dict with keys: {list(step.keys())}")
                    if 'tool_calls' in step:
                        for tool_call in step['tool_calls']:
                            if tool_call.get('name') == 'page_explorer' or tool_call.get('tool_name') == 'page_explorer':
                                obs = tool_call.get('observations') or tool_call.get('output')
                                if obs:
                                    try:
                                        tool_output = json.loads(obs)
                                        print(f"✓ Extracted {len(tool_output.get('elements', []))} elements")
                                        break
                                    except Exception as e:
                                        print(f"⚠️ Parse failed: {e}")
                
                if tool_output:
                    break
        
        # Strategy 3: Access tool's cached result directly
        if not tool_output and hasattr(self.explorer_tool, 'last_result') and self.explorer_tool.last_result:
            tool_output = self.explorer_tool.last_result
            print(f"✓ Retrieved cached result from tool with {len(tool_output.get('elements', []))} elements")
        
        # Parse exploration data
        if tool_output and "url" in tool_output:
            exploration_data = {
                "url": tool_output.get("url", url),
                "title": tool_output.get("title", "Unknown"),
                "elements": tool_output.get("elements", []),
                "structure": tool_output.get("page_structure", "{}"),
                "metrics": metrics
            }
        else:
            print(f"⚠️ Could not extract tool output, using fallback")
            exploration_data = {
                "url": url,
                "title": "Explored Page",
                "elements": [],
                "structure": str(result) if result else "No data available",
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
