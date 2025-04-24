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
        
        console.log('UI Manager initialized');
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
    loadComponentUI(componentId) {
        // If we've already loaded this component, just activate it
        if (this.components[componentId]) {
            this.activateComponentUI(componentId);
            return;
        }
        
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
        
        // Special case for Terma component
        if (componentId === 'terma') {
            this.loadTermaComponent();
            return;
        }
        
        // Special case for Rhetor component
        if (componentId === 'rhetor') {
            this.loadRhetorComponent();
            return;
        }
        
        // Special case for Budget component
        if (componentId === 'budget') {
            this.loadBudgetComponent();
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
     * Load the Rhetor component
     */
    loadRhetorComponent() {
        console.log('Loading Rhetor component...');
        
        // First, set the activeComponent to 'rhetor'
        this.activeComponent = 'rhetor';
        tektonUI.activeComponent = 'rhetor';
        
        // Create an empty container in the HTML panel if it doesn't exist
        const htmlPanel = document.getElementById('html-panel');
        console.log('HTML panel found:', !!htmlPanel);
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // IMPORTANT: Clear the HTML panel completely
        htmlPanel.innerHTML = '';
        
        // Create a new container
        console.log('Creating rhetor-container div');
        const container = document.createElement('div');
        container.id = 'rhetor-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.overflow = 'auto';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.backgroundColor = 'var(--bg-primary, #1e1e1e)';
        htmlPanel.appendChild(container);
        
        // Add detailed logging to diagnose issues
        const rhetorContainer = document.getElementById('rhetor-container');
        
        if (rhetorContainer) {
            // Show loading message
            rhetorContainer.innerHTML = `
                <div style="padding: 20px; color: #f0f0f0; background: #333; height: 100%; overflow: auto;">
                    <h3>Loading Rhetor Component...</h3>
                    <p>Fetching the LLM management component from the server.</p>
                    <div id="rhetor-load-status" style="margin-top: 20px; font-family: monospace;"></div>
                </div>
            `;
        }
        
        const updateStatus = (message, isError = false) => {
            const statusEl = document.getElementById('rhetor-load-status');
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
        const componentPath = 'components/rhetor/rhetor-component.html' + cacheBuster;
        
        updateStatus(`Loading from: ${componentPath}`);
        
        // First, activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
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
                
                if (rhetorContainer) {
                    // Create a wrapper to isolate the component content
                    const componentWrapper = document.createElement('div');
                    componentWrapper.className = 'component-wrapper';
                    componentWrapper.style.height = '100%';
                    componentWrapper.style.width = '100%';
                    componentWrapper.style.position = 'relative';
                    componentWrapper.style.overflow = 'auto';
                    componentWrapper.style.padding = '0';
                    componentWrapper.style.margin = '0';
                    
                    // Set the HTML content within the wrapper
                    componentWrapper.innerHTML = html;
                    
                    // Clear container and append the wrapper
                    rhetorContainer.innerHTML = '';
                    rhetorContainer.appendChild(componentWrapper);
                    
                    updateStatus('Added HTML content to container');
                } else {
                    throw new Error('rhetor-container element disappeared');
                }
                
                // Register the component
                this.components['rhetor'] = {
                    id: 'rhetor',
                    loaded: true,
                    usesTerminal: false, // Uses HTML panel
                };
                
                updateStatus('Rhetor component loaded successfully');
                
                // Load the CSS stylesheet with special rules to prevent css leaking
                const styleElement = document.createElement('style');
                styleElement.textContent = `
                    #rhetor-container {
                        all: initial;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: var(--bg-primary, #1e1e1e);
                        color: var(--text-primary, #f0f0f0);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        box-sizing: border-box;
                        overflow: auto;
                    }
                    
                    #rhetor-container .component-wrapper {
                        display: block;
                        width: 100%;
                        height: 100%;
                        overflow: auto;
                    }
                `;
                document.head.appendChild(styleElement);
                
                // Load the regular component CSS
                const stylesheetElement = document.createElement('link');
                stylesheetElement.rel = 'stylesheet';
                stylesheetElement.href = `/styles/rhetor/rhetor-component.css${cacheBuster}`;
                document.head.appendChild(stylesheetElement);
                
                // Load the JavaScript
                const scriptElement = document.createElement('script');
                scriptElement.src = `/scripts/rhetor/rhetor-component.js${cacheBuster}`;
                scriptElement.onerror = () => {
                    updateStatus('Failed to load rhetor-component.js script', true);
                };
                scriptElement.onload = () => {
                    updateStatus('Successfully loaded rhetor-component.js script');
                    
                    // Add tab event handlers (after script is loaded)
                    setTimeout(() => {
                        const tabs = document.querySelectorAll('.rhetor-tabs .tab-button');
                        tabs.forEach(tab => {
                            tab.addEventListener('click', () => {
                                const tabName = tab.getAttribute('data-tab');
                                
                                // Deactivate all tabs
                                tabs.forEach(t => t.classList.remove('active'));
                                document.querySelectorAll('.tab-content').forEach(content => {
                                    content.classList.remove('active');
                                });
                                
                                // Activate selected tab
                                tab.classList.add('active');
                                const contentElement = document.getElementById(`${tabName}-content`);
                                if (contentElement) {
                                    contentElement.classList.add('active');
                                }
                            });
                        });
                    }, 100);
                };
                document.head.appendChild(scriptElement);
            })
            .catch(error => {
                updateStatus(`Failed to load Rhetor component: ${error.message}`, true);
                
                // Show error in container
                if (rhetorContainer) {
                    rhetorContainer.innerHTML = `
                        <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                            <h3>Error: Failed to Load Rhetor Component</h3>
                            <p>The Rhetor component could not be loaded: ${error.message}</p>
                            <h4>Troubleshooting:</h4>
                            <ol style="margin-left: 20px;">
                                <li>Verify that Rhetor API is running (tekton-status shows Rhetor API running)</li>
                                <li>Check that the component files exist in the correct locations</li>
                                <li>Restart the Hephaestus UI server</li>
                                <li>Try opening the browser's network tab to see the exact request failures</li>
                            </ol>
                            <p style="margin-top: 20px;">Click the Rhetor tab again to retry loading.</p>
                        </div>
                    `;
                }
                
                // Fallback to terminal panel
                this.components['rhetor'] = {
                    id: 'rhetor',
                    loaded: true,
                    usesTerminal: true,
                };
                this.activatePanel('terminal');
            });
    }
    
    /**
     * Load the Budget component
     */
    loadBudgetComponent() {
        console.log('Loading Budget component...');
        
        // First, set the activeComponent to 'budget'
        this.activeComponent = 'budget';
        tektonUI.activeComponent = 'budget';
        
        // Create an empty container in the HTML panel if it doesn't exist
        const htmlPanel = document.getElementById('html-panel');
        console.log('HTML panel found:', !!htmlPanel);
        
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        // IMPORTANT: Clear the HTML panel completely
        htmlPanel.innerHTML = '';
        
        // Create a new container
        console.log('Creating budget-container div');
        const container = document.createElement('div');
        container.id = 'budget-container';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.overflow = 'auto';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.backgroundColor = 'var(--bg-primary, #1e1e1e)';
        htmlPanel.appendChild(container);
        
        // Add detailed logging to diagnose issues
        const budgetContainer = document.getElementById('budget-container');
        
        if (budgetContainer) {
            // Show loading message
            budgetContainer.innerHTML = `
                <div style="padding: 20px; color: #f0f0f0; background: #333; height: 100%; overflow: auto;">
                    <h3>Loading Budget Dashboard Component...</h3>
                    <p>Fetching the budget management component from the server.</p>
                    <div id="budget-load-status" style="margin-top: 20px; font-family: monospace;"></div>
                </div>
            `;
        }
        
        const updateStatus = (message, isError = false) => {
            const statusEl = document.getElementById('budget-load-status');
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
        const componentPath = 'components/budget/budget-dashboard.html' + cacheBuster;
        
        updateStatus(`Loading from: ${componentPath}`);
        
        // First, activate the HTML panel to ensure it's visible
        this.activatePanel('html');
        
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
                
                if (budgetContainer) {
                    // Create a wrapper to isolate the component content
                    const componentWrapper = document.createElement('div');
                    componentWrapper.className = 'component-wrapper';
                    componentWrapper.style.height = '100%';
                    componentWrapper.style.width = '100%';
                    componentWrapper.style.position = 'relative';
                    componentWrapper.style.overflow = 'auto';
                    componentWrapper.style.padding = '0';
                    componentWrapper.style.margin = '0';
                    
                    // Set the HTML content within the wrapper
                    componentWrapper.innerHTML = html;
                    
                    // Clear container and append the wrapper
                    budgetContainer.innerHTML = '';
                    budgetContainer.appendChild(componentWrapper);
                    
                    updateStatus('Added HTML content to container');
                } else {
                    throw new Error('budget-container element disappeared');
                }
                
                // Register the component
                this.components['budget'] = {
                    id: 'budget',
                    loaded: true,
                    usesTerminal: false, // Uses HTML panel
                };
                
                updateStatus('Budget component loaded successfully');
                
                // Load the CSS stylesheet with special rules to prevent css leaking
                const styleElement = document.createElement('style');
                styleElement.textContent = `
                    #budget-container {
                        all: initial;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: var(--bg-primary, #1e1e1e);
                        color: var(--text-primary, #f0f0f0);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        box-sizing: border-box;
                        overflow: auto;
                    }
                    
                    #budget-container .component-wrapper {
                        display: block;
                        width: 100%;
                        height: 100%;
                        overflow: auto;
                    }
                `;
                document.head.appendChild(styleElement);
                
                // Load the regular component CSS
                const stylesheetElement = document.createElement('link');
                stylesheetElement.rel = 'stylesheet';
                stylesheetElement.href = `/styles/budget/budget-component.css${cacheBuster}`;
                document.head.appendChild(stylesheetElement);
                
                // Load the JavaScript
                const scriptElement = document.createElement('script');
                scriptElement.src = `/scripts/budget/budget-dashboard.js${cacheBuster}`;
                scriptElement.onerror = () => {
                    updateStatus('Failed to load budget-dashboard.js script', true);
                };
                scriptElement.onload = () => {
                    updateStatus('Successfully loaded budget-dashboard.js script');
                    
                    // Add tab event handlers (after script is loaded)
                    setTimeout(() => {
                        const tabs = document.querySelectorAll('.budget-tabs .tab-button');
                        tabs.forEach(tab => {
                            tab.addEventListener('click', () => {
                                const tabName = tab.getAttribute('data-tab');
                                
                                // Deactivate all tabs
                                tabs.forEach(t => t.classList.remove('active'));
                                document.querySelectorAll('.tab-content').forEach(content => {
                                    content.classList.remove('active');
                                });
                                
                                // Activate selected tab
                                tab.classList.add('active');
                                const contentElement = document.getElementById(`${tabName}-content`);
                                if (contentElement) {
                                    contentElement.classList.add('active');
                                }
                            });
                        });
                    }, 100);
                };
                document.head.appendChild(scriptElement);
            })
            .catch(error => {
                updateStatus(`Failed to load Budget component: ${error.message}`, true);
                
                // Show error in container
                if (budgetContainer) {
                    budgetContainer.innerHTML = `
                        <div style="padding: 20px; color: #ff6b6b; background: #333; height: 100%; overflow: auto;">
                            <h3>Error: Failed to Load Budget Component</h3>
                            <p>The Budget component could not be loaded: ${error.message}</p>
                            <h4>Troubleshooting:</h4>
                            <ol style="margin-left: 20px;">
                                <li>Verify that Rhetor API is running (tekton-status shows Rhetor API running)</li>
                                <li>Check that the component files exist in the correct locations</li>
                                <li>Restart the Hephaestus UI server</li>
                                <li>Try opening the browser's network tab to see the exact request failures</li>
                            </ol>
                            <p style="margin-top: 20px;">Click the Budget tab again to retry loading.</p>
                        </div>
                    `;
                }
                
                // Fallback to terminal panel
                this.components['budget'] = {
                    id: 'budget',
                    loaded: true,
                    usesTerminal: true,
                };
                this.activatePanel('terminal');
            });
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