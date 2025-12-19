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
from dotenv import load_dotenv

from smolagents import (
    Tool,
    CodeAgent,
    ToolCallingAgent,
)
from playwright.async_api import async_playwright

load_dotenv()

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
        print (f"[TestingAgent] Initialized with model provider: {model_provider}")
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
    
    def _init_model(self, provider: str):
        """Hot-swappable LLM initialization"""
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
    
    def design_tests(self, exploration: ExplorationResult, desired_count: int = 12) -> TestDesignResult:
        """Phase 2: Design test cases based on exploration"""
        print(f"\n📋 PHASE 2: Designing {desired_count} test cases")
        start_time = time.time()
        
        # Extract actual elements for more specific test generation
        elements_summary = self._summarize_elements_detailed(exploration.elements)
        
        prompt = f"""You are a test automation expert. Design specific test cases for this webpage.

URL: {exploration.url}
Structure: {exploration.structure}

Key Interactive Elements:
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
        test_cases = self._parse_test_cases(str(result))
        
        # Calculate coverage based on elements tested
        coverage_score = self._calculate_coverage(test_cases, exploration.elements)
        
        design_result = TestDesignResult(
            test_cases=test_cases,
            coverage_score=coverage_score,
            metrics=metrics
        )
        
        print(f"✅ Test design complete in {elapsed:.2f}s")
        print(f"   Generated {len(test_cases)} test cases")
        print(f"   Coverage: {coverage_score:.1f}%")
        
        return design_result
    
    def _summarize_elements(self, elements: List[Dict]) -> str:
        """Summarize found elements for test generation"""
        if not elements:
            return "No interactive elements found"
        
        summary = []
        buttons = [e for e in elements if e.get('tag') == 'button']
        links = [e for e in elements if e.get('tag') == 'a']
        inputs = [e for e in elements if e.get('tag') == 'input']
        
        if buttons:
            summary.append(f"Buttons ({len(buttons)}): " + ", ".join([b.get('text', 'unnamed')[:30] for b in buttons[:5]]))
        if links:
            summary.append(f"Links ({len(links)}): " + ", ".join([l.get('text', 'unnamed')[:30] for l in links[:5]]))
        if inputs:
            summary.append(f"Inputs ({len(inputs)}): " + ", ".join([i.get('type', 'text')[:20] for i in inputs[:5]]))
        
        return "\n".join(summary)
    
    def _summarize_elements_detailed(self, elements: List[Dict]) -> str:
        """Create detailed element summary with specific examples"""
        if not elements:
            return "No interactive elements found"
        
        summary = []
        
        # Get visible elements only
        visible_elements = [e for e in elements if e.get('visible', True)]
        
        buttons = [e for e in visible_elements if e.get('tag') == 'button'][:8]
        links = [e for e in visible_elements if e.get('tag') == 'a'][:10]
        inputs = [e for e in visible_elements if e.get('tag') == 'input'][:6]
        
        if buttons:
            summary.append(f"\n🔘 BUTTONS ({len(buttons)} shown):")
            for i, b in enumerate(buttons, 1):
                text = b.get('text', '').strip()[:40]
                btn_id = b.get('id', '')
                btn_type = b.get('type', '')
                parts = []
                if text:
                    parts.append(f"text='{text}'")
                if btn_id:
                    parts.append(f"id='{btn_id}'")
                if btn_type:
                    parts.append(f"type='{btn_type}'")
                summary.append(f"  {i}. Button: {', '.join(parts) if parts else 'no text/id'}")
        
        if links:
            summary.append(f"\n🔗 LINKS ({len(links)} shown):")
            for i, l in enumerate(links, 1):
                text = l.get('text', '').strip()[:40]
                link_id = l.get('id', '')
                parts = []
                if text:
                    parts.append(f"text='{text}'")
                if link_id:
                    parts.append(f"id='{link_id}'")
                summary.append(f"  {i}. Link: {', '.join(parts) if parts else 'no text/id'}")
        
        if inputs:
            summary.append(f"\n📝 INPUTS ({len(inputs)} shown):")
            for i, inp in enumerate(inputs, 1):
                inp_type = inp.get('type', 'text')
                inp_id = inp.get('id', '')
                inp_name = inp.get('name', '')
                parts = [f"type='{inp_type}'"]
                if inp_id:
                    parts.append(f"id='{inp_id}'")
                if inp_name:
                    parts.append(f"name='{inp_name}'")
                summary.append(f"  {i}. Input: {', '.join(parts)}")
        
        return "\n".join(summary)
    
    def _calculate_coverage(self, test_cases: List[Dict], elements: List[Dict]) -> float:
        """Calculate test coverage percentage - % of visible elements that have tests"""
        if not elements or not test_cases:
            return 0.0
        
        # Count visible interactive elements only
        visible_elements = [e for e in elements if e.get('visible', True)]
        if not visible_elements:
            return 50.0
        
        # Count unique element types covered in tests
        covered_elements = set()
        test_content = ' '.join([
            test.get('name', '') + ' ' + 
            test.get('description', '') + ' ' + 
            ' '.join(test.get('steps', []))
            for test in test_cases
        ]).lower()
        
        for elem in visible_elements:
            elem_id = elem.get('id', '')
            elem_text = elem.get('text', '').strip().lower()
            elem_type = elem.get('type', '')
            
            # Check if element is referenced in tests
            if elem_id and len(elem_id) > 0 and elem_id.lower() in test_content:
                covered_elements.add(f"id:{elem_id}")
            elif elem_text and len(elem_text) > 3 and elem_text[:20] in test_content:
                covered_elements.add(f"text:{elem_text[:20]}")
            elif elem_type and len(elem_type) > 0 and elem_type in test_content:
                covered_elements.add(f"type:{elem_type}")
        
        # Ensure we don't exceed 100%
        num_covered = min(len(covered_elements), len(visible_elements))
        coverage = (num_covered / len(visible_elements)) * 100
        return round(min(coverage, 95.0), 1)  # Cap at 95%
    
    def _parse_test_cases(self, llm_output: str) -> List[Dict]:
        """Parse test cases from LLM output with detailed extraction"""
        import re
        
        test_cases = []
        print(f"[DEBUG] Parsing LLM output ({len(llm_output)} chars)")
        
        # Split by test case blocks - look for "Test" followed by a number
        blocks = re.split(r'(?=(?:Test|###)\s*(?:Case)?\s*#?\d+)', llm_output, flags=re.IGNORECASE)
        
        for i, block in enumerate(blocks):
            if not block.strip() or len(block) < 20:
                continue
            
            # Extract test name
            name_match = re.search(r'(?:Test|###)\s*(?:Case)?\s*#?(\d+):?\s*[:\-]?\s*(.+?)(?:\n|Description|Steps)', block, re.IGNORECASE)
            if not name_match:
                continue
            
            test_id = name_match.group(1)
            test_name = name_match.group(2).strip().rstrip(':').strip('*')
            # Remove escaped newlines from test name
            test_name = test_name.replace('\\n', '').replace('\n', '').strip()
            
            # Extract description - stop before Steps
            desc_match = re.search(r'(?:Description|Desc):?\s*(.+?)(?=Steps:)', block, re.IGNORECASE | re.DOTALL)
            if not desc_match:
                desc_match = re.search(r'(?:Description|Desc):?\s*(.+?)(?:\n\s*(?:Expected|Priority)|$)', block, re.IGNORECASE | re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else "Test case generated from page analysis"
            # Remove escaped newlines and 'Steps:' remnants from description
            description = description.replace('\\n', ' ').replace('\n', ' ').strip()
            description = re.sub(r'Steps:.*$', '', description, flags=re.IGNORECASE).strip()
            
            # Extract steps
            steps_match = re.search(r'Steps:?\s*(.+?)(?:\n\s*(?:Expected|Priority)|$)', block, re.IGNORECASE | re.DOTALL)
            steps_text = steps_match.group(1).strip() if steps_match else ""
            
            # Parse steps into list
            steps = []
            if steps_text:
                # Replace escaped newlines with actual newlines
                steps_text = steps_text.replace('\\n', '\n')
                for line in steps_text.split('\n'):
                    line = line.strip()
                    # Remove numbering/bullets and quotes
                    line = re.sub(r'^[-*•\d+\.)\]]+\s*', '', line)
                    line = line.strip('"\'')
                    # Skip lines that are just "Expected" or contain Priority
                    if line and len(line) > 5 and not re.search(r'^(Expected|Priority):', line, re.IGNORECASE):
                        steps.append(line)
            
            if not steps:
                steps = ["Navigate to the page", description.split('.')[0] if '.' in description else description]
            
            # Extract expected outcome
            expected_match = re.search(r'Expected:?\s*(.+?)(?=\s*Priority:|$)', block, re.IGNORECASE | re.DOTALL)
            expected = expected_match.group(1).strip() if expected_match else "Test should complete successfully"
            # Clean up expected - remove trailing Priority mentions and newlines
            expected = re.sub(r'\s*Priority:.*$', '', expected, flags=re.IGNORECASE)
            expected = expected.replace('\\n', ' ').replace('\n', ' ').strip()
            expected = expected.strip('"\' ').strip()
            # If too short (just punctuation), use fallback
            if len(expected) < 5:
                expected = "Test should complete successfully"
            
            # Extract priority
            priority_match = re.search(r'Priority:?\s*(High|Medium|Low)', block, re.IGNORECASE)
            priority = priority_match.group(1).capitalize() if priority_match else "Medium"
            
            test_cases.append({
                "id": int(test_id) if test_id.isdigit() else i + 1,
                "name": test_name[:100],
                "description": description[:300].strip(),
                "steps": [s for s in steps[:15] if s],  # Max 15 steps, filter empty
                "expected_outcome": expected[:300],
                "priority": priority
            })
            print(f"[DEBUG] Parsed test {test_id}: {test_name[:40]}... with {len(steps)} steps")
        
        print(f"[DEBUG] Parsed {len(test_cases)} test cases total")
        
        # Deduplicate test cases by name and first step
        seen = set()
        unique_cases = []
        for tc in test_cases:
            # Create unique key from name and first step
            key = (tc["name"].lower(), tc["steps"][0].lower() if tc["steps"] else "")
            if key not in seen:
                seen.add(key)
                unique_cases.append(tc)
            else:
                print(f"[DEBUG] Skipping duplicate test: {tc['name']}")
        
        test_cases = unique_cases
        # Renumber IDs sequentially after deduplication
        for idx, tc in enumerate(test_cases):
            tc["id"] = idx + 1
        
        print(f"[DEBUG] After deduplication: {len(test_cases)} unique test cases")
        
        # If still no test cases, return placeholder
        if not test_cases:
            print("[DEBUG] No test cases found, returning placeholder")
            return [
                {
                    "id": 1,
                    "name": "Header Presence",
                    "description": "Auto-generated test case",
                    "steps": ["Navigate to page", "Verify header exists"],
                    "expected_outcome": "Header element is visible",
                    "priority": "Medium"
                },
                {
                    "id": 2,
                    "name": "Footer Presence",
                    "description": "Auto-generated test case",
                    "steps": ["Navigate to page", "Verify footer exists"],
                    "expected_outcome": "Footer element is visible",
                    "priority": "Medium"
                }
            ]
        
        return test_cases
    
    def generate_code(self, test_cases: List[Dict], url: str, suite_name: str = "TestSuite", elements: List[Dict] = None, custom_instructions: str = "") -> str:
        """Phase 3: Generate Playwright Python code with smart locator strategy"""
        print(f"\n💻 PHASE 3: Generating code for {len(test_cases)} test cases")
        print(f"📦 Exploration elements available: {len(elements) if elements else 0}")
        if custom_instructions:
            print(f"📝 Custom instructions: {custom_instructions[:100]}...")
        start_time = time.time()
        
        # Build page object model with smart locators from exploration elements
        page_class = self._generate_page_class(url, test_cases, elements)
        test_class = self._generate_test_class(suite_name, test_cases, url)
        
        base_code = f'''"""
