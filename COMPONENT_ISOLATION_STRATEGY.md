# Hephaestus Component Isolation Strategy

## Overview

This document outlines the strategy for implementing proper component isolation in the Hephaestus UI to address the duplication issues identified in Phase 0. The approach focuses on using Shadow DOM for component encapsulation while maintaining a consistent theming and interaction model.

## Current Problems

1. **Style Bleeding**: CSS from one component affects other components and the main UI
2. **DOM Duplication**: Component HTML can include duplicate elements from the main UI
3. **Event Handler Collisions**: Multiple components initialize the same event handlers
4. **Inconsistent Loading**: Different methods for loading different components

## Isolation Approach: Shadow DOM

After evaluating the options in the reimplementation guide, we will use **Shadow DOM** for component isolation because it provides:

1. Strong style encapsulation while maintaining theme variables
2. DOM isolation to prevent recursive nesting
3. Event scoping to avoid handler duplication
4. Standard web platform technology with good browser support

## Implementation Strategy

### 1. Component Container Structure

```html
<div id="component-host">
  <!-- Shadow root will be attached here -->
</div>
```

Each component will be loaded into its own shadow root attached to a dedicated host element.

### 2. Shadow DOM Creation

```javascript
function loadComponentInShadowDOM(componentId, containerElement) {
  // Clear container
  containerElement.innerHTML = '';
  
  // Create host element
  const host = document.createElement('div');
  host.id = `${componentId}-host`;
  containerElement.appendChild(host);
  
  // Create shadow root
  const shadowRoot = host.attachShadow({ mode: 'open' });
  
  // Return shadow root for content insertion
  return shadowRoot;
}
```

### 3. Theming Support

To maintain consistent theming across shadow boundaries, we'll use CSS custom properties:

