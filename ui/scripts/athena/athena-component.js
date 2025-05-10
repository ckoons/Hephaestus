/**
 * Athena Component
 * Knowledge graph and entity management interface
 */

class AthenaComponent {
    constructor() {
        this.state = {
            initialized: false,
            activeTab: 'graph', // Default tab is now Knowledge Graph
            graphLoaded: false,
            entitiesLoaded: false
        };
    }
    
    /**
     * Initialize the component
     */
    init() {
        console.log('Initializing Athena component');
        
        // If already initialized, just activate
        if (this.state.initialized) {
            console.log('Athena component already initialized, just activating');
            this.activateComponent();
            return this;
        }
        
        // Check SHOW_GREEK_NAMES environment variable
        this.checkGreekNamesVisibility();
        
        // Ensure HTML panel is active using the UI manager
        if (window.uiManager) {
            console.log('Using UI Manager to activate HTML panel');
            window.uiManager.activatePanel('html');
        } else {
            console.log('UI Manager not found, manually activating HTML panel');
            const panels = document.querySelectorAll('.panel');
            panels.forEach(p => p.classList.remove('active'));
            const htmlPanel = document.getElementById('html-panel');
            if (htmlPanel) {
                htmlPanel.classList.add('active');
                htmlPanel.style.display = 'block';
            }
        }
        
        // Load component HTML
        this.loadComponentHTML();
        
        // Mark as initialized
        this.state.initialized = true;
        
        return this;
    }
    
    /**
     * Check if SHOW_GREEK_NAMES environment variable is set
     */
    checkGreekNamesVisibility() {
        // Check if the environment variable is available and set to true
        const showGreekNames = window.env && window.env.SHOW_GREEK_NAMES === 'true';
        
        // Apply to body for CSS selectors to work
        if (showGreekNames) {
            document.body.setAttribute('data-show-greek-names', 'true');
        } else {
            document.body.removeAttribute('data-show-greek-names');
        }
        
        console.log(`Greek names visibility: ${showGreekNames ? 'visible' : 'hidden'}`);
    }
    
    /**
     * Activate the component interface
     */
    activateComponent() {
        console.log('Activating Athena component');
        
        // Make sure we're using the HTML panel
        const htmlPanel = document.getElementById('html-panel');
        if (htmlPanel) {
            // Make the HTML panel active
            const panels = document.querySelectorAll('.panel');
            panels.forEach(panel => panel.classList.remove('active'));
            htmlPanel.classList.add('active');
            
            // Set styles to ensure full visibility
            htmlPanel.style.display = 'block';
            htmlPanel.style.width = '100%';
            htmlPanel.style.height = '100%';
            htmlPanel.style.position = 'absolute';
            htmlPanel.style.top = '0';
            htmlPanel.style.left = '0';
            htmlPanel.style.overflow = 'auto';
            
            // Ensure Athena container fills available space
            const athenaContainer = htmlPanel.querySelector('.athena-container');
            if (athenaContainer) {
                athenaContainer.style.width = '100%';
                athenaContainer.style.height = '100%';
            }
        }
        
        // Update the status indicator
        const statusIndicator = document.querySelector('.nav-item[data-component="athena"] .status-indicator');
        if (statusIndicator) {
            statusIndicator.classList.add('active');
        }
    }
    