Generated Test Suite: {suite_name}
URL: {url}
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Test Framework: Playwright + pytest
"""

import re
import pytest
from playwright.sync_api import Page, expect

{page_class}

{test_class}
'''
        
        # If custom instructions provided, use LLM to refine the code
        if custom_instructions:
            print(f"🤖 Applying custom instructions via LLM...")
            code = self._apply_custom_instructions(base_code, custom_instructions, test_cases, url)
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
        return code
    
    def _apply_custom_instructions(self, base_code: str, instructions: str, test_cases: List[Dict], url: str) -> str:
        """Use LLM to apply custom instructions to the generated code"""
        prompt = f"""You are an expert Playwright test automation engineer. I have generated the following Playwright Python test code:

```python
{base_code}
```

The user has provided these custom instructions/feedback to improve the code:
"{instructions}"

Please modify and improve the code according to these instructions. Return ONLY the complete modified Python code, nothing else. Do not include markdown code blocks or explanations - just the raw Python code.

Important guidelines:
- Keep all imports at the top
- Maintain the pytest and Playwright patterns
- Ensure all test methods start with test_
- Keep the code functional and runnable
- Apply the user's instructions thoughtfully"""

        messages = [
            {"role": "system", "content": "You are an expert test automation engineer. Return only valid Python code with no markdown formatting or explanations."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            result = self.model(messages, stop_sequences=["```"])
            refined_code = str(result).strip()
            
            print(f"[DEBUG] Raw LLM response length: {len(refined_code)}")
            print(f"[DEBUG] First 200 chars: {refined_code[:200]}")
            
            # Clean up any markdown artifacts
            if "```python" in refined_code:
                # Extract code between ```python and ```
                start = refined_code.find("```python") + 9
                end = refined_code.find("```", start)
                if end > start:
                    refined_code = refined_code[start:end]
            elif refined_code.startswith("```"):
                refined_code = refined_code[3:]
                if "```" in refined_code:
                    refined_code = refined_code[:refined_code.find("```")]
            
            if refined_code.endswith("```"):
                refined_code = refined_code[:-3]
            refined_code = refined_code.strip()
            
            # More lenient validation - just check it has some Python-like content
            has_class_or_def = "class " in refined_code or "def " in refined_code
            has_python_keywords = "import" in refined_code or "from " in refined_code
            is_reasonable_length = len(refined_code) > 100
            
            if (has_class_or_def or has_python_keywords) and is_reasonable_length:
                print(f"✅ LLM successfully refined the code ({len(refined_code)} chars)")
                return refined_code
            else:
                print(f"⚠️ LLM output didn't look like valid code (has_class_or_def={has_class_or_def}, has_python_keywords={has_python_keywords}, len={len(refined_code)}), using base code")
                print(f"[DEBUG] Full response: {refined_code[:500]}...")
                return base_code
        except Exception as e:
            print(f"⚠️ Error applying custom instructions: {e}")
            import traceback
            traceback.print_exc()
            return base_code
    
    def _generate_page_class(self, url: str, test_cases: List[Dict], elements: List[Dict] = None) -> str:
        """Generate Page Object Model class with smart locators"""
        import re
        class_name = "WebPage"
        
        # Extract unique elements from exploration data first, then test steps
        locators = set()
        
        # If we have exploration elements, use them directly for better locators
        if elements:
            print(f"  Processing {len(elements)} exploration elements...")
            for elem in elements:
                elem_id = elem.get('id', '')
                elem_text = elem.get('text', '')
                elem_tag = elem.get('tag', '')
                
                # Add ID-based locators
                if elem_id:
                    safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', elem_id)
                    if safe_id and safe_id[0].isdigit():
                        safe_id = 'elem_' + safe_id
                    locators.add(('id', safe_id, f"self.page.locator(\"#{elem_id}\")"))
                
                # Add text-based locators for buttons and links
                if elem_text and elem_tag in ['button', 'a', 'link'] and len(elem_text.strip()) > 0 and len(elem_text) <= 50:
                    text_clean = elem_text.strip()
                    safe_text = re.sub(r'[^a-zA-Z0-9_]', '_', text_clean)
                    safe_text = re.sub(r'_+', '_', safe_text).strip('_')[:30]
                    if safe_text and safe_text[0].isdigit():
                        safe_text = 'text_' + safe_text
                    if safe_text:
                        locators.add(('text', safe_text, f"self.page.get_by_text(\"{text_clean}\")"))
                
                # Add input field locators
                if elem_tag == 'input' and elem_id:
                    safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', elem_id)
                    if safe_id and safe_id[0].isdigit():
                        safe_id = 'elem_' + safe_id
                    locators.add(('id', safe_id, f"self.page.locator(\"#{elem_id}\")"))
        
        # Also extract from test steps for any additional references
        for tc in test_cases:
            for step in tc.get('steps', []):
                step_lower = step.lower()
                # Extract element references
                if 'id=' in step_lower:
                    # Extract ID locators
                    ids = re.findall(r"id=['\"]([^'\"]+)['\"]", step, re.IGNORECASE)
                    for elem_id in ids:
                        # Sanitize ID for Python method name
                        safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', elem_id)
                        if safe_id and safe_id[0].isdigit():
                            safe_id = 'elem_' + safe_id
                        locators.add(('id', safe_id, f"self.page.locator(\"#{elem_id}\")"))
                elif 'text=' in step_lower or 'with text' in step_lower:
                    # Extract text locators from multiple patterns
                    import re
                    # Try "text='...'" pattern
                    texts = re.findall(r"text=['\"]([^'\"]+)['\"]" , step, re.IGNORECASE)
                    # Also try "with text '...'" pattern
                    if not texts:
                        texts = re.findall(r"with text\s+['\"]([^'\"]+)['\"]" , step, re.IGNORECASE)
                    for text in texts:
                        # Sanitize text for Python method name
                        safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', text)
                        safe_name = re.sub(r'_+', '_', safe_name).strip('_')[:30]
                        if safe_name and safe_name[0].isdigit():
                            safe_name = 'text_' + safe_name
                        if safe_name:
                            locators.add(('text', safe_name, f"self.page.get_by_text(\"{text}\")"))
                elif 'button' in step_lower:
                    if 'login' in step_lower or 'sign in' in step_lower:
                        locators.add(('button', 'login_btn', "self.page.get_by_role(\"button\", name=\"Login\")"))
                elif 'input' in step_lower:
                    if 'username' in step_lower:
                        locators.add(('input', 'username_input', "self.page.get_by_label(\"Username\")"))
                    elif 'password' in step_lower:
                        locators.add(('input', 'password_input', "self.page.get_by_label(\"Password\")"))
        
        locator_methods = []
        for loc_type, name, locator_code in sorted(locators):
            method_name = f"get_{name}"
            locator_methods.append(f'''    def {method_name}(self):
        """Smart locator for {name}"""
        return {locator_code}''')
        
        print(f"🎯 Generated {len(locator_methods)} locator methods from {len(locators)} unique locators")
        
        return f'''class {class_name}:
    """Page Object Model for {url}"""
    
    def __init__(self, page: Page):
        self.page = page
        self.url = "{url}"
    
    def navigate(self):
        """Navigate to the page"""
        self.page.goto(self.url)
    
{chr(10).join(locator_methods) if locator_methods else "    pass"}'''
    
    def _generate_test_class(self, suite_name: str, test_cases: List[Dict], url: str) -> str:
        """Generate pytest test class"""
        import re
        safe_name = suite_name.replace(' ', '_').replace('-', '_')
        
        test_methods = []
        for i, tc in enumerate(test_cases):
            # Sanitize test name for Python method name
            test_name = tc.get('name', f'Test {i+1}')
            test_name = re.sub(r'[^a-zA-Z0-9_]', '_', test_name).lower()
            test_name = re.sub(r'_+', '_', test_name).strip('_')
            if not test_name or test_name[0].isdigit():
                test_name = f'test_{i+1}'
            
            description = tc.get('description', '')
            steps = tc.get('steps', [])
            expected = tc.get('expected_outcome', '')
            priority = tc.get('priority', 'Medium')
            
            # Generate actual implementation code from steps
            implementation_lines = []
            for j, step in enumerate(steps):
                step_lower = step.lower()
                code_line = f"# {j+1}. {step}"
                
                # Parse step and generate actual code
                if 'click' in step_lower:
                    # Extract what to click
                    if "id='" in step or 'id="' in step:
                        id_match = re.search(r"id=['\"]([^'\"]+)['\"]" , step)
                        if id_match:
                            elem_id = id_match.group(1)
                            safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', elem_id)
                            if safe_id and safe_id[0].isdigit():
                                safe_id = 'elem_' + safe_id
                            code_line += f"\n        web_page.get_{safe_id}().click()"
                    elif "text='" in step or 'text="' in step or "with text '" in step_lower or 'with text "' in step_lower:
                        # Try to extract text from patterns like "text='...'", "with text '...'" or "link with text '...'"
                        text_match = re.search(r"(?:text=|with text\s+)['\"]([^'\"]+)['\"]" , step, re.IGNORECASE)
                        if text_match:
                            text = text_match.group(1)
                            safe_text = re.sub(r'[^a-zA-Z0-9_]', '_', text)
                            safe_text = re.sub(r'_+', '_', safe_text).strip('_')[:30]
                            if safe_text and safe_text[0].isdigit():
                                safe_text = 'text_' + safe_text
                            if safe_text:
                                code_line += f"\n        web_page.get_{safe_text}().click()"
                        else:
                            # Fallback: try to use page.get_by_role or get_by_text
                            code_line += "\n        # Click action - locator not auto-detected, implement manually"
                    else:
                        code_line += "\n        # Click action - specify locator manually"
                
                elif 'enter' in step_lower or 'type' in step_lower or 'fill' in step_lower:
                    # Input action - try to extract field ID and value
                    id_match = re.search(r"id=['\"]([^'\"]+)['\"]" , step)
                    if id_match:
                        elem_id = id_match.group(1)
                        safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', elem_id)
                        if safe_id and safe_id[0].isdigit():
                            safe_id = 'elem_' + safe_id
                        # Try to extract the value to fill
                        value_match = re.search(r"['\"]([^'\"]{3,30})['\"]", step)
                        fill_value = value_match.group(1) if value_match else "test_value"
                        code_line += f"\n        web_page.get_{safe_id}().fill('{fill_value}')"
                    else:
                        code_line += "\n        # Implement text input (e.g., web_page.get_input().fill('text'))"
                
                elif 'verify' in step_lower or 'check' in step_lower:
                    # Verification step
                    if 'url' in step_lower:
                        code_line += "\n        expect(page).to_have_url(re.compile(r'.*'))"
                    elif 'visible' in step_lower or 'displayed' in step_lower:
                        code_line += "\n        # Verify element visibility (e.g., expect(web_page.get_element()).to_be_visible())"
                    else:
                        code_line += "\n        # Add verification assertion"
                
                elif 'wait' in step_lower or 'observe' in step_lower:
                    code_line += "\n        page.wait_for_load_state('networkidle')"
                
                elif 'scroll' in step_lower:
                    code_line += "\n        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')"
                
                elif 'navigate' in step_lower:
                    code_line += "\n        # Navigation handled by web_page.navigate()"
                else:
                    code_line += "\n        # Implement: " + step[:50]
                
                implementation_lines.append(code_line)
            
            implementation_code = '\n        '.join(implementation_lines)
            
            test_methods.append(f'''    def test_{test_name}(self, page: Page):
        """
        {description}
        
        Expected: {expected}
        Priority: {priority}
        """
        web_page = WebPage(page)
        web_page.navigate()
        
        {implementation_code}''')
        
        return f'''class Test{safe_name}:
    """Generated test suite: {suite_name}"""
    
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        """Setup before each test"""
        page.set_viewport_size({{"width": 1280, "height": 720}})
        yield
        # Teardown after each test
    
{chr(10).join(test_methods)}'''
    
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
