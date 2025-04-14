/**
 * WebSocket Manager
 * Handles WebSocket communication with the Tekton backend
 */

class WebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.url = this.getWebSocketUrl();
        this.messageQueue = [];
    }
    
    /**
     * Get WebSocket URL based on current location
     * @returns {string} WebSocket URL
     */
    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = 8081; // Default WebSocket port - may need to be configurable
        return `${protocol}//${host}:${port}/ws`;
    }
    
    /**
     * Connect to the WebSocket server
     */
    connect() {
        try {
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                
                // Register the UI
                this.sendMessage({
                    type: 'REGISTER',
                    source: 'UI',
                    target: 'SYSTEM',
                    timestamp: new Date().toISOString(),
                    payload: {
                        clientId: 'ui-client',
                        capabilities: ['UI', 'USER_INTERACTION']
                    }
                });
                
                // Process any queued messages
                this.processQueue();
                
                // Display connection status in UI
                this.updateConnectionStatus(true);
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            
            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.connected = false;
                
                // Display disconnection in UI
                this.updateConnectionStatus(false);
                
                // Try to reconnect
                this.attemptReconnect();
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.connected = false;
                
                // Display error in UI
                this.updateConnectionStatus(false, error);
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            // Since we can't connect, set up a fake connection for demo purposes
            this.setupFakeConnection();
        }
    }
    
    /**
     * Set up a fake connection for demo purposes when no real backend is available
     */
    setupFakeConnection() {
        console.log('Setting up fake WebSocket connection for demo purposes');
        this.connected = true;
        
        // Show a message to the user
        if (window.terminalManager) {
            terminalManager.write('⚠️ Running in demo mode - no backend connection available');
            terminalManager.write('Some features may be limited or simulated');
        }
        
        // Set up fake processing for messages
        this.fakeSendMessage = this.sendMessage;
        this.sendMessage = (message) => {
            console.log('Fake WebSocket message sent:', message);
            
            // Simulate a response after a delay
            setTimeout(() => {
                this.simulateResponse(message);
            }, 500);
        };
    }
    
    /**
     * Simulate a response to a message in demo mode
     * @param {Object} message - The message to respond to
     */
    simulateResponse(message) {
        if (!message || !message.type) return;
        
        switch (message.type) {
            case 'COMMAND':
                if (message.payload && message.payload.command === 'process_message') {
                    const userMessage = message.payload.message;
                    const response = this.generateFakeResponse(userMessage, message.target);
                    
                    if (window.terminalManager) {
                        terminalManager.write(response);
                    }
                } else if (message.payload && message.payload.command === 'get_context') {
                    // Simulate context response
                    const componentId = message.target;
                    
                    if (window.uiManager) {
                        // Update header with fake actions
                        uiManager.updateComponentControls([
                            { id: 'action1', label: 'Action 1' },
                            { id: 'action2', label: 'Action 2' }
                        ]);
                    }
                    
                    if (window.terminalManager) {
                        terminalManager.write(`Loaded context for ${componentId} component`);
                    }
                }
                break;
                
            case 'REGISTER':
                if (window.terminalManager) {
                    terminalManager.write('UI client registered with Tekton system');
                }
                break;
        }
    }
    
    /**
     * Generate a fake response for demo mode
     * @param {string} message - User message to respond to
     * @param {string} componentId - The component ID
     * @returns {string} Generated response
     */
    generateFakeResponse(message, componentId) {
        const responses = {
            tekton: [
                "I'm managing your projects. What would you like to do?",
                "This is the Tekton Projects component. I can help with project management.",
                "Your project dashboard is ready. Ask me to create or modify projects."
            ],
            prometheus: [
                "Prometheus Planning System active. I can help with scheduling and planning.",
                "Let me assist with your project timeline and roadmap.",
                "I'm analyzing your planning needs. How can I assist with scheduling?"
            ],
            engram: [
                "Engram Memory System active. I can help you retrieve past information.",
                "I'm searching through our conversation history for relevant context.",
                "Memory systems online. What would you like to remember?"
            ]
        };
        
        // Default responses if component isn't specifically handled
        const defaultResponses = [
            `The ${componentId} component received your message: "${message}"`,
            `I'm processing your request in the ${componentId} system.`,
            `${componentId} component is active and responding to your input.`
        ];
        
        // Get appropriate response list
        const responseList = responses[componentId] || defaultResponses;
        
        // Select a random response
        return responseList[Math.floor(Math.random() * responseList.length)];
    }
    
    /**
     * Attempt to reconnect to the WebSocket server
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            
            // Set up fake connection since we can't connect
            this.setupFakeConnection();
            return;
        }
        
        this.reconnectAttempts++;
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }
    
    /**
     * Send a message through the WebSocket
     * @param {Object} message - Message to send (will be JSON stringified)
     */
    sendMessage(message) {
        if (!message) return;
        
        if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
            this.socket.send(serializedMessage);
        } else {
            // Queue the message for later
            this.messageQueue.push(message);
        }
    }
    
    /**
     * Process queued messages after connection is established
     */
    processQueue() {
        if (this.messageQueue.length === 0) return;
        
        console.log(`Processing ${this.messageQueue.length} queued messages`);
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }
    
    /**
     * Handle an incoming WebSocket message
     * @param {string} data - Message data (JSON string)
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            console.log('Received message:', message);
            
            switch (message.type) {
                case 'RESPONSE':
                    this.handleResponse(message);
                    break;
                    
                case 'UPDATE':
                    this.handleUpdate(message);
                    break;
                    
                case 'NOTIFICATION':
                    this.handleNotification(message);
                    break;
                    
                case 'ERROR':
                    this.handleError(message);
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
    
    /**
     * Handle a response message
     * @param {Object} message - Response message
     */
    handleResponse(message) {
        const payload = message.payload || {};
        
        // Handle AI response to a message
        if (payload.response && window.terminalManager) {
            terminalManager.write(payload.response);
        }
        
        // Handle context response
        if (payload.context && window.uiManager) {
            // Update UI based on context
            
            // Update header controls if provided
            if (payload.context.actions) {
                uiManager.updateComponentControls(payload.context.actions);
            }
            
            // Set terminal mode if specified
            if (payload.context.mode === 'terminal') {
                uiManager.activatePanel('terminal');
            } else if (payload.context.mode === 'html') {
                uiManager.activatePanel('html');
            }
            
            // Display context summary
            if (payload.context.summary && window.terminalManager) {
                terminalManager.write(payload.context.summary);
            }
        }
    }
    
    /**
     * Handle an update message
     * @param {Object} message - Update message
     */
    handleUpdate(message) {
        const payload = message.payload || {};
        
        // Update terminal if terminal update included
        if (payload.terminal && window.terminalManager) {
            if (typeof payload.terminal === 'string') {
                terminalManager.write(payload.terminal);
            } else if (payload.terminal.text) {
                terminalManager.write(payload.terminal.text, payload.terminal.isCommand);
            }
        }
        
        // Update HTML elements if specified
        if (payload.elements && window.uiManager) {
            Object.entries(payload.elements).forEach(([elementId, update]) => {
                const element = document.getElementById(elementId);
                if (!element) return;
                
                if (update.text) element.textContent = update.text;
                if (update.html) element.innerHTML = update.html;
                if (update.value) element.value = update.value;
                if (update.classes) {
                    if (update.classes.add) {
                        update.classes.add.forEach(cls => element.classList.add(cls));
                    }
                    if (update.classes.remove) {
                        update.classes.remove.forEach(cls => element.classList.remove(cls));
                    }
                }
            });
        }
        
        // Update header if specified
        if (payload.header && window.uiManager) {
            if (payload.header.title) {
                document.querySelector('.component-title').textContent = payload.header.title;
            }
            
            if (payload.header.actions) {
                uiManager.updateComponentControls(payload.header.actions);
            }
        }
    }
    
    /**
     * Handle a notification message
     * @param {Object} message - Notification message
     */
    handleNotification(message) {
        const payload = message.payload || {};
        
        if (payload.message) {
            if (payload.type === 'error') {
                if (window.tektonUI) {
                    tektonUI.showError(payload.message);
                }
            } else if (payload.type === 'modal') {
                if (window.tektonUI) {
                    tektonUI.showModal(payload.title || 'Notification', payload.message);
                }
            } else if (window.terminalManager) {
                // Default to showing in terminal
                terminalManager.write(`[${payload.type || 'INFO'}] ${payload.message}`);
            }
        }
    }
    
    /**
     * Handle an error message
     * @param {Object} message - Error message
     */
    handleError(message) {
        const payload = message.payload || {};
        
        console.error('Error from server:', payload);
        
        if (payload.message) {
            if (window.tektonUI) {
                tektonUI.showError(payload.message);
            }
            
            if (payload.showInTerminal && window.terminalManager) {
                terminalManager.write(`[ERROR] ${payload.message}`);
            }
        }
    }
    
    /**
     * Update connection status in the UI
     * @param {boolean} connected - Whether connected
     * @param {Object} error - Optional error object
     */
    updateConnectionStatus(connected, error = null) {
        // This could update a status indicator in the UI
        if (!connected && error) {
            console.error('Connection error:', error);
            
            if (window.tektonUI) {
                tektonUI.showError('Connection to Tekton server lost. Attempting to reconnect...');
            }
        }
    }
    
    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}