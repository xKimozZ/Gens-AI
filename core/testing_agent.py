"""
Testing Agent
Main agent orchestrator for web testing workflow.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import asdict

from smolagents import ToolCallingAgent

from models import Metrics, ExplorationResult, TestDesignResult
from core.llm_provider import init_model
from tools.page_explorer import PageExplorerTool
from parsers.test_parser import (
    parse_test_cases,
    summarize_elements_detailed,
    calculate_coverage
)
from generators.code_generator import (
    generate_code,
    generate_code_with_llm,
    apply_custom_instructions,
    LocatorAnalyzer,
    CodeValidator,
    CodeRunner,
    TestExecutionLog
)


class TestingAgent:
    """Main agent orchestrator for web testing workflow"""
    
    def __init__(self, model_provider: str = "huggingface"):
        """
        Initialize agent with hot-swappable LLM.
        
        Args:
            model_provider: "huggingface", "openai", or "ollama"
        """
        self.model = init_model(model_provider)
        print(f"[TestingAgent] Initialized with model provider: {model_provider}")
        model_api_key = os.getenv("OPENAI_API_KEY", "")
        print(model_api_key)
        self.explorer_tool = PageExplorerTool()
        
        # Initialize agent with tools
        self.agent = ToolCallingAgent(
            tools=[self.explorer_tool],
            model=self.model,
            max_steps=5
        )
        
        self.metrics_log = []
    
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
        tool_output = self._extract_tool_output()
        
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
    
    def _extract_tool_output(self) -> Dict[str, Any]:
        """Extract tool output from agent's step logs"""
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
        
        return tool_output
    
    def design_tests(self, exploration: ExplorationResult, desired_count: int = 12) -> TestDesignResult:
        """Phase 2: Design test cases based on exploration"""
        print(f"\n📋 PHASE 2: Designing {desired_count} test cases")
        start_time = time.time()
        
        # Extract actual elements for more specific test generation
        elements_summary = summarize_elements_detailed(exploration.elements)
        
        prompt = f"""You are a test automation expert. Design specific test cases for this webpage.

URL: {exploration.url}
Structure: {exploration.structure}

Key Interactive Elements:
```
{elements_summary}

Create exactly {desired_count} test cases. Use this EXACT format for each:

Test 1: [Test Name]
Description: [What this validates - mention specific elements like button text or link names]
Steps:
1. [Step with specific element reference]
2. [Step with expected action]
3. [Verification step]
Expected: [Specific outcome]
Priority: High/Medium/Low

Test 2: [Next test...]

IMPORTANT: Reference actual elements found (e.g., 'Click Sign in button', 'Navigate to US link', 'Enter text in search input with id="headerSearchIcon"'). Be specific!"""
        
        # Use model's generate method directly to avoid tool calling
        # Build messages format for chat models
        messages = [
            {"role": "system", "content": "You are a test automation expert. Generate detailed test cases based on page elements. Do not use any tools or function calls."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            # Try to use the model with messages (chat format)
            result = self.model(messages, stop_sequences=["\n\n\n"])
        except Exception as e:
            print(f"[DEBUG] Messages format failed: {e}, trying plain text")
            # Fallback to plain prompt
            result = self.model(prompt)
        
        elapsed = time.time() - start_time
        
        # Count tokens (approximate for now)
        tokens_used = len(prompt.split()) + len(str(result).split())
        
        metrics = Metrics(
            phase="test_design",
            tokens_used=tokens_used,
            response_time=elapsed,
            timestamp=datetime.now().isoformat()
        )
        
        self.metrics_log.append(asdict(metrics))
        
        # Parse test cases from LLM output
        test_cases = parse_test_cases(str(result))
        
        # Calculate coverage based on elements tested
        coverage_score = calculate_coverage(test_cases, exploration.elements)
        
        design_result = TestDesignResult(
            test_cases=test_cases,
            coverage_score=coverage_score,
            metrics=metrics
        )
        
        print(f"✅ Test design complete in {elapsed:.2f}s")
        print(f"   Generated {len(test_cases)} test cases")
        print(f"   Coverage: {coverage_score:.1f}%")
        
        return design_result
    
    def generate_code(
        self, 
        test_cases: List[Dict], 
        url: str, 
        suite_name: str = "TestSuite", 
        elements: List[Dict] = None, 
        custom_instructions: str = "",
        use_llm: bool = True,
        run_tests: bool = False,
        headless: bool = True
    ) -> Dict[str, Any]:
        """
        Phase 3: Generate Playwright Python code with smart locator strategy.
        
        The agent now truly writes code using LLM intelligence with:
        - Smart locator strategy selection (testid > id > aria > name > text > css)
        - Self-correction through validation loops AND actual test execution
        - Detailed execution logs when run_tests=True
        - Fallback to templates if LLM fails
        
        Args:
            test_cases: List of test case dictionaries
            url: Target URL
            suite_name: Name for the test suite
            elements: List of page elements from exploration
            custom_instructions: Additional instructions for code generation
            use_llm: Whether to use LLM for code generation (default: True)
            run_tests: Whether to actually run tests for verification (default: False)
            headless: Run browser in headless mode during test execution (default: True)
        
        Returns:
            Dict containing:
                - code: The generated Python test code
                - execution_log: TestExecutionLog if run_tests=True, else None
                - metrics: Generation metrics
        """
        print(f"\n💻 PHASE 3: Generating code for {len(test_cases)} test cases")
        if custom_instructions:
            print(f"📝 Custom instructions: {custom_instructions[:100]}...")
        if run_tests:
            print(f"🧪 Test execution enabled (headless={headless})")
        start_time = time.time()
        
        execution_log = None
        
        if use_llm:
            # Use LLM-powered generation with self-correction
            result = generate_code_with_llm(
                model=self.model,
                test_cases=test_cases,
                url=url,
                suite_name=suite_name,
                elements=elements,
                max_retries=2,
                run_tests=run_tests,
                headless=headless
            )
            # Handle both tuple return (new) and string return (legacy)
            if isinstance(result, tuple):
                base_code, execution_log = result
            else:
                base_code = result
        else:
            # Use template-based fallback
            base_code = generate_code(test_cases, url, suite_name, elements)
        
        # If custom instructions provided, use LLM to refine the code
        if custom_instructions:
            print(f"🤖 Applying custom instructions via LLM...")
            code = apply_custom_instructions(base_code, custom_instructions, self.model, test_cases, url)
        else:
            code = base_code
        
        elapsed = time.time() - start_time
        metrics = Metrics(
            phase="code_generation",
            tokens_used=len(code.split()),
            response_time=elapsed,
            timestamp=datetime.now().isoformat()
        )
        self.metrics_log.append(asdict(metrics))
        
        print(f"✅ Code generation complete in {elapsed:.2f}s")
        
        # Return comprehensive result
        return {
            "code": code,
            "execution_log": execution_log,
            "metrics": asdict(metrics)
        }
    
    def get_metrics(self) -> List[Dict]:
        """Return all collected metrics"""
        return self.metrics_log
    
    def reset(self):
        """Reset agent state"""
        self.metrics_log = []
        print("🔄 Agent reset complete")
