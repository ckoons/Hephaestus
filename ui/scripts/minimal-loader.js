/**
 * Minimal Component Loader
 * 
 * A stripped-down, extremely simple component loader for the Hephaestus UI.
 * Focuses only on loading a component's HTML into the RIGHT PANEL.
 */

class MinimalLoader {
  constructor() {
    // Standard component paths
    this.componentPaths = {
      'test': '/components/test/test-component.html',
      'athena': '/components/athena/athena-component.html',
      'ergon': '/components/ergon/ergon-component.html'
    };
    
    // Keep track of the current component to prevent reloading
    this.currentComponent = null;
  }
  
  /**
   * Load a component into the specified container
   */
  async loadComponent(componentId) {
    console.log(`MinimalLoader: Loading component ${componentId}`);
    
    // Get the RIGHT PANEL container
    const container = document.getElementById('html-panel');
    if (!container) {
      console.error('MinimalLoader: RIGHT PANEL (html-panel) not found');
      return null;
    }
    
    // Don't reload if it's already the current component
    if (this.currentComponent === componentId) {
      console.log(`MinimalLoader: ${componentId} is already loaded, skipping`);
      return;
    }
    
    try {
      // Show loading indicator
      container.innerHTML = `<div style="padding: 20px; text-align: center;">Loading ${componentId}...</div>`;
      
      // Determine component path
      const componentPath = this.componentPaths[componentId] || `/components/${componentId}/${componentId}-component.html`;
      
      // Load the HTML
      const response = await fetch(componentPath);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Display the component HTML directly in the container
      container.innerHTML = html;
      
      // Update current component
      this.currentComponent = componentId;
      
      // Make sure the container is visible
      container.style.display = 'block';
      
      // Run any scripts in the component
      const scripts = container.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
      });
      
      console.log(`MinimalLoader: ${componentId} loaded successfully`);
    } catch (error) {
      console.error(`MinimalLoader: Error loading ${componentId}:`, error);
      container.innerHTML = `
        <div style="padding: 20px; margin: 20px; border: 1px solid #dc3545; border-radius: 8px;">
          <h3 style="color: #dc3545;">Error Loading ${componentId}</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
}

// Create a global instance
window.minimalLoader = new MinimalLoader();