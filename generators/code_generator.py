"""
Code Generator - LLM-Powered
Generates Playwright Python test code using AI with intelligent locator strategies
and self-correction capabilities.
"""

import os
import re
import subprocess
import tempfile
import shutil
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field


class LocatorStrategy(Enum):
    """Locator strategy priority levels"""
    TEST_ID = 1      # data-testid - Most reliable
    ID = 2           # #id - Very reliable
    ARIA = 3         # aria-label, role - Semantic/accessible
    NAME = 4         # [name='...'] - Form fields
    TEXT = 5         # text content - Human readable
    CSS = 6          # CSS selectors - Flexible
    XPATH = 7        # XPath - Last resort


class LocatorAnalyzer:
    """Analyzes elements and determines the best locator strategy"""
    
    @staticmethod
    def analyze_element(element: Dict) -> Tuple[LocatorStrategy, str, str]:
        """
        Analyze an element and return the best locator strategy.
        
        Returns:
            Tuple of (strategy, locator_code, reasoning)
        """
        elem_id = element.get('id', '')
        elem_name = element.get('name', '')
        elem_text = element.get('text', '').strip()
        elem_tag = element.get('tag', '')
        elem_type = element.get('type', '')
        test_id = element.get('data-testid', '') or element.get('testid', '')
        aria_label = element.get('aria-label', '')
        
        # Priority 1: data-testid (most reliable for testing)
        if test_id:
            return (
                LocatorStrategy.TEST_ID,
                f'page.get_by_test_id("{test_id}")',
                f"Using data-testid '{test_id}' - most reliable for testing"
            )
        
        # Priority 2: ID attribute (very reliable, skip auto-generated ones)
        if elem_id and not elem_id.startswith('ember') and not re.match(r'^[a-f0-9-]{36}$', elem_id):
            return (
                LocatorStrategy.ID,
                f'page.locator("#{elem_id}")',
                f"Using ID '{elem_id}' - stable identifier"
            )
        
        # Priority 3: ARIA/Role-based (semantic, accessible)
        if aria_label:
            return (
                LocatorStrategy.ARIA,
                f'page.get_by_label("{aria_label}")',
                f"Using aria-label '{aria_label}' - semantic locator"
            )
        
        # For buttons, prefer role-based locators
        if elem_tag == 'button' and elem_text:
            return (
                LocatorStrategy.ARIA,
                f'page.get_by_role("button", name="{elem_text}")',
                f"Using role 'button' with name '{elem_text}' - semantic locator"
            )
        
        # For links, prefer role-based locators
        if elem_tag == 'a' and elem_text:
            return (
                LocatorStrategy.ARIA,
                f'page.get_by_role("link", name="{elem_text}")',
                f"Using role 'link' with name '{elem_text}' - semantic locator"
            )
        
        # Priority 4: Name attribute (good for form fields)
        if elem_name:
            return (
                LocatorStrategy.NAME,
                f'page.locator("[name=\'{elem_name}\']")',
                f"Using name attribute '{elem_name}' - good for forms"
            )
        
        # Priority 5: Text content (human readable)
        if elem_text and len(elem_text) <= 50:
            return (
                LocatorStrategy.TEXT,
                f'page.get_by_text("{elem_text}", exact=True)',
                f"Using text content '{elem_text}' - human readable"
            )
        
        # Priority 6: CSS selector combination
        if elem_tag:
            css_parts = [elem_tag]
            if elem_type:
                css_parts.append(f'[type="{elem_type}"]')
            css_selector = ''.join(css_parts)
            return (
                LocatorStrategy.CSS,
                f'page.locator("{css_selector}")',
                f"Using CSS selector '{css_selector}' - tag-based fallback"
            )
        
        # Priority 7: XPath as last resort
        return (
            LocatorStrategy.XPATH,
            'page.locator("//element")',
            "Using XPath - needs manual refinement"
        )
    
    @staticmethod
    def build_element_context(elements: List[Dict]) -> str:
        """Build a context string describing available elements with locator recommendations"""
        if not elements:
            return "No elements available"
        
        context_lines = []
        for elem in elements:
            strategy, locator, reasoning = LocatorAnalyzer.analyze_element(elem)
            elem_desc = f"- {elem.get('tag', 'element')}"
            if elem.get('text'):
                elem_desc += f" '{elem.get('text', '')[:30]}'"
            if elem.get('id'):
                elem_desc += f" (id={elem.get('id')})"
            elem_desc += f"\n  Recommended: {locator}\n  Reason: {reasoning}"
            context_lines.append(elem_desc)
        
        return "\n".join(context_lines[:20])  # Limit to 20 elements


