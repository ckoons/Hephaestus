/**
 * Minimal Component Loader for Hephaestus UI
 * 
 * Handles loading and basic lifecycle management of UI components
 * using direct HTML injection for simplicity and reliability.
 */

class ComponentLoader {
  constructor() {
    this.activeComponents = {};
    this.currentTheme = 'dark-blue';

    // Component paths mapping - using standardized paths
    this.componentPaths = {
      'athena': 'components/athena/athena-component.html',
      'ergon': 'components/ergon/ergon-component.html',
      'rhetor': 'components/rhetor/rhetor-component.html',
      'terma': 'components/terma/terma-component.html',
      'engram': 'components/engram/engram-component.html',
      'hermes': 'components/hermes/hermes-component.html',
      'codex': 'components/codex/codex-component.html',
      'prometheus': 'components/prometheus/prometheus-component.html',
      'telos': 'components/telos/telos-component.html',
      'harmonia': 'components/harmonia/harmonia-component.html',
      'synthesis': 'components/synthesis/synthesis-component.html',
      'sophia': 'components/sophia/sophia-component.html',
      'tekton': 'components/tekton/tekton-component.html',
      'test': 'components/test/test-component.html'
    };

    // Initialize registry from JSON
    this.registry = null;
    this.loadComponentRegistry().then(registry => {
      this.registry = registry;
      console.log('Registry loaded:', this.registry);
    }).catch(error => {
      console.error('Failed to load registry:', error);
    });
  }
  
  /**
   * Load a component into the right panel
   * 
   * @param {string} componentId - ID of the component to load
   * @param {HTMLElement} containerElement - Container element to load the component into
   * @returns {Promise<Object>} - Promise resolving to the component reference
   */
  async loadComponent(componentId, containerElement) {
    console.log(`Loading component: ${componentId}`);

    // Check if we're loading the component too frequently - could cause flickering
    const now = new Date().getTime();
    const lastLoadTime = this.activeComponents[componentId]?.loadTime || 0;
    if (now - lastLoadTime < 500) { // Less than 500ms since last load
      console.warn(`Component ${componentId} loaded too frequently, potential loop detected. Skipping.`);
      return this.activeComponents[componentId] || null;
    }

    // Prevent reloading the same component if it's already loaded and active
    if (this.activeComponents[componentId] &&
        this.activeComponents[componentId].loaded &&
        this.activeComponents[componentId].active) {
      console.log(`Component ${componentId} is already loaded and active, skipping reload`);
      return this.activeComponents[componentId];
    }

    try {
      // First mark all components as inactive
      Object.keys(this.activeComponents).forEach(id => {
        if (this.activeComponents[id]) {
          this.activeComponents[id].active = false;
        }
      });

      // Cleanup previous component if it exists
      this.cleanupComponent(componentId);

      // Get container element if not provided (default to html-panel)
      if (!containerElement) {
        containerElement = document.getElementById('html-panel');
        if (!containerElement) {
          throw new Error('HTML panel not found');
        }
      }

      // Clear the panel and show loading indicator
      containerElement.innerHTML = `<div class="loading-indicator">Loading ${componentId} component...</div>`;

      // Make sure panels are visible and positioned correctly
      containerElement.style.display = 'block';

      // Activate the panel in the UI manager if available
      if (window.uiManager) {
        window.uiManager.activatePanel('html');
      }

      // Update navigation UI to show active component
      this._updateComponentNav(componentId);

      // Load component HTML content
      const componentHtml = await this._loadComponentContent(componentId);

      // Insert component HTML into panel
      containerElement.innerHTML = componentHtml;

      // Check if component uses Shadow DOM
      const usesShadowDom = this._componentUsesShadowDom(componentId);
      console.log(`Component ${componentId} uses shadow DOM: ${usesShadowDom}`);

      // Load component-specific scripts
      await this._loadComponentScript(componentId, containerElement);

      // Add component ID as a data attribute to container
      containerElement.setAttribute('data-component-id', componentId);

      // Add component-specific class to container for styling
      containerElement.classList.add(`${componentId}-container`);

      // Store active component reference
      this.activeComponents[componentId] = {
        id: componentId,
        loaded: true,
        active: true,
        container: containerElement,
        usesShadowDom: usesShadowDom,
        loadTime: now // Track when this component was loaded
      };

      console.log(`Component ${componentId} loaded successfully`);

      // Initialize component if it has an init function
      const componentGlobal = window[`${componentId}Component`];
      if (componentGlobal && typeof componentGlobal.init === 'function') {
        console.log(`Initializing ${componentId} component with global init function`);
        componentGlobal.init();
      } else {
        // Only dispatch DOM event if there are no inline scripts
        const hasInlineScripts = containerElement.querySelectorAll('script').length > 0;
        if (!hasInlineScripts) {
          console.log(`No initialization function found for ${componentId}, using DOMContentLoaded`);
          const initEvent = new Event('DOMContentLoaded');
          document.dispatchEvent(initEvent);
        } else {
          console.log(`Component ${componentId} has inline scripts, skipping DOMContentLoaded dispatch`);
        }
      }

      // Return component reference
      return this.activeComponents[componentId];
    } catch (error) {
      console.error(`Error loading component ${componentId}:`, error);
      this._showErrorInPanel(componentId, containerElement, error);
      return null;
    }
  }

