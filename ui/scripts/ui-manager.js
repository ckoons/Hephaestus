/**
 * UI Manager
 * Handles UI state, component switching, and panel management
 * Updated to use Shadow DOM component isolation
 */

class UIManager {
    constructor() {
        this.components = {};
        this.activeComponent = 'tekton'; // Default component
        this.activePanel = 'terminal'; // Default panel (terminal, html, or settings)
        this.useShadowDOM = true; // Flag to control Shadow DOM usage for backward compatibility
        
        // Shared services and utilities
        this.services = {};
        this.componentUtils = null;
    }
    
    /**
     * Initialize the UI manager
     */
    init() {
        // Initialize component utilities if not already loaded
        this._initializeComponentUtils();
        
        // Load the component registry
        this.loadComponentRegistry();
        
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
        
        // Also check budget button to make it load the budget component
        const budgetButton = document.getElementById('budget-button');
        if (budgetButton) {
            budgetButton.addEventListener('click', () => {
                // Instead of showing a modal, load the budget component
                this.activateComponent('budget');
            });
        }
        
        // Set initial active component
        this.activateComponent(this.activeComponent);
        
        console.log('UI Manager initialized (Shadow DOM: ' + (this.useShadowDOM ? 'enabled' : 'disabled') + ')');
    }
    
    /**
     * Initialize component utilities for shared functionality
     */
    _initializeComponentUtils() {
        // If already initialized globally, use the existing instance
        if (window.componentUtils) {
            this.componentUtils = window.componentUtils;
            return;
        }
        
        // Otherwise check if the script was loaded but not initialized
        if (window.ComponentUtils) {
            this.componentUtils = new ComponentUtils().init();
            window.componentUtils = this.componentUtils;
        } else {
            // Dynamically load the component utilities script if not loaded
            console.log('Loading component utilities script...');
            const script = document.createElement('script');
            script.src = '/scripts/component-utils.js';
            script.onload = () => {
                console.log('Component utilities script loaded');
                // The script will initialize itself on DOMContentLoaded
            };
            script.onerror = (error) => {
                console.error('Error loading component utilities script:', error);
            };
            document.head.appendChild(script);
        }
    }
    
