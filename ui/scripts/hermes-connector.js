/**
 * Hermes Connector
 * Establishes connection with Hermes message bus for AI communication
 */

class HermesConnector {
    constructor() {
        this.connected = false;
        this.endpoints = {
            register: '/api/register',
            message: '/api/message',
            status: '/api/status'
        };
        this.terminals = {}; // Terminal registrations by context ID
        this.baseUrl = window.location.origin;
        this.eventListeners = {};
        this.connectionTimeout = null;
        this.retryDelay = 5000; // 5 second initial retry
        this.maxRetryDelay = 30000; // Max 30 second retry
    }
    
    /**
     * Initialize the connector and establish connection
     */
    init() {
        console.log('Initializing Hermes connector...');
        
        // Check if settings disable Hermes integration
        if (window.settingsManager && 
            window.settingsManager.settings.hermesIntegration === false) {
            console.log('Hermes integration disabled in settings');
            return this;
        }
        
        // Try to connect
        this.connect();
        
        return this;
    }
    
    /**
     * Connect to Hermes
     */
    connect() {
        console.log('Attempting to connect to Hermes message bus...');
        
        // Clear any existing timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        
        // Check Hermes status
        fetch(`${this.baseUrl}${this.endpoints.status}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Hermes status check failed: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Hermes status:', data);
                this.connected = true;
                this.retryDelay = 5000; // Reset retry delay on successful connection
                this.dispatchEvent('connected', data);
                
                // Register any terminals that were added before connection
                Object.values(this.terminals).forEach(terminal => {
                    if (!terminal.registered) {
                        this.registerTerminal(terminal.id, terminal.metadata);
                    }
                });
            })
            .catch(error => {
                console.error('Error connecting to Hermes:', error);
                this.connected = false;
                this.dispatchEvent('connectionError', { error });
                
                // Schedule retry with exponential backoff
                this.connectionTimeout = setTimeout(() => {
                    this.connect();
                }, this.retryDelay);
                
                // Increase retry delay for next attempt (with max limit)
                this.retryDelay = Math.min(this.retryDelay * 1.5, this.maxRetryDelay);
            });
    }
    
    /**
     * Register a terminal with Hermes
     * @param {string} terminalId - ID of the terminal (context ID)
     * @param {Object} metadata - Terminal metadata
     */
    registerTerminal(terminalId, metadata = {}) {
        // Store terminal even if not connected yet
        this.terminals[terminalId] = {
            id: terminalId,
            metadata: metadata,
            registered: false
        };
        
        // If not connected, will register when connection established
        if (!this.connected) {
            console.log(`Terminal ${terminalId} queued for registration when connected`);
            return;
        }
        
        console.log(`Registering terminal ${terminalId} with Hermes`);
        
        // Convert Greek names if needed
        const displayName = this.getDisplayName(terminalId);
        
        // Prepare registration data
        const registrationData = {
            id: terminalId,
            type: 'ui-terminal',
            name: displayName,
            capabilities: ['receive-messages', 'send-messages'],
            ...metadata
        };
        
        // Register with Hermes
        fetch(`${this.baseUrl}${this.endpoints.register}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Registration failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Terminal ${terminalId} registered successfully:`, data);
            this.terminals[terminalId].registered = true;
            this.dispatchEvent('terminalRegistered', { 
                terminalId, 
                response: data 
            });
        })
        .catch(error => {
            console.error(`Error registering terminal ${terminalId}:`, error);
            this.dispatchEvent('registrationError', { 
                terminalId, 
                error 
            });
        });
    }
    
    /**
     * Unregister a terminal with Hermes
     * @param {string} terminalId - ID of the terminal to unregister
     */
    unregisterTerminal(terminalId) {
        if (!this.terminals[terminalId]) {
            console.log(`Terminal ${terminalId} not found for unregistration`);
            return;
        }
        
        if (!this.connected) {
            console.log(`Cannot unregister terminal ${terminalId} - not connected`);
            delete this.terminals[terminalId];
            return;
        }
        
        console.log(`Unregistering terminal ${terminalId}`);
        
        // Send unregister request
        fetch(`${this.baseUrl}${this.endpoints.register}/${terminalId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Unregistration failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Terminal ${terminalId} unregistered successfully`);
            delete this.terminals[terminalId];
            this.dispatchEvent('terminalUnregistered', { terminalId });
        })
        .catch(error => {
            console.error(`Error unregistering terminal ${terminalId}:`, error);
            delete this.terminals[terminalId]; // Remove from local tracking anyway
        });
    }
    
    /**
     * Send a message through Hermes
     * @param {string} sender - Sender terminal ID
     * @param {string|Array} recipients - Recipient terminal ID(s)
     * @param {Object} message - Message data
     */
    sendMessage(sender, recipients, message) {
        if (!this.connected) {
            console.error(`Cannot send message - not connected to Hermes`);
            return;
        }
        
        // Normalize recipients to array
        const recipientList = Array.isArray(recipients) ? recipients : [recipients];
        
        // Prepare message
        const messageData = {
            sender: sender,
            recipients: recipientList,
            timestamp: new Date().toISOString(),
            payload: message
        };
        
        console.log(`Sending message from ${sender} to ${recipientList.join(', ')}:`, message);
        
        // Send message to Hermes
        fetch(`${this.baseUrl}${this.endpoints.message}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Message send failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Message sent successfully:`, data);
            this.dispatchEvent('messageSent', { 
                sender, 
                recipients: recipientList, 
                message,
                response: data 
            });
        })
        .catch(error => {
            console.error(`Error sending message from ${sender}:`, error);
            this.dispatchEvent('messageError', { 
                sender, 
                recipients: recipientList, 
                message,
                error 
            });
        });
    }
    
    /**
     * Get a display name for a terminal based on settings
     * @param {string} terminalId - Terminal ID to convert
     * @returns {string} Display name based on current settings
     */
    getDisplayName(terminalId) {
        // Use settings manager if available
        if (window.settingsManager) {
            return window.settingsManager.getChatTabLabel(terminalId);
        }
        
        // Default mappings if settings manager not available
        const displayNames = {
            'ergon': 'Ergon',
            'awt-team': 'Symposium',
            'agora': 'Agora'
        };
        
        return displayNames[terminalId] || terminalId;
    }
    
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        return this;
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event]
                .filter(cb => cb !== callback);
        }
        return this;
    }
    
    /**
     * Dispatch an event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    dispatchEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in Hermes event handler for ${event}:`, e);
                }
            });
        }
        return this;
    }
}

// Initialize the Hermes connector when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.hermesConnector = new HermesConnector();
    
    // Initialize after UI elements and settings are available
    setTimeout(() => {
        window.hermesConnector.init();
    }, 1500);
});