class CodeValidator:
    """Validates generated Python/Playwright code"""
    
    @staticmethod
    def validate_syntax(code: str) -> Tuple[bool, List[str]]:
        """Check Python syntax validity"""
        errors = []
        try:
            compile(code, '<string>', 'exec')
            return True, []
        except SyntaxError as e:
            errors.append(f"Syntax error at line {e.lineno}: {e.msg}")
            return False, errors
    
    @staticmethod
    def validate_playwright_patterns(code: str) -> Tuple[bool, List[str]]:
        """Validate Playwright-specific patterns"""
        warnings = []
        
        # Check for deprecated patterns
        if 'page.click(' in code and 'page.locator' not in code:
            warnings.append("Consider using page.locator().click() instead of page.click()")
        
        if 'page.fill(' in code and 'page.locator' not in code:
            warnings.append("Consider using page.locator().fill() instead of page.fill()")
        
        # Check for missing waits in navigation
        if 'goto(' in code and 'wait_for' not in code and 'expect' not in code:
            warnings.append("Consider adding explicit waits after navigation")
        
        # Check for hardcoded sleeps
        if 'time.sleep' in code or 'asyncio.sleep' in code:
            warnings.append("Avoid hardcoded sleeps - use Playwright's auto-waiting or explicit waits")
        
        # Check test method naming
        if 'def test_' not in code and 'class Test' in code:
            warnings.append("Test methods should start with 'test_' for pytest discovery")
        
        return len(warnings) == 0, warnings
    
    @staticmethod
    def validate_completeness(code: str, test_cases: List[Dict]) -> Tuple[bool, List[str]]:
        """Check if all test cases are represented in the code"""
        issues = []
        
        for tc in test_cases:
            test_name = tc.get('name', '').lower()
            safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', test_name).lower()
            safe_name = re.sub(r'_+', '_', safe_name).strip('_')
            
            if f"def test_" not in code:
                issues.append(f"No test methods found in generated code")
                break
            
            # Check if some form of the test exists
            if safe_name and safe_name not in code.lower():
                words = safe_name.split('_')[:3]
                if not any(word in code.lower() for word in words if len(word) > 3):
                    issues.append(f"Test case '{tc.get('name')}' may not be fully represented")
        
        return len(issues) == 0, issues


@dataclass
class TestResult:
    """Result of a single test execution"""
    test_name: str
    passed: bool
    duration: float = 0.0
    error_message: str = ""
    error_type: str = ""
    line_number: Optional[int] = None
    
    def __str__(self):
        status = "✅ PASSED" if self.passed else "❌ FAILED"
        result = f"{status}: {self.test_name} ({self.duration:.2f}s)"
        if not self.passed and self.error_message:
            result += f"\n    Error: {self.error_type}: {self.error_message}"
            if self.line_number:
                result += f" (line {self.line_number})"
        return result


@dataclass
class TestExecutionLog:
    """Complete log of test execution"""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    code_file: str = ""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    skipped: int = 0
    duration: float = 0.0
    test_results: List[TestResult] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
    return_code: int = 0
    
    @property
    def all_passed(self) -> bool:
        return self.failed == 0 and self.errors == 0
    
    @property
    def success_rate(self) -> float:
        if self.total_tests == 0:
            return 0.0
        return (self.passed / self.total_tests) * 100
    
    def get_failure_summary(self) -> str:
        """Get a summary of all failures for LLM self-correction"""
        failures = [r for r in self.test_results if not r.passed]
        if not failures:
            return "All tests passed!"
        
        summary_lines = [f"❌ {len(failures)} test(s) failed:\n"]
        for result in failures:
            summary_lines.append(f"  - {result.test_name}:")
            if result.error_type:
                summary_lines.append(f"    Type: {result.error_type}")
            if result.error_message:
                summary_lines.append(f"    Error: {result.error_message[:500]}")
            if result.line_number:
                summary_lines.append(f"    Line: {result.line_number}")
            summary_lines.append("")
        
        return "\n".join(summary_lines)
    
    def __str__(self):
        lines = [
            "=" * 60,
            f"📊 TEST EXECUTION LOG - {self.timestamp}",
            "=" * 60,
            f"📁 File: {self.code_file}",
            f"⏱️  Duration: {self.duration:.2f}s",
            f"📈 Results: {self.passed}/{self.total_tests} passed ({self.success_rate:.1f}%)",
            "",
            "📋 Test Results:",
            "-" * 40,
        ]
        
        for result in self.test_results:
            lines.append(str(result))
        
        lines.append("-" * 40)
        
        if self.failed > 0 or self.errors > 0:
            lines.append(f"\n⚠️ Failures: {self.failed}, Errors: {self.errors}")
        else:
            lines.append("\n✅ All tests passed!")
        
        lines.append("=" * 60)
        return "\n".join(lines)


