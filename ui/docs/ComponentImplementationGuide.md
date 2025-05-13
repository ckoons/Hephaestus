# Tekton Component Implementation Guide

## Overview
This guide outlines best practices for implementing UI components in the Tekton Hephaestus system following the Clean Slate approach. Following these patterns ensures components are isolated, maintainable, and function correctly.

## Component Structure

Each component should follow this structure:

```
/components/
  /{component-name}/
    {component-name}-component.html  # HTML and CSS 
/scripts/
  /{component-name}/
    {component-name}-component.js    # JavaScript implementation
```

## HTML & CSS Implementation

```html
<!-- {Component} Component - {Brief description} -->
<div class="{component}">
    <!-- Component Header -->
    <div class="{component}__header">
        <!-- Header content -->
    </div>
    
    <!-- Tab Navigation (if needed) -->
    <div class="{component}__menu-bar">
        <div class="{component}__tabs">
            <div class="{component}__tab {component}__tab--active" data-tab="tab1">
                <span class="{component}__tab-label">Tab 1</span>
            </div>
            <!-- Additional tabs... -->
        </div>
    </div>
    
    <!-- Content Area -->
    <div class="{component}__content">
        <!-- Tab Panels -->
        <div id="tab1-panel" class="{component}__panel {component}__panel--active">
            <!-- Panel content -->
        </div>
        <!-- Additional panels... -->
    </div>
    
    <!-- Footer (if needed) -->
    <div class="{component}__footer">
        <!-- Footer content -->
    </div>
</div>

<!-- Component Styles -->
<style>
    /* Component styles using BEM naming convention */
    .{component} {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
    }
    
    /* Panel visibility control - REQUIRED for tab switching */
    .{component}__panel {
        display: none;
        height: 100%;
        width: 100%;
        overflow: auto;
    }
    
    .{component}__panel--active {
        display: block;
    }
    
    /* Additional component-specific styles... */
</style>

<!-- Script Loading - CORRECT PATTERN -->
<script>
    // Use direct script inclusion with cache busting
    const timestamp = new Date().getTime();
    const scriptPath = `/scripts/{component}/{component}-component.js?t=${timestamp}`;
    
    console.log('Loading {Component} component script from:', scriptPath);
    
    // Create and insert script directly (not in DOMContentLoaded)
    const script = document.createElement('script');
    script.src = scriptPath;
    script.async = false; // Important for reliable loading
    
    // Handle loading and errors
    script.onload = function() {
        console.log('{Component} component script loaded successfully');
        if (window.{component}Component && typeof window.{component}Component.init === 'function') {
            window.{component}Component.init();
        } else {
            console.error('{Component} component not properly loaded');
        }
    };
    
    script.onerror = function(error) {
        console.error('Failed to load {Component} component script:', error);
    };
    
    // Add to document.body (not head) for better visibility
    document.body.appendChild(script);
</script>
```

## JavaScript Implementation

