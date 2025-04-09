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
    this.currentIframe = null;
    
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
      // Use iframe to load the component without script interference
      this.container.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.id = `component-iframe-${componentId}`;
      iframe.src = `${this.componentList[componentId].url}?embedded=true`;
      
      // Set iframe styling
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.overflow = 'hidden';
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      
      // Store current iframe
      this.currentIframe = iframe;
      
      // Apply styling to container for iframe
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';
      
      // Add iframe to container
      this.container.appendChild(iframe);
      
      // Add an event listener for iframe load events
      iframe.addEventListener('load', () => {
        // Try to add embedded mode class to iframe content
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          
          // Add embedded class to root elements
          iframeDoc.documentElement.classList.add('embedded');
          iframeDoc.body.classList.add('embedded');
          
          // Force embedded mode parameters if not already set
          // This helps ensure component sizing is correct
          const urlParams = new URLSearchParams(iframeDoc.location.search);
          if (!urlParams.has('embedded')) {
            // Force embedded mode through script injection
            const script = iframeDoc.createElement('script');
            script.textContent = `
              document.documentElement.classList.add('embedded');
              document.body.classList.add('embedded');
              
              // Force container to take full size
              document.querySelectorAll('.container, .athena-container, .telos-container, .hermes-container, .harmonia-container, .sophia-container, .rhetor-container').forEach(container => {
                if (container) {
                  container.style.margin = '0';
                  container.style.padding = '0';
                  container.style.width = '100%';
                  container.style.height = '100%';
                  container.style.position = 'absolute';
                  container.style.top = '0';
                  container.style.left = '0';
                  container.style.right = '0';
                  container.style.bottom = '0';
                  container.style.overflow = 'hidden';
                }
              });
              
              // Adjust navigation elements consistently
              document.querySelectorAll('.tabs, .athena-tabs, .hermes-nav, .telos-nav, .sophia-nav, .harmonia-nav, .rhetor-nav').forEach(nav => {
                if (nav) {
                  nav.style.padding = '0 10px';
                  nav.style.width = '100%';
                  nav.style.boxSizing = 'border-box';
                  nav.style.margin = '0';
                  nav.style.borderRadius = '0';
                }
              });
              
              // Adjust content areas consistently
              document.querySelectorAll('.main-content, .athena-content, .hermes-content, .telos-content, .sophia-content, .harmonia-content, .rhetor-content').forEach(content => {
                if (content) {
                  content.style.padding = '10px';
                  content.style.margin = '0';
                  content.style.position = 'absolute';
                  content.style.top = '46px';
                  content.style.left = '0';
                  content.style.right = '0';
                  content.style.bottom = '0';
                  content.style.width = '100%';
                  content.style.borderRadius = '0';
                  content.style.overflow = 'auto';
                }
              });
            `;
            iframeDoc.body.appendChild(script);
          }
        } catch (e) {
          console.warn('Could not access iframe contents due to security restrictions:', e);
        }
      });
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