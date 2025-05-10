/**
 * Component Loader for Hephaestus UI
 * 
 * Handles loading and lifecycle management of UI components using Shadow DOM
 * for proper isolation and encapsulation.
 */

class ComponentLoader {
  constructor() {
    this.activeComponents = {};
    this.themeObservers = {};
    this.componentRegistry = {};
    this.loadingComponents = new Set(); // Track components currently loading
    
    // Initialize theme tracking
    this.currentTheme = document.documentElement.dataset.theme || 'dark-blue';
    
    // Component paths mapping
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
      'sophia': 'components/sophia/sophia-component.html'
    };
    
    // Setup theme observer for the document root
    this._setupDocumentThemeObserver();
  }
  
  /**
   * Load a component into a container with Shadow DOM isolation
   * 
   * @param {string} componentId - ID of the component to load
   * @param {HTMLElement} containerElement - Container to load the component into
   * @param {Object} options - Additional options for loading
   * @returns {Promise<Object>} - Promise resolving to the component reference
   */
  async loadComponent(componentId, containerElement, options = {}) {
    console.log(`Loading component: ${componentId}`);
    
    if (this.loadingComponents.has(componentId)) {
      console.warn(`Component ${componentId} is already loading, ignoring duplicate request`);
      return null;
    }
    
    // Mark component as loading
    this.loadingComponents.add(componentId);
    
    try {
      // Cleanup previous component if it exists
      if (this.activeComponents[componentId]) {
        this.cleanupComponent(componentId);
      }
      
      // Create shadow DOM for isolation
      const shadowRoot = this._createShadowDOM(componentId, containerElement);
      
      // Add theme variables for styling consistency
      this._addThemeStylesToShadowRoot(shadowRoot);
      
      // Load component HTML content into shadow root
      const componentWrapper = await this._loadComponentContent(componentId, shadowRoot);
      
      // Load component-specific styles
      await this._loadComponentStyles(componentId, shadowRoot);
      
      // Initialize component scripts
      await this._initializeComponentScripts(componentId, shadowRoot);
      
      // Store active component reference
      this.activeComponents[componentId] = {
        id: componentId,
        shadowRoot,
        wrapper: componentWrapper,
        container: containerElement
      };
      
      // Setup theme observer for this component
      this._setupComponentThemeObserver(componentId, shadowRoot);
      
      // Mark component as no longer loading
      this.loadingComponents.delete(componentId);
      
      console.log(`Component ${componentId} loaded successfully`);
      
      // Return component reference
      return this.activeComponents[componentId];
    } catch (error) {
      console.error(`Error loading component ${componentId}:`, error);
      
      // Show error in the container
      this._showErrorInShadowRoot(componentId, containerElement, error);
      
      // Mark component as no longer loading
      this.loadingComponents.delete(componentId);
      
      return null;
    }
  }
  
  /**
   * Create Shadow DOM for a component
   * 
   * @param {string} componentId - ID of the component
   * @param {HTMLElement} containerElement - Container element
   * @returns {ShadowRoot} The created shadow root
   */
  _createShadowDOM(componentId, containerElement) {
    console.log(`Creating Shadow DOM for ${componentId}`);
    
    // Clear container
    containerElement.innerHTML = '';
    
    // Create host element
    const host = document.createElement('div');
    host.id = `${componentId}-host`;
    host.dataset.componentId = componentId;
    host.style.height = '100%';
    host.style.width = '100%';
    host.style.display = 'block';
    containerElement.appendChild(host);
    
    // Create shadow root with open mode for debugging
    const shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Add component attribute to the shadow root for identification
    shadowRoot.host.dataset.component = componentId;
    
    // Add current theme to the host element
    shadowRoot.host.dataset.theme = this.currentTheme;
    
    return shadowRoot;
  }
  
  /**
   * Add theme variables to a shadow root
   * 
   * @param {ShadowRoot} shadowRoot - The shadow root to add styles to
   */
  _addThemeStylesToShadowRoot(shadowRoot) {
    const themeStyle = document.createElement('style');
    themeStyle.id = 'theme-variables';
    themeStyle.textContent = `
      :host {
        /* Import theme variables from parent */
        --bg-primary: var(--bg-primary, #1e1e1e);
        --bg-secondary: var(--bg-secondary, #252525);
        --bg-tertiary: var(--bg-tertiary, #333333);
        --bg-card: var(--bg-card, #2d2d2d);
        --bg-hover: var(--bg-hover, #3a3a3a);
        
        /* Text colors */
        --text-primary: var(--text-primary, #f0f0f0);
        --text-secondary: var(--text-secondary, #aaaaaa);
        --text-disabled: var(--text-disabled, #666666);
        
        /* Brand colors */
        --color-primary: var(--color-primary, #007bff);
        --color-primary-hover: var(--color-primary-hover, #0056b3);
        --color-secondary: var(--color-secondary, #6c757d);
        --color-success: var(--color-success, #28a745);
        --color-warning: var(--color-warning, #ffc107);
        --color-danger: var(--color-danger, #dc3545);
        --color-info: var(--color-info, #17a2b8);
        
        /* Border colors */
        --border-color: var(--border-color, #444444);
        --border-radius-sm: var(--border-radius-sm, 4px);
        --border-radius-md: var(--border-radius-md, 8px);
        --border-radius-lg: var(--border-radius-lg, 12px);
        
        /* Spacing */
        --spacing-xs: var(--spacing-xs, 4px);
        --spacing-sm: var(--spacing-sm, 8px);
        --spacing-md: var(--spacing-md, 16px);
        --spacing-lg: var(--spacing-lg, 24px);
        --spacing-xl: var(--spacing-xl, 32px);
        
        /* Typography */
        --font-family-sans: var(--font-family-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        --font-family-mono: var(--font-family-mono, 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace);
        --font-size-xs: var(--font-size-xs, 0.75rem);
        --font-size-sm: var(--font-size-sm, 0.875rem);
        --font-size-md: var(--font-size-md, 1rem);
        --font-size-lg: var(--font-size-lg, 1.25rem);
        --font-size-xl: var(--font-size-xl, 1.5rem);
        
        /* Effects */
        --box-shadow-sm: var(--box-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
        --box-shadow-md: var(--box-shadow-md, 0 4px 8px rgba(0, 0, 0, 0.1));
        --box-shadow-lg: var(--box-shadow-lg, 0 8px 16px rgba(0, 0, 0, 0.1));
        
        /* Set default styles for component */
        display: block;
        height: 100%;
        width: 100%;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-family: var(--font-family-sans);
        box-sizing: border-box;
      }
    `;
    shadowRoot.prepend(themeStyle);
  }
  
  /**
   * Load component HTML content
   * 
   * @param {string} componentId - ID of the component
   * @param {ShadowRoot} shadowRoot - Shadow root to load content into
   * @returns {Promise<HTMLElement>} - Promise resolving to the component wrapper
   */
  async _loadComponentContent(componentId, shadowRoot) {
    console.log(`Loading HTML content for ${componentId}`);
    
    // Add cache busting parameter
    const cacheBuster = `?t=${new Date().getTime()}`;
    
    // Use only the standardized nested structure
    const componentPath = `components/${componentId}/${componentId}-component.html`;
    
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
      
      // Create wrapper with component-specific class
      const wrapper = document.createElement('div');
      wrapper.className = `${componentId}-container`;
      wrapper.innerHTML = html;
      
      // Append to shadow root
      shadowRoot.appendChild(wrapper);
      
      console.log(`Successfully loaded HTML from ${componentPath}`);
      return wrapper;
    } catch (error) {
      console.error(`Error loading component HTML for ${componentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Load component CSS styles
   * 
   * @param {string} componentId - ID of the component
   * @param {ShadowRoot} shadowRoot - Shadow root to load styles into
   * @returns {Promise<void>}
   */
  async _loadComponentStyles(componentId, shadowRoot) {
    console.log(`Loading styles for ${componentId}`);
    
    // Add cache busting parameter
    const cacheBuster = `?t=${new Date().getTime()}`;
    
    // Use only the standardized nested structure
    const cssPath = `styles/${componentId}/${componentId}-component.css`;
    
    try {
      console.log(`Loading CSS from: ${cssPath}`);
      const response = await fetch(`${cssPath}${cacheBuster}`);
      
      if (!response.ok) {
        console.warn(`No dedicated CSS file found for ${componentId} at ${cssPath}, using default styles`);
        return;
      }
      
      const css = await response.text();
      
      if (!css || css.trim().length === 0) {
        console.warn(`Received empty CSS content from ${cssPath}, using default styles`);
        return;
      }
      
      // Create style element
      const style = document.createElement('style');
      style.id = `${componentId}-styles`;
      
      // No need to process CSS, it's already scoped by shadow DOM
      style.textContent = css;
      
      // Add to shadow root
      shadowRoot.appendChild(style);
      
      console.log(`Successfully loaded CSS from ${cssPath}`);
    } catch (error) {
      console.warn(`Error loading styles for ${componentId}, using default styles:`, error);
      // Non-critical error, we can continue without custom styles
    }
  }
  
  /**
   * Initialize component scripts
   * 
   * @param {string} componentId - ID of the component
   * @param {ShadowRoot} shadowRoot - Shadow root for the component
   * @returns {Promise<void>}
   */
  async _initializeComponentScripts(componentId, shadowRoot) {
    console.log(`Initializing scripts for ${componentId}`);
    
    // Add cache busting parameter
    const cacheBuster = `?t=${new Date().getTime()}`;
    
    // Use only the standardized nested structure
    const scriptPath = `scripts/${componentId}/${componentId}-component.js`;
    
    try {
      console.log(`Loading script from: ${scriptPath}`);
      const response = await fetch(`${scriptPath}${cacheBuster}`);
      
      if (!response.ok) {
        console.warn(`Script not found at ${scriptPath}, component may be static`);
        return;
      }
      
      const jsCode = await response.text();
      
      // Create component context object
      const component = {
        id: componentId,
        root: shadowRoot,
        
        // Scoped query selector that only searches within component
        $: function(selector) {
          return this.root.querySelector(selector);
        },
        
        // Query selector all within component
        $$: function(selector) {
          return this.root.querySelectorAll(selector);
        },
        
        // Event delegation helper
        on: function(eventType, selector, handler) {
          this.root.addEventListener(eventType, (event) => {
            const elements = this.root.querySelectorAll(selector);
            const element = event.target.closest(selector);
            if (element && [...elements].includes(element)) {
              handler.call(element, event, this);
            }
          });
        },
        
        // Register cleanup function
        registerCleanup: function(cleanupFn) {
          if (typeof cleanupFn === 'function') {
            window.__componentCleanupHandlers = window.__componentCleanupHandlers || {};
            window.__componentCleanupHandlers[componentId] = cleanupFn;
          }
        },
        
        // Get global Tekton UI instance
        getTektonUI: function() {
          return window.tektonUI;
        },
        
        // Dispatch custom event that can bubble up through shadow DOM
        dispatch: function(eventName, detail = {}) {
          const event = new CustomEvent(eventName, {
            bubbles: true,
            composed: true, // Allows event to cross shadow DOM boundary
            detail: { ...detail, componentId }
          });
          this.root.host.dispatchEvent(event);
        },
        
        // Use shared utilities
        utils: window.tektonUI?.componentUtils || {}
      };
      
      // Create a scoped initialization function that executes the component code
      // with the component context but allows global variable creation
      const initComponentFn = new Function('component', `
        try {
          // Execute component code with component context
          // But without creating a closure to allow global window properties
          eval(${JSON.stringify(jsCode)});
          
          // Make sure global instance uses our component context
          if (window['${componentId}Component']) {
            console.log('Connecting ${componentId} global instance to component context');
            Object.assign(window['${componentId}Component'], { 
              root: component.root,
              $: component.$,
              $$: component.$$,
              dispatch: component.dispatch,
              utils: component.utils
            });
          }
          
          // Return success
          return { success: true };
        } catch (error) {
          console.error('Error initializing component script:', error);
          return { success: false, error: error.message };
        }
      `);
      
      // Execute the component initialization
      const result = initComponentFn(component);
      
      if (!result.success) {
        throw new Error(`Failed to initialize component script: ${result.error}`);
      }
      
      console.log(`Successfully loaded and initialized script from ${scriptPath}`);
      
    } catch (error) {
      console.error(`Error loading or initializing script for ${componentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Show error message in shadow root when component loading fails
   * 
   * @param {string} componentId - ID of the component
   * @param {HTMLElement} containerElement - Container element
   * @param {Error} error - The error that occurred
   */
  _showErrorInShadowRoot(componentId, containerElement, error) {
    // Clear container
    containerElement.innerHTML = '';
    
    // Create host element
    const host = document.createElement('div');
    host.id = `${componentId}-host`;
    host.dataset.componentId = componentId;
    host.style.height = '100%';
    host.style.width = '100%';
    containerElement.appendChild(host);
    
    // Create shadow root
    const shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Add theme styles
    this._addThemeStylesToShadowRoot(shadowRoot);
    
    // Add error message
    const errorContainer = document.createElement('div');
    errorContainer.className = 'component-error';
    errorContainer.innerHTML = `
      <style>
        .component-error {
          padding: 20px;
          border: 1px solid var(--color-danger, #dc3545);
          border-radius: var(--border-radius-md, 8px);
          background-color: var(--bg-card, #2d2d2d);
          color: var(--text-primary, #f0f0f0);
          margin: 20px;
        }
        .component-error h3 {
          color: var(--color-danger, #dc3545);
          margin-top: 0;
        }
        .component-error .error-message {
          font-family: var(--font-family-mono);
          background-color: var(--bg-tertiary, #333333);
          padding: 10px;
          border-radius: var(--border-radius-sm, 4px);
          white-space: pre-wrap;
          overflow-x: auto;
        }
        .component-error .retry-button {
          margin-top: 20px;
          padding: 8px 16px;
          background-color: var(--color-primary, #007bff);
          color: white;
          border: none;
          border-radius: var(--border-radius-sm, 4px);
          cursor: pointer;
        }
        .component-error .retry-button:hover {
          background-color: var(--color-primary-hover, #0056b3);
        }
      </style>
      <h3>Error Loading ${componentId} Component</h3>
      <p>The component failed to load properly.</p>
      <div class="error-message">${error.message}</div>
      <h4>Troubleshooting:</h4>
      <ol>
        <li>Check that the component files exist in the correct locations</li>
        <li>Verify that required services are running (check with tekton-status)</li>
        <li>Restart the Hephaestus UI server</li>
        <li>Check browser console for detailed error messages</li>
      </ol>
      <button class="retry-button" id="retry-button">Retry Loading</button>
    `;
    
    shadowRoot.appendChild(errorContainer);
    
    // Add retry button functionality
    const retryButton = shadowRoot.getElementById('retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        // Try to reload the component
        this.loadComponent(componentId, containerElement);
      });
    }
    
    // Store this as an active component so it can be cleaned up
    this.activeComponents[componentId] = {
      id: componentId,
      shadowRoot,
      container: containerElement,
      isError: true
    };
  }
  
  /**
   * Clean up a component instance
   * 
   * @param {string} componentId - ID of the component to clean up
   */
  cleanupComponent(componentId) {
    console.log(`Cleaning up component: ${componentId}`);
    
    const component = this.activeComponents[componentId];
    if (!component) {
      console.warn(`Component ${componentId} not found, nothing to clean up`);
      return;
    }
    
    try {
      // Execute registered cleanup handler if exists
      if (window.__componentCleanupHandlers && 
          window.__componentCleanupHandlers[componentId]) {
        console.log(`Executing registered cleanup handler for ${componentId}`);
        window.__componentCleanupHandlers[componentId]();
        delete window.__componentCleanupHandlers[componentId];
      }
      
      // Disconnect theme observer if exists
      if (this.themeObservers[componentId]) {
        console.log(`Disconnecting theme observer for ${componentId}`);
        this.themeObservers[componentId].disconnect();
        delete this.themeObservers[componentId];
      }
      
      // Remove shadow root host from DOM
      if (component.shadowRoot && component.shadowRoot.host) {
        console.log(`Removing shadow root host for ${componentId}`);
        component.shadowRoot.host.remove();
      }
      
      // Remove from active components
      delete this.activeComponents[componentId];
      
    } catch (error) {
      console.error(`Error cleaning up component ${componentId}:`, error);
    }
  }
  
  /**
   * Set up theme observer for document to detect theme changes
   */
  _setupDocumentThemeObserver() {
    // Create MutationObserver to watch for theme attribute changes on document root
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.dataset.theme;
          console.log(`Theme changed to: ${newTheme}`);
          this._propagateThemeToComponents(newTheme);
        }
      });
    });
    
    // Start observing
    observer.observe(document.documentElement, { 
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    // Store observer for potential cleanup
    this.documentThemeObserver = observer;
  }
  
  /**
   * Set up theme observer for a specific component
   * 
   * @param {string} componentId - ID of the component
   * @param {ShadowRoot} shadowRoot - Shadow root of the component
   */
  _setupComponentThemeObserver(componentId, shadowRoot) {
    // Create MutationObserver to watch for theme changes on the host element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          console.log(`Theme changed for component ${componentId}`);
          // Additional component-specific theme handling could go here
        }
      });
    });
    
    // Start observing the host element
    observer.observe(shadowRoot.host, { 
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    // Store observer for cleanup
    this.themeObservers[componentId] = observer;
  }
  
  /**
   * Propagate theme change to all active components
   * 
   * @param {string} newTheme - The new theme value
   */
  _propagateThemeToComponents(newTheme) {
    this.currentTheme = newTheme;
    
    // Update each component's host element
    Object.values(this.activeComponents).forEach(component => {
      if (component.shadowRoot && component.shadowRoot.host) {
        component.shadowRoot.host.dataset.theme = newTheme;
      }
    });
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
      this.componentRegistry = registry;
      
      console.log('Component registry loaded:', registry);
      return registry;
    } catch (error) {
      console.error('Error loading component registry:', error);
      throw error;
    }
  }
  
  /**
   * Get component metadata from registry
   * 
   * @param {string} componentId - ID of the component
   * @returns {Object|null} - Component metadata or null if not found
   */
  getComponentMeta(componentId) {
    if (!this.componentRegistry || !this.componentRegistry.components) {
      return null;
    }
    
    return this.componentRegistry.components.find(
      component => component.id === componentId
    ) || null;
  }
}

// Export a global instance for use in other scripts
window.componentLoader = new ComponentLoader();