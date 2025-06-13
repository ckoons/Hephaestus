"""
UI DevTools MCP - Tools for UI manipulation without destroying everything
"""

import asyncio
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from bs4 import BeautifulSoup, NavigableString, Tag
import lxml.html
from cssselect import GenericTranslator

# Import configuration properly
from shared.utils.env_config import get_component_config

# Get component port mapping from env_config
def get_component_ports():
    """Get component ports from configuration"""
    config = get_component_config()
    return {
        "hephaestus": config.hephaestus.port,
        "engram": config.engram.port,
        "hermes": config.hermes.port,
        "ergon": config.ergon.port,
        "rhetor": config.rhetor.port,
        "terma": config.terma.port,
        "athena": config.athena.port,
        "prometheus": config.prometheus.port,
        "harmonia": config.harmonia.port,
        "telos": config.telos.port,
        "synthesis": config.synthesis.port,
        "tekton_core": config.tekton_core.port,
        "metis": config.metis.port,
        "apollo": config.apollo.port,
        "budget": config.budget.port,
        "sophia": config.sophia.port
    }

# Valid component names for validation
VALID_COMPONENTS = {
    "hephaestus", "engram", "hermes", "ergon", "rhetor", 
    "terma", "athena", "prometheus", "harmonia", "telos",
    "synthesis", "tekton_core", "metis", "apollo", "budget", "sophia"
}

# Common Tekton UI selectors
TEKTON_SELECTORS = {
    "component": lambda name: f"#{name}-component",
    "content": lambda name: f"#{name}-content",
    "footer": lambda name: f"#{name}-footer",
    "header": lambda name: f"#{name}-header",
    "chat": lambda name: f"#{name}-chat",
    "terminal": lambda name: f"#{name}-terminal",
    "tabs": lambda name: f"#{name}-tabs"
}

# Dangerous patterns to detect and prevent
DANGEROUS_PATTERNS = {
    "frameworks": [
        r"import\s+React",
        r"import\s+\{.*\}\s+from\s+['\"](react|vue|angular)",
        r"Vue\.(component|createApp)",
        r"angular\.(module|component)",
        r"webpack",
        r"babel",
        r"npm\s+install.*react",
        r"yarn\s+add.*vue",
        r"<script.*src=.*react",
        r"<script.*src=.*vue"
    ],
    "build_tools": [
        r"webpack\.config",
        r"rollup\.config",
        r"vite\.config",
        r"parcel",
        r"esbuild"
    ],
    "complex_patterns": [
        r"class\s+\w+\s+extends\s+(React\.)?Component",
        r"function\s+\w+\s*\(\s*props\s*\)",
        r"const\s+\[\s*\w+\s*,\s*set\w+\s*\]\s*=\s*useState"
    ]
}


class UIToolsError(Exception):
    """Base exception for UI tools"""
    pass


class FrameworkDetectedError(UIToolsError):
    """Raised when a framework is detected in changes"""
    pass