class CodeRunner:
    """Executes generated test code and captures results"""
    
    def __init__(self, timeout: int = 120, headless: bool = True):
        """
        Initialize the code runner.
        
        Args:
            timeout: Maximum time in seconds to run tests
            headless: Whether to run browser in headless mode
        """
        self.timeout = timeout
        self.headless = headless
        self.temp_dir = None
    
    def run_tests(self, code: str, test_file_name: str = "test_generated.py") -> TestExecutionLog:
        """
        Run the generated test code and return execution log.
        
        Args:
            code: The Python test code to execute
            test_file_name: Name for the temporary test file
            
        Returns:
            TestExecutionLog with detailed results
        """
        log = TestExecutionLog()
        
        # Create temporary directory for test execution
        self.temp_dir = tempfile.mkdtemp(prefix="playwright_test_")
        test_file_path = os.path.join(self.temp_dir, test_file_name)
        log.code_file = test_file_path
        
        try:
            # Write code to temp file
            with open(test_file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            print(f"\n🧪 RUNNING TESTS")
            print(f"📁 Test file: {test_file_path}")
            print("-" * 50)
            
            # Build pytest command
            cmd = [
                "python", "-m", "pytest",
                test_file_path,
                "-v",  # Verbose output
                "--tb=short",  # Short traceback
                f"--timeout={self.timeout}",  # Test timeout
                "--no-header",  # Cleaner output
            ]
            
            # Add headless flag via environment
            env = os.environ.copy()
            if self.headless:
                env["PWHEADLESS"] = "1"
                env["HEADLESS"] = "1"
            
            # Run pytest
            start_time = datetime.now()
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout + 30,  # Extra buffer for pytest overhead
                env=env,
                cwd=self.temp_dir
            )
            end_time = datetime.now()
            
            log.duration = (end_time - start_time).total_seconds()
            log.stdout = result.stdout
            log.stderr = result.stderr
            log.return_code = result.returncode
            
            # Parse results
            self._parse_pytest_output(result.stdout, result.stderr, log)
            
            # Print log
            print(str(log))
            
        except subprocess.TimeoutExpired:
            log.errors = 1
            log.stderr = f"Test execution timed out after {self.timeout} seconds"
            print(f"⏰ Test execution timed out after {self.timeout}s")
            
        except Exception as e:
            log.errors = 1
            log.stderr = f"Error running tests: {str(e)}"
            print(f"❌ Error running tests: {e}")
            import traceback
            traceback.print_exc()
            
        finally:
            # Cleanup temp directory
            if self.temp_dir and os.path.exists(self.temp_dir):
                try:
                    shutil.rmtree(self.temp_dir)
                except Exception:
                    pass
        
        return log
    
    def _parse_pytest_output(self, stdout: str, stderr: str, log: TestExecutionLog):
        """Parse pytest output to extract test results"""
        
        # Parse individual test results from verbose output
        # Pattern: test_file.py::TestClass::test_name PASSED/FAILED
        test_pattern = r'(test_\w+)\s+(PASSED|FAILED|ERROR|SKIPPED)'
        
        for match in re.finditer(test_pattern, stdout, re.IGNORECASE):
            test_name = match.group(1)
            status = match.group(2).upper()
            
            result = TestResult(
                test_name=test_name,
                passed=(status == "PASSED"),
                error_type="" if status == "PASSED" else status
            )
            
            log.test_results.append(result)
            
            if status == "PASSED":
                log.passed += 1
            elif status == "FAILED":
                log.failed += 1
            elif status == "ERROR":
                log.errors += 1
            elif status == "SKIPPED":
                log.skipped += 1
        
        log.total_tests = len(log.test_results)
        
        # If no tests were found via pattern, try summary line
        if log.total_tests == 0:
            summary_pattern = r'(\d+)\s+passed|(\d+)\s+failed|(\d+)\s+error'
            for match in re.finditer(summary_pattern, stdout, re.IGNORECASE):
                if match.group(1):
                    log.passed = int(match.group(1))
                if match.group(2):
                    log.failed = int(match.group(2))
                if match.group(3):
                    log.errors = int(match.group(3))
            log.total_tests = log.passed + log.failed + log.errors + log.skipped
        
        # Extract error details from failures
        self._extract_error_details(stdout + "\n" + stderr, log)
    
    def _extract_error_details(self, output: str, log: TestExecutionLog):
        """Extract detailed error information from pytest output"""
        
        # Find FAILURES section
        failures_section = re.search(r'=+ FAILURES =+(.+?)(?:=+ \w+ =+|$)', output, re.DOTALL)
        if not failures_section:
            return
        
        failures_text = failures_section.group(1)
        
        # Parse each failure
        # Pattern: ___ test_name ___
        failure_blocks = re.split(r'_+ (test_\w+) _+', failures_text)
        
        for i in range(1, len(failure_blocks), 2):
            if i + 1 >= len(failure_blocks):
                break
            
            test_name = failure_blocks[i]
            error_text = failure_blocks[i + 1]
            
            # Find matching test result
            for result in log.test_results:
                if result.test_name == test_name and not result.passed:
                    # Extract error type and message
                    error_match = re.search(r'([\w.]+Error|AssertionError|Exception):\s*(.+?)(?:\n|$)', error_text)
                    if error_match:
                        result.error_type = error_match.group(1)
                        result.error_message = error_match.group(2).strip()[:500]
                    
                    # Extract line number
                    line_match = re.search(r':(\d+):', error_text)
                    if line_match:
                        result.line_number = int(line_match.group(1))
                    
                    break


