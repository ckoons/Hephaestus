/**
 * Rhetor Service
 * Provides communication with the Rhetor API for LLM management, prompt engineering, and budget tracking
 */

class RhetorService extends window.tektonUI.componentUtils.BaseService {
    constructor() {
        // Call base service with service name and default API endpoint
        super('rhetorService', 'http://localhost:8050/api');
        
        // Initialize WebSocket connection state
        this.ws = null;
        this.wsConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000; // Start with 2 seconds
        this.reconnecting = false;
        
        // Set up caches with expiration
        this.caches = {
            providers: {
                data: [],
                timestamp: 0,
                ttl: 5 * 60 * 1000 // 5 minutes
            },
            models: {
                data: {},
                timestamp: 0,
                ttl: 5 * 60 * 1000 // 5 minutes
            },
            settings: {
                data: null,
                timestamp: 0,
                ttl: 5 * 60 * 1000 // 5 minutes
            },
            budget: {
                data: null,
                timestamp: 0,
                ttl: 60 * 1000 // 1 minute
            },
            templates: {
                data: [],
                timestamp: 0,
                ttl: 5 * 60 * 1000 // 5 minutes
            },
            conversations: {
                data: [],
                timestamp: 0,
                ttl: 60 * 1000 // 1 minute
            }
        };
        
        // State for LLM configuration
        this.state = {
            providers: [],
            selectedProvider: null,
            selectedModel: null,
            connected: false,
            status: 'disconnected',
            lastError: null,
            budget: {
                limit: 0,
                used: 0,
                remaining: 0,
                period: 'monthly',
                alerts: {
                    enabled: false,
                    threshold: 80
                }
            },
            templates: [],
            conversations: []
        };
        
        // Initialize with persisted state if available
        this._loadPersistedState();
        
        // Set up auto-connection
        this._autoConnect();
    }
    
    /**
     * Auto-connect to Rhetor API and WebSocket
     * @private
     */
    async _autoConnect() {
        try {
            // Check if Rhetor API is available
            await this.connect();
            
            // Connect to WebSocket if API is available
            if (this.connected) {
                this.connectWebSocket();
            }
        } catch (error) {
            console.error('Failed to auto-connect to Rhetor:', error);
        }
    }
    
    /**
     * Connect to the Rhetor API
     * @returns {Promise<boolean>} - Promise resolving to connection status
     */
    async connect() {
        try {
            // Check if Rhetor API is available
            const response = await fetch(`${this.apiUrl}/health`);
            
            if (!response.ok) {
                this.connected = false;
                this.state.connected = false;
                this.state.status = 'disconnected';
                this.state.lastError = `Failed to connect to Rhetor API: ${response.status} ${response.statusText}`;
                
                this.dispatchEvent('connectionFailed', { 
                    error: this.state.lastError
                });
                return false;
            }
            
            const data = await response.json();
            this.connected = true;
            this.state.connected = true;
            this.state.status = 'connected';
            this.state.lastError = null;
            this.apiVersion = data.version || 'unknown';
            
            // Dispatch connected event
            this.dispatchEvent('connected', { 
                version: this.apiVersion 
            });
            
            // Load initial data
            await Promise.all([
                this.getProviders(),
                this.getSettings(),
                this.getBudget()
            ]);
            
            return true;
        } catch (error) {
            this.connected = false;
            this.state.connected = false;
            this.state.status = 'disconnected';
            this.state.lastError = `Failed to connect to Rhetor API: ${error.message}`;
            
            this.dispatchEvent('connectionFailed', { 
                error: this.state.lastError
            });
            return false;
        }
    }
    
    /**
     * Connect to Rhetor WebSocket for real-time updates
     * @returns {boolean} Success status
     */
    connectWebSocket() {
        if (this.ws) {
            // Already connected or connecting
            return true;
        }
        
        try {
            // Convert HTTP URL to WebSocket URL
            const wsUrl = this.apiUrl.replace(/^http/, 'ws') + '/ws';
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                this.wsConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectInterval = 2000; // Reset reconnect interval
                this.reconnecting = false;
                this.state.status = 'connected';
                
                this.dispatchEvent('websocketConnected', {});
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    // Handle different message types
                    switch (message.type) {
                        case 'STATUS':
                            this.state.status = message.data.status;
                            this.dispatchEvent('statusUpdate', message.data);
                            break;
                            
                        case 'TYPING':
                            this.dispatchEvent('typing', message.data);
                            break;
                            
                        case 'ERROR':
                            this.state.lastError = message.data.message;
                            this.dispatchEvent('error', message.data);
                            break;
                            
                        default:
                            this.dispatchEvent('message', message);
                            break;
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                this.state.lastError = `WebSocket error: ${error.message || 'Unknown error'}`;
                this.dispatchEvent('error', { 
                    error: this.state.lastError
                });
            };
            
            this.ws.onclose = () => {
                this.wsConnected = false;
                this.state.status = this.connected ? 'connected' : 'disconnected';
                
                this.dispatchEvent('websocketDisconnected', {});
                
                // Attempt to reconnect if not intentionally closed
                if (!this.reconnecting && this.connected) {
                    this._attemptReconnect();
                }
            };
            
            return true;
        } catch (error) {
            this.wsConnected = false;
            this.state.lastError = `Failed to connect to WebSocket: ${error.message}`;
            
            this.dispatchEvent('error', { 
                error: this.state.lastError
            });
            return false;
        }
    }
    