class BrowserManager:
    """Manages browser instances and contexts for UI tools with error recovery"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.contexts: Dict[str, BrowserContext] = {}
        self.pages: Dict[str, Page] = {}
        self._initialization_lock = asyncio.Lock()
        self._restart_attempts = 0
        self._max_restart_attempts = 3
    
    async def initialize(self, force_restart: bool = False):
        """Initialize the browser with automatic recovery"""
        async with self._initialization_lock:
            if force_restart:
                await self._cleanup_browser()
            
            if not self.playwright:
                self.playwright = await async_playwright().start()
            
            if not self.browser or not self.browser.is_connected():
                try:
                    self.browser = await self.playwright.chromium.launch(headless=True)
                    self._restart_attempts = 0
                except Exception as e:
                    if self._restart_attempts < self._max_restart_attempts:
                        self._restart_attempts += 1
                        await asyncio.sleep(1)  # Brief delay before retry
                        return await self.initialize(force_restart=True)
                    raise UIToolsError(f"Failed to start browser after {self._max_restart_attempts} attempts: {str(e)}")
    
    async def get_page(self, component: str) -> Page:
        """Get or create a page for the specified component with validation"""
        # Validate component name
        if component not in VALID_COMPONENTS:
            raise UIToolsError(
                f"Invalid component '{component}'. Valid components: {', '.join(sorted(VALID_COMPONENTS))}"
            )
        
        # Check if page exists and is still valid
        if component in self.pages:
            page = self.pages[component]
            try:
                # Quick check if page is still responsive
                await page.evaluate("() => true")
                return page
            except:
                # Page is dead, remove it
                del self.pages[component]
                if component in self.contexts:
                    try:
                        await self.contexts[component].close()
                    except:
                        pass
                    del self.contexts[component]
        
        # Create new page
        try:
            context = await self._get_context(component)
            page = await context.new_page()
            
            # Get port from configuration
            component_ports = get_component_ports()
            port = component_ports.get(component, 8080)
            url = f"http://localhost:{port}"
            
            await page.goto(url, wait_until="networkidle", timeout=10000)
            self.pages[component] = page
            return page
            
        except Exception as e:
            # Try browser restart on failure
            if "Target closed" in str(e) or "Browser closed" in str(e):
                await self.initialize(force_restart=True)
                # Retry once after restart
                return await self.get_page(component)
            
            raise UIToolsError(f"Failed to load {component}: {str(e)}")
    
    async def _get_context(self, component: str) -> BrowserContext:
        """Get or create a browser context for the component"""
        await self.initialize()  # Ensure browser is ready
        
        if component not in self.contexts:
            self.contexts[component] = await self.browser.new_context()
        return self.contexts[component]
    
    async def _cleanup_browser(self):
        """Clean up browser resources"""
        for page in list(self.pages.values()):
            try:
                await page.close()
            except:
                pass
        self.pages.clear()
        
        for context in list(self.contexts.values()):
            try:
                await context.close()
            except:
                pass
        self.contexts.clear()
        
        if self.browser:
            try:
                await self.browser.close()
            except:
                pass
            self.browser = None
    
    async def cleanup(self):
        """Clean up all browser resources"""
        await self._cleanup_browser()
        
        if self.playwright:
            try:
                await self.playwright.stop()
            except:
                pass
            self.playwright = None


# Global browser manager instance
browser_manager = BrowserManager()


def get_tekton_selector(component: str, element_type: str = "component") -> str:
    """
    Get a standard Tekton selector for a component element.
    
    Args:
        component: Component name (e.g., 'rhetor')
        element_type: Type of element ('component', 'content', 'footer', etc.)
    
    Returns:
        CSS selector string
    """
    if element_type in TEKTON_SELECTORS:
        return TEKTON_SELECTORS[element_type](component)
    return f"#{component}-{element_type}"


def get_common_selectors(component: str) -> Dict[str, str]:
    """
    Get all common selectors for a component.
    
    Args:
        component: Component name
        
    Returns:
        Dictionary of element_type -> selector mappings
    """
    return {
        element_type: selector_func(component)
        for element_type, selector_func in TEKTON_SELECTORS.items()
    }


def _detect_dangerous_patterns(content: str) -> List[str]:
    """Detect dangerous patterns in content"""
    detected = []
    
    for category, patterns in DANGEROUS_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                detected.append(f"{category}: {pattern}")
    
    return detected


def _extract_element_info(element: Tag) -> Dict[str, Any]:
    """Extract relevant information from a BeautifulSoup element"""
    info = {
        "tag": element.name,
        "id": element.get("id"),
        "classes": element.get("class", []),
        "attributes": {}
    }
    
    # Extract relevant attributes
    for attr in ["href", "src", "alt", "title", "placeholder", "value", "type", "name"]:
        if element.get(attr):
            info["attributes"][attr] = element.get(attr)
    
    # Extract text content
    text = element.get_text(strip=True)
    if text and len(text) < 200:  # Limit text length
        info["text"] = text
    elif text:
        info["text"] = text[:200] + "..."
    
    return info


def _html_to_structured_data(html: str, selector: Optional[str] = None) -> Dict[str, Any]:
    """Convert HTML to structured data representation"""
    soup = BeautifulSoup(html, 'html.parser')
    
    # If selector provided, find matching elements
    if selector:
        if selector.startswith("#"):
            # ID selector
            element = soup.find(id=selector[1:])
            elements = [element] if element else []
        elif selector.startswith("."):
            # Class selector
            elements = soup.find_all(class_=selector[1:])
        else:
            # Tag or complex selector
            try:
                # Use lxml for complex CSS selectors
                doc = lxml.html.fromstring(html)
                xpath = GenericTranslator().css_to_xpath(selector)
                lxml_elements = doc.xpath(xpath)
                
                # Convert back to BeautifulSoup elements
                elements = []
                for lxml_el in lxml_elements:
                    el_html = lxml.html.tostring(lxml_el, encoding='unicode')
                    el_soup = BeautifulSoup(el_html, 'html.parser')
                    if el_soup.body:
                        elements.extend(el_soup.body.children)
                    else:
                        elements.extend(el_soup.children)
            except:
                # Fallback to simple tag search
                elements = soup.find_all(selector)
    else:
        # Return structure of entire document
        elements = [soup.body if soup.body else soup]
    
    result = {
        "element_count": len(elements),
        "elements": []
    }
    
    for element in elements:
        if isinstance(element, Tag):
            el_info = _extract_element_info(element)
            
            # Add child count
            children = [child for child in element.children if isinstance(child, Tag)]
            if children:
                el_info["child_count"] = len(children)
            
            result["elements"].append(el_info)
    
    return result


async def ui_capture(
    component: str,
    selector: Optional[str] = None,
    include_screenshot: bool = False
) -> Dict[str, Any]:
    """
    Capture UI state without taking screenshots (unless requested)
    
    Args:
        component: Name of the Tekton component (e.g., 'rhetor', 'hermes')
        selector: Optional CSS selector to focus on specific elements
        include_screenshot: Whether to include a visual screenshot
    
    Returns:
        Structured data about the UI state
    """
    await browser_manager.initialize()
    page = await browser_manager.get_page(component)
    
    result = {
        "component": component,
        "url": page.url,
        "title": await page.title(),
        "viewport": page.viewport_size,
    }
    
    # Get HTML content
    if selector:
        try:
            element = await page.wait_for_selector(selector, timeout=5000)
            html = await element.inner_html()
            result["selector"] = selector
        except:
            result["error"] = f"Selector '{selector}' not found"
            return result
    else:
        html = await page.content()
    
    # Convert to structured data
    result["structure"] = _html_to_structured_data(html, selector)
    
    # Extract forms
    forms = await page.query_selector_all("form")
    if forms:
        result["forms"] = []
        for form in forms:
            form_data = {
                "id": await form.get_attribute("id"),
                "action": await form.get_attribute("action"),
                "method": await form.get_attribute("method"),
                "inputs": []
            }
            
            inputs = await form.query_selector_all("input, select, textarea")
            for input_el in inputs:
                input_data = {
                    "type": await input_el.get_attribute("type") or "text",
                    "name": await input_el.get_attribute("name"),
                    "id": await input_el.get_attribute("id"),
                    "value": await input_el.get_attribute("value"),
                    "placeholder": await input_el.get_attribute("placeholder")
                }
                form_data["inputs"].append(input_data)
            
            result["forms"].append(form_data)
    
    # Extract interactive elements
    buttons = await page.query_selector_all("button, input[type='button'], input[type='submit']")
    if buttons:
        result["buttons"] = []
        for button in buttons:
            text = await button.text_content()
            result["buttons"].append({
                "text": text.strip() if text else "",
                "id": await button.get_attribute("id"),
                "classes": await button.get_attribute("class"),
                "disabled": await button.is_disabled()
            })
    
    # Extract links
    links = await page.query_selector_all("a[href]")
    if links:
        result["links"] = []
        for link in links[:20]:  # Limit to first 20 links
            href = await link.get_attribute("href")
            text = await link.text_content()
            result["links"].append({
                "href": href,
                "text": text.strip() if text else "",
                "id": await link.get_attribute("id")
            })
    
    # Include screenshot if requested
    if include_screenshot:
        screenshot = await page.screenshot(full_page=False)
        result["screenshot"] = {
            "type": "base64",
            "data": screenshot.hex()  # Convert to hex for JSON serialization
        }
    
    return result


async def ui_interact(
    component: str,
    action: str,
    selector: str,
    value: Optional[str] = None,
    capture_changes: bool = True
) -> Dict[str, Any]:
    """
    Interact with UI elements and capture what happens
    
    Args:
        component: Name of the Tekton component
        action: Type of action ('click', 'type', 'select', 'hover')
        selector: CSS selector for the element
        value: Value for type/select actions
        capture_changes: Whether to capture before/after state
    
    Returns:
        Result of the interaction including any changes
    """
    await browser_manager.initialize()
    page = await browser_manager.get_page(component)
    
    result = {
        "component": component,
        "action": action,
        "selector": selector,
        "value": value
    }
    
    # Capture before state if requested
    if capture_changes:
        before_html = await page.content()
        result["before"] = _html_to_structured_data(before_html)
    
    # Set up console message capture
    console_messages = []
    async def handle_console(msg):
        console_messages.append({
            "type": msg.type,
            "text": msg.text
        })
    page.on("console", handle_console)
    
    # Set up network request capture
    network_requests = []
    async def handle_request(request):
        if request.resource_type in ["xhr", "fetch"]:
            network_requests.append({
                "url": request.url,
                "method": request.method
            })
    page.on("request", handle_request)
    
    try:
        # Wait for element
        element = await page.wait_for_selector(selector, timeout=5000)
        
        # Perform action
        if action == "click":
            await element.click()
            await page.wait_for_load_state("networkidle", timeout=5000)
        
        elif action == "type":
            if value is None:
                raise ValueError("Value required for type action")
            await element.clear()
            await element.type(value)
        
        elif action == "select":
            if value is None:
                raise ValueError("Value required for select action")
            await element.select_option(value)
        
        elif action == "hover":
            await element.hover()
            await asyncio.sleep(0.5)  # Give hover effects time to show
        
        else:
            raise ValueError(f"Unknown action: {action}")
        
        result["success"] = True
        
        # Capture after state if requested
        if capture_changes:
            after_html = await page.content()
            result["after"] = _html_to_structured_data(after_html)
            
            # Calculate changes
            changes = []
            before_soup = BeautifulSoup(before_html, 'html.parser')
            after_soup = BeautifulSoup(after_html, 'html.parser')
            
            # Simple change detection (can be enhanced)
            before_text = before_soup.get_text()
            after_text = after_soup.get_text()
            
            if before_text != after_text:
                changes.append("Page text content changed")
            
            # Check for new elements with common dynamic IDs/classes
            for attr in ["id", "class"]:
                before_els = before_soup.find_all(attrs={attr: True})
                after_els = after_soup.find_all(attrs={attr: True})
                
                before_attrs = set(el.get(attr) for el in before_els)
                after_attrs = set(el.get(attr) for el in after_els)
                
                new_attrs = after_attrs - before_attrs
                if new_attrs:
                    changes.append(f"New {attr}s appeared: {list(new_attrs)[:5]}")
            
            result["changes"] = changes
        
        # Add console and network activity
        if console_messages:
            result["console"] = console_messages
        if network_requests:
            result["network"] = network_requests
    
    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
    
    finally:
        # Clean up event handlers
        page.remove_listener("console", handle_console)
        page.remove_listener("request", handle_request)
    
    return result


async def ui_sandbox(
    component: str,
    changes: List[Dict[str, Any]],
    preview: bool = True
) -> Dict[str, Any]:
    """
    Test UI changes in a sandboxed environment
    
    Args:
        component: Name of the Tekton component
        changes: List of changes to apply, each with:
            - type: 'html', 'css', or 'js'
            - selector: CSS selector for target element
            - content: The change to apply
            - action: 'replace', 'append', 'prepend', 'after', 'before'
        preview: Whether to preview changes without applying
    
    Returns:
        Result of sandbox testing including validation
    """
    await browser_manager.initialize()
    page = await browser_manager.get_page(component)
    
    result = {
        "component": component,
        "changes": changes,
        "preview": preview,
        "validations": []
    }
    
    # Validate changes for dangerous patterns
    for i, change in enumerate(changes):
        change_content = change.get("content", "")
        detected = _detect_dangerous_patterns(change_content)
        
        if detected:
            result["validations"].append({
                "change_index": i,
                "status": "rejected",
                "reason": "Dangerous patterns detected",
                "patterns": detected
            })
            
            # Don't continue if dangerous patterns found
            result["applied"] = False
            result["error"] = "Changes rejected due to framework/complexity detection"
            return result
    
    # Create a snapshot of current state
    original_html = await page.content()
    result["original_snapshot"] = _html_to_structured_data(original_html)
    
    # Apply changes in sandbox mode
    sandbox_results = []
    
    for i, change in enumerate(changes):
        change_type = change.get("type", "html")
        selector = change.get("selector")
        content = change.get("content", "")
        action = change.get("action", "replace")
        
        try:
            if change_type == "html":
                # Use JavaScript to modify DOM without reload
                js_code = f"""
                (function() {{
                    const elements = document.querySelectorAll('{selector}');
                    if (elements.length === 0) return {{ success: false, error: 'No elements found' }};
                    
                    elements.forEach(el => {{
                        const content = `{content.replace('`', '\\`')}`;
                        
                        switch('{action}') {{
                            case 'replace':
                                el.innerHTML = content;
                                break;
                            case 'append':
                                el.innerHTML += content;
                                break;
                            case 'prepend':
                                el.innerHTML = content + el.innerHTML;
                                break;
                            case 'after':
                                el.insertAdjacentHTML('afterend', content);
                                break;
                            case 'before':
                                el.insertAdjacentHTML('beforebegin', content);
                                break;
                        }}
                    }});
                    
                    return {{ success: true, count: elements.length }};
                }})();
                """
                
                result_js = await page.evaluate(js_code)
                sandbox_results.append({
                    "change_index": i,
                    "success": result_js.get("success", False),
                    "elements_modified": result_js.get("count", 0),
                    "error": result_js.get("error")
                })
            
            elif change_type == "css":
                # Inject CSS
                css_content = f"<style>{content}</style>"
                await page.add_style_tag(content=content)
                sandbox_results.append({
                    "change_index": i,
                    "success": True,
                    "type": "css_injected"
                })
            
            elif change_type == "js":
                # Validate JS doesn't include frameworks
                if _detect_dangerous_patterns(content):
                    sandbox_results.append({
                        "change_index": i,
                        "success": False,
                        "error": "JavaScript contains framework/build tool references"
                    })
                else:
                    # Execute JS in page context
                    await page.evaluate(content)
                    sandbox_results.append({
                        "change_index": i,
                        "success": True,
                        "type": "js_executed"
                    })
        
        except Exception as e:
            sandbox_results.append({
                "change_index": i,
                "success": False,
                "error": str(e)
            })
    
    result["sandbox_results"] = sandbox_results
    
    # Capture final state
    final_html = await page.content()
    result["final_snapshot"] = _html_to_structured_data(final_html)
    
    # If preview mode, restore original state
    if preview:
        await page.set_content(original_html)
        result["restored"] = True
    else:
        result["applied"] = True
    
    # Summary
    successful = sum(1 for r in sandbox_results if r.get("success", False))
    result["summary"] = {
        "total_changes": len(changes),
        "successful": successful,
        "failed": len(changes) - successful
    }
    
    return result


async def ui_analyze(
    component: str,
    deep_scan: bool = False
) -> Dict[str, Any]:
    """
    Analyze UI structure and patterns
    
    Args:
        component: Name of the Tekton component
        deep_scan: Whether to perform deep analysis
    
    Returns:
        Analysis of UI structure, patterns, and recommendations
    """
    await browser_manager.initialize()
    page = await browser_manager.get_page(component)
    
    result = {
        "component": component,
        "url": page.url,
        "analysis": {}
    }
    
    # Get page content
    html = await page.content()
    soup = BeautifulSoup(html, 'html.parser')
    
    # Analyze structure
    structure_analysis = {
        "total_elements": len(soup.find_all()),
        "forms": len(soup.find_all("form")),
        "inputs": len(soup.find_all(["input", "textarea", "select"])),
        "buttons": len(soup.find_all(["button", "input[type='button']", "input[type='submit']"])),
        "links": len(soup.find_all("a")),
        "images": len(soup.find_all("img")),
        "tables": len(soup.find_all("table")),
        "divs": len(soup.find_all("div")),
        "sections": len(soup.find_all(["section", "article", "aside", "nav", "header", "footer"]))
    }
    result["analysis"]["structure"] = structure_analysis
    
    # Detect frameworks and libraries
    framework_detection = {
        "react": False,
        "vue": False,
        "angular": False,
        "jquery": False,
        "bootstrap": False,
        "tailwind": False
    }
    
    # Check for framework indicators
    scripts = soup.find_all("script")
    for script in scripts:
        src = script.get("src", "")
        text = script.string or ""
        
        if "react" in src.lower() or "React" in text:
            framework_detection["react"] = True
        if "vue" in src.lower() or "Vue" in text:
            framework_detection["vue"] = True
        if "angular" in src.lower() or "angular" in text:
            framework_detection["angular"] = True
        if "jquery" in src.lower() or "$(" in text or "jQuery" in text:
            framework_detection["jquery"] = True
    
    # Check for CSS frameworks
    links = soup.find_all("link", rel="stylesheet")
    for link in links:
        href = link.get("href", "")
        if "bootstrap" in href.lower():
            framework_detection["bootstrap"] = True
        if "tailwind" in href.lower():
            framework_detection["tailwind"] = True
    
    # Check classes for Tailwind
    if not framework_detection["tailwind"]:
        all_classes = set()
        for el in soup.find_all(class_=True):
            all_classes.update(el.get("class", []))
        
        tailwind_patterns = ["flex", "grid", "p-", "m-", "bg-", "text-", "w-", "h-"]
        tailwind_count = sum(1 for cls in all_classes for pattern in tailwind_patterns if pattern in cls)
        if tailwind_count > 10:
            framework_detection["tailwind"] = True
    
    result["analysis"]["frameworks"] = framework_detection
    
    # Analyze JavaScript usage
    js_analysis = {
        "inline_scripts": len([s for s in scripts if not s.get("src")]),
        "external_scripts": len([s for s in scripts if s.get("src")]),
        "event_handlers": 0
    }
    
    # Count inline event handlers
    for attr in ["onclick", "onchange", "onsubmit", "onload", "oninput"]:
        js_analysis["event_handlers"] += len(soup.find_all(attrs={attr: True}))
    
    result["analysis"]["javascript"] = js_analysis
    
    # Component analysis (specific to Tekton)
    component_divs = soup.find_all("div", id=re.compile(r".*-component$"))
    components = []
    for comp_div in component_divs:
        comp_id = comp_div.get("id", "")
        components.append({
            "id": comp_id,
            "name": comp_id.replace("-component", ""),
            "visible": "display: none" not in comp_div.get("style", ""),
            "child_count": len(comp_div.find_all(recursive=False))
        })
    
    result["analysis"]["tekton_components"] = components
    
    # Deep scan if requested
    if deep_scan:
        # Analyze API calls in JavaScript
        api_calls = []
        for script in scripts:
            text = script.string or ""
            
            # Look for fetch calls
            fetch_matches = re.findall(r'fetch\([\'"`]([^\'"`]+)[\'"`]', text)
            api_calls.extend({"type": "fetch", "url": url} for url in fetch_matches)
            
            # Look for XMLHttpRequest
            xhr_matches = re.findall(r'\.open\([\'"`]\w+[\'"`],\s*[\'"`]([^\'"`]+)[\'"`]', text)
            api_calls.extend({"type": "xhr", "url": url} for url in xhr_matches)
        
        result["analysis"]["api_calls"] = api_calls
        
        # Analyze form actions
        forms_analysis = []
        forms = soup.find_all("form")
        for form in forms:
            form_data = {
                "id": form.get("id"),
                "action": form.get("action", ""),
                "method": form.get("method", "GET").upper(),
                "fields": []
            }
            
            for input_el in form.find_all(["input", "select", "textarea"]):
                field = {
                    "type": input_el.get("type", "text"),
                    "name": input_el.get("name"),
                    "required": input_el.has_attr("required"),
                    "validation": []
                }
                
                # Check for validation attributes
                if input_el.get("pattern"):
                    field["validation"].append(f"pattern: {input_el.get('pattern')}")
                if input_el.get("min"):
                    field["validation"].append(f"min: {input_el.get('min')}")
                if input_el.get("max"):
                    field["validation"].append(f"max: {input_el.get('max')}")
                
                form_data["fields"].append(field)
            
            forms_analysis.append(form_data)
        
        result["analysis"]["forms_detail"] = forms_analysis
    
    # Complexity assessment
    complexity_score = 0
    complexity_factors = []
    
    if framework_detection["react"] or framework_detection["vue"] or framework_detection["angular"]:
        complexity_score += 10
        complexity_factors.append("Modern framework detected")
    
    if js_analysis["inline_scripts"] > 5:
        complexity_score += 3
        complexity_factors.append(f"Many inline scripts ({js_analysis['inline_scripts']})")
    
    if js_analysis["external_scripts"] > 10:
        complexity_score += 2
        complexity_factors.append(f"Many external scripts ({js_analysis['external_scripts']})")
    
    if structure_analysis["total_elements"] > 1000:
        complexity_score += 2
        complexity_factors.append(f"Large DOM ({structure_analysis['total_elements']} elements)")
    
    result["analysis"]["complexity"] = {
        "score": complexity_score,
        "level": "high" if complexity_score >= 10 else "medium" if complexity_score >= 5 else "low",
        "factors": complexity_factors
    }
    
    # Recommendations
    recommendations = []
    
    if any(framework_detection.values()):
        recommendations.append({
            "type": "warning",
            "message": "Frameworks detected. Avoid adding more complexity.",
            "frameworks": [k for k, v in framework_detection.items() if v]
        })
    
    if complexity_score >= 10:
        recommendations.append({
            "type": "warning",
            "message": "High complexity detected. Use simple HTML/CSS for modifications."
        })
    
    if structure_analysis["forms"] > 0 and not soup.find("form", method="post"):
        recommendations.append({
            "type": "info",
            "message": "Forms use GET method. Consider POST for sensitive data."
        })
    
    result["recommendations"] = recommendations
    
    return result


# Export functions for MCP registration
__all__ = [
    "ui_capture",
    "ui_interact", 
    "ui_sandbox",
    "ui_analyze",
    "browser_manager",
    "get_tekton_selector",
    "get_common_selectors",
    "VALID_COMPONENTS"
]