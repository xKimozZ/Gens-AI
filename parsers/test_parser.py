"""
Test Case Parser
Handles parsing of LLM output into structured test cases.
"""

import re
from typing import Dict, List


def parse_test_cases(llm_output: str) -> List[Dict]:
    """Parse test cases from LLM output with detailed extraction"""
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
        return _get_placeholder_tests()
    
    return test_cases


def _get_placeholder_tests() -> List[Dict]:
    """Return placeholder test cases when parsing fails"""
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


def summarize_elements(elements: List[Dict]) -> str:
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


def summarize_elements_detailed(elements: List[Dict]) -> str:
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


def calculate_coverage(test_cases: List[Dict], elements: List[Dict]) -> float:
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