def generate_code_with_llm(
    model,
    test_cases: List[Dict],
    url: str,
    suite_name: str = "TestSuite",
    elements: List[Dict] = None,
    max_retries: int = 2,
    run_tests: bool = True,
    headless: bool = True
) -> Tuple[str, Optional[TestExecutionLog]]:
    """
    Generate Playwright Python code using LLM with self-correction.
    
    Args:
        model: The LLM model instance
        test_cases: List of test case dictionaries
        url: Target URL
        suite_name: Name for the test suite
        elements: List of page elements from exploration
        max_retries: Number of self-correction attempts
        run_tests: Whether to actually run tests for verification
        headless: Run browser in headless mode during test execution
    
    Returns:
        Tuple of (generated code, execution log or None)
    """
    print(f"\n💻 PHASE 3: LLM-Powered Code Generation")
    print(f"📋 Test cases: {len(test_cases)}")
    print(f"📦 Elements available: {len(elements) if elements else 0}")
    print(f"🧪 Test execution: {'Enabled' if run_tests else 'Disabled'}")
    
    # Initialize code runner if test execution is enabled
    runner = CodeRunner(timeout=120, headless=headless) if run_tests else None
    final_log = None
    
    # Build element context with locator recommendations
    element_context = ""
    if elements:
        element_context = LocatorAnalyzer.build_element_context(elements)
        print(f"🎯 Analyzed {len(elements)} elements for locator strategies")
    
    # Format test cases for the prompt
    test_cases_text = _format_test_cases_for_prompt(test_cases)
    
    # Initial generation prompt
    prompt = f"""You are an expert Playwright test automation engineer. Generate complete, executable Python test code.

## Target Information
- URL: {url}
- Suite Name: {suite_name}
- Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Available Page Elements with Recommended Locators
{element_context if element_context else "No specific elements provided - use semantic locators"}

## Test Cases to Implement
{test_cases_text}

## Requirements
1. Use pytest framework with Playwright
2. Create a Page Object Model class for reusability
3. Use the RECOMMENDED LOCATORS from above - they are analyzed for reliability
4. Locator Priority: data-testid > id > role/aria > name > text > css
5. Include proper assertions using Playwright's expect() API
6. Add meaningful docstrings and comments
7. Handle potential failures gracefully
8. Use auto-waiting (avoid time.sleep)

## Output Format
Return ONLY valid Python code. No markdown, no explanations, no ```python blocks.
Start directly with the imports.

Generate the complete test file now:"""

    messages = [
        {
            "role": "system", 
            "content": """You are an expert test automation engineer specializing in Playwright and Python.
You write clean, maintainable, and robust test code.
You always use the best locator strategy for reliability.
You ONLY output valid Python code - no markdown, no explanations."""
        },
        {"role": "user", "content": prompt}
    ]
    
    # Generate initial code
    print("🤖 Generating code with LLM...")
    code = _call_llm_for_code(model, messages)
    
    if not code:
        print("⚠️ LLM generation failed, using fallback template")
        fallback_code = _generate_fallback_code(test_cases, url, suite_name, elements)
        return (fallback_code, None)
    
    # Self-correction loop
    for attempt in range(max_retries):
        print(f"\n🔍 Validation & Testing - Attempt {attempt + 1}/{max_retries}")
        
        # Static validation first
        is_valid, static_issues = _validate_code(code, test_cases)
        
        if not is_valid:
            print(f"⚠️ Static validation found {len(static_issues)} issues")
            for issue in static_issues[:3]:
                print(f"   - {issue}")
        
        # Run actual tests if enabled
        execution_issues = []
        if run_tests and is_valid:  # Only run if syntax is valid
            print("\n🧪 Running actual test execution...")
            final_log = runner.run_tests(code)
            
            if not final_log.all_passed:
                execution_issues = [final_log.get_failure_summary()]
                print(f"⚠️ Test execution: {final_log.passed}/{final_log.total_tests} passed")
        
        # Combine all issues
        all_issues = static_issues + execution_issues
        
        if not all_issues and (not run_tests or (final_log and final_log.all_passed)):
            print("✅ All validations passed!")
            break
        
        print(f"🔧 Attempting self-correction (attempt {attempt + 1})...")
        
        # Self-correction prompt with actual test failures
        correction_prompt = _build_correction_prompt(code, all_issues, final_log)
        
        correction_messages = [
            {"role": "system", "content": "You are fixing Python/Playwright test code based on actual test execution failures. Return only valid Python code."},
            {"role": "user", "content": correction_prompt}
        ]
        
        corrected_code = _call_llm_for_code(model, correction_messages)
        if corrected_code:
            code = corrected_code
            print(f"✏️ Applied self-correction")
    
    # Final syntax check
    is_valid, _ = CodeValidator.validate_syntax(code)
    if not is_valid:
        print("⚠️ Final code has syntax errors, using fallback")
        return (_generate_fallback_code(test_cases, url, suite_name, elements), final_log)
    
    print(f"✅ Code generation complete ({len(code)} chars)")
    return (code, final_log)


