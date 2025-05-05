/**
 * UI Manager
 * Handles UI state, component switching, and panel management with a simplified architecture
 * Implements standardized component loading for the Fix GUI Sprint
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
        
        // SPECIAL CASE: Direct component loading for Hermes
        if (componentId === 'hermes') {
            console.log('DIRECT LOADING HERMES COMPONENT');
            this.loadHermesComponent();
            return;
        }
        
        // SPECIAL CASE: Direct component loading for Engram
        if (componentId === 'engram') {
            console.log('DIRECT LOADING ENGRAM COMPONENT');
            this.loadEngramComponent();
            return;
        }
        
        // SPECIAL CASE: Direct component loading for Athena
        if (componentId === 'athena') {
            console.log('DIRECT LOADING ATHENA COMPONENT');
            this.loadAthenaComponent();
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
            const specialComponents = ['rhetor', 'budget', 'terma', 'engram'];
            
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
        
        // Special case for Engram component - now using Shadow DOM
        if (componentId === 'engram') {
            this.loadEngramComponent();
            return;
        }
        
        // Special case for Athena - load from static HTML
        if (componentId === 'athena') {
            console.log('ATHENA: Loading Athena from static HTML');
            this.loadAthenaComponent();
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
    
    /**
     * Load the Hermes component using the Component Loader with Shadow DOM
     */
    loadHermesComponent() {
        console.log('Loading Hermes component with Shadow DOM isolation...');
        
        // First, set the activeComponent to 'hermes'
        this.activeComponent = 'hermes';
        tektonUI.activeComponent = 'hermes';
        
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
        container.id = 'hermes-container';
        container.className = 'shadow-component-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';
        htmlPanel.appendChild(container);
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Load the component using the component loader
        if (window.componentLoader) {
            window.componentLoader.loadComponent('hermes', container)
                .then(component => {
                    if (component) {
                        // Register the component
                        this.components['hermes'] = {
                            id: 'hermes',
                            loaded: true,
                            usesTerminal: false,
                            shadowComponent: true,
                            container
                        };
                        
                        console.log('Hermes component loaded successfully with Shadow DOM isolation');
                    } else {
                        console.error('Failed to load Hermes component with Shadow DOM');
                        
                        // Fallback to terminal panel
                        this.components['hermes'] = {
                            id: 'hermes',
                            loaded: true,
                            usesTerminal: true,
                        };
                        this.activatePanel('terminal');
                    }
                })
                .catch(error => {
                    console.error('Error loading Hermes component:', error);
                    
                    // Fallback to terminal panel
                    this.components['hermes'] = {
                        id: 'hermes',
                        loaded: true,
                        usesTerminal: true,
                    };
                    this.activatePanel('terminal');
                });
        } else {
            console.error('Component loader not available, cannot load Hermes component');
            
            // Show error in container
            container.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                    <h3>Error: Component Loader Not Available</h3>
                    <p>The Shadow DOM component loader is not available. Please check that main.js initializes the component loader correctly.</p>
                </div>
            `;
            
            // Fallback to terminal panel
            this.components['hermes'] = {
                id: 'hermes',
                loaded: true,
                usesTerminal: true,
            };
        }
    }
    
    /**
     * Load the Engram component using the Component Loader with Shadow DOM
     */
    loadEngramComponent() {
        console.log('Loading Engram component with Shadow DOM isolation...');
        
        // First, set the activeComponent to 'engram'
        this.activeComponent = 'engram';
        tektonUI.activeComponent = 'engram';
        
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
        container.id = 'engram-container';
        container.className = 'shadow-component-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';
        htmlPanel.appendChild(container);
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Load the component using the component loader
        if (window.componentLoader) {
            window.componentLoader.loadComponent('engram', container)
                .then(component => {
                    if (component) {
                        // Register the component
                        this.components['engram'] = {
                            id: 'engram',
                            loaded: true,
                            usesTerminal: false,
                            shadowComponent: true,
                            container
                        };
                        
                        console.log('Engram component loaded successfully with Shadow DOM isolation');
                    } else {
                        console.error('Failed to load Engram component with Shadow DOM');
                        
                        // Fallback to terminal panel
                        this.components['engram'] = {
                            id: 'engram',
                            loaded: true,
                            usesTerminal: true,
                        };
                        this.activatePanel('terminal');
                    }
                })
                .catch(error => {
                    console.error('Error loading Engram component:', error);
                    
                    // Fallback to terminal panel
                    this.components['engram'] = {
                        id: 'engram',
                        loaded: true,
                        usesTerminal: true,
                    };
                    this.activatePanel('terminal');
                });
        } else {
            console.error('Component loader not available, cannot load Engram component');
            
            // Show error in container
            container.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                    <h3>Error: Component Loader Not Available</h3>
                    <p>The Shadow DOM component loader is not available. Please check that main.js initializes the component loader correctly.</p>
                </div>
            `;
            
            // Fallback to terminal panel
            this.components['engram'] = {
                id: 'engram',
                loaded: true,
                usesTerminal: true,
            };
        }
    }
    
    /**
     * Load the Athena component using direct HTML injection pattern
     * This is our new pattern for all components in the Fix GUI Sprint
     */
    loadAthenaComponent() {
        console.log('Loading Athena component with direct HTML injection pattern...');
        
        // First, set the activeComponent to 'athena'
        this.activeComponent = 'athena';
        tektonUI.activeComponent = 'athena';
        
        // Get the HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // Clear any existing content in the HTML panel
        htmlPanel.innerHTML = '';
        
        // Activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
        // Define the component HTML directly
        // This direct injection approach solves the issues with loading full HTML documents
        const athenaHtml = `
            <div id="athena-container" class="athena-component" style="height: 100%; width: 100%; display: flex; flex-direction: column; background-color: #1a1a1a; color: #f0f0f0;">
                <!-- Header -->
                <header style="background-color: #252525; padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="/images/icon.jpg" alt="Athena" style="height: 2rem; width: auto; border-radius: 4px;">
                        <h1 style="margin: 0; font-size: 1.5rem;">Athena Knowledge Graph</h1>
                    </div>
                    <div>
                        <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: #aaa;">
                            <span id="entity-count">Entities: <strong style="color: #4a86e8;">247</strong></span> |
                            <span id="relationship-count">Relationships: <strong style="color: #4a86e8;">615</strong></span>
                        </div>
                    </div>
                </header>
                
                <!-- Tabs -->
                <div class="athena-tabs" style="display: flex; background-color: #252525; border-bottom: 1px solid #444;">
                    <div class="athena-tab active" data-panel="graph" 
                         style="padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 3px solid #007bff; font-weight: bold;">
                        Knowledge Graph
                    </div>
                    <div class="athena-tab" data-panel="chat" 
                         style="padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 3px solid transparent;">
                        Knowledge Chat
                    </div>
                    <div class="athena-tab" data-panel="entities" 
                         style="padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 3px solid transparent;">
                        Entities
                    </div>
                    <div class="athena-tab" data-panel="query" 
                         style="padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 3px solid transparent;">
                        Query Builder
                    </div>
                </div>
                
                <!-- Content -->
                <div class="athena-content" style="flex: 1; padding: 1rem; overflow: auto;">
                    <!-- Graph Panel -->
                    <div class="athena-panel active" id="graph-panel" style="height: 100%; display: block;">
                        <div class="graph-toolbar" style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #444; background-color: #252525;">
                            <div class="graph-controls" style="display: flex; gap: 0.5rem;">
                                <button id="zoom-in-btn" class="graph-btn" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                    <span style="font-size: 1.2rem;">+</span>
                                </button>
                                <button id="zoom-out-btn" class="graph-btn" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                    <span style="font-size: 1.2rem;">-</span>
                                </button>
                                <button id="reset-view-btn" class="graph-btn" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                    <span>Reset</span>
                                </button>
                            </div>
                            <div class="graph-filters" style="display: flex; gap: 0.5rem;">
                                <select id="entity-type-filter" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px;">
                                    <option value="all">All Types</option>
                                    <option value="person">Person</option>
                                    <option value="organization">Organization</option>
                                    <option value="location">Location</option>
                                    <option value="concept">Concept</option>
                                </select>
                                <select id="relationship-filter" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px;">
                                    <option value="all">All Relationships</option>
                                    <option value="works_for">Works For</option>
                                    <option value="knows">Knows</option>
                                    <option value="located_in">Located In</option>
                                    <option value="part_of">Part Of</option>
                                </select>
                                <button id="search-graph-btn" class="graph-btn" style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>
                        <div id="graph-container" style="height: calc(100% - 50px); background-color: #1a1a1a; border-radius: 0 0 4px 4px; position: relative;">
                            <!-- Graph visualization will be rendered here -->
                            <div id="graph-placeholder" style="height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 2rem;">
                                <div style="width: 80px; height: 80px; border: 4px solid #333; border-top-color: #4a86e8; border-radius: 50%; margin-bottom: 1rem; animation: spin 1s linear infinite;"></div>
                                <h2 style="color: #999; margin-bottom: 1rem;">Loading Knowledge Graph</h2>
                                <p style="color: #777; max-width: 600px;">The visualization allows you to explore relationships between entities in the knowledge graph. You can zoom, pan, and click on nodes to see details.</p>
                                <style>
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                </style>
                            </div>
                            
                            <!-- Entity Details Sidebar (hidden by default) -->
                            <div id="entity-sidebar" style="position: absolute; top: 0; right: 0; width: 300px; height: 100%; background-color: #252525; border-left: 1px solid #444; transform: translateX(100%); transition: transform 0.3s ease; overflow-y: auto;">
                                <div style="padding: 1rem; border-bottom: 1px solid #444;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <h3 id="entity-sidebar-title" style="margin: 0; color: #f0f0f0;">Entity Details</h3>
                                        <button id="close-sidebar-btn" style="background: none; border: none; color: #f0f0f0; font-size: 1.2rem; cursor: pointer;">&times;</button>
                                    </div>
                                    <div id="entity-sidebar-type" style="font-size: 0.9rem; color: #aaa; margin-top: 0.25rem;"></div>
                                </div>
                                <div id="entity-sidebar-content" style="padding: 1rem;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Chat Panel -->
                    <div class="athena-panel" id="chat-panel" style="height: 100%; display: none;">
                        <div style="height: 100%; display: flex; flex-direction: column;">
                            <div class="chat-toolbar" style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #444; background-color: #252525;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="color: #aaa;">Knowledge Assistant</span>
                                    <span class="status-indicator" style="width: 8px; height: 8px; border-radius: 50%; background-color: #4CAF50; display: inline-block;"></span>
                                </div>
                                <div>
                                    <button id="clear-chat-btn" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                        Clear Chat
                                    </button>
                                </div>
                            </div>
                            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 1rem; background-color: #1a1a1a; margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 1rem;">
                                <!-- Welcome message -->
                                <div class="chat-message system-message" style="background-color: #252525; padding: 1rem; border-radius: 4px; border-left: 3px solid #4a86e8;">
                                    <p style="margin: 0; color: #f0f0f0;">Welcome to Knowledge Chat! I can answer questions about your knowledge graph and provide insights about the entities and relationships.</p>
                                    <p style="margin: 0.5rem 0 0; color: #aaa;">Try asking questions like:</p>
                                    <ul style="margin: 0.5rem 0 0; color: #aaa;">
                                        <li>What do you know about [entity name]?</li>
                                        <li>How are [entity A] and [entity B] connected?</li>
                                        <li>What organizations are located in [location]?</li>
                                        <li>List all people who work for [organization].</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="chat-input-container" style="display: flex; gap: 0.5rem; padding: 0.5rem; background-color: #252525; border-top: 1px solid #444;">
                                <textarea id="chat-input" style="flex: 1; padding: 0.75rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0; font-family: inherit; resize: none; min-height: 2.5rem; max-height: 150px; overflow-y: auto;" placeholder="Ask a question about your knowledge graph..." rows="1"></textarea>
                                <button id="send-button" style="padding: 0.75rem 1.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; align-self: flex-end;">Send</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Entities Panel -->
                    <div class="athena-panel" id="entities-panel" style="height: 100%; display: none;">
                        <div style="display: flex; height: 100%; gap: 1rem;">
                            <div style="width: 30%; background-color: #1a1a1a; border-radius: 4px; overflow-y: auto; display: flex; flex-direction: column;">
                                <div class="entity-search" style="padding: 1rem; border-bottom: 1px solid #333;">
                                    <div style="position: relative;">
                                        <input type="text" id="entity-search" placeholder="Search entities..." style="width: 100%; padding: 0.5rem 2rem 0.5rem 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;">
                                        <button id="entity-search-btn" style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #aaa; cursor: pointer;">
                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div style="display: flex; margin-top: 0.5rem; gap: 0.5rem; flex-wrap: wrap;">
                                        <select id="entity-type-select" style="padding: 0.25rem; background-color: #2d2d2d; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; flex: 1;">
                                            <option value="all">All Types</option>
                                            <option value="person">Person</option>
                                            <option value="organization">Organization</option>
                                            <option value="location">Location</option>
                                            <option value="concept">Concept</option>
                                        </select>
                                        <select id="entity-sort-select" style="padding: 0.25rem; background-color: #2d2d2d; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; flex: 1;">
                                            <option value="name">Sort by Name</option>
                                            <option value="type">Sort by Type</option>
                                            <option value="recent">Recently Added</option>
                                            <option value="connections">Most Connected</option>
                                        </select>
                                    </div>
                                </div>
                                <div id="entity-list" style="flex: 1; overflow-y: auto; padding: 0.5rem;">
                                    <!-- Loading indicator -->
                                    <div id="entity-list-loading" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center;">
                                        <div style="width: 40px; height: 40px; border: 3px solid #333; border-top-color: #4a86e8; border-radius: 50%; margin-bottom: 1rem; animation: spin 1s linear infinite;"></div>
                                        <p style="color: #aaa; margin: 0;">Loading entities...</p>
                                    </div>
                                    
                                    <!-- Entity list items will be populated here -->
                                    <div id="entity-list-items" style="display: none;">
                                        <!-- Sample entity items for layout purposes -->
                                        <div class="entity-item" style="padding: 0.75rem; border-bottom: 1px solid #333; cursor: pointer;" data-entity-id="e1">
                                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                                <h4 style="margin: 0 0 0.25rem; color: #f0f0f0;">John Smith</h4>
                                                <span style="font-size: 0.75rem; background-color: #4285F4; color: white; padding: 0.125rem 0.375rem; border-radius: 3px;">Person</span>
                                            </div>
                                            <p style="margin: 0; font-size: 0.9rem; color: #aaa;">CEO at Acme Corporation</p>
                                        </div>
                                        <div class="entity-item" style="padding: 0.75rem; border-bottom: 1px solid #333; cursor: pointer;" data-entity-id="e2">
                                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                                <h4 style="margin: 0 0 0.25rem; color: #f0f0f0;">Acme Corporation</h4>
                                                <span style="font-size: 0.75rem; background-color: #34A853; color: white; padding: 0.125rem 0.375rem; border-radius: 3px;">Organization</span>
                                            </div>
                                            <p style="margin: 0; font-size: 0.9rem; color: #aaa;">Technology company based in San Francisco</p>
                                        </div>
                                        <div class="entity-item" style="padding: 0.75rem; border-bottom: 1px solid #333; cursor: pointer;" data-entity-id="e3">
                                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                                <h4 style="margin: 0 0 0.25rem; color: #f0f0f0;">San Francisco</h4>
                                                <span style="font-size: 0.75rem; background-color: #FBBC05; color: white; padding: 0.125rem 0.375rem; border-radius: 3px;">Location</span>
                                            </div>
                                            <p style="margin: 0; font-size: 0.9rem; color: #aaa;">City in California, USA</p>
                                        </div>
                                    </div>
                                </div>
                                <div style="padding: 1rem; border-top: 1px solid #333; background-color: #1a1a1a;">
                                    <button id="add-entity-btn" style="width: 100%; padding: 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        Add New Entity
                                    </button>
                                </div>
                            </div>
                            <div id="entity-details" style="flex: 1; background-color: #1a1a1a; border-radius: 4px; padding: 0; display: flex; flex-direction: column; overflow: hidden;">
                                <!-- Loading placeholder -->
                                <div id="entity-details-placeholder" style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 2rem;">
                                    <h2 style="color: #999; margin-bottom: 1rem;">Entity Details</h2>
                                    <p style="color: #777; max-width: 600px;">Select an entity from the list to view its properties and relationships.</p>
                                </div>
                                
                                <!-- Entity details content (initially hidden) -->
                                <div id="entity-details-content" style="display: none; height: 100%; flex-direction: column;">
                                    <div class="entity-details-header" style="padding: 1rem; border-bottom: 1px solid #444; background-color: #252525; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <h3 id="entity-detail-name" style="margin: 0 0 0.25rem; color: #f0f0f0;">Entity Name</h3>
                                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                                <span id="entity-detail-type" style="font-size: 0.75rem; background-color: #4285F4; color: white; padding: 0.125rem 0.375rem; border-radius: 3px;">Entity Type</span>
                                                <span id="entity-detail-id" style="font-size: 0.75rem; color: #aaa;">ID: entity-123</span>
                                            </div>
                                        </div>
                                        <div>
                                            <button id="edit-entity-btn" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
                                                Edit
                                            </button>
                                            <button id="view-in-graph-btn" style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                                View in Graph
                                            </button>
                                        </div>
                                    </div>
                                    <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
                                        <!-- Properties section -->
                                        <div style="padding: 1rem; border-bottom: 1px solid #333;">
                                            <h4 style="margin: 0 0 0.5rem; color: #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
                                                Properties
                                                <button id="add-property-btn" style="font-size: 0.875rem; padding: 0.125rem 0.375rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                                    + Add
                                                </button>
                                            </h4>
                                            <table id="entity-properties-table" style="width: 100%; border-collapse: collapse;">
                                                <tr style="border-bottom: 1px solid #333;">
                                                    <td style="padding: 0.5rem; width: 30%; color: #f0f0f0; font-weight: bold;">name</td>
                                                    <td style="padding: 0.5rem; color: #f0f0f0;">John Smith</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #333;">
                                                    <td style="padding: 0.5rem; width: 30%; color: #f0f0f0; font-weight: bold;">title</td>
                                                    <td style="padding: 0.5rem; color: #f0f0f0;">CEO</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #333;">
                                                    <td style="padding: 0.5rem; width: 30%; color: #f0f0f0; font-weight: bold;">age</td>
                                                    <td style="padding: 0.5rem; color: #f0f0f0;">42</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <!-- Relationships section -->
                                        <div style="padding: 1rem;">
                                            <h4 style="margin: 0 0 0.5rem; color: #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
                                                Relationships
                                                <button id="add-relationship-btn" style="font-size: 0.875rem; padding: 0.125rem 0.375rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                                    + Add
                                                </button>
                                            </h4>
                                            <div id="entity-relationships">
                                                <!-- Outgoing relationships -->
                                                <div style="margin-bottom: 1rem;">
                                                    <h5 style="margin: 0 0 0.5rem; color: #aaa; font-size: 0.875rem;">Outgoing</h5>
                                                    <div class="relationship-item" style="padding: 0.5rem; border: 1px solid #333; border-radius: 4px; margin-bottom: 0.5rem;">
                                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                                            <span style="color: #f0f0f0; font-weight: bold;">works_for</span>
                                                            <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 3px; background-color: #4285F4; color: white;">Outgoing</span>
                                                        </div>
                                                        <div style="margin-top: 0.25rem; padding: 0.25rem; background-color: #252525; border-radius: 4px;">
                                                            <a href="#" class="entity-link" style="color: #4a86e8; text-decoration: none; display: flex; justify-content: space-between; align-items: center;" data-entity-id="e2">
                                                                <span>Acme Corporation</span>
                                                                <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 3px; background-color: #34A853; color: white;">Organization</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div class="relationship-item" style="padding: 0.5rem; border: 1px solid #333; border-radius: 4px; margin-bottom: 0.5rem;">
                                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                                            <span style="color: #f0f0f0; font-weight: bold;">lives_in</span>
                                                            <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 3px; background-color: #4285F4; color: white;">Outgoing</span>
                                                        </div>
                                                        <div style="margin-top: 0.25rem; padding: 0.25rem; background-color: #252525; border-radius: 4px;">
                                                            <a href="#" class="entity-link" style="color: #4a86e8; text-decoration: none; display: flex; justify-content: space-between; align-items: center;" data-entity-id="e3">
                                                                <span>San Francisco</span>
                                                                <span style="font-size: 0.75rem; padding: 0.125rem 0.375rem; border-radius: 3px; background-color: #FBBC05; color: white;">Location</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <!-- Incoming relationships -->
                                                <div>
                                                    <h5 style="margin: 0 0 0.5rem; color: #aaa; font-size: 0.875rem;">Incoming</h5>
                                                    <div style="padding: 1rem; text-align: center; color: #777; border: 1px dashed #333; border-radius: 4px;">
                                                        No incoming relationships
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Query Panel -->
                    <div class="athena-panel" id="query-panel" style="height: 100%; display: none;">
                        <div class="query-builder" style="display: flex; flex-direction: column; height: 100%; gap: 1rem;">
                            <div class="query-section" style="background-color: #1a1a1a; border-radius: 4px; padding: 1rem;">
                                <h3 style="margin-top: 0; color: #ddd; display: flex; justify-content: space-between; align-items: center;">
                                    Build Query
                                    <button id="save-query-btn" style="font-size: 0.875rem; padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                                        Save Query
                                    </button>
                                </h3>
                                <div style="margin-bottom: 1rem;">
                                    <label for="query-type" style="display: block; margin-bottom: 0.5rem; color: #f0f0f0;">Query Type:</label>
                                    <select id="query-type" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;">
                                        <option value="entity">Entity Query</option>
                                        <option value="relationship">Relationship Query</option>
                                        <option value="path">Path Query</option>
                                    </select>
                                </div>
                                <div id="query-builder-form" style="margin-top: 1rem;">
                                    <!-- Entity query form (default) -->
                                    <div class="query-form" id="entity-query-form">
                                        <div style="margin-bottom: 1rem;">
                                            <label style="display: block; margin-bottom: 0.5rem; color: #f0f0f0;">Entity Type:</label>
                                            <select id="entity-query-type" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;">
                                                <option value="person">Person</option>
                                                <option value="organization">Organization</option>
                                                <option value="location">Location</option>
                                                <option value="event">Event</option>
                                                <option value="concept">Concept</option>
                                            </select>
                                        </div>
                                        <div style="margin-bottom: 1rem;">
                                            <label style="display: block; margin-bottom: 0.5rem; color: #f0f0f0;">Properties (Optional):</label>
                                            <textarea id="entity-query-props" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0; min-height: 5rem; font-family: monospace;" placeholder="name: John Doe
title: CEO"></textarea>
                                            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #aaa;">Enter properties in YAML format, one per line</div>
                                        </div>
                                        <div style="margin-bottom: 1rem;">
                                            <label style="display: block; margin-bottom: 0.5rem; color: #f0f0f0;">Limit Results:</label>
                                            <input type="number" id="entity-query-limit" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;" value="10" min="1" max="100">
                                        </div>
                                        <button id="run-entity-query" style="padding: 0.5rem 1rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Run Query</button>
                                    </div>
                                </div>
                            </div>
                            <div class="query-results" style="flex: 1; background-color: #1a1a1a; border-radius: 4px; padding: 1rem; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <h3 style="margin: 0; color: #ddd;">Results</h3>
                                    <div>
                                        <button id="export-results-btn" style="padding: 0.25rem 0.5rem; background-color: #333; color: #f0f0f0; border: 1px solid #444; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
                                            Export
                                        </button>
                                        <button id="view-results-in-graph-btn" style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                            View in Graph
                                        </button>
                                    </div>
                                </div>
                                <div id="query-results-container" style="flex: 1; overflow-y: auto;">
                                    <div id="query-results-placeholder" style="height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
                                        <p style="color: #aaa; max-width: 600px;">Results will be displayed here after running a query</p>
                                    </div>
                                    
                                    <!-- Results table (initially hidden) -->
                                    <div id="query-results-table-container" style="display: none;">
                                        <div style="margin-bottom: 0.5rem; color: #aaa;">
                                            <span id="query-result-count">10 results found</span> in <span id="query-execution-time">0.24</span> seconds
                                        </div>
                                        <div style="max-height: 100%; overflow-y: auto;">
                                            <table id="query-results-table" style="width: 100%; border-collapse: collapse;">
                                                <thead>
                                                    <tr style="background-color: #252525; color: #f0f0f0;">
                                                        <th style="padding: 0.5rem; text-align: left; position: sticky; top: 0; background-color: #252525; z-index: 1;">ID</th>
                                                        <th style="padding: 0.5rem; text-align: left; position: sticky; top: 0; background-color: #252525; z-index: 1;">Type</th>
                                                        <th style="padding: 0.5rem; text-align: left; position: sticky; top: 0; background-color: #252525; z-index: 1;">Name</th>
                                                        <th style="padding: 0.5rem; text-align: left; position: sticky; top: 0; background-color: #252525; z-index: 1;">Properties</th>
                                                        <th style="padding: 0.5rem; text-align: center; position: sticky; top: 0; background-color: #252525; z-index: 1;">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <!-- Sample results for layout -->
                                                    <tr style="border-bottom: 1px solid #333;">
                                                        <td style="padding: 0.5rem; color: #aaa;">E-001</td>
                                                        <td style="padding: 0.5rem;">
                                                            <span style="font-size: 0.75rem; background-color: #4285F4; color: white; padding: 0.125rem 0.375rem; border-radius: 3px;">Person</span>
                                                        </td>
                                                        <td style="padding: 0.5rem; color: #f0f0f0;">John Smith</td>
                                                        <td style="padding: 0.5rem; color: #aaa;">title: CEO, age: 42</td>
                                                        <td style="padding: 0.5rem; text-align: center;">
                                                            <button class="view-result-btn" style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" data-entity-id="E-001">View</button>
                                                        </td>
                                                    </tr>
                                                    <tr style="border-bottom: 1px solid #333;">
                                                        <td style="padding: 0.5rem; color: #aaa;">E-002</td>
                                                        <td style="padding: 0.5rem;">
                                                            <span style="font-size: 0.75rem; background-color: #34A853; color: white; padding: 0.125rem 0.375rem; border-radius: 3px;">Organization</span>
                                                        </td>
                                                        <td style="padding: 0.5rem; color: #f0f0f0;">Acme Corporation</td>
                                                        <td style="padding: 0.5rem; color: #aaa;">industry: Technology, founded: 2010</td>
                                                        <td style="padding: 0.5rem; text-align: center;">
                                                            <button class="view-result-btn" style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" data-entity-id="E-002">View</button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    <!-- Loading indicator (initially hidden) -->
                                    <div id="query-results-loading" style="display: none; height: 100%; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center;">
                                        <div style="width: 40px; height: 40px; border: 3px solid #333; border-top-color: #4a86e8; border-radius: 50%; margin-bottom: 1rem; animation: spin 1s linear infinite;"></div>
                                        <p style="color: #aaa; margin: 0;">Running query...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the HTML directly to the panel
        htmlPanel.innerHTML = athenaHtml;
        
        // Add tab switching functionality
        const setupTabs = () => {
            const tabs = document.querySelectorAll('.athena-tab');
            const panels = document.querySelectorAll('.athena-panel');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Update active tab
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        t.style.borderBottomColor = 'transparent';
                    });
                    tab.classList.add('active');
                    tab.style.borderBottomColor = '#007bff';
                    
                    // Show active panel
                    const panelId = tab.getAttribute('data-panel') + '-panel';
                    panels.forEach(panel => {
                        panel.style.display = 'none';
                        panel.classList.remove('active');
                    });
                    const activePanel = document.getElementById(panelId);
                    if (activePanel) {
                        activePanel.style.display = 'block';
                        activePanel.classList.add('active');
                    }
                    
                    // Update the active tab in the Athena component if it exists
                    if (window.athenaComponent) {
                        window.athenaComponent.activeTab = tab.getAttribute('data-panel');
                    }
                });
            });
            
            // Set up chat input functionality
            const chatInput = document.getElementById('chat-input');
            const sendButton = document.getElementById('send-button');
            
            if (chatInput && sendButton) {
                // Auto-resize text area as user types
                chatInput.addEventListener('input', () => {
                    chatInput.style.height = 'auto';
                    chatInput.style.height = (chatInput.scrollHeight) + 'px';
                });
                
                // Send message on button click
                sendButton.addEventListener('click', () => {
                    const message = chatInput.value.trim();
                    if (message) {
                        // Call Athena service if available
                        if (window.athenaService) {
                            window.athenaService.sendMessage(message);
                        } else {
                            console.log('Athena service not available, message not sent:', message);
                        }
                        chatInput.value = '';
                        chatInput.style.height = 'auto';
                    }
                });
                
                // Send message on Enter key (but allow Shift+Enter for new lines)
                chatInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendButton.click();
                    }
                });
            }
            
            // Init query builder
            const queryTypeSelect = document.getElementById('query-type');
            if (queryTypeSelect) {
                queryTypeSelect.addEventListener('change', () => {
                    const queryType = queryTypeSelect.value;
                    const formContainer = document.getElementById('query-builder-form');
                    
                    // Generate form based on query type
                    if (formContainer) {
                        switch (queryType) {
                            case 'entity':
                                formContainer.innerHTML = `
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Entity Type:</label>
                                        <select style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;">
                                            <option value="person">Person</option>
                                            <option value="organization">Organization</option>
                                            <option value="location">Location</option>
                                            <option value="event">Event</option>
                                            <option value="concept">Concept</option>
                                        </select>
                                    </div>
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Properties (Optional):</label>
                                        <textarea style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0; min-height: 5rem;" placeholder="name: John Doe"></textarea>
                                    </div>
                                    <button style="padding: 0.5rem 1rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Run Query</button>
                                `;
                                break;
                            case 'relationship':
                                formContainer.innerHTML = `
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Source Entity:</label>
                                        <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;" placeholder="Entity ID or name">
                                    </div>
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Relationship Type:</label>
                                        <select style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;">
                                            <option value="any">Any</option>
                                            <option value="works_for">Works For</option>
                                            <option value="knows">Knows</option>
                                            <option value="located_in">Located In</option>
                                            <option value="part_of">Part Of</option>
                                        </select>
                                    </div>
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Target Entity (Optional):</label>
                                        <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;" placeholder="Entity ID or name">
                                    </div>
                                    <button style="padding: 0.5rem 1rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Run Query</button>
                                `;
                                break;
                            case 'path':
                                formContainer.innerHTML = `
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Source Entity:</label>
                                        <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;" placeholder="Entity ID or name">
                                    </div>
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Target Entity:</label>
                                        <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;" placeholder="Entity ID or name">
                                    </div>
                                    <div style="margin-bottom: 1rem;">
                                        <label style="display: block; margin-bottom: 0.5rem;">Max Path Length:</label>
                                        <input type="number" style="width: 100%; padding: 0.5rem; border: 1px solid #444; border-radius: 4px; background-color: #2d2d2d; color: #f0f0f0;" value="3" min="1" max="5">
                                    </div>
                                    <button style="padding: 0.5rem 1rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Find Paths</button>
                                `;
                                break;
                        }
                        
                        // Add event listener to query buttons
                        const queryButton = formContainer.querySelector('button');
                        if (queryButton) {
                            queryButton.addEventListener('click', () => {
                                const resultsContainer = document.getElementById('query-results-container');
                                if (resultsContainer) {
                                    resultsContainer.innerHTML = `
                                        <div style="padding: 1rem; background-color: #252525; border-radius: 4px;">
                                            <p style="margin-bottom: 0.5rem; color: #aaa;">Running query...</p>
                                            <div style="width: 100%; height: 4px; background-color: #333; border-radius: 2px; overflow: hidden;">
                                                <div style="width: 30%; height: 100%; background-color: #007bff; animation: progress 2s infinite linear;"></div>
                                            </div>
                                            <style>
                                                @keyframes progress {
                                                    0% { transform: translateX(-100%); }
                                                    100% { transform: translateX(100%); }
                                                }
                                            </style>
                                        </div>
                                    `;
                                    
                                    // Simulate query results after delay
                                    setTimeout(() => {
                                        if (resultsContainer) {
                                            resultsContainer.innerHTML = `
                                                <div style="padding: 1rem; background-color: #252525; border-radius: 4px;">
                                                    <h4 style="margin-top: 0; color: #ddd;">Query Results</h4>
                                                    <p style="color: #aaa;">10 results found</p>
                                                    <div style="max-height: 300px; overflow-y: auto; margin-top: 1rem; border: 1px solid #333; border-radius: 4px;">
                                                        <table style="width: 100%; border-collapse: collapse;">
                                                            <thead>
                                                                <tr style="background-color: #333; color: #ddd;">
                                                                    <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #444;">ID</th>
                                                                    <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #444;">Type</th>
                                                                    <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #444;">Name</th>
                                                                    <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #444;">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr style="border-bottom: 1px solid #333;">
                                                                    <td style="padding: 0.5rem; color: #aaa;">E-001</td>
                                                                    <td style="padding: 0.5rem; color: #aaa;">Person</td>
                                                                    <td style="padding: 0.5rem; color: #aaa;">John Smith</td>
                                                                    <td style="padding: 0.5rem;"><button style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">View</button></td>
                                                                </tr>
                                                                <tr style="border-bottom: 1px solid #333;">
                                                                    <td style="padding: 0.5rem; color: #aaa;">E-002</td>
                                                                    <td style="padding: 0.5rem; color: #aaa;">Organization</td>
                                                                    <td style="padding: 0.5rem; color: #aaa;">Acme Corporation</td>
                                                                    <td style="padding: 0.5rem;"><button style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">View</button></td>
                                                                </tr>
                                                                <tr style="border-bottom: 1px solid #333;">
                                                                    <td style="padding: 0.5rem; color: #aaa;">E-003</td>
                                                                    <td style="padding: 0.5rem; color: #aaa;">Location</td>
                                                                    <td style="padding: 0.5rem; color: #aaa;">San Francisco</td>
                                                                    <td style="padding: 0.5rem;"><button style="padding: 0.25rem 0.5rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">View</button></td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            `;
                                            
                                            // Add event listeners to view buttons
                                            const viewButtons = resultsContainer.querySelectorAll('button');
                                            viewButtons.forEach(button => {
                                                button.addEventListener('click', () => {
                                                    // Switch to entities tab and show details
                                                    const entitiesTab = document.querySelector('.athena-tab[data-panel="entities"]');
                                                    if (entitiesTab) {
                                                        entitiesTab.click();
                                                        
                                                        // Simulate loading entity details
                                                        const entityDetails = document.getElementById('entity-details');
                                                        if (entityDetails) {
                                                            entityDetails.innerHTML = `
                                                                <div style="padding: 1rem;">
                                                                    <h3 style="margin-top: 0; color: #ddd;">Entity Details</h3>
                                                                    <div style="margin-bottom: 1rem;">
                                                                        <span style="color: #aaa; display: inline-block; width: 100px;">ID:</span>
                                                                        <span style="color: #ddd;">E-001</span>
                                                                    </div>
                                                                    <div style="margin-bottom: 1rem;">
                                                                        <span style="color: #aaa; display: inline-block; width: 100px;">Type:</span>
                                                                        <span style="color: #ddd;">Person</span>
                                                                    </div>
                                                                    <div style="margin-bottom: 1rem;">
                                                                        <span style="color: #aaa; display: inline-block; width: 100px;">Name:</span>
                                                                        <span style="color: #ddd;">John Smith</span>
                                                                    </div>
                                                                    <div style="margin-bottom: 1rem;">
                                                                        <span style="color: #aaa; display: inline-block; width: 100px;">Age:</span>
                                                                        <span style="color: #ddd;">42</span>
                                                                    </div>
                                                                    <div style="margin-bottom: 1rem;">
                                                                        <span style="color: #aaa; display: inline-block; width: 100px;">Role:</span>
                                                                        <span style="color: #ddd;">Software Engineer</span>
                                                                    </div>
                                                                    <h4 style="margin-top: 2rem; color: #ddd;">Relationships</h4>
                                                                    <div style="margin-bottom: 0.5rem;">
                                                                        <span style="color: #4a86e8; font-weight: bold;">Works For</span>
                                                                        <span style="color: #aaa;"> → </span>
                                                                        <span style="color: #ddd;">Acme Corporation (E-002)</span>
                                                                    </div>
                                                                    <div style="margin-bottom: 0.5rem;">
                                                                        <span style="color: #4a86e8; font-weight: bold;">Lives In</span>
                                                                        <span style="color: #aaa;"> → </span>
                                                                        <span style="color: #ddd;">San Francisco (E-003)</span>
                                                                    </div>
                                                                </div>
                                                            `;
                                                        }
                                                    }
                                                });
                                            });
                                        }
                                    }, 1500);
                                }
                            });
                        }
                    }
                });
            }
        };
        
        // Set up tab functionality after a short delay to ensure DOM is ready
        setTimeout(setupTabs, 100);
        
        // Initialize graph visualization (if script exists)
        setTimeout(() => {
            if (window.athenaService) {
                console.log('Initializing Athena service');
                window.athenaService.initialize();
            } else {
                console.log('Athena service not found, loading required scripts');
                this.loadAthenaScripts();
            }
        }, 200);
        
        // Register the component with a container reference
        const container = document.getElementById('athena-container');
        this.components['athena'] = {
            id: 'athena',
            loaded: true,
            usesTerminal: false, // Use HTML panel
            container: container
        };
        
        console.log('Athena component loaded successfully');
    }
    
    /**
     * Load the Athena component using static HTML approach (fallback method)
     */
    loadAthenaComponentStatic(container) {
        console.log('Loading Athena component using static HTML method (fallback)...');
        
        // IMPORTANT: Only use the component-specific HTML, not the full HTML page
        // This ensures we only get the component markup, not a complete HTML document
        const componentPath = 'components/athena/athena-component.html';
        
        // Cache busting parameter
        const cacheBuster = `?t=${new Date().getTime()}`;
        
        const path = componentPath + cacheBuster;
        console.log(`Loading Athena from: ${path}`);
        
        fetch(path)
            .then(response => {
                console.log(`Received response from ${path}: status ${response.status}`);
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                if (!html || html.trim().length === 0) {
                    throw new Error('Received empty HTML content');
                }
                
                console.log(`Loaded Athena HTML content successfully (${html.length} bytes)`);
                
                // Extract just the component HTML, not the full HTML document
                // This ensures we don't load a complete HTML document with its own body
                let componentHtml = html;
                
                // If the HTML contains a full document structure, extract just the component
                if (componentHtml.includes('<!DOCTYPE html>') || componentHtml.includes('<html')) {
                    console.log('Detected full HTML document, extracting just the component');
                    // Extract the component div (class="athena-component")
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(componentHtml, 'text/html');
                    const componentDiv = doc.querySelector('.athena-component');
                    
                    if (componentDiv) {
                        componentHtml = componentDiv.outerHTML;
                    } else {
                        console.warn('Could not find athena-component div, using body content');
                        componentHtml = doc.body.innerHTML;
                    }
                }
                
                // Add the component HTML content to the container
                container.innerHTML = componentHtml;
                console.log('Added Athena component HTML content to container');
                
                // Try to load Athena scripts
                this.loadAthenaScripts();
                
                // Load the CSS for Athena
                this.loadAthenaCss();
                
                // Register the component
                this.components['athena'] = {
                    id: 'athena',
                    loaded: true,
                    usesTerminal: false, // Use HTML panel
                };
                
                console.log('Athena component loaded successfully');
            })
            .catch(error => {
                console.error(`Failed to load Athena from ${path}: ${error.message}`);
                
                // Show error in container
                container.innerHTML = `
                    <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                        <h3>Error: Failed to Load Athena Component</h3>
                        <p>The Athena component could not be loaded: ${error.message}</p>
                        <p style="margin-top: 20px;">Click the Athena tab again to retry loading.</p>
                    </div>
                `;
                
                // Register the component anyway to prevent further loading attempts
                this.components['athena'] = {
                    id: 'athena',
                    loaded: true,
                    usesTerminal: false, // Use HTML panel
                };
            });
    }
    
    /**
     * Load Athena scripts manually
     */
    loadAthenaScripts() {
        console.log('Loading Athena scripts manually...');
        
        // List of scripts to load
        const scripts = [
            'scripts/athena/athena-service.js',
            'scripts/athena/athena-component.js'
        ];
        
        // Cache busting parameter
        const cacheBuster = `?t=${new Date().getTime()}`;
        
        // Load scripts sequentially
        const loadScript = (index) => {
            if (index >= scripts.length) {
                console.log('All Athena scripts loaded successfully');
                return;
            }
            
            const scriptPath = scripts[index];
            const scriptElement = document.createElement('script');
            scriptElement.src = `/${scriptPath}${cacheBuster}`;
            scriptElement.onerror = () => {
                console.error(`Failed to load script: ${scriptPath}`);
                // Continue loading other scripts
                loadScript(index + 1);
            };
            scriptElement.onload = () => {
                console.log(`Successfully loaded script: ${scriptPath}`);
                // Load next script
                loadScript(index + 1);
            };
            document.head.appendChild(scriptElement);
        };
        
        // Start loading scripts
        loadScript(0);
    }
    
    /**
     * Load Athena CSS manually
     */
    loadAthenaCss() {
        console.log('Loading Athena CSS manually...');
        
        // CSS to load
        const cssPath = 'styles/athena/athena-component.css';
        
        // Check if stylesheet already exists
        const existingLink = document.querySelector(`link[href*="${cssPath}"]`);
        if (existingLink) {
            console.log('Athena CSS already loaded, skipping');
            return;
        }
        
        // Cache busting parameter
        const cacheBuster = `?t=${new Date().getTime()}`;
        
        // Create link element
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = `/${cssPath}${cacheBuster}`;
        linkElement.onload = () => {
            console.log('Athena CSS loaded successfully');
        };
        linkElement.onerror = () => {
            console.error('Failed to load Athena CSS');
        };
        
        // Add to document head
        document.head.appendChild(linkElement);
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