    /**
     * Load the component registry to get component metadata
     */
    loadComponentRegistry() {
        console.log('Loading component registry...');
        
        // Fetch the component registry from the server
        fetch('/server/component_registry.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load component registry: ${response.status}`);
                }
                return response.json();
            })
            .then(registry => {
                console.log('Component registry loaded:', registry);
                
                // Store component registry data
                this.registry = registry;
                
                // Update the registry-based components
                this.updateRegistryComponents();
            })
            .catch(error => {
                console.error('Error loading component registry:', error);
            });
    }
    
    /**
     * Update components based on registry data
     */
    updateRegistryComponents() {
        if (!this.registry || !this.registry.components) {
            console.error('No components found in registry');
            return;
        }
        
        // Create a map of component definitions
        const componentMap = {};
        this.registry.components.forEach(component => {
            componentMap[component.id] = component;
        });
        
        // Store for later use
        this.componentMap = componentMap;
        
        console.log('Component map created:', componentMap);
    }
    
    /**
     * Activate a component
     * @param {string} componentId - ID of the component to activate
     */
    activateComponent(componentId) {
        // Extra logging for debugging
        console.log(`ACTIVATING COMPONENT: ${componentId} (DEBUGGING)`);
        
        // SPECIAL CASE: Direct component loading for Rhetor
        if (componentId === 'rhetor') {
            console.log('DIRECT LOADING RHETOR COMPONENT');
            this.loadRhetorComponent();
            return;
        }
        
        // SPECIAL CASE: Direct component loading for Budget
        if (componentId === 'budget') {
            console.log('DIRECT LOADING BUDGET COMPONENT');
            this.loadBudgetComponent();
            return;
        }
        
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
        if (activeNavItem && componentTitle) {
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
    async loadComponentUI(componentId) {
        // If we've already loaded this component, just activate it
        if (this.components[componentId]) {
            this.activateComponentUI(componentId);
            return;
        }
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // If using Shadow DOM for components and the component loader is available
        if (this.useShadowDOM && window.componentLoader) {
            console.log(`Loading component ${componentId} with Shadow DOM isolation`);
            
            // For backwards compatibility with special components during migration
            // In future phases, we'll convert these components to use Shadow DOM
            const specialComponents = ['rhetor', 'budget', 'terma'];
            
            if (specialComponents.includes(componentId)) {
                console.log(`Special component ${componentId} detected - using direct loading during migration`);
                this._loadSpecialComponent(componentId);
                return;
            }
            
            try {
                // Clear any existing content in the HTML panel
                // In the future, we'll support multiple components being visible at once
                htmlPanel.innerHTML = '';
                
                // Create a container for the component
                const container = document.createElement('div');
                container.id = `${componentId}-container`;
                container.className = 'shadow-component-container';
                container.style.height = '100%';
                container.style.width = '100%';
                htmlPanel.appendChild(container);
                
                // Load the component using the component loader
                const component = await window.componentLoader.loadComponent(componentId, container);
                
                if (component) {
                    // Register the component
                    this.components[componentId] = {
                        id: componentId,
                        loaded: true,
                        usesTerminal: false, // Shadow DOM components use HTML panel
                        shadowComponent: true, // Mark as a shadow DOM component
                        container
                    };
                    
                    // Activate the HTML panel
                    this.activatePanel('html');
                    
                    console.log(`Component ${componentId} loaded successfully with Shadow DOM`);
                } else {
                    console.error(`Failed to load component ${componentId} with Shadow DOM`);
                    
                    // Fallback to terminal panel
                    this.components[componentId] = {
                        id: componentId,
                        loaded: true,
                        usesTerminal: true,
                    };
                    this.activatePanel('terminal');
                }
            } catch (error) {
                console.error(`Error loading component ${componentId} with Shadow DOM:`, error);
                
                // Fallback to terminal panel
                this.components[componentId] = {
                    id: componentId,
                    loaded: true,
                    usesTerminal: true,
                };
                this.activatePanel('terminal');
            }
            
            return;
        }
        
        // Legacy component loading (without Shadow DOM)
        console.log(`Loading component ${componentId} using legacy method`);
        
        // Check if we have registry data for this component
        if (this.componentMap && this.componentMap[componentId]) {
            const componentConfig = this.componentMap[componentId];
            console.log(`Loading component from registry: ${componentId}`, componentConfig);
            
            // If component has HTML mode, load the component path
            if (componentConfig.defaultMode === 'html' && componentConfig.componentPath) {
                this.loadRegistryComponent(componentId, componentConfig);
                return;
            }
        }
        
        // Handle special component cases
        this._loadSpecialComponent(componentId);
    }
    
    /**
     * Load special component types
     * This is for backward compatibility during the migration
     * @param {string} componentId - ID of the component to load
     */
    _loadSpecialComponent(componentId) {
        // Special case for Terma component - still using legacy approach
        if (componentId === 'terma') {
            this.loadTermaComponent();
            return;
        }
        
        // Special case for Rhetor component - now using Shadow DOM
        if (componentId === 'rhetor') {
            this.loadRhetorComponent();
            return;
        }
        
        // Special case for Budget component - now using Shadow DOM
        if (componentId === 'budget') {
            this.loadBudgetComponent();
            return;
        }
        
        // Special case for Settings component - now using Shadow DOM
        if (componentId === 'settings') {
            this.loadSettingsComponent();
            return;
        }
        
        // Default component loading for components without special handling
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
     * Load a component based on registry configuration
     * @param {string} componentId - ID of the component to load
     * @param {object} config - Component configuration from registry
     */
    loadRegistryComponent(componentId, config) {
        console.log(`Loading registry component: ${componentId}`, config);
        
        // Create an empty container in the HTML panel if it doesn't exist
        const htmlPanel = document.getElementById('html-panel');
        console.log('HTML panel found:', !!htmlPanel);
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        const containerId = `${componentId}-container`;
        if (!htmlPanel.querySelector(`#${containerId}`)) {
            console.log(`Creating ${containerId} div`);
            const container = document.createElement('div');
            container.id = containerId;
            container.style.height = '100%';
            htmlPanel.appendChild(container);
        } else {
            console.log(`${containerId} already exists`);
        }
        
        // Add detailed logging to diagnose issues
        const container = document.getElementById(containerId);
        
        if (container) {
            // Show loading message
            container.innerHTML = `
                <div style="padding: 20px; color: #f0f0f0; background: #333; height: 100%; overflow: auto;">
                    <h3>Loading ${config.name} Component...</h3>
                    <p>Fetching the component from the server.</p>
                    <div id="${componentId}-load-status" style="margin-top: 20px; font-family: monospace;"></div>
                </div>
            `;
        }
        
        const updateStatus = (message, isError = false) => {
            const statusEl = document.getElementById(`${componentId}-load-status`);
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
        
        // Cache busting parameter
        const cacheBuster = `?t=${new Date().getTime()}`;
        const componentPath = config.componentPath + cacheBuster;
        
        updateStatus(`Loading from: ${componentPath}`);
        
        fetch(componentPath)
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
                
                if (container) {
                    container.innerHTML = html;
                    updateStatus('Added HTML content to container');
                } else {
                    throw new Error(`${containerId} element disappeared`);
                }
                
                // Register the component
                this.components[componentId] = {
                    id: componentId,
                    loaded: true,
                    usesTerminal: false, // Uses HTML panel
                };
                
                // Activate the HTML panel
                updateStatus('Activating HTML panel');
                this.activatePanel('html');
                
                updateStatus(`${config.name} component loaded successfully`);
                
                // Load stylesheets
                if (config.styles && Array.isArray(config.styles)) {
                    config.styles.forEach(stylePath => {
                        const stylesheetElement = document.createElement('link');
                        stylesheetElement.rel = 'stylesheet';
                        stylesheetElement.href = `/${stylePath}${cacheBuster}`;
                        document.head.appendChild(stylesheetElement);
                        updateStatus(`Loaded stylesheet: ${stylePath}`);
                    });
                }
                
                // Load scripts
                if (config.scripts && Array.isArray(config.scripts)) {
                    const loadScript = (index) => {
                        if (index >= config.scripts.length) {
                            updateStatus('All scripts loaded successfully');
                            return;
                        }
                        
                        const scriptPath = config.scripts[index];
                        const scriptElement = document.createElement('script');
                        scriptElement.src = `/${scriptPath}${cacheBuster}`;
                        scriptElement.onerror = () => {
                            updateStatus(`Failed to load script: ${scriptPath}`, true);
                            // Continue loading other scripts
                            loadScript(index + 1);
                        };
                        scriptElement.onload = () => {
                            updateStatus(`Successfully loaded script: ${scriptPath}`);
                            // Load next script
                            loadScript(index + 1);
                        };
                        document.head.appendChild(scriptElement);
                    };
                    
                    // Start loading scripts
                    loadScript(0);
                }
            })
            .catch(error => {
                updateStatus(`Failed to load ${config.name} component: ${error.message}`, true);
                
                // Show error in container
                if (container) {
                    container.innerHTML = `
                        <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                            <h3>Error: Failed to Load ${config.name} Component</h3>
                            <p>The component could not be loaded: ${error.message}</p>
                            <h4>Troubleshooting:</h4>
                            <ol style="margin-left: 20px;">
                                <li>Verify that required services are running (check with tekton-status)</li>
                                <li>Check that the component files exist in the correct locations</li>
                                <li>Restart the Hephaestus UI server</li>
                                <li>Try opening the browser's network tab to see the exact request failures</li>
                            </ol>
                            <p style="margin-top: 20px;">Click the tab again to retry loading.</p>
                        </div>
                    `;
                }
                
                // Fallback to terminal panel
                this.components[componentId] = {
                    id: componentId,
                    loaded: true,
                    usesTerminal: true,
                };
                this.activatePanel('terminal');
            });
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
        if (!component) {
            console.error(`Component ${componentId} not found, cannot activate`);
            return;
        }
        
        // Activate the appropriate panel for this component
        if (component.usesTerminal) {
            this.activatePanel('terminal');
        } else {
            this.activatePanel('html');
            
            // Special handling for shadow DOM components
            if (component.shadowComponent && component.container) {
                // Make sure only this component's container is visible
                const containers = document.querySelectorAll('.shadow-component-container');
                containers.forEach(container => {
                    if (container.id === `${componentId}-container`) {
                        container.style.display = 'block';
                    } else {
                        container.style.display = 'none';
                    }
                });
            }
        }
        
        console.log(`Activated UI for component: ${componentId}`);
    }
    
    /**
     * Switch between terminal, HTML, settings, and profile panels
     * @param {string} panelId - 'terminal', 'html', 'settings', or 'profile'
     */
    activatePanel(panelId) {
        console.log(`Activating panel: ${panelId}`);
        
        // Make sure we're dealing with a valid panel ID
        if (!['terminal', 'html', 'settings', 'profile'].includes(panelId)) {
            console.error(`Invalid panel ID: ${panelId}`);
            return;
        }
        
        // Get all panels
        const panels = document.querySelectorAll('.panel');
        console.log(`Found ${panels.length} panels`);
        
        // Hide all panels first
        panels.forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none';
        });
        
        // Now activate the requested panel
        const targetPanel = document.getElementById(`${panelId}-panel`);
        if (targetPanel) {
            console.log(`Found target panel: ${targetPanel.id}`);
            
            // Force display and add active class
            targetPanel.style.display = 'block';
            targetPanel.classList.add('active');
            
            // This ensures panels don't show up hidden when they should be visible
            targetPanel.style.visibility = 'visible';
            targetPanel.style.opacity = '1';
            
            console.log(`Set panel ${targetPanel.id} to active, display: ${targetPanel.style.display}`);
            
            // Special handling for HTML panel - we need to make sure the content is properly shown
            if (panelId === 'html') {
                console.log('HTML panel activated, checking containers');
                
                // If we have an active component, make sure its container is visible
                if (this.activeComponent) {
                    // For Rhetor and Budget, the container completely replaces the panel contents
                    // So if we have these components active, we don't need to do anything else
                    if (['rhetor', 'budget'].includes(this.activeComponent)) {
                        console.log(`Special component ${this.activeComponent} is active, no additional container management needed`);
                    } else {
                        // For other components with containers, show the appropriate container
                        const activeContainer = document.getElementById(`${this.activeComponent}-container`);
                        if (activeContainer) {
                            console.log(`Found active container for ${this.activeComponent}, showing it`);
                            activeContainer.style.display = 'block';
                            activeContainer.style.visibility = 'visible';
                        }
                    }
                }
            }
        } else {
            console.error(`Panel not found: ${panelId}-panel`);
        }
        
        // Update state
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
        console.log('Showing settings panel with Shadow DOM isolation');
        
        // Load the Settings component using Shadow DOM isolation
        this.loadSettingsComponent();
    }
    
    /**
     * Load the Settings component using Shadow DOM isolation
     */
    loadSettingsComponent() {
        // First, set the activeComponent to 'settings'
        this.activeComponent = 'settings';
        tektonUI.activeComponent = 'settings';
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // Clear the HTML panel
        htmlPanel.innerHTML = '';
        
        // Create a container for the component
        const container = document.createElement('div');
        container.id = 'settings-container';
        container.className = 'shadow-component-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';
        htmlPanel.appendChild(container);
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Load the component using the component loader
        if (window.componentLoader) {
            window.componentLoader.loadComponent('settings', container)
                .then(component => {
                    if (component) {
                        // Register the component
                        this.components['settings'] = {
                            id: 'settings',
                            loaded: true,
                            usesTerminal: false,
                            shadowComponent: true,
                            container
                        };
                        
                        console.log('Settings component loaded successfully with Shadow DOM isolation');
                    } else {
                        console.error('Failed to load Settings component with Shadow DOM');
                        
                        // Fallback to traditional settings panel
                        this.activatePanel('settings');
                        console.log('Falling back to traditional settings panel');
                        
                        // Initialize settings UI if it hasn't been initialized
                        if (window.settingsUI && !window.settingsUI.initialized) {
                            window.settingsUI.init();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error loading Settings component:', error);
                    
                    // Fallback to traditional settings panel
                    this.activatePanel('settings');
                    console.log('Falling back to traditional settings panel');
                    
                    // Initialize settings UI if it hasn't been initialized
                    if (window.settingsUI && !window.settingsUI.initialized) {
                        window.settingsUI.init();
                    }
                });
        } else {
            console.error('Component loader not available, falling back to traditional settings panel');
            
            // Fallback to traditional panel
            this.activatePanel('settings');
            
            // Initialize settings UI if it hasn't been initialized
            if (window.settingsUI && !window.settingsUI.initialized) {
                window.settingsUI.init();
            }
        }
    }
    
    /**
     * Show the profile panel
     */
    showProfilePanel() {
        console.log('Showing profile panel with Shadow DOM isolation');
        
        // Load the Profile component using Shadow DOM isolation
        this.loadProfileComponent();
    }
    
    /**
     * Load the Profile component using Shadow DOM isolation
     */
    loadProfileComponent() {
        // First, set the activeComponent to 'profile'
        this.activeComponent = 'profile';
        tektonUI.activeComponent = 'profile';
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // Clear the HTML panel
        htmlPanel.innerHTML = '';
        
        // Create a container for the component
        const container = document.createElement('div');
        container.id = 'profile-container';
        container.className = 'shadow-component-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';
        htmlPanel.appendChild(container);
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Load the component using the component loader
        if (window.componentLoader) {
            window.componentLoader.loadComponent('profile', container)
                .then(component => {
                    if (component) {
                        // Register the component
                        this.components['profile'] = {
                            id: 'profile',
                            loaded: true,
                            usesTerminal: false,
                            shadowComponent: true,
                            container
                        };
                        
                        console.log('Profile component loaded successfully with Shadow DOM isolation');
                    } else {
                        console.error('Failed to load Profile component with Shadow DOM');
                        
                        // Fallback to traditional profile panel
                        this.activatePanel('profile');
                        console.log('Falling back to traditional profile panel');
                        
                        // Initialize profile UI if it hasn't been initialized
                        if (window.profileUI && !window.profileUI.initialized) {
                            window.profileUI.init();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error loading Profile component:', error);
                    
                    // Fallback to traditional profile panel
                    this.activatePanel('profile');
                    console.log('Falling back to traditional profile panel');
                    
                    // Initialize profile UI if it hasn't been initialized
                    if (window.profileUI && !window.profileUI.initialized) {
                        window.profileUI.init();
                    }
                });
        } else {
            console.error('Component loader not available, falling back to traditional profile panel');
            
            // Fallback to traditional panel
            this.activatePanel('profile');
            
            // Initialize profile UI if it hasn't been initialized
            if (window.profileUI && !window.profileUI.initialized) {
                window.profileUI.init();
            }
        }
    }
    
    /**
     * Load the Rhetor component using the Component Loader with Shadow DOM
     */
    loadRhetorComponent() {
        console.log('Loading Rhetor component with Shadow DOM isolation...');
        
        // First, set the activeComponent to 'rhetor'
        this.activeComponent = 'rhetor';
        tektonUI.activeComponent = 'rhetor';
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // Clear the HTML panel
        htmlPanel.innerHTML = '';
        
        // Create a container for the component
        const container = document.createElement('div');
        container.id = 'rhetor-container';
        container.className = 'shadow-component-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';
        htmlPanel.appendChild(container);
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Load the component using the component loader
        if (window.componentLoader) {
            window.componentLoader.loadComponent('rhetor', container)
                .then(component => {
                    if (component) {
                        // Register the component
                        this.components['rhetor'] = {
                            id: 'rhetor',
                            loaded: true,
                            usesTerminal: false,
                            shadowComponent: true,
                            container
                        };
                        
                        console.log('Rhetor component loaded successfully with Shadow DOM isolation');
                    } else {
                        console.error('Failed to load Rhetor component with Shadow DOM');
                        
                        // Fallback to terminal panel
                        this.components['rhetor'] = {
                            id: 'rhetor',
                            loaded: true,
                            usesTerminal: true,
                        };
                        this.activatePanel('terminal');
                    }
                })
                .catch(error => {
                    console.error('Error loading Rhetor component:', error);
                    
                    // Fallback to terminal panel
                    this.components['rhetor'] = {
                        id: 'rhetor',
                        loaded: true,
                        usesTerminal: true,
                    };
                    this.activatePanel('terminal');
                });
        } else {
            console.error('Component loader not available, cannot load Rhetor component');
            
            // Show error in container
            container.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                    <h3>Error: Component Loader Not Available</h3>
                    <p>The Shadow DOM component loader is not available. Please check that main.js initializes the component loader correctly.</p>
                </div>
            `;
            
            // Fallback to terminal panel
            this.components['rhetor'] = {
                id: 'rhetor',
                loaded: true,
                usesTerminal: true,
            };
        }
    }
    
    /**
     * Load the Budget component using the Component Loader with Shadow DOM
     */
    loadBudgetComponent() {
        console.log('Loading Budget component with Shadow DOM isolation...');
        
        // First, set the activeComponent to 'budget'
        this.activeComponent = 'budget';
        tektonUI.activeComponent = 'budget';
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // Clear the HTML panel
        htmlPanel.innerHTML = '';
        
        // Create a container for the component
        const container = document.createElement('div');
        container.id = 'budget-container';
        container.className = 'shadow-component-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';
        htmlPanel.appendChild(container);
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Load the component using the component loader
        if (window.componentLoader) {
            window.componentLoader.loadComponent('budget', container)
                .then(component => {
                    if (component) {
                        // Register the component
                        this.components['budget'] = {
                            id: 'budget',
                            loaded: true,
                            usesTerminal: false,
                            shadowComponent: true,
                            container
                        };
                        
                        console.log('Budget component loaded successfully with Shadow DOM isolation');
                    } else {
                        console.error('Failed to load Budget component with Shadow DOM');
                        
                        // Fallback to terminal panel
                        this.components['budget'] = {
                            id: 'budget',
                            loaded: true,
                            usesTerminal: true,
                        };
                        this.activatePanel('terminal');
                    }
                })
                .catch(error => {
                    console.error('Error loading Budget component:', error);
                    
                    // Fallback to terminal panel
                    this.components['budget'] = {
                        id: 'budget',
                        loaded: true,
                        usesTerminal: true,
                    };
                    this.activatePanel('terminal');
                });
        } else {
            console.error('Component loader not available, cannot load Budget component');
            
            // Show error in container
            container.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                    <h3>Error: Component Loader Not Available</h3>
                    <p>The Shadow DOM component loader is not available. Please check that main.js initializes the component loader correctly.</p>
                </div>
            `;
            
            // Fallback to terminal panel
            this.components['budget'] = {
                id: 'budget',
                loaded: true,
                usesTerminal: true,
            };
        }
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