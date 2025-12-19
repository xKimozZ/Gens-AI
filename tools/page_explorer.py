"""
Page Explorer Tool
Custom smolagents tool for deep page exploration using Playwright.
"""

import json
import asyncio
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor

from smolagents import Tool
from playwright.async_api import async_playwright


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
