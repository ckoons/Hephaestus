/**
 * Ergon Component
 * Agent management and LLM integration interface
 */

class ErgonComponent {
    constructor() {
        this.state = {
            initialized: false,
            activeTab: 'agents', // Default tab
            tabHistory: {}      // History for each tab
        };
        
        // Message history tracking for chat
        this.messageHistory = {
            'ergon': [],
            'awt-team': [],
            'agora': []
        };
        this.historyPosition = -1;
        this.currentInput = '';
        this.streamHandlersRegistered = false;
    }
    
    /**
     * Initialize the component
     */
    init() {
        console.log('Initializing Ergon component');
        
        // First, add a terminal message to inform the user
        if (window.websocketManager) {
            websocketManager.addToTerminal("", 'white'); // blank line for spacing
            websocketManager.addToTerminal("=== ERGON COMPONENT ACTIVATED ===", '#00bfff');
            websocketManager.addToTerminal("Switching to the Ergon interface panel.", '#aaaaaa');
            websocketManager.addToTerminal("You can still use the terminal for all Ergon commands.", '#aaaaaa');
            websocketManager.addToTerminal("Connecting to LLM adapter for enhanced chat...", '#00bfff');
            websocketManager.addToTerminal("", 'white'); // blank line for spacing
        }
        
        // If already initialized, just activate
        if (this.state.initialized) {
            console.log('Ergon component already initialized, just activating');
            this.activateComponent();
            return this;
        }
        
        // Load component HTML
        this.loadComponentHTML();
        
        // Ensure LLM adapter connection is established
        if (window.hermesConnector && !window.hermesConnector.llmConnected) {
            console.log("Initializing connection to LLM adapter");
            window.hermesConnector.connectToLLMAdapter();
        }
        
        // Mark as initialized
        this.state.initialized = true;
        
        return this;
    }
    
    /**
     * Activate the component interface
     */
    activateComponent() {
        console.log('Activating Ergon component');
        
        // Make sure we're using the HTML panel
        if (window.uiUtils) {
            window.uiUtils.activatePanel('html');
        } else if (window.uiManager) {
            window.uiManager.activatePanel('html');
        }
        
        // Update the status indicator
        const statusIndicator = document.querySelector('.nav-item[data-component="ergon"] .status-indicator');
        if (statusIndicator) {
            statusIndicator.classList.add('active');
        }
        
        // Restore component state
        this.restoreComponentState();
    }
    