```javascript
function addThemeStylesToShadowRoot(shadowRoot) {
  const themeStyle = document.createElement('style');
  themeStyle.textContent = `
    :host {
      /* Import all theme variables from parent */
      --bg-primary: var(--bg-primary, #1e1e1e);
      --bg-secondary: var(--bg-secondary, #252525);
      --text-primary: var(--text-primary, #f0f0f0);
      /* Add all other theme variables... */
    }
  `;
  shadowRoot.prepend(themeStyle);
}
```

### 4. Content Loading

```javascript
function loadComponentContent(componentId, shadowRoot) {
  // Fetch component HTML
  return fetch(`/components/${componentId}/${componentId}-component.html`)
    .then(response => response.text())
    .then(html => {
      // Create wrapper with component-specific class
      const wrapper = document.createElement('div');
      wrapper.className = `${componentId}-container`;
      wrapper.innerHTML = html;
      
      // Append to shadow root
      shadowRoot.appendChild(wrapper);
      
      // Return wrapper for further processing
      return wrapper;
    });
}
```

### 5. Style Loading

```javascript
function loadComponentStyles(componentId, shadowRoot) {
  return fetch(`/styles/${componentId}/${componentId}-component.css`)
    .then(response => response.text())
    .then(css => {
      // Create scoped stylesheet
      const style = document.createElement('style');
      
      // Process CSS to use component-specific selectors
      // This prevents using generic selectors like .tab-content
      const processedCSS = css
        .replace(/\.tab-button/g, `.${componentId}-tab-button`)
        .replace(/\.tab-content/g, `.${componentId}-tab-content`);
        
      style.textContent = processedCSS;
      shadowRoot.appendChild(style);
    });
}
```

### 6. Script Initialization

```javascript
function initializeComponentScripts(componentId, shadowRoot) {
  return fetch(`/scripts/${componentId}/${componentId}-component.js`)
    .then(response => response.text())
    .then(jsCode => {
      // Create a scoped initialization function that receives the shadow root
      const scopedInit = new Function('shadowRoot', 'componentId', 
        `const component = {
          // Component context object
          id: componentId,
          root: shadowRoot,
          
          // Scoped querySelector that only searches within component
          $(selector) {
            return this.root.querySelector(selector);
          },
          
          // Scoped event delegation
          on(eventType, selector, handler) {
            this.root.addEventListener(eventType, (event) => {
              const elements = this.root.querySelectorAll(selector);
              const element = event.target.closest(selector);
              if (element && [...elements].includes(element)) {
                handler.call(element, event);
              }
            });
          }
        };
        
        // Execute component code with component context
        (function(component) {
          ${jsCode}
        })(component);`
      );
      
      // Execute the scoped initialization
      scopedInit(shadowRoot, componentId);
    });
}
```

### 7. Component Cleanup

```javascript
function cleanupComponent(componentId, shadowRoot) {
  // Store cleanup handlers registered by component
  if (window.__componentCleanupHandlers && 
      window.__componentCleanupHandlers[componentId]) {
    // Execute registered cleanup
    window.__componentCleanupHandlers[componentId]();
  }
  
  // Remove all event listeners (not necessary with Shadow DOM,
  // but good practice for explicit cleanup)
  const host = shadowRoot.host;
  host.remove();
}
```

### 8. Unified Component Loader

```javascript
class ComponentLoader {
  constructor() {
    this.activeComponents = {};
    this.componentRegistry = {};
  }
  
  async loadComponent(componentId, containerElement) {
    // Cleanup previous component if it exists
    if (this.activeComponents[componentId]) {
      this.cleanupComponent(componentId);
    }
    
    // Create shadow DOM for isolation
    const shadowRoot = loadComponentInShadowDOM(componentId, containerElement);
    
    // Add theme variables for styling consistency
    addThemeStylesToShadowRoot(shadowRoot);
    
    try {
      // Load component HTML content into shadow root
      const componentWrapper = await loadComponentContent(componentId, shadowRoot);
      
      // Load component-specific styles
      await loadComponentStyles(componentId, shadowRoot);
      
      // Initialize component scripts
      await initializeComponentScripts(componentId, shadowRoot);
      
      // Store active component reference
      this.activeComponents[componentId] = {
        id: componentId,
        shadowRoot,
        wrapper: componentWrapper
      };
      
      // Return component reference
      return this.activeComponents[componentId];
    } catch (error) {
      console.error(`Error loading component ${componentId}:`, error);
      shadowRoot.innerHTML = `
        <div class="component-error">
          <h3>Error Loading Component</h3>
          <p>${error.message}</p>
        </div>
      `;
      return null;
    }
  }
  
  cleanupComponent(componentId) {
    const component = this.activeComponents[componentId];
    if (component) {
      // Execute cleanup routine
      cleanupComponent(componentId, component.shadowRoot);
      // Remove from active components
      delete this.activeComponents[componentId];
    }
  }
}
```

## Component HTML Structure Guidelines

To ensure components work properly with Shadow DOM isolation, the following guidelines should be followed:

1. **Use Component-Specific Selectors**:
   ```html
   <!-- Instead of this -->
   <div class="tab-button">Settings</div>
   
   <!-- Use this -->
   <div class="rhetor-tab-button">Settings</div>
   ```

2. **Avoid Document-Level Queries**:
   ```javascript
   // Instead of this
   document.querySelector('.tab-button')
   
   // Use component context
   component.$('.rhetor-tab-button')
   ```

3. **Register Cleanup Handlers**:
   ```javascript
   // Register cleanup for when component is unloaded
   window.__componentCleanupHandlers = window.__componentCleanupHandlers || {};
   window.__componentCleanupHandlers[componentId] = function() {
     // Cleanup code here
   };
   ```

4. **Use Event Delegation**:
   ```javascript
   // Instead of attaching to each button
   component.on('click', '.rhetor-tab-button', function(event) {
     // Handle tab button click
   });
   ```

## Theme Integration

To ensure components receive theme changes:

1. **Theme Change Events**:
   ```javascript
   // In main UI
   document.addEventListener('themeChanged', (event) => {
     const newTheme = event.detail.theme;
     document.documentElement.dataset.theme = newTheme;
   });
   ```

2. **Component Theme Observers**:
   ```javascript
   // Setup theme observer in component initialization
   function setupThemeObserver(shadowRoot) {
     // Create MutationObserver to watch for theme attribute changes
     const observer = new MutationObserver((mutations) => {
       mutations.forEach((mutation) => {
         if (mutation.attributeName === 'data-theme') {
           // Theme changed, update component theme
           const newTheme = document.documentElement.dataset.theme;
           shadowRoot.host.dataset.theme = newTheme;
         }
       });
     });
     
     // Start observing
     observer.observe(document.documentElement, { 
       attributes: true,
       attributeFilter: ['data-theme']
     });
     
     // Return cleanup function
     return () => observer.disconnect();
   }
   ```

## Migration Strategy

To migrate existing components to the new isolation strategy:

1. **Update Component HTML**:
   - Prefix all CSS classes with component ID
   - Remove any document-level queries
   - Structure HTML to be a self-contained component

2. **Update Component CSS**:
   - Use component-specific selectors
   - Replace direct element selection with class-based selection
   - Utilize CSS variables for theming

3. **Update Component JS**:
   - Use component context for DOM queries
   - Implement event delegation
   - Register cleanup handlers

4. **Migrate in Phases**:
   - Start with problematic components (Rhetor, Budget)
   - Then migrate utility components (Settings, Profile)
   - Finally migrate remaining components

## Testing Strategy

1. **Component Isolation Testing**:
   - Verify CSS does not leak between components
   - Ensure events only affect the component that owns them
   - Test that theme changes propagate correctly

2. **Component Switching Testing**:
   - Verify that loading one component does not affect others
   - Test rapid switching between components
   - Ensure component state is preserved when switching

3. **Error Handling**:
   - Test component loading failures
   - Verify graceful degradation when components cannot load

## Example: Migrating Rhetor Component

### Old Component Loading:
```javascript
function loadRhetorComponent() {
  // Clear HTML panel
  htmlPanel.innerHTML = '';
  
  // Create container
  const container = document.createElement('div');
  container.id = 'rhetor-container';
  htmlPanel.appendChild(container);
  
  // Fetch HTML
  fetch('components/rhetor/rhetor-component.html')
    .then(response => response.text())
    .then(html => {
      container.innerHTML = html;
      
      // Load CSS and JS
      const styleElement = document.createElement('link');
      styleElement.rel = 'stylesheet';
      styleElement.href = '/styles/rhetor/rhetor-component.css';
      document.head.appendChild(styleElement);
      
      const scriptElement = document.createElement('script');
      scriptElement.src = '/scripts/rhetor/rhetor-component.js';
      document.head.appendChild(scriptElement);
    });
}
```

### New Component Loading:
```javascript
async function loadRhetorComponent() {
  // Get the HTML panel
  const htmlPanel = document.getElementById('html-panel');
  
  // Load component using the unified loader
  const component = await componentLoader.loadComponent('rhetor', htmlPanel);
  
  // Activate HTML panel
  uiManager.activatePanel('html');
  
  return component;
}
```

This structured approach ensures proper isolation, easier maintenance, and avoids the duplication issues currently plaguing the Hephaestus UI implementation.