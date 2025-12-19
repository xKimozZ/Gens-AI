"""
Code Generator
Generates Playwright Python test code from test cases.
"""

import re
from datetime import datetime
from typing import Dict, List, Any


def generate_code(
    test_cases: List[Dict], 
    url: str, 
    suite_name: str = "TestSuite", 
    elements: List[Dict] = None
) -> str:
    """Generate Playwright Python code with smart locator strategy"""
    print(f"\n💻 Generating code for {len(test_cases)} test cases")
    print(f"📦 Exploration elements available: {len(elements) if elements else 0}")
    
    # Build page object model with smart locators from exploration elements
    page_class = _generate_page_class(url, test_cases, elements)
    test_class = _generate_test_class(suite_name, test_cases, url)
    
    code = f'''"""
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
    
    return code


def apply_custom_instructions(
    base_code: str, 
    instructions: str, 
    model,
    test_cases: List[Dict] = None, 
    url: str = None
) -> str:
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
        result = model(messages, stop_sequences=["```"])
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


def _generate_page_class(url: str, test_cases: List[Dict], elements: List[Dict] = None) -> str:
    """Generate Page Object Model class with smart locators"""
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


def _generate_test_class(suite_name: str, test_cases: List[Dict], url: str) -> str:
    """Generate pytest test class"""
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