    /**
     * Load the component HTML
     */
    async loadComponentHTML() {
        console.log('Loading Ergon component HTML');
        
        // Get HTML panel for component rendering
        const htmlPanel = document.getElementById('html-panel');
        if (!htmlPanel) {
            console.error('HTML panel not found!');
            return;
        }
        
        try {
            // Show loading indicator
            if (window.uiUtils) {
                window.uiUtils.showLoadingIndicator(htmlPanel, 'Ergon');
            } else {
                htmlPanel.innerHTML = '<div style="padding: 20px;">Loading Ergon component...</div>';
            }
            
            // Fetch component HTML template with cache busting
            const cacheBuster = `?t=${new Date().getTime()}`;
            const response = await fetch(`components/ergon/ergon-component.html${cacheBuster}`);
            
            if (!response.ok) {
                // Try fallback path if component not found in standardized location
                const fallbackResponse = await fetch(`components/ergon.html${cacheBuster}`);
                if (!fallbackResponse.ok) {
                    throw new Error(`Failed to load Ergon template: ${response.status}`);
                }
                
                // Use fallback HTML
                const html = await fallbackResponse.text();
                htmlPanel.innerHTML = html;
                console.log('Ergon component loaded from fallback path');
            } else {
                // Use standardized path HTML
                const html = await response.text();
                htmlPanel.innerHTML = html;
                console.log('Ergon component loaded from standardized path');
            }
            
            // Setup component functionality
            this.setupTabs();
            this.setupEventListeners();
            this.setupChatInputs();
            this.loadAgentData();
            
            console.log('Ergon component HTML loaded successfully');
        } catch (error) {
            console.error('Error loading Ergon component:', error);
            if (window.uiUtils) {
                window.uiUtils.showErrorMessage(htmlPanel, 'Ergon', error.message);
            } else {
                htmlPanel.innerHTML = `
                    <div class="error-message">
                        <h3>Error Loading Ergon Component</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Set up tab switching functionality
     */
    setupTabs() {
        console.log('Setting up Ergon tabs');
        
        const tabs = document.querySelectorAll('.tab-button');
        
        // Add click handlers to tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.activateTab(tabId);
            });
        });
        
        // Activate the default tab
        this.activateTab(this.state.activeTab || 'agents');
    }
    
    /**
     * Activate a specific tab
     * @param {string} tabId - The ID of the tab to activate
     */
    activateTab(tabId) {
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(t => {
            t.classList.remove('active');
        });
        const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Show the specific tab content
        const tabContent = document.getElementById(`${tabId}-content`);
        if (tabContent) {
            tabContent.style.display = 'block';
        }
        
        // Save active tab to state
        this.state.activeTab = tabId;
        this.saveComponentState();
        
        // Add notification message to terminal
        if (window.websocketManager) {
            // Only add context switch notification for chat tabs
            if (tabId === 'ergon' || tabId === 'awt-team') {
                websocketManager.addToTerminal("", 'white'); // blank line for spacing
                websocketManager.addToTerminal(`Switched to ${tabId} chat interface.`, '#888888');
                websocketManager.addToTerminal(`Type '@${tabId === 'awt-team' ? 'awt' : 'ergon'} your message' to chat directly`, '#888888');
            } else if (tabId === 'agents' || tabId === 'memory' || tabId === 'tools') {
                websocketManager.addToTerminal(`Viewing ${tabId} panel. Use terminal commands to interact.`, '#888888');
            }
        }
        
        // Special handling for chat tabs
        if (tabId === 'ergon' || tabId === 'awt-team') {
            // Focus the terminal input when switching to a chat tab
            setTimeout(() => {
                const terminalInput = document.getElementById('simple-terminal-input');
                if (terminalInput) {
                    terminalInput.focus();
                    
                    // Set a data attribute on the input to track which chat is active
                    terminalInput.setAttribute('data-chat-context', tabId);
                    
                    // Update the placeholder text
                    if (tabId === 'ergon') {
                        terminalInput.placeholder = "Type @ergon followed by your message";
                    } else if (tabId === 'awt-team') {
                        terminalInput.placeholder = "Type @awt followed by your message";
                    }
                }
            }, 100);
            
            // Ensure LLM adapter is connected
            if (window.hermesConnector) {
                // If we have an LLM adapter connector, make sure it's connected
                // This will attempt reconnection if needed
                if (!window.hermesConnector.llmConnected) {
                    console.log(`Connecting to LLM adapter for ${tabId} chat...`);
                    window.hermesConnector.connectToLLMAdapter();
                    
                    // Add a system message that explains the LLM connection
                    const chatMessages = document.getElementById(`${tabId}-chat-messages`);
                    if (chatMessages) {
                        const systemMsgEl = document.createElement('div');
                        systemMsgEl.className = 'chat-message system';
                        systemMsgEl.innerHTML = `
                            <div class="message-content">
                                <div class="message-text">
                                    <strong>System:</strong> Connecting to LLM for enhanced chat capabilities.
                                    Type your message and press Enter to chat with the AI.
                                </div>
                                <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        `;
                        
                        // Add system message
                        const welcomeMsgEl = chatMessages.querySelector('.chat-message.system');
                        if (welcomeMsgEl) {
                            // Insert after existing welcome message
                            welcomeMsgEl.parentNode.insertBefore(systemMsgEl, welcomeMsgEl.nextSibling);
                        } else {
                            // Add to the beginning
                            chatMessages.appendChild(systemMsgEl);
                        }
                        
                        // Scroll to bottom
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }
            }
        } else {
            // Reset placeholder for non-chat tabs
            const terminalInput = document.getElementById('simple-terminal-input');
            if (terminalInput) {
                terminalInput.placeholder = "Type here and press Enter";
                terminalInput.removeAttribute('data-chat-context');
            }
        }
    }
    
    /**
     * Save current component state to localStorage
     */
    saveComponentState() {
        // Save to localStorage if available
        if (window.storageManager) {
            storageManager.setItem('ergon_component_state', JSON.stringify(this.state));
        }
        
        console.log('Ergon component state saved, active tab:', this.state.activeTab);
    }
    
    /**
     * Restore component state from localStorage
     */
    restoreComponentState() {
        // Load state from localStorage if available
        if (window.storageManager) {
            const savedState = storageManager.getItem('ergon_component_state');
            if (savedState) {
                try {
                    const parsedState = JSON.parse(savedState);
                    // Merge with current state
                    this.state = {...this.state, ...parsedState};
                } catch (e) {
                    console.error('Error parsing saved Ergon state:', e);
                }
            }
        }
        
        // Activate the previously active tab
        if (this.state.activeTab) {
            this.activateTab(this.state.activeTab);
        }
    }
    
    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Create agent button
        const createButton = document.getElementById('create-agent-button');
        if (createButton) {
            createButton.addEventListener('click', () => {
                document.getElementById('agent-creation-form').style.display = 'block';
            });
        }
        
        // Cancel agent creation
        const cancelButton = document.getElementById('cancel-creation');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                document.getElementById('agent-creation-form').style.display = 'none';
            });
        }
        
        // Submit agent creation
        const submitButton = document.getElementById('submit-creation');
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const name = document.getElementById('agent-name').value;
                const type = document.getElementById('agent-type').value;
                const description = document.getElementById('agent-description').value;
                
                if (name && description) {
                    // Send create agent command
                    tektonUI.sendCommand('create_agent', {
                        name: name,
                        type: type,
                        description: description
                    });
                    
                    // Hide form
                    document.getElementById('agent-creation-form').style.display = 'none';
                } else {
                    alert('Please fill in all required fields');
                }
            });
        }
        
        // Agent run buttons
        document.querySelectorAll('.agent-action-button').forEach(button => {
            if (button.textContent === 'Run') {
                button.addEventListener('click', (e) => {
                    const agentCard = e.target.closest('.agent-card');
                    const agentName = agentCard.querySelector('.agent-name').textContent;
                    
                    // Send run agent command
                    tektonUI.sendCommand('run_agent', {
                        agent_name: agentName
                    });
                    
                    // Update status indicator
                    agentCard.querySelector('.agent-status').classList.add('active');
                });
            } else if (button.textContent === 'Delete') {
                button.addEventListener('click', (e) => {
                    const agentCard = e.target.closest('.agent-card');
                    const agentName = agentCard.querySelector('.agent-name').textContent;
                    
                    if (confirm(`Are you sure you want to delete the agent "${agentName}"?`)) {
                        // Send delete agent command
                        tektonUI.sendCommand('delete_agent', {
                            agent_name: agentName
                        });
                        
                        // Remove the card with animation
                        agentCard.style.opacity = '0';
                        setTimeout(() => {
                            agentCard.remove();
                        }, 300);
                    }
                });
            }
        });
        
        // Set up clear chat buttons
        const clearButtons = {
            'ergon': document.getElementById('clear-ergon-chat'),
            'awt-team': document.getElementById('clear-awt-chat'),
            'agora': document.getElementById('clear-agora-chat')
        };
        
        // Add event listeners to clear buttons
        Object.entries(clearButtons).forEach(([context, button]) => {
            if (button) {
                button.addEventListener('click', () => {
                    const chatMessages = document.getElementById(`${context}-chat-messages`);
                    if (chatMessages) {
                        // Add confirmation
                        if (confirm('Are you sure you want to clear this chat history?')) {
                            // Keep only the welcome message
                            const welcomeMessage = chatMessages.querySelector('.chat-message.system');
                            chatMessages.innerHTML = '';
                            if (welcomeMessage) {
                                chatMessages.appendChild(welcomeMessage);
                            }
                        }
                    }
                });
            }
        });
    }
    
    /**
     * Set up chat inputs
     */
    setupChatInputs() {
        console.log("Setting up terminal-style chat interfaces");
        
        // Get all chat containers and inputs
        const chatInputs = document.querySelectorAll('.terminal-chat-input');
        
        console.log(`Found ${chatInputs.length} chat inputs`);
        
        // Add event listeners to all chat inputs
        chatInputs.forEach(input => {
            const context = input.getAttribute('data-context');
            console.log(`Setting up input for context: ${context}`);
            
            // Add event listener directly to make sure it's attached
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const message = input.value.trim();
                    if (message) {
                        this.sendChatMessage(context, message);
                        input.value = '';
                    }
                }
            });
            
            // Focus input when container is clicked
            const container = input.closest('.terminal-chat-container');
            if (container) {
                container.addEventListener('click', () => {
                    input.focus();
                });
            }
        });
    }
    
    /**
     * Send a chat message
     * @param {string} context - The chat context (ergon, awt-team, etc.)
     * @param {string} message - The message to send
     */
    sendChatMessage(context, message) {
        // Get the chat messages container
        const chatMessages = document.getElementById(`${context}-chat-messages`);
        if (!chatMessages) return;
        
        console.log(`Sending message in ${context} context:`, message);
        
        // Add user message to chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message}</div>
                <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message system typing';
        typingDiv.setAttribute('data-typing', 'true');
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">Processing...</div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Also echo to main terminal
        if (window.websocketManager) {
            // Format as if it was entered in the main terminal with @ prefix
            const termPrefix = context === 'awt-team' ? '@awt' : '@ergon';
            websocketManager.addToTerminal(`${termPrefix}: ${message}`, '#2962FF');
        }
        
        // Use LLM integration if available
        if (window.hermesConnector) {
            // Register stream event handlers if not already done
            if (!this.streamHandlersRegistered) {
                this.setupStreamHandlers();
            }
            
            // First check if LLM Adapter is connected
            if (!window.hermesConnector.llmConnected) {
                console.log(`LLM Adapter not connected, attempting to connect for ${context}`);
                
                // Add a message to the chat explaining we're trying to connect
                const connectingDiv = document.createElement('div');
                connectingDiv.className = 'chat-message system';
                connectingDiv.innerHTML = `
                    <div class="message-content">
                        <div class="message-text">
                            <strong>System:</strong> Attempting to connect to LLM service...
                        </div>
                        <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                `;
                
                // Hide typing indicator before adding this message
                const typingIndicators = chatMessages.querySelectorAll('[data-typing="true"]');
                typingIndicators.forEach(indicator => indicator.remove());
                
                chatMessages.appendChild(connectingDiv);
                
                // Re-add typing indicator
                chatMessages.appendChild(typingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // Send to LLM via Hermes connector
            window.hermesConnector.sendLLMMessage(context, message, true, {
                // Additional options can be configured here
                temperature: 0.7
            });
        } else {
            // Fallback - simulate response after delay
            setTimeout(() => {
                // Remove typing indicators
                const typingIndicators = chatMessages.querySelectorAll('[data-typing="true"]');
                typingIndicators.forEach(indicator => indicator.remove());
                
                // Add response
                const responseDiv = document.createElement('div');
                responseDiv.className = 'chat-message agent';
                responseDiv.innerHTML = `
                    <div class="message-content">
                        <div class="message-text">
                            <strong>Note:</strong> LLM integration not available. This is a simulated response.<br><br>
                            I received your message: "${message}".<br>How can I assist you further?
                        </div>
                        <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                `;
                
                chatMessages.appendChild(responseDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Also echo to main terminal
                if (window.websocketManager) {
                    const targetName = context === 'awt-team' ? 'AWT-Team' : 'Ergon';
                    websocketManager.addToTerminal(`[${targetName}] I received your message: "${message}". How can I assist you further?`, '#00bfff');
                }
            }, 1000);
        }
    }
    
    /**
     * Set up stream event handlers for streaming LLM responses
     */
    setupStreamHandlers() {
        if (!window.hermesConnector) return;
        
        // Set up stream chunk handler
        window.hermesConnector.addEventListener('streamChunk', (data) => {
            const { contextId, chunk } = data;
            
            // Handle chunk based on context
            if (contextId === 'ergon' || contextId === 'awt-team' || contextId === 'agora') {
                this.handleStreamChunk(contextId, chunk);
            }
        });
        
        // Set up stream completion handler
        window.hermesConnector.addEventListener('streamComplete', (data) => {
            const { contextId, fullResponse } = data;
            
            // Convert streaming message to regular message
            this.finalizeStreamingMessage(contextId);
            
            // Also echo to main terminal if needed
            if (window.websocketManager) {
                const targetName = contextId === 'awt-team' ? 'AWT-Team' : 
                                    contextId === 'agora' ? 'Agora' : 'Ergon';
                
                // Extract first 100 chars for terminal summary
                const summary = fullResponse.length > 100 ? 
                    fullResponse.substring(0, 100) + '...' : 
                    fullResponse;
                    
                websocketManager.addToTerminal(`[${targetName}] Response: ${summary}`, '#00bfff');
            }
        });
        
        // Handle typing indicators
        window.hermesConnector.addEventListener('typingStarted', (data) => {
            const { contextId } = data;
            
            // Add typing indicator to specific context
            this.showTypingIndicator(contextId);
        });
        
        window.hermesConnector.addEventListener('typingEnded', (data) => {
            const { contextId } = data;
            
            // Remove typing indicator from specific context
            this.hideTypingIndicator(contextId);
        });
        
        // Mark handlers as registered
        this.streamHandlersRegistered = true;
    }
    
    /**
     * Handle stream chunk for a specific context
     * @param {string} contextId - The chat context
     * @param {string} chunk - The text chunk to add
     */
    handleStreamChunk(contextId, chunk) {
        // Get the chat messages container
        const chatMessages = document.getElementById(`${contextId}-chat-messages`);
        if (!chatMessages) return;
        
        // Find or create streaming message element
        let streamingMessage = chatMessages.querySelector('.llm-streaming-message');
        if (!streamingMessage) {
            // Remove typing indicators first
            const typingIndicators = chatMessages.querySelectorAll('[data-typing="true"]');
            typingIndicators.forEach(indicator => indicator.remove());
            
            // Create new streaming message element
            streamingMessage = document.createElement('div');
            streamingMessage.className = 'chat-message agent llm-streaming-message';
            streamingMessage.innerHTML = `
                <div class="message-content">
                    <div class="message-text"></div>
                    <div class="message-time">Just now</div>
                </div>
            `;
            
            chatMessages.appendChild(streamingMessage);
        }
        
        // Add chunk to message
        const messageText = streamingMessage.querySelector('.message-text');
        if (messageText) {
            messageText.innerHTML += chunk;
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    /**
     * Finalize a streaming message when complete
     * @param {string} contextId - The chat context
     */
    finalizeStreamingMessage(contextId) {
        // Get the chat messages container
        const chatMessages = document.getElementById(`${contextId}-chat-messages`);
        if (!chatMessages) return;
        
        // Find streaming message element
        const streamingMessage = chatMessages.querySelector('.llm-streaming-message');
        if (streamingMessage) {
            // Convert to regular message
            streamingMessage.classList.remove('llm-streaming-message');
            
            // Update timestamp
            const timeElement = streamingMessage.querySelector('.message-time');
            if (timeElement) {
                const now = new Date();
                timeElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
    }
    
    /**
     * Show typing indicator for a specific context
     * @param {string} contextId - The chat context
     */
    showTypingIndicator(contextId) {
        // Get the chat messages container
        const chatMessages = document.getElementById(`${contextId}-chat-messages`);
        if (!chatMessages) return;
        
        // Check if typing indicator already exists
        if (chatMessages.querySelector('[data-typing="true"]')) {
            return;
        }
        
        // Create typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message system typing';
        typingDiv.setAttribute('data-typing', 'true');
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">Processing...</div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Hide typing indicator for a specific context
     * @param {string} contextId - The chat context
     */
    hideTypingIndicator(contextId) {
        // Get the chat messages container
        const chatMessages = document.getElementById(`${contextId}-chat-messages`);
        if (!chatMessages) return;
        
        // Remove typing indicators
        const typingIndicators = chatMessages.querySelectorAll('[data-typing="true"]');
        typingIndicators.forEach(indicator => indicator.remove());
    }
    
    /**
     * Load agent data from the backend
     */
    loadAgentData() {
        // In a real implementation, this would fetch data from the backend
        // For demo purposes, we're using the pre-populated data in the HTML
        console.log('Loading agent data');
        
        // Send a command to request agent data
        tektonUI.sendCommand('get_agents', {});
    }
    
    /**
     * Handle incoming messages
     * @param {Object} message - The message object
     */
    receiveMessage(message) {
        console.log('Received message in Ergon component:', message);
        
        // Handle different message types
        if (message.type === 'RESPONSE') {
            const payload = message.payload || {};
            
            // Handle chat responses
            if (payload.message && payload.context) {
                this.handleChatResponse(payload.message, payload.context);
            }
            // Handle agent list responses
            else if (payload.agents) {
                // Update agent list
                this.updateAgentList(payload.agents);
            } 
            // Handle agent creation response
            else if (payload.agent_created) {
                // Add new agent to list
                this.addAgentToList(payload.agent_created);
            }
            // Handle general responses
            else if (payload.response) {
                // If we have a active chat tab, show response there
                const activeTab = document.querySelector('.tab-button.active');
                if (activeTab) {
                    const tabId = activeTab.getAttribute('data-tab');
                    if (tabId === 'ergon' || tabId === 'awt-team') {
                        const chatMessages = document.getElementById(`${tabId}-chat-messages`);
                        if (chatMessages) {
                            // Add AI message to chat
                            const responseDiv = document.createElement('div');
                            responseDiv.className = 'chat-message agent';
                            responseDiv.innerHTML = `
                                <div class="message-content">
                                    <div class="message-text">${payload.response}</div>
                                    <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            `;
                            
                            chatMessages.appendChild(responseDiv);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }
                }
            }
        } 
        // Handle typing indicators and status updates
        else if (message.type === 'UPDATE') {
            const payload = message.payload || {};
            
            // Handle typing status
            if (payload.status === 'typing') {
                const context = payload.context || '';
                
                if (context === 'ergon' || context === 'awt-team') {
                    if (payload.isTyping) {
                        this.showTypingIndicator(context);
                    } else {
                        this.hideTypingIndicator(context);
                    }
                }
            }
            // Handle agent status updates
            else if (payload.agent_status) {
                // Update agent status
                this.updateAgentStatus(payload.agent_status);
            }
        }
    }
    
    /**
     * Handle chat responses from AI
     * @param {string} message - The message text
     * @param {string} context - The chat context
     */
    handleChatResponse(message, context) {
        // Hide typing indicator if still showing
        this.hideTypingIndicator(context);
        
        // Get the chat messages container
        const chatMessages = document.getElementById(`${context}-chat-messages`);
        if (!chatMessages) return;
        
        // Add AI message to chat
        const responseDiv = document.createElement('div');
        responseDiv.className = 'chat-message agent';
        responseDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message}</div>
                <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
        
        chatMessages.appendChild(responseDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Update the agent list with data from the backend
     * @param {Array} agents - The list of agents
     */
    updateAgentList(agents) {
        // This would update the agent list in a real implementation
        console.log('Would update agent list with:', agents);
    }
    
    /**
     * Add a new agent to the list
     * @param {Object} agent - The agent data
     */
    addAgentToList(agent) {
        // This would add a new agent card in a real implementation
        console.log('Would add new agent to list:', agent);
    }
    
    /**
     * Update an agent's status
     * @param {Object} status - The agent status data
     */
    updateAgentStatus(status) {
        // This would update an agent's status indicator in a real implementation
        console.log('Would update agent status:', status);
    }
}

// Create global instance
window.ergonComponent = new ErgonComponent();

// Register the component
document.addEventListener('DOMContentLoaded', function() {
    // When the ergon component is clicked in the left panel, initialize it
    const ergonNavItem = document.querySelector('.nav-item[data-component="ergon"]');
    if (ergonNavItem) {
        ergonNavItem.addEventListener('click', function() {
            window.ergonComponent.init();
        });
    }
});