  /**
   * Check if a component uses Shadow DOM based on registry
   *
   * @param {string} componentId - ID of the component
   * @returns {boolean} - Whether the component uses Shadow DOM
   */
  _componentUsesShadowDom(componentId) {
    // Check registry if available
    if (this.registry && this.registry.components) {
      const component = this.registry.components.find(c => c.id === componentId);
      if (component && component.hasOwnProperty('usesShadowDom')) {
        return component.usesShadowDom;
      }
    }

    // Default to false for new components
    return false;
  }
  
  /**
   * Update navigation UI to show active component
   * 
   * @param {string} componentId - ID of the component to activate
   */
  _updateComponentNav(componentId) {
    // Update navigation items to show active component
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-component') === componentId) {
        item.classList.add('active');
        // Make status indicator visible for active component
        const statusIndicator = item.querySelector('.status-indicator');
        if (statusIndicator) {
          statusIndicator.classList.add('active');
        }
      } else {
        item.classList.remove('active');
        // Remove active class from status indicator
        const statusIndicator = item.querySelector('.status-indicator');
        if (statusIndicator) {
          statusIndicator.classList.remove('active');
        }
      }
    });
    
    // Update component title
    const componentTitle = document.querySelector('.component-title');
    const activeNavItem = document.querySelector(`.nav-item[data-component="${componentId}"]`);
    if (activeNavItem && componentTitle) {
      componentTitle.textContent = activeNavItem.querySelector('.nav-label').textContent;
    }
  }
  
  /**
   * Load component HTML content
   * 
   * @param {string} componentId - ID of the component
   * @returns {Promise<string>} - Promise resolving to the component HTML
   */
  async _loadComponentContent(componentId) {
    console.log(`Loading HTML content for ${componentId}`);
    
    // Add cache busting parameter
    const cacheBuster = `?t=${new Date().getTime()}`;
    
    // Use standardized path or fallback to default pattern if not explicitly defined
    let componentPath = this.componentPaths[componentId];

    if (!componentPath) {
      // Use standardized path pattern as fallback
      console.warn(`Component path not explicitly defined for ${componentId}, using default pattern`);
      componentPath = `components/${componentId}/${componentId}-component.html`;
    }
    
    try {
      console.log(`Loading HTML from: ${componentPath}`);
      const response = await fetch(`${componentPath}${cacheBuster}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load component HTML: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      
      if (!html || html.trim().length === 0) {
        throw new Error('Received empty HTML content');
      }
      
      return html;
    } catch (error) {
      console.error(`Error loading component HTML for ${componentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Load component-specific JavaScript
   * 
   * @param {string} componentId - ID of the component
   * @param {HTMLElement} containerElement - Container element that contains the component
   * @returns {Promise<void>}
   */
  async _loadComponentScript(componentId, containerElement) {
    console.log(`Loading script for ${componentId}`);

    // First, check for inline scripts in the component HTML
    const inlineScripts = containerElement.querySelectorAll('script');
    if (inlineScripts.length > 0) {
      console.log(`Found ${inlineScripts.length} inline scripts for ${componentId}`);

      // Execute each inline script
      for (const inlineScript of inlineScripts) {
        try {
          // Create a new script element to execute the code
          const newScript = document.createElement('script');
          newScript.textContent = inlineScript.textContent;

          // Remove the original inline script
          inlineScript.remove();

          // Append the new script to trigger execution
          document.head.appendChild(newScript);

          console.log(`Executed inline script for ${componentId}`);
        } catch (error) {
          console.warn(`Error executing inline script for ${componentId}:`, error);
        }
      }
    }

    // Set up context for component scripts
    if (!window.componentContext) {
      window.componentContext = {};
    }

    // Create context for this component
    window.componentContext[componentId] = {
      root: containerElement,
      $: function(selector) { return containerElement.querySelector(selector); },
      $$: function(selector) { return containerElement.querySelectorAll(selector); }
    };

    // Add cache busting parameter
    const cacheBuster = `?t=${new Date().getTime()}`;

    // Check if it's a nested path or a direct component path
    let scriptPath;
    if (componentId.includes('/')) {
      // Handle nested path
      scriptPath = `scripts/${componentId}-component.js`;
    } else {
      // Standard path structure
      scriptPath = `scripts/${componentId}/${componentId}-component.js`;
    }

    // Check if component has external script
    if (this._shouldLoadExternalScript(componentId)) {
      return new Promise((resolve, reject) => {
        try {
          // Check if script already exists
          const existingScript = document.querySelector(`script[src^="${scriptPath}"]`);
          if (existingScript) {
            existingScript.remove();
          }

          // Create script element
          const script = document.createElement('script');
          script.src = `${scriptPath}${cacheBuster}`;

          // Handle script load events
          script.onload = () => {
            console.log(`External script loaded for ${componentId}`);
            resolve();
          };

          script.onerror = (error) => {
            console.warn(`Error loading external script for ${componentId}:`, error);
            // Non-critical error, we can continue without script
            resolve();
          };

          // Add script to document
          document.head.appendChild(script);
        } catch (error) {
          console.warn(`Error setting up external script for ${componentId}:`, error);
          // Non-critical error, we can continue without script
          resolve();
        }
      });
    }

    return Promise.resolve();
  }

  /**
   * Determine if a component should load an external script
   *
   * @param {string} componentId - ID of the component
   * @returns {boolean} - Whether to load an external script
   */
  _shouldLoadExternalScript(componentId) {
    // Check registry if available
    if (this.registry && this.registry.components) {
      const component = this.registry.components.find(c => c.id === componentId);
      if (component && component.scripts && component.scripts.length > 0) {
        return true;
      }
    }

    // Fall back to a simple test for external script
    try {
      // Check if standard external script file exists
      const scriptPath = `scripts/${componentId}/${componentId}-component.js`;
      const request = new XMLHttpRequest();
      request.open('HEAD', scriptPath, false);
      request.send();
      return request.status !== 404;
    } catch (error) {
      console.warn(`Error checking for external script: ${error}`);
      return false;
    }
  }
  
  /**
   * Show error message when component loading fails
   * 
   * @param {string} componentId - ID of the component
   * @param {HTMLElement} containerElement - Container element
   * @param {Error} error - The error that occurred
   */
  _showErrorInPanel(componentId, containerElement, error) {
    // Make sure we have a container element
    if (!containerElement) {
      containerElement = document.getElementById('html-panel');
      if (!containerElement) return;
    }
    
    // Show error message
    containerElement.innerHTML = `
      <div class="component-error" style="padding: 20px; margin: 20px; background-color: #2d2d2d; border: 1px solid #dc3545; border-radius: 8px;">
        <h3 style="color: #dc3545; margin-top: 0;">Error Loading ${componentId} Component</h3>
        <p>${error.message}</p>
        <div class="error-message" style="background-color: #333; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; color: #aaa;">${error.stack || ''}</div>
        <button id="retry-button" style="background-color: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry Loading</button>
      </div>
    `;
    
    // Add retry button functionality
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.loadComponent(componentId, containerElement);
      });
    }
  }
  
  /**
   * Clean up a component instance
   * 
   * @param {string} componentId - ID of the component to clean up
   */
  cleanupComponent(componentId) {
    console.log(`Cleaning up component: ${componentId}`);
    
    // Get cleanup function from global scope if it exists
    const component = this.activeComponents[componentId];
    
    // Call component's cleanup method if available
    if (component && typeof component.cleanup === 'function') {
      try {
        component.cleanup();
      } catch (error) {
        console.error(`Error executing cleanup method for ${componentId}:`, error);
      }
    }
    
    // Also check for global cleanup function
    const cleanupFnName = `${componentId}Cleanup`;
    if (typeof window[cleanupFnName] === 'function') {
      try {
        window[cleanupFnName]();
      } catch (error) {
        console.error(`Error executing cleanup function for ${componentId}:`, error);
      }
    }
    
    // Remove component context
    if (window.componentContext && window.componentContext[componentId]) {
      delete window.componentContext[componentId];
    }
    
    // Remove active component reference
    if (this.activeComponents[componentId]) {
      delete this.activeComponents[componentId];
    }
  }
  
  /**
   * Load the component registry to get metadata about available components
   * 
   * @returns {Promise<Object>} - Promise resolving to the component registry
   */
  async loadComponentRegistry() {
    try {
      const response = await fetch('server/component_registry.json');
      
      if (!response.ok) {
        throw new Error(`Failed to load component registry: ${response.status}`);
      }
      
      const registry = await response.json();
      
      console.log('Component registry loaded:', registry);
      return registry;
    } catch (error) {
      console.error('Error loading component registry:', error);
      throw error;
    }
  }
}

// Export a global instance for use in other scripts
window.componentLoader = new ComponentLoader();