def _build_correction_prompt(code: str, issues: List[str], execution_log: Optional[TestExecutionLog] = None) -> str:
    """Build a detailed correction prompt including test execution results"""
    
    prompt_parts = ["The generated code has issues that need to be fixed:\n"]
    
    # Add static issues
    if issues:
        prompt_parts.append("## Static Analysis Issues:")
        for issue in issues:
            prompt_parts.append(f"- {issue}")
        prompt_parts.append("")
    
    # Add execution results if available
    if execution_log and not execution_log.all_passed:
        prompt_parts.append("## Test Execution Results:")
        prompt_parts.append(f"- Total: {execution_log.total_tests} tests")
        prompt_parts.append(f"- Passed: {execution_log.passed}")
        prompt_parts.append(f"- Failed: {execution_log.failed}")
        prompt_parts.append(f"- Errors: {execution_log.errors}")
        prompt_parts.append("")
        
        prompt_parts.append("## Detailed Failures:")
        for result in execution_log.test_results:
            if not result.passed:
                prompt_parts.append(f"\n### {result.test_name}")
                prompt_parts.append(f"Error Type: {result.error_type}")
                prompt_parts.append(f"Message: {result.error_message}")
                if result.line_number:
                    prompt_parts.append(f"Line Number: {result.line_number}")
        prompt_parts.append("")
        
        # Add relevant stderr if available
        if execution_log.stderr:
            prompt_parts.append("## Error Output (stderr):")
            prompt_parts.append(execution_log.stderr[:1000])
            prompt_parts.append("")
    
    prompt_parts.append(f"""## Current Code:
```python
{code}
```

## Instructions:
1. Fix ALL the issues mentioned above
2. Pay special attention to the actual test execution errors
3. Ensure locators are correct and elements exist
4. Add proper waits if elements are not found
5. Handle edge cases and potential failures

Return ONLY the complete fixed Python code, no markdown or explanations.""")
    
    return "\n".join(prompt_parts)


