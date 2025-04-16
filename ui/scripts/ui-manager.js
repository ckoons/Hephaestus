/**
 * UI Manager
 * Handles UI state, component switching, and panel management
 */

class UIManager {
    constructor() {
        this.components = {};
        this.activeComponent = 'tekton'; // Default component
        this.activePanel = 'terminal'; // Default panel (terminal, html, or settings)
    }
    
    /**
     * Initialize the UI manager
     */
    init() {
        // Set up component navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const componentId = item.getAttribute('data-component');
            if (componentId) {
                item.addEventListener('click', () => {
                    this.activateComponent(componentId);
                });
            }
        });
        
        // Set up settings button
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                this.showSettingsPanel();
            });
        }
        
        // Set up profile button
        const profileButton = document.getElementById('profile-button');
        if (profileButton) {
            profileButton.addEventListener('click', () => {
                this.showProfilePanel();
            });
        }
        
        // Set initial active component
        this.activateComponent(this.activeComponent);
        
        console.log('UI Manager initialized');
    }
    
    /**
     * Activate a component
     * @param {string} componentId - ID of the component to activate
     */
    activateComponent(componentId) {
        // Update active component in UI
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-component') === componentId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update component title
        const componentTitle = document.querySelector('.component-title');
        const activeNavItem = document.querySelector(`.nav-item[data-component="${componentId}"]`);
        if (activeNavItem) {
            componentTitle.textContent = activeNavItem.querySelector('.nav-label').textContent;
        }
        
        // Clear component controls
        const componentControls = document.querySelector('.component-controls');
        if (componentControls) {
            componentControls.innerHTML = '';
        }
        
        // Store the previous component to save its state
        const previousComponent = this.activeComponent;
        
        // Update active component
        this.activeComponent = componentId;
        tektonUI.activeComponent = componentId;
        
        // Save current input for the previous component
        const chatInput = document.getElementById('chat-input');
        if (previousComponent && chatInput) {
            storageManager.setInputContext(previousComponent, chatInput.value);
        }
        
        // Load the new component UI if needed
        this.loadComponentUI(componentId);
        
        // Restore input context for the new component
        if (chatInput) {
            const savedInput = storageManager.getInputContext(componentId) || '';
            chatInput.value = savedInput;
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        }
        
        // Request current context from the component AI
        tektonUI.sendCommand('get_context');
        
        // Restore terminal history for this component
        if (window.terminalManager) {
            terminalManager.loadHistory(componentId);
        }
        
        console.log(`Activated component: ${componentId}`);
    }
    
    /**
     * Load a component's UI
     * @param {string} componentId - ID of the component to load
     */
    loadComponentUI(componentId) {
        // If we've already loaded this component, just activate it
        if (this.components[componentId]) {
            this.activateComponentUI(componentId);
            return;
        }
        
        // Simplified component loading for now (will be enhanced in Phase 2)
        // In the full implementation, this would dynamically load the component HTML file
        this.components[componentId] = {
            id: componentId,
            loaded: true,
            usesTerminal: true, // Default to terminal for now
        };
        
        // Activate the appropriate panel for this component
        if (this.components[componentId].usesTerminal) {
            this.activatePanel('terminal');
        } else {
            this.activatePanel('html');
        }
        
        console.log(`Loaded component UI: ${componentId}`);
    }
    
    /**
     * Activate a component's UI that was previously loaded
     * @param {string} componentId - ID of the component to activate
     */
    activateComponentUI(componentId) {
        const component = this.components[componentId];
        if (component) {
            // Activate the appropriate panel for this component
            if (component.usesTerminal) {
                this.activatePanel('terminal');
            } else {
                this.activatePanel('html');
            }
        }
    }
    
    /**
     * Switch between terminal, HTML, settings, and profile panels
     * @param {string} panelId - 'terminal', 'html', 'settings', or 'profile'
     */
    activatePanel(panelId) {
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            if (panel.id === `${panelId}-panel`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
        
        this.activePanel = panelId;
        tektonUI.activePanel = panelId;
        
        // Auto-focus on input if terminal panel
        if (panelId === 'terminal') {
            const terminalInput = document.getElementById('simple-terminal-input');
            if (terminalInput) {
                setTimeout(() => {
                    terminalInput.focus();
                }, 100);
            }
        }
        
        console.log(`Activated panel: ${panelId}`);
    }
    
    /**
     * Show the settings panel
     */
    showSettingsPanel() {
        this.activatePanel('settings');
        console.log('Showing settings panel');
        
        // Initialize settings UI if it hasn't been initialized
        if (window.settingsUI && !window.settingsUI.initialized) {
            window.settingsUI.init();
        }
    }
    
    /**
     * Show the profile panel
     */
    showProfilePanel() {
        this.activatePanel('profile');
        console.log('Showing profile panel');
        
        // Initialize profile UI if it hasn't been initialized
        if (window.profileUI && !window.profileUI.initialized) {
            window.profileUI.init();
        }
    }
    
    /**
     * Update component controls in the header
     * @param {Object} actions - Array of action objects with id, label, and onClick properties
     */
    updateComponentControls(actions) {
        const controlsContainer = document.querySelector('.component-controls');
        if (!controlsContainer) return;
        
        controlsContainer.innerHTML = '';
        
        if (Array.isArray(actions) && actions.length > 0) {
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'control-button';
                button.textContent = action.label;
                button.addEventListener('click', () => {
                    tektonUI.sendCommand('execute_action', { actionId: action.id });
                });
                controlsContainer.appendChild(button);
            });
        }
    }
}