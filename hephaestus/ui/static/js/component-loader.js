/**
 * Component Loader for Tekton UI
 * 
 * This script handles loading component interfaces into the RIGHT PANEL
 * of the Tekton UI. It ensures that UI components stay within their
 * designated areas and don't modify the top page.
 */

class ComponentLoader {
  constructor() {
    // The element where component UIs will be loaded
    this.container = document.getElementById('right-panel-content');
    this.currentComponent = null;
    this.componentList = {};
    
    // Initialize the loader
    this.init();
  }
  
  /**
   * Initialize the component loader
   */
  async init() {
    // Fetch available component interfaces
    try {
      console.log('Loading component interfaces...');
      const response = await fetch('/api/component-interfaces');
      const data = await response.json();
      
      console.log('Available interfaces:', data);
      
      if (data.interfaces && Array.isArray(data.interfaces)) {
        // Store component interfaces
        data.interfaces.forEach(interface => {
          this.componentList[interface.id] = interface;
        });
        
        console.log('Loaded components:', Object.keys(this.componentList));
        
        // Set up component navigation
        this.setupComponentNavigation();
        
        // Add visual indicator for components with interfaces
        Object.keys(this.componentList).forEach(id => {
          const items = document.querySelectorAll(`.component-item[data-component-id="${id}"]`);
          items.forEach(item => {
            item.style.position = 'relative';
            const indicator = document.createElement('div');
            indicator.className = 'component-ui-indicator';
            indicator.style.position = 'absolute';
            indicator.style.top = '50%';
            indicator.style.right = '10px';
            indicator.style.transform = 'translateY(-50%)';
            indicator.style.width = '10px';
            indicator.style.height = '10px';
            indicator.style.borderRadius = '50%';
            indicator.style.backgroundColor = '#10b981';
            indicator.style.boxShadow = '0 0 5px rgba(16, 185, 129, 0.7)';
            indicator.innerHTML = '⚙️';
            indicator.style.fontSize = '14px';
            indicator.style.color = 'white';
            indicator.style.display = 'flex';
            indicator.style.justifyContent = 'center';
            indicator.style.alignItems = 'center';
            indicator.style.zIndex = '5';
            
            // Add tooltip
            indicator.title = 'This component has a UI interface';
            
            item.appendChild(indicator);
            
            // Also add a small animation to draw attention
            setTimeout(() => {
              indicator.style.animation = 'pulse 2s infinite';
              item.style.animation = 'highlight 1s ease-in-out';
              item.style.animationIterationCount = '1';
            }, 1000 * (Object.keys(this.componentList).indexOf(id) + 1));
          });
        });
      }
    } catch (error) {
      console.error('Failed to load component interfaces:', error);
    }
  }
  
  /**
   * Set up click handlers for component navigation
   */
  setupComponentNavigation() {
    // Get all component items in the left panel
    const componentItems = document.querySelectorAll('.component-item');
    
    // Add click handlers to each component item
    componentItems.forEach(item => {
      const componentId = item.getAttribute('data-component-id');
      if (componentId && this.componentList[componentId]) {
        // This component has a UI interface
        item.classList.add('has-interface');
        
        item.addEventListener('click', (event) => {
          // Hide settings page and show component panel
          document.getElementById('settings-page').style.display = 'none';
          document.getElementById('right-panel-content').style.display = 'block';
          
          // Load the component
          this.loadComponent(componentId);
          
          // Mark this component as active
          componentItems.forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          
          // Update header title
          const headerTitle = document.querySelector('.header-title');
          if (headerTitle) {
            const nameElement = item.querySelector('.component-name');
            if (nameElement) {
              headerTitle.textContent = nameElement.textContent.trim();
            } else {
              headerTitle.textContent = this.componentList[componentId].name;
            }
          }
        });
      }
    });
  }
  
  /**
   * Load a component's UI into the right panel
   * @param {string} componentId - The ID of the component to load
   */
  async loadComponent(componentId) {
    if (!componentId || !this.componentList[componentId]) {
      console.error(`Component ${componentId} not found`);
      return;
    }
    
    this.currentComponent = componentId;
    
    // Display loading indicator
    this.container.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <div style="margin-left: 15px;">Loading ${this.componentList[componentId].name} component...</div>
      </div>
    `;
    
    try {
      // Fetch the component's HTML
      const response = await fetch(this.componentList[componentId].url);
      const html = await response.text();
      
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      
      // Find the body content
      const bodyContent = temp.querySelector('body');
      if (bodyContent) {
        // Set the container's content to the body content
        this.container.innerHTML = bodyContent.innerHTML;
        
        // Execute any scripts in the HTML
        const scripts = temp.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          
          // Copy attributes
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // Set the script content
          newScript.textContent = script.textContent;
          
          // Append to document to execute
          document.body.appendChild(newScript);
          
          // Remove after execution to avoid cluttering the DOM
          // setTimeout(() => newScript.remove(), 100);
        });
      } else {
        this.container.innerHTML = 'Failed to load component interface';
      }
    } catch (error) {
      console.error(`Failed to load component ${componentId}:`, error);
      this.container.innerHTML = `Error loading component: ${error.message}`;
    }
  }
}

// Initialize the component loader when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.componentLoader = new ComponentLoader();
});