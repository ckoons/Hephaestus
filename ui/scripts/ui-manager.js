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
        
        // Special case for Terma component
        if (componentId === 'terma') {
            this.loadTermaComponent();
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
     * Load the Terma terminal component
     */
    loadTermaComponent() {
        console.log('Loading Terma component...');
        
        // Create an empty container in the HTML panel if it doesn't exist
        const htmlPanel = document.getElementById('html-panel');
        console.log('HTML panel found:', !!htmlPanel);
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        if (!htmlPanel.querySelector('#terma-container')) {
            console.log('Creating terma-container div');
            const container = document.createElement('div');
            container.id = 'terma-container';
            container.style.height = '100%';
            htmlPanel.appendChild(container);
        } else {
            console.log('terma-container already exists');
        }
        
        // Add detailed logging to diagnose issues
        const termaContainer = document.getElementById('terma-container');
        
        if (termaContainer) {
            // Show loading message
            termaContainer.innerHTML = `
                <div style="padding: 20px; color: #f0f0f0; background: #333; height: 100%; overflow: auto;">
                    <h3>Loading Terma Terminal Component...</h3>
                    <p>Fetching the terminal component from the server.</p>
                    <div id="terma-load-status" style="margin-top: 20px; font-family: monospace;"></div>
                </div>
            `;
        }
        
        const updateStatus = (message, isError = false) => {
            const statusEl = document.getElementById('terma-load-status');
            if (statusEl) {
                const entry = document.createElement('div');
                entry.style.color = isError ? '#ff6b6b' : '#4CAF50';
                entry.style.margin = '5px 0';
                entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
                statusEl.appendChild(entry);
                statusEl.scrollTop = statusEl.scrollHeight;
            }
            console.log(isError ? `ERROR: ${message}` : message);
        };
        
        // Try multiple paths for component HTML
        const componentPaths = [
            'components/terma/terma-component.html',
            '../Terma/ui/hephaestus/terma-component.html',
            '/components/terma/terma-component.html',
            '/terma/ui/hephaestus/terma-component.html'
        ];
        
        // Cache busting parameter
        const cacheBuster = `?t=${new Date().getTime()}`;
        
        // Function to attempt loading from a path
        const tryLoadPath = (pathIndex) => {
            if (pathIndex >= componentPaths.length) {
                updateStatus('All component paths failed, showing error view', true);
                
                // Show error in terminal
                if (termaContainer) {
                    termaContainer.innerHTML = `
                        <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                            <h3>Error: Failed to Load Terma Terminal Component</h3>
                            <p>The terminal component could not be loaded after trying multiple paths.</p>
                            <h4>Attempted Paths:</h4>
                            <ul style="margin-left: 20px; font-family: monospace;">
                                ${componentPaths.map(path => `<li>${path}</li>`).join('')}
                            </ul>
                            <h4>Troubleshooting:</h4>
                            <ol style="margin-left: 20px;">
                                <li>Verify that Terma API is running (tekton-status shows Terma API running)</li>
                                <li>Check that the Terma component was installed in Hephaestus (run install_in_hephaestus.sh)</li>
                                <li>Restart the Hephaestus UI server</li>
                                <li>Try opening the browser's network tab to see the exact request failures</li>
                            </ol>
                            <p style="margin-top: 20px;">Click the Terma tab again to retry loading.</p>
                        </div>
                    `;
                }
                
                // Fallback to terminal panel
                this.components['terma'] = {
                    id: 'terma',
                    loaded: true,
                    usesTerminal: true, 
                };
                this.activatePanel('terminal');
                return;
            }
            
            const path = componentPaths[pathIndex] + cacheBuster;
            updateStatus(`Trying to load from: ${path}`);
            
            fetch(path)
                .then(response => {
                    updateStatus(`Received response: status ${response.status}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(html => {
                    if (!html || html.trim().length === 0) {
                        throw new Error('Received empty HTML content');
                    }
                    
                    updateStatus(`Loaded HTML content successfully (${html.length} bytes)`);
                    
                    if (termaContainer) {
                        termaContainer.innerHTML = html;
                        updateStatus('Added HTML content to container');
                    } else {
                        throw new Error('terma-container element disappeared');
                    }
                    
                    // Register the component
                    this.components['terma'] = {
                        id: 'terma',
                        loaded: true,
                        usesTerminal: false, // Uses HTML panel
                    };
                    
                    // Activate the HTML panel
                    updateStatus('Activating HTML panel');
                    this.activatePanel('html');
                    
                    updateStatus('Terma component loaded successfully');
                    
                    // Attempt to load terma-terminal.js script to ensure it's properly loaded
                    const scriptElement = document.createElement('script');
                    scriptElement.src = `/scripts/terma/terma-terminal.js${cacheBuster}`;
                    scriptElement.onerror = () => {
                        updateStatus('Failed to load terma-terminal.js script', true);
                    };
                    scriptElement.onload = () => {
                        updateStatus('Successfully loaded terma-terminal.js script');
                    };
                    document.head.appendChild(scriptElement);
                })
                .catch(error => {
                    updateStatus(`Failed to load from ${path}: ${error.message}`, true);
                    
                    // Try the next path
                    tryLoadPath(pathIndex + 1);
                });
        };
        
        // Start the loading process with the first path
        tryLoadPath(0);
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
        console.log(`Activating panel: ${panelId}`);
        
        const panels = document.querySelectorAll('.panel');
        console.log(`Found ${panels.length} panels`);
        
        panels.forEach(panel => {
            const panelName = panel.id;
            const shouldBeActive = panel.id === `${panelId}-panel`;
            console.log(`Panel ${panelName}, should be active: ${shouldBeActive}`);
            
            if (shouldBeActive) {
                panel.classList.add('active');
                console.log(`Set panel ${panelName} to active`);
                
                // Debug panel style
                console.log(`Panel ${panelName} style:`, panel.style.display, 'classList:', panel.classList);
                
                // Force display
                panel.style.display = 'block';
            } else {
                panel.classList.remove('active');
                // Don't hide the panel - let CSS handle it
                // panel.style.display = 'none';
            }
        });
        
        // Get the panel that should be active to double-check its state
        const activePanel = document.getElementById(`${panelId}-panel`);
        if (activePanel) {
            console.log(`Active panel found: ${activePanel.id}, display: ${activePanel.style.display}, classlist: ${activePanel.classList}`);
        } else {
            console.error(`Active panel not found: ${panelId}-panel`);
        }
        
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
        
        console.log(`Successfully activated panel: ${panelId}`);
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