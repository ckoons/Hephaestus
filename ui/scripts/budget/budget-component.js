/**
 * Budget Component
 * 
 * Provides a comprehensive interface for budget management, usage tracking,
 * and resource allocation within the Tekton platform.
 */

class BudgetComponent {
    constructor() {
        this.budgetService = null;
        this.state = {
            activeTab: 'dashboard',
            loading: false,
            budgetData: null,
            usageDetails: null,
            alerts: []
        };
        
        console.log('[BUDGET] Component constructed');
    }
    
    /**
     * Initialize the component
     */
    async init() {
        console.log('[BUDGET] Initializing component');
        this.setupBudgetService();
        this.setupEventListeners();
        this.loadComponentState();
        
        // Load initial data
        this.refreshData();
    }
    
    /**
     * Set up budget service
     */
    setupBudgetService() {
        console.log('[BUDGET] Setting up budget service');
        
        // Attempt to use the budget service from window
        if (window.tektonUI?.services?.budgetService) {
            this.budgetService = window.tektonUI.services.budgetService;
            console.log('[BUDGET] Using global budget service');
        } else {
            // Create a new budget service if not available globally
            const BudgetService = window.BudgetService || this._createFallbackService();
            this.budgetService = new BudgetService();
            console.log('[BUDGET] Created new budget service');
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('[BUDGET] Setting up event listeners');
        
        // Get the budget container
        const budgetContainer = document.querySelector('.budget');
        if (!budgetContainer) {
            console.error('[BUDGET] Cannot find budget container for setting up event listeners');
            return;
        }
        
        // Send button and chat input
        const chatInput = budgetContainer.querySelector('#chat-input');
        const sendButton = budgetContainer.querySelector('#send-button');
        
        if (chatInput && sendButton) {
            sendButton.addEventListener('click', () => this.handleChatMessage());
            chatInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    this.handleChatMessage();
                }
            });
        }
    }
    
    /**
     * Handle chat message submission
     */
    handleChatMessage() {
        const budgetContainer = document.querySelector('.budget');
        if (!budgetContainer) return;
        
        const chatInput = budgetContainer.querySelector('#chat-input');
        if (!chatInput || !chatInput.value.trim()) return;
        
        const message = chatInput.value.trim();
        console.log('[BUDGET] Chat message:', message);
        
        // Clear the input
        chatInput.value = '';
        
        // TODO: Implement chat functionality for budget questions
    }
    
    /**
     * Load data for the currently active tab
     */
    loadTabContent(tabId) {
        console.log('[BUDGET] Loading content for tab:', tabId);
        
        switch (tabId) {
            case 'dashboard':
                this.loadBudgetData();
                break;
            case 'details':
                this.loadUsageDetails();
                break;
            case 'settings':
                this.loadBudgetSettings();
                break;
            case 'alerts':
                this.loadAlerts();
                break;
        }
    }
    
    /**
     * Refresh all data
     */
    refreshData() {
        console.log('[BUDGET] Refreshing all data');
        
        // Load data for the active tab
        this.loadTabContent(this.state.activeTab);
    }
    
    /**
     * Load budget data for the dashboard
     */
    async loadBudgetData() {
        console.log('[BUDGET] Loading budget data');
        
        // Show loading indicator
        this.setLoading(true);
        
        try {
            // Get budget data from the service
            const budgetData = await this.budgetService.getBudgetData();
            this.state.budgetData = budgetData;
            
            // Update the UI
            this.updateBudgetDashboard();
        } catch (error) {
            console.error('[BUDGET] Error loading budget data:', error);
            this.showErrorMessage('Failed to load budget data');
        } finally {
            // Hide loading indicator
            this.setLoading(false);
        }
    }
    
    /**
     * Load usage details
     */
    async loadUsageDetails() {
        console.log('[BUDGET] Loading usage details');
        
        // Show loading indicator
        this.setLoading(true);
        
        try {
            // Get start and end dates from inputs
            const budgetContainer = document.querySelector('.budget');
            const startDate = budgetContainer.querySelector('#start-date')?.value || '';
            const endDate = budgetContainer.querySelector('#end-date')?.value || '';
            
            // Get usage details from the service
            const usageDetails = await this.budgetService.getUsageDetails(startDate, endDate);
            this.state.usageDetails = usageDetails;
            
            // Update the UI
            this.updateUsageDetails();
        } catch (error) {
            console.error('[BUDGET] Error loading usage details:', error);
            this.showErrorMessage('Failed to load usage details');
        } finally {
            // Hide loading indicator
            this.setLoading(false);
        }
    }
    
    /**
     * Filter usage details by date range
     */
    async filterUsage() {
        console.log('[BUDGET] Filtering usage details');
        
        // Load usage details with the current date range
        await this.loadUsageDetails();
    }
    
    /**
     * Load budget settings
     */
    async loadBudgetSettings() {
        console.log('[BUDGET] Loading budget settings');
        
        // TODO: Load budget settings from service and update form
    }
    
    /**
     * Load alerts
     */
    async loadAlerts() {
        console.log('[BUDGET] Loading alerts');
        
        // TODO: Load alerts from service
    }
    
    /**
     * Save budget settings
     */
    async saveBudgetSettings() {
        console.log('[BUDGET] Saving budget settings');
        
        // Show loading indicator
        this.setLoading(true);
        
        try {
            // Get the budget container
            const budgetContainer = document.querySelector('.budget');
            if (!budgetContainer) return;
            
            // Collect settings from form
            const settings = {
                limits: {
                    daily: parseFloat(budgetContainer.querySelector('#daily-limit')?.value || 0),
                    weekly: parseFloat(budgetContainer.querySelector('#weekly-limit')?.value || 0),
                    monthly: parseFloat(budgetContainer.querySelector('#monthly-limit')?.value || 0)
                },
                enforcement_policy: budgetContainer.querySelector('#enforce-policy')?.value || 'warn',
                provider_limits: {
                    enabled: !!budgetContainer.querySelector('#enable-provider-limits')?.checked,
                    anthropic: parseFloat(budgetContainer.querySelector('#anthropic-limit')?.value || 0),
                    openai: parseFloat(budgetContainer.querySelector('#openai-limit')?.value || 0)
                },
                warning_threshold: parseInt(budgetContainer.querySelector('#warning-threshold')?.value || 80, 10),
                allow_free_models: !!budgetContainer.querySelector('#allow-free-models')?.checked,
                reset_day: budgetContainer.querySelector('#reset-day')?.value || '1'
            };
            
            // Save settings to service
            await this.budgetService.saveBudgetSettings(settings);
            
            // Show success message
            this.showSuccessMessage('Budget settings saved successfully');
        } catch (error) {
            console.error('[BUDGET] Error saving budget settings:', error);
            this.showErrorMessage('Failed to save budget settings');
        } finally {
            // Hide loading indicator
            this.setLoading(false);
        }
    }
    
    /**
     * Save alert settings
     */
    async saveAlertSettings() {
        console.log('[BUDGET] Saving alert settings');
        
        // Show loading indicator
        this.setLoading(true);
        
        try {
            // Get the budget container
            const budgetContainer = document.querySelector('.budget');
            if (!budgetContainer) return;
            
            // Collect settings from form
            const settings = {
                email_alerts: {
                    enabled: !!budgetContainer.querySelector('#enable-email-alerts')?.checked,
                    email: budgetContainer.querySelector('#alert-email')?.value || '',
                    frequency: budgetContainer.querySelector('#alert-frequency')?.value || 'daily'
                }
            };
            
            // Save settings to service
            await this.budgetService.saveAlertSettings(settings);
            
            // Show success message
            this.showSuccessMessage('Alert settings saved successfully');
        } catch (error) {
            console.error('[BUDGET] Error saving alert settings:', error);
            this.showErrorMessage('Failed to save alert settings');
        } finally {
            // Hide loading indicator
            this.setLoading(false);
        }
    }
    
    /**
     * Clear all alerts
     */
    clearAlerts() {
        console.log('[BUDGET] Clearing all alerts');
        
        // Get the budget container
        const budgetContainer = document.querySelector('.budget');
        if (!budgetContainer) return;
        
        // Get the alert list
        const alertList = budgetContainer.querySelector('.budget__alert-list');
        if (!alertList) return;
        
        // Clear the alert list
        alertList.innerHTML = '';
        
        // Show success message
        this.showSuccessMessage('All alerts cleared');
    }
    
    /**
     * Update the budget dashboard UI
     */
    updateBudgetDashboard() {
        console.log('[BUDGET] Updating budget dashboard UI');
        
        // TODO: Update dashboard UI with budget data
    }
    
    /**
     * Update the usage details UI
     */
    updateUsageDetails() {
        console.log('[BUDGET] Updating usage details UI');
        
        // TODO: Update usage details UI with usage data
    }
    
    /**
     * Show loading indicator
     */
    setLoading(isLoading) {
        this.state.loading = isLoading;
        
        // TODO: Update UI loading state
    }
    
    /**
     * Show error message
     */
    showErrorMessage(message) {
        console.error('[BUDGET] Error:', message);
        
        // TODO: Show error message in UI
    }
    
    /**
     * Show success message
     */
    showSuccessMessage(message) {
        console.log('[BUDGET] Success:', message);
        
        // TODO: Show success message in UI
    }
    
    /**
     * Save component state to local storage
     */
    saveComponentState() {
        console.log('[BUDGET] Saving component state');
        
        try {
            // Save state to local storage
            const stateToSave = {
                activeTab: this.state.activeTab
            };
            
            localStorage.setItem('budgetComponentState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('[BUDGET] Error saving component state:', error);
        }
    }
    
    /**
     * Load component state from local storage
     */
    loadComponentState() {
        console.log('[BUDGET] Loading component state');
        
        try {
            // Load state from local storage
            const savedState = localStorage.getItem('budgetComponentState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                
                // Update state
                if (parsedState.activeTab) {
                    this.state.activeTab = parsedState.activeTab;
                    
                    // Switch to the active tab
                    window.budget_switchTab(this.state.activeTab);
                }
            }
        } catch (error) {
            console.error('[BUDGET] Error loading component state:', error);
        }
    }
    
    /**
     * Create a fallback service for testing/development
     */
    _createFallbackService() {
        console.warn('[BUDGET] Creating fallback budget service');
        
        // Return a simple service class
        return class FallbackBudgetService {
            async connect() {
                return true;
            }
            
            async getBudgetData() {
                return {
                    daily: {
                        current: 2.47,
                        limit: 5.00,
                        percentage: 49.4
                    },
                    weekly: {
                        current: 12.89,
                        limit: 25.00,
                        percentage: 51.6,
                        start_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                        end_date: new Date().toISOString()
                    },
                    monthly: {
                        current: 36.75,
                        limit: 100.00,
                        percentage: 36.8,
                        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
                        end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
                    },
                    tokens: {
                        total: 1200000,
                        input: 542000,
                        output: 658000
                    },
                    breakdown: {
                        by_provider: {
                            'Anthropic': 27.50,
                            'OpenAI': 9.25,
                            'Ollama': 0.00
                        }
                    },
                    top_usage: {
                        by_model: [
                            {
                                model: 'Claude 3 Sonnet',
                                provider: 'Anthropic',
                                tokens: 230450,
                                cost: 3.46
                            },
                            {
                                model: 'Claude 3 Haiku',
                                provider: 'Anthropic',
                                tokens: 543120,
                                cost: 0.68
                            },
                            {
                                model: 'GPT-4',
                                provider: 'OpenAI',
                                tokens: 104300,
                                cost: 6.26
                            },
                            {
                                model: 'Llama 3',
                                provider: 'Ollama',
                                tokens: 1250680,
                                cost: 0.00
                            }
                        ]
                    }
                };
            }
            
            async getUsageDetails() {
                return {
                    items: [
                        {
                            timestamp: '2025-04-21T15:42:00Z',
                            component: 'Terma',
                            provider: 'Anthropic',
                            model: 'Claude 3 Sonnet',
                            task_type: 'chat',
                            input_tokens: 1500,
                            output_tokens: 2820,
                            cost: 0.06
                        },
                        {
                            timestamp: '2025-04-21T14:15:00Z',
                            component: 'Ergon',
                            provider: 'Anthropic',
                            model: 'Claude 3 Haiku',
                            task_type: 'agent_creation',
                            input_tokens: 8000,
                            output_tokens: 4450,
                            cost: 0.02
                        },
                        {
                            timestamp: '2025-04-21T10:33:00Z',
                            component: 'Athena',
                            provider: 'OpenAI',
                            model: 'GPT-4',
                            task_type: 'knowledge_retrieval',
                            input_tokens: 1200,
                            output_tokens: 2080,
                            cost: 0.19
                        },
                        {
                            timestamp: '2025-04-20T18:22:00Z',
                            component: 'Codex',
                            provider: 'Ollama',
                            model: 'Llama 3',
                            task_type: 'code_completion',
                            input_tokens: 12000,
                            output_tokens: 33320,
                            cost: 0.00
                        }
                    ],
                    page: 1,
                    total_pages: 14
                };
            }
            
            async saveBudgetSettings(settings) {
                console.log('[BUDGET] Mock: Saving budget settings', settings);
                return { success: true };
            }
            
            async saveAlertSettings(settings) {
                console.log('[BUDGET] Mock: Saving alert settings', settings);
                return { success: true };
            }
        };
    }
}

// Create global instance
window.budgetComponent = new BudgetComponent();