    /**
     * Load the component HTML
     */
    async loadComponentHTML() {
        console.log('Loading Athena component HTML');
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        try {
            // Show loading indicator
            htmlPanel.innerHTML = '<div style="padding: 20px;">Loading Athena component...</div>';
            
            // Fetch component HTML template with cache busting
            const cacheBuster = `?t=${new Date().getTime()}`;
            const response = await fetch(`components/athena/athena-component.html${cacheBuster}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load Athena template: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Insert HTML into panel
            htmlPanel.innerHTML = html;
            
            // Setup component functionality
            this.setupTabs();
            this.setupChat();
            
            console.log('Athena component HTML loaded successfully');
        } catch (error) {
            console.error('Error loading Athena component:', error);
            htmlPanel.innerHTML = `
                <div class="error-message" style="padding: 20px; color: #f44336;">
                    <h3>Error Loading Athena Component</h3>
                    <p>${error.message}</p>
                    <button id="retry-athena-btn" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                        Retry
                    </button>
                </div>
            `;
            
            // Add retry handler
            const retryBtn = document.getElementById('retry-athena-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.loadComponentHTML());
            }
        }
    }
    
    /**
     * Set up tab switching functionality
     */
    setupTabs() {
        console.log('Setting up Athena tabs');
        
        const tabs = document.querySelectorAll('.athena-tab');
        const panels = document.querySelectorAll('.athena-panel');
        const chatInput = document.getElementById('chat-input');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show active panel
                const panelId = tab.getAttribute('data-tab') + '-panel';
                panels.forEach(panel => {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                });
                const activePanel = document.getElementById(panelId);
                if (activePanel) {
                    activePanel.style.display = 'block';
                    activePanel.classList.add('active');
                }
                
                // Show/hide the clear chat button in the menu bar based on active tab
                const clearChatBtn = document.getElementById('clear-chat-btn');
                if (clearChatBtn) {
                    const panelType = tab.getAttribute('data-tab');
                    clearChatBtn.style.display = (panelType === 'chat' || panelType === 'teamchat') ? 'block' : 'none';
                }
                
                // Update the active tab in state
                this.state.activeTab = tab.getAttribute('data-tab');
                
                // Update chat input placeholder based on active tab
                this.updateChatPlaceholder(this.state.activeTab);
                
                // Load tab-specific content if needed
                this.loadTabContent(this.state.activeTab);
            });
        });
        
        // Set up clear chat button
        const clearChatBtn = document.getElementById('clear-chat-btn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearActiveChat());
        }
        
        // Initial placeholder update
        this.updateChatPlaceholder(this.state.activeTab);
    }
    
    /**
     * Update chat input placeholder based on active tab
     * @param {string} activeTab - The currently active tab
     */
    updateChatPlaceholder(activeTab) {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        switch(activeTab) {
            case 'graph':
                chatInput.placeholder = "Ask about the knowledge graph visualization or search for connections...";
                break;
            case 'entities':
                chatInput.placeholder = "Ask about entities or search for specific information...";
                break;
            case 'query':
                chatInput.placeholder = "Ask about creating queries or interpreting results...";
                break;
            case 'chat':
                chatInput.placeholder = "Enter chat message for Athena knowledge graph queries, entities or information";
                break;
            case 'teamchat':
                chatInput.placeholder = "Enter team chat message for all Tekton components";
                break;
            default:
                chatInput.placeholder = "Enter message...";
        }
    }
    
    /**
     * Load content specific to a tab
     * @param {string} tabId - The ID of the tab to load content for
     */
    loadTabContent(tabId) {
        console.log(`Loading content for ${tabId} tab`);
        
        switch (tabId) {
            case 'graph':
                if (!this.state.graphLoaded) {
                    this.initializeGraph();
                    this.state.graphLoaded = true;
                }
                break;
            case 'entities':
                if (!this.state.entitiesLoaded) {
                    this.loadEntities();
                    this.state.entitiesLoaded = true;
                }
                break;
            case 'query':
                // Initialize query panel if needed
                break;
            case 'chat':
                // Chat is loaded by setupChat
                break;
            case 'teamchat':
                // Team chat is loaded by setupChat
                break;
        }
    }
    
    /**
     * Initialize the graph visualization
     */
    initializeGraph() {
        console.log('Initializing knowledge graph visualization');
        
        // For now, just update the placeholder
        const placeholder = document.getElementById('graph-placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2 style="color: #999; margin-bottom: 1rem;">Knowledge Graph View</h2>
                    <p style="color: #777; max-width: 600px; margin: 0 auto;">
                        This is a placeholder for the knowledge graph visualization.
                        In a real implementation, this would show an interactive graph of entities and relationships.
                    </p>
                </div>
            `;
        }
    }
    
    /**
     * Load entities for the entity list
     */
    loadEntities() {
        console.log('Loading entities');
        
        const entityList = document.getElementById('entity-list-items');
        const loading = document.getElementById('entity-list-loading');
        
        if (entityList && loading) {
            // Show some sample entities after a delay
            setTimeout(() => {
                loading.style.display = 'none';
                entityList.style.display = 'block';
            }, 1000);
        }
    }
    
    /**
     * Set up chat functionality
     */
    setupChat() {
        console.log('Setting up Athena chat');
        
        const input = document.getElementById('chat-input');
        const button = document.getElementById('send-button');
        
        if (!input || !button) {
            console.error('Missing chat input elements');
            return;
        }
        
        // Send message on button click
        button.addEventListener('click', () => {
            const message = input.value.trim();
            if (!message) return;
            
            // Determine which chat container to use based on active tab
            let messagesContainer;
            let responsePrefix = '';
            
            if (this.state.activeTab === 'teamchat') {
                messagesContainer = document.getElementById('teamchat-messages');
                responsePrefix = 'Team Chat: ';
            } else {
                // Default to knowledge chat for all other tabs
                messagesContainer = document.getElementById('chat-messages');
                responsePrefix = 'Knowledge: ';
            }
            
            if (!messagesContainer) {
                console.error('Chat messages container not found');
                return;
            }
            
            // Add user message to chat
            this.addUserMessageToChatUI(messagesContainer, message);
            
            // Simulate a response based on the active tab
            setTimeout(() => {
                let response;
                
                if (this.state.activeTab === 'teamchat') {
                    response = `${responsePrefix}I received your team message: "${message}". This would be shared with all Tekton components.`;
                } else if (this.state.activeTab === 'graph') {
                    response = `${responsePrefix}I received your query about the knowledge graph: "${message}". I can help visualize connections.`;
                } else if (this.state.activeTab === 'entities') {
                    response = `${responsePrefix}I received your entity query: "${message}". I can help find entity information.`;
                } else if (this.state.activeTab === 'query') {
                    response = `${responsePrefix}I received your query builder request: "${message}". I can help construct complex queries.`;
                } else {
                    response = `${responsePrefix}I received your message: "${message}". This is a response from Athena Knowledge system.`;
                }
                
                this.addAIMessageToChatUI(messagesContainer, response);
            }, 1000);
            
            // Clear input
            input.value = '';
        });
        
        // Send message on Enter key (but allow Shift+Enter for new lines)
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                button.click();
            }
        });
    }
    
    /**
     * Add a user message to the chat UI
     * @param {HTMLElement} messages - The messages container element
     * @param {string} message - The message text
     */
    addUserMessageToChatUI(messages, message) {
        if (!messages) return;
        
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-message user-message';
        userBubble.textContent = message;
        messages.appendChild(userBubble);
        messages.scrollTop = messages.scrollHeight;
    }
    
    /**
     * Add an AI message to the chat UI
     * @param {HTMLElement} messages - The messages container element
     * @param {string} message - The message text
     */
    addAIMessageToChatUI(messages, message) {
        if (!messages) return;
        
        const aiBubble = document.createElement('div');
        aiBubble.className = 'chat-message ai-message';
        aiBubble.textContent = message;
        messages.appendChild(aiBubble);
        messages.scrollTop = messages.scrollHeight;
    }
    
    /**
     * Clear the active chat messages
     */
    clearActiveChat() {
        let messagesContainer;
        
        // Determine which chat is active
        if (this.state.activeTab === 'chat') {
            messagesContainer = document.getElementById('chat-messages');
        } else if (this.state.activeTab === 'teamchat') {
            messagesContainer = document.getElementById('teamchat-messages');
        }
        
        if (messagesContainer) {
            // Keep only the welcome message
            const welcomeMessage = messagesContainer.querySelector('.chat-message:first-child');
            messagesContainer.innerHTML = '';
            if (welcomeMessage) {
                messagesContainer.appendChild(welcomeMessage);
            }
        }
    }
}

// Create global instance
window.athenaComponent = new AthenaComponent();

// Add handler to component activation
document.addEventListener('DOMContentLoaded', function() {
    const athenaTab = document.querySelector('.nav-item[data-component="athena"]');
    if (athenaTab) {
        athenaTab.addEventListener('click', function() {
            // First, make sure the HTML panel is visible
            const htmlPanel = document.getElementById('html-panel');
            if (htmlPanel) {
                // Make it active and visible
                const panels = document.querySelectorAll('.panel');
                panels.forEach(panel => {
                    panel.classList.remove('active');
                    panel.style.display = 'none';
                });
                htmlPanel.classList.add('active');
                htmlPanel.style.display = 'block';
            }
            
            // Initialize component if not already done
            if (window.athenaComponent) {
                window.athenaComponent.init();
            }
        });
    }
});