def _format_test_cases_for_prompt(test_cases: List[Dict]) -> str:
    """Format test cases into a readable string for the LLM prompt"""
    lines = []
    for i, tc in enumerate(test_cases, 1):
        lines.append(f"\n### Test {i}: {tc.get('name', 'Unnamed')}")
        lines.append(f"Description: {tc.get('description', 'No description')}")
        lines.append("Steps:")
        for j, step in enumerate(tc.get('steps', []), 1):
            lines.append(f"  {j}. {step}")
        lines.append(f"Expected: {tc.get('expected_outcome', 'Test passes')}")
        lines.append(f"Priority: {tc.get('priority', 'Medium')}")
    return "\n".join(lines)


def _call_llm_for_code(model, messages: List[Dict]) -> Optional[str]:
    """Call the LLM and extract clean Python code from response"""
    try:
        result = model(messages, stop_sequences=["```\n\n", "\n\n\n\n"])
        
        # Extract content from various response formats
        code = None
        
        # Handle ChatMessage objects (smolagents)
        if hasattr(result, 'content'):
            code = result.content
        # Handle dict responses
        elif isinstance(result, dict):
            code = result.get('content') or result.get('text') or result.get('message', {}).get('content')
        # Handle string responses
        elif isinstance(result, str):
            code = result
        # Fallback: try to get string representation
        else:
            # Check if it has a raw attribute with the actual response
            if hasattr(result, 'raw') and hasattr(result.raw, 'choices'):
                try:
                    code = result.raw.choices[0].message.content
                except (IndexError, AttributeError):
                    pass
            if not code:
                code = str(result)
        
        if not code:
            print("⚠️ Could not extract content from LLM response")
            return None
        
        code = code.strip()
        print(f"[DEBUG] Extracted code length: {len(code)} chars")
        print(f"[DEBUG] First 100 chars: {code[:100]}...")
        
        # Clean up markdown artifacts
        if "```python" in code:
            start = code.find("```python") + 9
            end = code.find("```", start)
            if end > start:
                code = code[start:end]
        elif code.startswith("```"):
            code = code[3:]
            if "```" in code:
                code = code[:code.find("```")]
        
        if code.endswith("```"):
            code = code[:-3]
        
        code = code.strip()
        
        # Basic validation
        if len(code) < 100:
            print(f"⚠️ Code too short ({len(code)} chars)")
            return None
        
        if "import" not in code and "def " not in code:
            print("⚠️ Code doesn't look like Python (no import/def)")
            return None
        
        return code
        
    except Exception as e:
        print(f"⚠️ LLM call failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def _validate_code(code: str, test_cases: List[Dict]) -> Tuple[bool, List[str]]:
    """Run all validators and collect issues"""
    all_issues = []
    
    # Syntax validation
    syntax_valid, syntax_errors = CodeValidator.validate_syntax(code)
    if not syntax_valid:
        all_issues.extend(syntax_errors)
    
    # Playwright patterns validation
    _, playwright_warnings = CodeValidator.validate_playwright_patterns(code)
    all_issues.extend(playwright_warnings)
    
    # Completeness validation
    _, completeness_issues = CodeValidator.validate_completeness(code, test_cases)
    all_issues.extend(completeness_issues)
    
    return len(all_issues) == 0, all_issues


def _generate_fallback_code(
    test_cases: List[Dict],
    url: str,
    suite_name: str,
    elements: List[Dict] = None
) -> str:
    """Generate fallback code using templates when LLM fails"""
    print("📝 Generating fallback code from templates...")
    
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', suite_name)
    
    # Generate locator methods from elements
    locator_methods = []
    if elements:
        for elem in elements[:15]:
            strategy, locator, _ = LocatorAnalyzer.analyze_element(elem)
            method_name = _create_method_name(elem)
            if method_name:
                locator_methods.append(f'''    def get_{method_name}(self):
        """Locator using {strategy.name} strategy"""
        return {locator.replace('page.', 'self.page.')}''')
    
    # Generate test methods
    test_methods = []
    for i, tc in enumerate(test_cases):
        test_name = re.sub(r'[^a-zA-Z0-9_]', '_', tc.get('name', f'test_{i}')).lower()
        test_name = re.sub(r'_+', '_', test_name).strip('_')
        if not test_name or test_name[0].isdigit():
            test_name = f"test_{i+1}"
        
        steps_comments = "\n        ".join([f"# Step {j+1}: {step}" for j, step in enumerate(tc.get('steps', []))])
        
        test_methods.append(f'''    def test_{test_name}(self, page: Page):
        """
        {tc.get('description', 'Auto-generated test')}
        
        Expected: {tc.get('expected_outcome', 'Test passes')}
        Priority: {tc.get('priority', 'Medium')}
        """
        web_page = WebPage(page)
        web_page.navigate()
        
        {steps_comments}
        
        # TODO: Implement test steps
        page.wait_for_load_state("networkidle")''')
    
    return f'''"""
Generated Test Suite: {suite_name}
URL: {url}
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Test Framework: Playwright + pytest
Note: This is fallback-generated code - review and enhance as needed
"""

import re
import pytest
from playwright.sync_api import Page, expect


class WebPage:
    """Page Object Model for {url}"""
    
    def __init__(self, page: Page):
        self.page = page
        self.url = "{url}"
    
    def navigate(self):
        """Navigate to the page"""
        self.page.goto(self.url)
        self.page.wait_for_load_state("domcontentloaded")
    
{chr(10).join(locator_methods) if locator_methods else "    pass"}


class Test{safe_name}:
    """Generated test suite: {suite_name}"""
    
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        """Setup before each test"""
        page.set_viewport_size({{"width": 1280, "height": 720}})
        yield
        # Teardown after each test
    
{chr(10).join(test_methods)}
'''


def _create_method_name(elem: Dict) -> Optional[str]:
    """Create a safe method name from element attributes"""
    # Try ID first
    if elem.get('id'):
        name = re.sub(r'[^a-zA-Z0-9_]', '_', elem.get('id'))
        name = re.sub(r'_+', '_', name).strip('_')[:25]
        if name and not name[0].isdigit():
            return name
    
    # Try text content
    if elem.get('text'):
        text = elem.get('text', '').strip()[:20]
        name = re.sub(r'[^a-zA-Z0-9_]', '_', text)
        name = re.sub(r'_+', '_', name).strip('_').lower()
        if name and len(name) > 2 and not name[0].isdigit():
            return name
    
    # Try tag + type
    if elem.get('tag'):
        name = elem.get('tag', '')
        if elem.get('type'):
            name += f"_{elem.get('type')}"
        return name[:20]
    
    return None


# Legacy function for backward compatibility
def generate_code(
    test_cases: List[Dict],
    url: str,
    suite_name: str = "TestSuite",
    elements: List[Dict] = None
) -> str:
    """
    Legacy function - generates fallback code without LLM.
    Use generate_code_with_llm() for AI-powered generation.
    """
    return _generate_fallback_code(test_cases, url, suite_name, elements)


def apply_custom_instructions(
    base_code: str,
    instructions: str,
    model,
    test_cases: List[Dict] = None,
    url: str = None
) -> str:
    """Use LLM to apply custom instructions to the generated code with validation"""
    print(f"🤖 Applying custom instructions via LLM...")
    
    prompt = f"""You are an expert Playwright test automation engineer. Modify this test code according to the user's instructions.

## Current Code
```python
{base_code}
```

## User Instructions
{instructions}

## Requirements
1. Apply the user's instructions carefully
2. Maintain valid Python syntax
3. Keep pytest and Playwright patterns
4. Ensure all test methods start with test_
5. Use proper Playwright locators and assertions

Return ONLY the complete modified Python code. No markdown blocks, no explanations."""

    messages = [
        {"role": "system", "content": "You are fixing/improving Playwright test code. Return only valid Python code."},
        {"role": "user", "content": prompt}
    ]
    
    refined_code = _call_llm_for_code(model, messages)
    
    if refined_code:
        # Validate the refined code
        is_valid, issues = CodeValidator.validate_syntax(refined_code)
        if is_valid:
            print(f"✅ Custom instructions applied successfully ({len(refined_code)} chars)")
            return refined_code
        else:
            print(f"⚠️ Refined code has syntax errors: {issues}")
    
    print("⚠️ Could not apply custom instructions, returning original code")
    return base_code