```javascript
/**
 * {Component} Component
 * {Brief description} with BEM naming conventions
 */

class {Component}Component {
    constructor() {
        this.state = {
            initialized: false,
            activeTab: 'tab1', // Default tab
            // Component-specific state...
        };
        
        // Component-specific properties...
    }
    
    /**
     * Initialize the component
     */
    init() {
        // Debug instrumentation (can be added at zero-cost)
        if (window.TektonDebug) TektonDebug.info('{component}', 'Initializing {Component} component');
        
        // If already initialized, just activate
        if (this.state.initialized) {
            if (window.TektonDebug) TektonDebug.info('{component}', '{Component} component already initialized, just activating');
            this.activateComponent();
            return this;
        }
        
        // Setup component functionality
        this.setupTabs();
        this.setupEventListeners();
        // Additional setup...
        
        // Mark as initialized
        this.state.initialized = true;
        
        return this;
    }
    
    /**
     * Set up tab switching functionality
     */
    setupTabs() {
        if (window.TektonDebug) TektonDebug.debug('{component}', 'Setting up {Component} tabs');
        
        // Find the component container
        const container = document.querySelector('.{component}');
        if (!container) {
            if (window.TektonDebug) TektonDebug.error('{component}', '{Component} container not found!');
            return;
        }
        
        // Get tabs within the container
        const tabs = container.querySelectorAll('.{component}__tab');
        
        // Add click handlers to tabs
        tabs.forEach(tab => {
            const tabId = tab.getAttribute('data-tab');
            tab.addEventListener('click', () => {
                this.activateTab(tabId);
            });
        });
        
        // Activate the default tab
        const defaultTab = this.state.activeTab || 'tab1';
        this.activateTab(defaultTab);
    }
    
    /**
     * Activate a specific tab - CORRECT IMPLEMENTATION
     * @param {string} tabId - The ID of the tab to activate
     */
    activateTab(tabId) {
        if (window.TektonDebug) TektonDebug.debug('{component}', `Activating tab: ${tabId}`);
        
        // Find the component container
        const container = document.querySelector('.{component}');
        if (!container) {
            if (window.TektonDebug) TektonDebug.error('{component}', '{Component} container not found!');
            return;
        }
        
        // Update active tab - remove active class from all tabs
        container.querySelectorAll('.{component}__tab').forEach(t => {
            t.classList.remove('{component}__tab--active');
        });
        
        // Add active class to the selected tab
        const tabButton = container.querySelector(`.{component}__tab[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.classList.add('{component}__tab--active');
        } else {
            if (window.TektonDebug) TektonDebug.error('{component}', `Tab button not found for tab: ${tabId}`);
            return; // Exit early if we can't find the tab
        }
        
        // Hide all panels by removing active class
        container.querySelectorAll('.{component}__panel').forEach(panel => {
            panel.classList.remove('{component}__panel--active');
        });
        
        // Show the specific tab panel by adding active class
        const tabPanel = container.querySelector(`#${tabId}-panel`);
        if (tabPanel) {
            tabPanel.classList.add('{component}__panel--active');
        } else {
            if (window.TektonDebug) TektonDebug.error('{component}', `Panel not found for tab: ${tabId}`);
        }
        
        // Save active tab to state
        this.state.activeTab = tabId;
    }
    
    // Additional component methods...
}

// Create global instance
window.{component}Component = new {Component}Component();
```

## Debug Instrumentation

Tekton includes a lightweight debug instrumentation system that allows you to add logging with zero overhead in production environments. To use it:

1. Check for the existence of the `TektonDebug` object before using it (conditional instrumentation)
2. Use the appropriate log level (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
3. Always include the component name as the first parameter
4. Include contextual data where helpful

```javascript
// Example debug instrumentation
if (window.TektonDebug) TektonDebug.debug('componentName', 'Message', optionalData);
```

When the debug system is disabled (default), these calls have virtually zero overhead. When enabled, they provide rich contextual information.

## Best Practices

### Component Isolation
- Each component should be fully contained within its root element
- Use BEM naming to prevent CSS conflicts (`{component}__element--modifier`)
- Scope all DOM operations to the component container
- Avoid global state or direct DOM manipulation outside the component

### Script Loading
- Use the pattern shown above - direct script insertion with cache busting
- Don't use DOMContentLoaded within components (already handled by minimal-loader)
- Set `async=false` for reliable script execution order
- Include proper error handling for script loading

### Tab Switching
- Tabs must have `data-tab` attribute matching panel IDs (`data-tab="tab1"` → `id="tab1-panel"`)
- Panels must have CSS classes for visibility control (`.{component}__panel--active`)
- Use CSS classes, not inline styles, for showing/hiding panels
- Follow the `activateTab()` pattern shown above

### Debugging
- Use the conditional debug instrumentation pattern
- Check for `window.TektonDebug` before using it
- Include component name with all debug calls
- Add contextual data for complex operations

## Minimal Loader Integration
The minimal-loader.js script handles component loading and initialization. It:
1. Fetches the component HTML
2. Adds it to the DOM
3. Executes any script tags found in the component
4. Calls `init()` on the component if available

Your component must expose a global `{component}Component` object with an `init()` method to work correctly with the loader.

## Troubleshooting
- **Component not loading**: Check browser console for script loading errors
- **Tabs not working**: Verify panel IDs match data-tab attributes exactly
- **CSS issues**: Ensure proper BEM naming and containment
- **Initialization problems**: Verify the global component object and init() method

## Example Components
- See `/components/ergon/ergon-component.html` and `/scripts/ergon/ergon-component.js` for a working example
- Also reference `/components/athena/athena-component.html` for another implementation