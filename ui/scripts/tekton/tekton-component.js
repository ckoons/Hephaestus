/**
 * Tekton Component
 * Main command center for the Tekton system
 */

class TektonComponent {
    constructor() {
        this.state = {
            initialized: false,
            activeTab: 'dashboard',
            systemStatus: 'initializing'
        };
    }
    
    /**
     * Initialize the component
     */
    init() {
        console.log('Initializing Tekton component');
        
        // If already initialized, just activate
        if (this.state.initialized) {
            console.log('Tekton component already initialized, just activating');
            this.activateComponent();
            return this;
        }
        
        // Initialize component functionality
        this.setupTabs();
        this.setupActions();
        
        // Mark as initialized
        this.state.initialized = true;
        
        console.log('Tekton component initialized');
        return this;
    }
    
    /**
     * Activate the component interface
     */
    activateComponent() {
        console.log('Activating Tekton component');
        
        // Find our component container
        const tektonContainer = document.querySelector('.tekton-container');
        if (tektonContainer) {
            console.log('Tekton container found and activated');
        }
    }
    
    /**
     * Set up tab switching functionality
     */
    setupTabs() {
        console.log('Setting up Tekton tabs');
        
        // Find Tekton container
        const container = document.querySelector('.tekton-container');
        if (!container) {
            console.error('Tekton container not found!');
            return;
        }
        
        // Scope all queries to our container
        const tabs = container.querySelectorAll('.tekton__tab');
        const panels = container.querySelectorAll('.tekton__panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                tabs.forEach(t => {
                    t.classList.remove('tekton__tab--active');
                });
                tab.classList.add('tekton__tab--active');
                
                // Show active panel
                const panelId = tab.getAttribute('data-tab') + '-panel';
                panels.forEach(panel => {
                    panel.classList.remove('tekton__panel--active');
                });
                
                // Use container-scoped query
                const activePanel = container.querySelector(`#${panelId}`);
                if (activePanel) {
                    activePanel.classList.add('tekton__panel--active');
                }
                
                // Update the active tab in state
                this.state.activeTab = tab.getAttribute('data-tab');
                
                // Load tab-specific content if needed
                this.loadTabContent(this.state.activeTab);
            });
        });
    }
    
    /**
     * Set up action buttons
     */
    setupActions() {
        console.log('Setting up Tekton actions');
        
        // Find Tekton container
        const container = document.querySelector('.tekton-container');
        if (!container) {
            console.error('Tekton container not found!');
            return;
        }
        
        // Set up refresh button
        const refreshBtn = container.querySelector('#tekton-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
    }
    
    /**
     * Load content specific to a tab
     * 
     * @param {string} tabId - The ID of the tab to load content for
     */
    loadTabContent(tabId) {
        console.log(`Loading content for ${tabId} tab`);
        
        switch (tabId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'components':
                this.loadComponentsList();
                break;
            case 'status':
                this.loadSystemStatus();
                break;
            case 'console':
                this.loadConsoleOutput();
                break;
        }
    }
    
    /**
     * Load dashboard content
     */
    loadDashboard() {
        console.log('Loading dashboard content');
        // In a real implementation, this would fetch actual system data
    }
    
    /**
     * Load components list
     */
    loadComponentsList() {
        console.log('Loading components list');
        // In a real implementation, this would fetch component data
    }
    
    /**
     * Load system status
     */
    loadSystemStatus() {
        console.log('Loading system status');
        // In a real implementation, this would fetch status data
    }
    
    /**
     * Load console output
     */
    loadConsoleOutput() {
        console.log('Loading console output');
        // In a real implementation, this would fetch console logs
    }
    
    /**
     * Refresh dashboard data
     */
    refreshDashboard() {
        console.log('Refreshing dashboard data');
        this.loadTabContent(this.state.activeTab);
    }
}

// Create global instance
window.tektonComponent = new TektonComponent();

// Initialize the component when the script loads
window.tektonComponent.init();