    /**
     * Attempt to reconnect to WebSocket
     * @private
     */
    _attemptReconnect() {
        if (this.reconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        
        this.reconnecting = true;
        this.reconnectAttempts++;
        
        // Use exponential backoff for reconnection
        const delay = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1));
        
        this.dispatchEvent('reconnecting', { 
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay
        });
        
        setTimeout(() => {
            this.reconnecting = false;
            this.connectWebSocket();
        }, delay);
    }
    
    /**
     * Disconnect from WebSocket
     */
    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.wsConnected = false;
        }
    }
    
    /**
     * Reset connection
     * @returns {Promise<boolean>} Connection success
     */
    async resetConnection() {
        this.disconnectWebSocket();
        
        // Clear caches
        for (const cache of Object.values(this.caches)) {
            cache.timestamp = 0;
        }
        
        return this.connect();
    }
    
    /**
     * Get available LLM providers
     * @param {boolean} [forceRefresh=false] - Force refresh from server
     * @returns {Promise<Array>} Available providers
     */
    async getProviders(forceRefresh = false) {
        // Check cache first
        const cache = this.caches.providers;
        const now = Date.now();
        
        if (!forceRefresh && cache.timestamp > 0 && now - cache.timestamp < cache.ttl) {
            return cache.data;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/providers`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch providers: ${response.status} ${response.statusText}` 
                });
                return cache.data;
            }
            
            const data = await response.json();
            const providers = data.providers || [];
            
            // Update cache
            cache.data = providers;
            cache.timestamp = now;
            
            // Update state
            this.state.providers = providers;
            
            // Dispatch event
            this.dispatchEvent('providersUpdated', { providers });
            
            return providers;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch providers: ${error.message}` 
            });
            return cache.data;
        }
    }
    
    /**
     * Get models for a specific provider
     * @param {string} provider - Provider name
     * @param {boolean} [forceRefresh=false] - Force refresh from server
     * @returns {Promise<Array>} Available models
     */
    async getModels(provider, forceRefresh = false) {
        // Check cache first
        const cache = this.caches.models;
        const now = Date.now();
        
        if (!forceRefresh && cache.data[provider] && now - cache.timestamp < cache.ttl) {
            return cache.data[provider];
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/providers/${provider}/models`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch models: ${response.status} ${response.statusText}` 
                });
                return cache.data[provider] || [];
            }
            
            const data = await response.json();
            const models = data.models || [];
            
            // Update cache
            cache.data[provider] = models;
            cache.timestamp = now;
            
            // Dispatch event
            this.dispatchEvent('modelsUpdated', { provider, models });
            
            return models;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch models: ${error.message}` 
            });
            return cache.data[provider] || [];
        }
    }
    
    /**
     * Get Rhetor settings
     * @param {boolean} [forceRefresh=false] - Force refresh from server
     * @returns {Promise<Object>} Settings object
     */
    async getSettings(forceRefresh = false) {
        // Check cache first
        const cache = this.caches.settings;
        const now = Date.now();
        
        if (!forceRefresh && cache.data && now - cache.timestamp < cache.ttl) {
            return cache.data;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/settings`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch settings: ${response.status} ${response.statusText}` 
                });
                return cache.data || {};
            }
            
            const settings = await response.json();
            
            // Update cache
            cache.data = settings;
            cache.timestamp = now;
            
            // Update selected provider and model from settings
            if (settings.defaultProvider) {
                this.state.selectedProvider = settings.defaultProvider;
            }
            
            if (settings.defaultModel) {
                this.state.selectedModel = settings.defaultModel;
            }
            
            // Dispatch event
            this.dispatchEvent('settingsUpdated', { settings });
            
            return settings;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch settings: ${error.message}` 
            });
            return cache.data || {};
        }
    }
    
    /**
     * Save Rhetor settings
     * @param {Object} settings - Settings to save
     * @returns {Promise<Object>} Updated settings
     */
    async saveSettings(settings) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to save settings: ${response.status} ${response.statusText}` 
                });
                return null;
            }
            
            const updatedSettings = await response.json();
            
            // Update cache
            this.caches.settings.data = updatedSettings;
            this.caches.settings.timestamp = Date.now();
            
            // Update selected provider and model if in settings
            if (updatedSettings.defaultProvider) {
                this.state.selectedProvider = updatedSettings.defaultProvider;
            }
            
            if (updatedSettings.defaultModel) {
                this.state.selectedModel = updatedSettings.defaultModel;
            }
            
            // Dispatch event
            this.dispatchEvent('settingsUpdated', { settings: updatedSettings });
            
            return updatedSettings;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to save settings: ${error.message}` 
            });
            return null;
        }
    }
    
    /**
     * Test connection to provider/model
     * @param {string} provider - Provider name
     * @param {string} model - Model name
     * @param {Object} [options={}] - Additional options
     * @returns {Promise<Object>} Test result
     */
    async testConnection(provider, model, options = {}) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/test_connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider,
                    model,
                    ...options
                })
            });
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Connection test failed: ${response.status} ${response.statusText}` 
                });
                return {
                    success: false,
                    error: `HTTP Error ${response.status}: ${response.statusText}`
                };
            }
            
            const result = await response.json();
            
            // Dispatch event
            this.dispatchEvent('connectionTested', { provider, model, result });
            
            return result;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Connection test failed: ${error.message}` 
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get budget information
     * @param {string} [period='monthly'] - Period for budget data ('daily', 'weekly', 'monthly')
     * @param {boolean} [forceRefresh=false] - Force refresh from server
     * @returns {Promise<Object>} Budget data
     */
    async getBudget(period = 'monthly', forceRefresh = false) {
        // Check cache first
        const cache = this.caches.budget;
        const now = Date.now();
        
        // Always refresh budget data if the period changes
        const currPeriod = cache.data?.period;
        forceRefresh = forceRefresh || (currPeriod && currPeriod !== period);
        
        if (!forceRefresh && cache.data && now - cache.timestamp < cache.ttl) {
            return cache.data;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/budget?period=${period}`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch budget: ${response.status} ${response.statusText}` 
                });
                return cache.data || this.state.budget;
            }
            
            const budget = await response.json();
            
            // Add period to budget data
            budget.period = period;
            
            // Update cache
            cache.data = budget;
            cache.timestamp = now;
            
            // Update state
            this.state.budget = {
                ...this.state.budget,
                ...budget,
                period
            };
            
            // Dispatch event
            this.dispatchEvent('budgetUpdated', { budget });
            
            return budget;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch budget: ${error.message}` 
            });
            return cache.data || this.state.budget;
        }
    }
    
    /**
     * Save budget settings
     * @param {Object} settings - Budget settings to save
     * @returns {Promise<Object>} Updated budget settings
     */
    async saveBudgetSettings(settings) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/budget/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to save budget settings: ${response.status} ${response.statusText}` 
                });
                return null;
            }
            
            const updatedSettings = await response.json();
            
            // Update state
            this.state.budget = {
                ...this.state.budget,
                limit: updatedSettings.limit,
                alerts: updatedSettings.alerts
            };
            
            // Invalidate cache to force refresh on next getBudget call
            this.caches.budget.timestamp = 0;
            
            // Dispatch event
            this.dispatchEvent('budgetSettingsUpdated', { settings: updatedSettings });
            
            return updatedSettings;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to save budget settings: ${error.message}` 
            });
            return null;
        }
    }
    
    /**
     * Get templates
     * @param {boolean} [forceRefresh=false] - Force refresh from server
     * @returns {Promise<Array>} Templates array
     */
    async getTemplates(forceRefresh = false) {
        // Check cache first
        const cache = this.caches.templates;
        const now = Date.now();
        
        if (!forceRefresh && cache.timestamp > 0 && now - cache.timestamp < cache.ttl) {
            return cache.data;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/templates`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch templates: ${response.status} ${response.statusText}` 
                });
                return cache.data;
            }
            
            const data = await response.json();
            const templates = data.templates || [];
            
            // Update cache
            cache.data = templates;
            cache.timestamp = now;
            
            // Update state
            this.state.templates = templates;
            
            // Dispatch event
            this.dispatchEvent('templatesUpdated', { templates });
            
            return templates;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch templates: ${error.message}` 
            });
            return cache.data;
        }
    }
    
    /**
     * Save template
     * @param {Object} template - Template to save
     * @returns {Promise<Object>} Saved template
     */
    async saveTemplate(template) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(template)
            });
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to save template: ${response.status} ${response.statusText}` 
                });
                return null;
            }
            
            const savedTemplate = await response.json();
            
            // Invalidate cache to force refresh on next getTemplates call
            this.caches.templates.timestamp = 0;
            
            // Dispatch event
            this.dispatchEvent('templateSaved', { template: savedTemplate });
            
            // Refresh templates
            await this.getTemplates(true);
            
            return savedTemplate;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to save template: ${error.message}` 
            });
            return null;
        }
    }
    
    /**
     * Delete template
     * @param {string} templateId - Template ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteTemplate(templateId) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/templates/${templateId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to delete template: ${response.status} ${response.statusText}` 
                });
                return false;
            }
            
            // Invalidate cache to force refresh on next getTemplates call
            this.caches.templates.timestamp = 0;
            
            // Dispatch event
            this.dispatchEvent('templateDeleted', { templateId });
            
            // Refresh templates
            await this.getTemplates(true);
            
            return true;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to delete template: ${error.message}` 
            });
            return false;
        }
    }
    
    /**
     * Get conversations
     * @param {boolean} [forceRefresh=false] - Force refresh from server
     * @returns {Promise<Array>} Conversations array
     */
    async getConversations(forceRefresh = false) {
        // Check cache first
        const cache = this.caches.conversations;
        const now = Date.now();
        
        if (!forceRefresh && cache.timestamp > 0 && now - cache.timestamp < cache.ttl) {
            return cache.data;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/conversations`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch conversations: ${response.status} ${response.statusText}` 
                });
                return cache.data;
            }
            
            const data = await response.json();
            const conversations = data.conversations || [];
            
            // Update cache
            cache.data = conversations;
            cache.timestamp = now;
            
            // Update state
            this.state.conversations = conversations;
            
            // Dispatch event
            this.dispatchEvent('conversationsUpdated', { conversations });
            
            return conversations;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch conversations: ${error.message}` 
            });
            return cache.data;
        }
    }
    
    /**
     * Get conversation by ID
     * @param {string} conversationId - Conversation ID
     * @returns {Promise<Object>} Conversation data
     */
    async getConversation(conversationId) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/conversations/${conversationId}`);
            
            if (!response.ok) {
                this.dispatchEvent('error', { 
                    error: `Failed to fetch conversation: ${response.status} ${response.statusText}` 
                });
                return null;
            }
            
            const conversation = await response.json();
            
            // Dispatch event
            this.dispatchEvent('conversationLoaded', { conversation });
            
            return conversation;
        } catch (error) {
            this.dispatchEvent('error', { 
                error: `Failed to fetch conversation: ${error.message}` 
            });
            return null;
        }
    }
    
    /**
     * Select provider and model
     * @param {string} provider - Provider name
     * @param {string} model - Model name
     */
    selectProviderModel(provider, model) {
        this.state.selectedProvider = provider;
        this.state.selectedModel = model;
        
        this.dispatchEvent('providerModelSelected', { provider, model });
        
        // Persist the selection
        this._persistState();
    }
    
    /**
     * Get current selection
     * @returns {Object} Selected provider and model
     */
    getSelection() {
        return {
            provider: this.state.selectedProvider,
            model: this.state.selectedModel
        };
    }
    
    /**
     * Get current service state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Load persisted state from storage
     * @private
     */
    _loadPersistedState() {
        try {
            // Use local storage for persistence
            const persistedState = localStorage.getItem('rhetor_service_state');
            
            if (persistedState) {
                const state = JSON.parse(persistedState);
                
                // Apply stored values to current state
                if (state.selectedProvider) {
                    this.state.selectedProvider = state.selectedProvider;
                }
                
                if (state.selectedModel) {
                    this.state.selectedModel = state.selectedModel;
                }
            }
        } catch (error) {
            console.error('Error loading persisted state:', error);
        }
    }
    
    /**
     * Persist state to storage
     * @private
     */
    _persistState() {
        try {
            // Create state object for persistence
            const state = {
                selectedProvider: this.state.selectedProvider,
                selectedModel: this.state.selectedModel
            };
            
            // Save to local storage
            localStorage.setItem('rhetor_service_state', JSON.stringify(state));
        } catch (error) {
            console.error('Error persisting state:', error);
        }
    }
    
    /**
     * Clean up resources when service is destroyed
     */
    cleanup() {
        // Disconnect WebSocket
        this.disconnectWebSocket();
        
        // Persist state
        this._persistState();
    }
}

// Initialize the service when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create and register the service if not already present
    if (!window.tektonUI?.services?.rhetorService) {
        // Register it with the tektonUI global namespace
        window.tektonUI = window.tektonUI || {};
        window.tektonUI.services = window.tektonUI.services || {};
        
        // Create the service instance
        const rhetorService = new RhetorService();
        
        // Register the service
        window.tektonUI.services.rhetorService = rhetorService;
        
        console.log('Rhetor Service initialized');
    }
});