/**
 * Rhetor Component JavaScript
 * Main controller for the Rhetor UI component in Hephaestus
 */

// Initialize the Rhetor client
let rhetorClient = null;
let activeBudgetManager = null;

document.addEventListener('DOMContentLoaded', () => {
  initRhetorComponent();
});

/**
 * Initialize the Rhetor component
 */
function initRhetorComponent() {
  setupTabNavigation();
  initRhetorClient();
  initProviderSelector();
  initTemplateManager();
  initConversationViewer();
  initBudgetDashboard();
  
  // Set up temperature slider value display
  const temperatureSlider = document.getElementById('temperature-slider');
  const sliderValue = temperatureSlider.nextElementSibling;
  
  if (temperatureSlider && sliderValue) {
    temperatureSlider.addEventListener('input', () => {
      sliderValue.textContent = temperatureSlider.value;
    });
  }
}

/**
 * Initialize the Rhetor client connection
 */
function initRhetorClient() {
  // Initialize the Rhetor client
  rhetorClient = new RhetorClient({
    rhetorUrl: 'http://localhost:8300',
    componentId: 'hephaestus-ui',
    autoReconnect: true
  });
  
  // Connect to Rhetor
  connectToRhetor();

  // Set up status event handlers
  rhetorClient.on('status', handleStatus);
  rhetorClient.on('error', handleError);
}

/**
 * Connect to the Rhetor service
 */
async function connectToRhetor() {
  try {
    await rhetorClient.connect();
    updateConnectionStatus(true);
    loadProviders();
    fetchBudgetData();
  } catch (error) {
    console.error('Failed to connect to Rhetor:', error);
    updateConnectionStatus(false);
  }
}

/**
 * Update the connection status display
 */
function updateConnectionStatus(connected) {
  const statusElement = document.querySelector('.stat-value.connected');
  if (statusElement) {
    if (connected) {
      statusElement.textContent = 'Connected';
      statusElement.classList.remove('disconnected');
      statusElement.classList.add('connected');
    } else {
      statusElement.textContent = 'Disconnected';
      statusElement.classList.remove('connected');
      statusElement.classList.add('disconnected');
    }
  }
}

/**
 * Handle Rhetor status updates
 */
function handleStatus(status) {
  // Update UI based on status information
  if (status.budget && activeBudgetManager) {
    activeBudgetManager.updateBudgetData(status.budget);
  }
}

/**
 * Handle Rhetor errors
 */
function handleError(error) {
  console.error('Rhetor error:', error);
  // Display error notification
  const errorMessage = error.message || 'Unknown error occurred';
  // Add error notification UI here
}

/**
 * Set up tab navigation for the Rhetor component
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.rhetor-tabs .tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Deactivate all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Activate selected tab
      button.classList.add('active');
      document.getElementById(`${tabName}-content`).classList.add('active');
    });
  });
}

/**
 * Initialize provider selector functionality
 */
function initProviderSelector() {
  const providerSelect = document.getElementById('provider-select');
  const modelSelect = document.getElementById('model-select');
  const saveButton = document.getElementById('save-provider');
  const testButton = document.getElementById('test-provider');
  
  if (providerSelect && modelSelect) {
    // Handle provider selection change
    providerSelect.addEventListener('change', async () => {
      const provider = providerSelect.value;
      await loadModelsForProvider(provider);
    });
    
    // Handle save button click
    if (saveButton) {
      saveButton.addEventListener('click', saveProviderSettings);
    }
    
    // Handle test button click
    if (testButton) {
      testButton.addEventListener('click', testProviderConnection);
    }
  }
}

/**
 * Load available providers from Rhetor
 */
async function loadProviders() {
  if (!rhetorClient) return;
  
  try {
    const providers = await rhetorClient.getProviders();
    const providerSelect = document.getElementById('provider-select');
    
    if (providerSelect && providers && providers.length > 0) {
      // Clear the select
      providerSelect.innerHTML = '';
      
      // Add providers to select
      providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.name;
        providerSelect.appendChild(option);
      });
      
      // Load models for the selected provider
      const selectedProvider = providerSelect.value;
      await loadModelsForProvider(selectedProvider);
    }
    
    // Load current provider settings
    const settings = await rhetorClient.getSettings();
    if (settings && settings.default_provider) {
      providerSelect.value = settings.default_provider;
      await loadModelsForProvider(settings.default_provider);
      
      if (settings.default_model) {
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
          modelSelect.value = settings.default_model;
        }
      }
      
      if (settings.temperature) {
        const temperatureSlider = document.getElementById('temperature-slider');
        const sliderValue = temperatureSlider?.nextElementSibling;
        
        if (temperatureSlider) {
          temperatureSlider.value = settings.temperature;
          if (sliderValue) {
            sliderValue.textContent = settings.temperature;
          }
        }
      }
      
      if (settings.max_tokens) {
        const maxTokens = document.getElementById('max-tokens');
        if (maxTokens) {
          maxTokens.value = settings.max_tokens;
        }
      }
    }
  } catch (error) {
    console.error('Failed to load providers:', error);
  }
}

/**
 * Load models for the selected provider
 */
async function loadModelsForProvider(provider) {
  if (!rhetorClient) return;
  
  try {
    const models = await rhetorClient.getModels(provider);
    const modelSelect = document.getElementById('model-select');
    
    if (modelSelect && models && models.length > 0) {
      // Clear the select
      modelSelect.innerHTML = '';
      
      // Add models to select
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error(`Failed to load models for provider ${provider}:`, error);
  }
}

/**
 * Save provider settings
 */
async function saveProviderSettings() {
  if (!rhetorClient) return;
  
  const providerSelect = document.getElementById('provider-select');
  const modelSelect = document.getElementById('model-select');
  const temperatureSlider = document.getElementById('temperature-slider');
  const maxTokens = document.getElementById('max-tokens');
  
  if (providerSelect && modelSelect && temperatureSlider && maxTokens) {
    const settings = {
      default_provider: providerSelect.value,
      default_model: modelSelect.value,
      temperature: parseFloat(temperatureSlider.value),
      max_tokens: parseInt(maxTokens.value, 10)
    };
    
    try {
      await rhetorClient.saveSettings(settings);
      // Show success message
      alert('Settings saved successfully.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Show error message
      alert('Failed to save settings. Check console for details.');
    }
  }
}

/**
 * Test the provider connection
 */
async function testProviderConnection() {
  if (!rhetorClient) return;
  
  const providerSelect = document.getElementById('provider-select');
  const modelSelect = document.getElementById('model-select');
  
  if (providerSelect && modelSelect) {
    const provider = providerSelect.value;
    const model = modelSelect.value;
    
    try {
      const result = await rhetorClient.testConnection(provider, model);
      
      if (result.success) {
        alert(`Connection successful. Provider: ${provider}, Model: ${model}`);
      } else {
        alert(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test connection failed:', error);
      alert('Connection test failed. Check console for details.');
    }
  }
}

/**
 * Initialize template manager functionality
 */
function initTemplateManager() {
  const createTemplateButton = document.getElementById('create-template');
  const templateCategoryFilter = document.getElementById('template-category');
  const templateItems = document.querySelectorAll('.template-item');
  
  // Template editor buttons
  const saveTemplateButton = document.getElementById('save-template');
  const cancelTemplateButton = document.getElementById('cancel-template-edit');
  const testTemplateButton = document.getElementById('test-template');
  
  if (createTemplateButton) {
    createTemplateButton.addEventListener('click', () => {
      showTemplateEditor(null); // New template
    });
  }
  
  if (templateCategoryFilter) {
    templateCategoryFilter.addEventListener('change', filterTemplates);
  }
  
  // Set up template action buttons
  templateItems.forEach(item => {
    const editButton = item.querySelector('.template-action-button:nth-child(1)');
    const testButton = item.querySelector('.template-action-button:nth-child(2)');
    const historyButton = item.querySelector('.template-action-button:nth-child(3)');
    
    if (editButton) {
      editButton.addEventListener('click', () => {
        const templateName = item.querySelector('.template-name').textContent;
        showTemplateEditor(templateName);
      });
    }
    
    if (testButton) {
      testButton.addEventListener('click', () => {
        const templateName = item.querySelector('.template-name').textContent;
        testTemplate(templateName);
      });
    }
    
    if (historyButton) {
      historyButton.addEventListener('click', () => {
        const templateName = item.querySelector('.template-name').textContent;
        showTemplateHistory(templateName);
      });
    }
  });
  
  // Set up template editor buttons
  if (saveTemplateButton) {
    saveTemplateButton.addEventListener('click', saveTemplate);
  }
  
  if (cancelTemplateButton) {
    cancelTemplateButton.addEventListener('click', hideTemplateEditor);
  }
  
  if (testTemplateButton) {
    testTemplateButton.addEventListener('click', () => {
      testTemplateInEditor();
    });
  }
}

/**
 * Filter templates by category
 */
function filterTemplates() {
  const category = document.getElementById('template-category').value;
  const templateItems = document.querySelectorAll('.template-item');
  
  templateItems.forEach(item => {
    const templateCategory = item.querySelector('.template-category-badge').classList[1];
    
    if (category === 'all' || templateCategory === category) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Show template editor for creating/editing a template
 */
function showTemplateEditor(templateName) {
  const templateList = document.querySelector('.template-list');
  const templateEditor = document.getElementById('template-editor');
  const templateNameSpan = document.getElementById('edit-template-name');
  const templateNameInput = document.getElementById('template-name-input');
  const templateCategoryInput = document.getElementById('template-category-input');
  const templateDescriptionInput = document.getElementById('template-description-input');
  const templateContent = document.getElementById('template-content');
  
  if (templateEditor && templateList) {
    // Hide template list, show editor
    templateList.style.display = 'none';
    templateEditor.style.display = 'block';
    
    if (templateName) {
      // Editing existing template
      if (templateNameSpan) templateNameSpan.textContent = templateName;
      
      // In a real implementation, fetch the template data from Rhetor
      // For now, we'll just use the UI data
      const templateItem = Array.from(document.querySelectorAll('.template-item')).find(
        item => item.querySelector('.template-name').textContent === templateName
      );
      
      if (templateItem) {
        const category = templateItem.querySelector('.template-category-badge').classList[1];
        const description = templateItem.querySelector('.template-description').textContent.trim();
        
        if (templateNameInput) templateNameInput.value = templateName;
        if (templateCategoryInput) templateCategoryInput.value = category;
        if (templateDescriptionInput) templateDescriptionInput.value = description;
      }
    } else {
      // Creating new template
      if (templateNameSpan) templateNameSpan.textContent = 'New Template';
      if (templateNameInput) templateNameInput.value = '';
      if (templateCategoryInput) templateCategoryInput.value = 'system';
      if (templateDescriptionInput) templateDescriptionInput.value = '';
      if (templateContent) templateContent.value = '{{ context }}\n\n{{ query }}';
    }
  }
}

/**
 * Hide template editor
 */
function hideTemplateEditor() {
  const templateList = document.querySelector('.template-list');
  const templateEditor = document.getElementById('template-editor');
  
  if (templateEditor && templateList) {
    templateList.style.display = 'grid';
    templateEditor.style.display = 'none';
  }
}

/**
 * Save template
 */
function saveTemplate() {
  // In a real implementation, this would save the template to Rhetor
  // For demo purposes, we'll just hide the editor
  hideTemplateEditor();
  
  // Show success message
  alert('Template saved successfully.');
}

/**
 * Test a template
 */
function testTemplate(templateName) {
  // In a real implementation, this would test the template with Rhetor
  // For demo purposes, just show an alert
  alert(`Testing template: ${templateName}`);
}

/**
 * Test the template currently in the editor
 */
function testTemplateInEditor() {
  // In a real implementation, this would test the template with Rhetor
  // For demo purposes, just show an alert
  alert('Testing template in editor');
}

/**
 * Show template version history
 */
function showTemplateHistory(templateName) {
  // In a real implementation, this would show the template history
  // For demo purposes, just show an alert
  alert(`Template history for: ${templateName}`);
}

/**
 * Initialize conversation viewer functionality
 */
function initConversationViewer() {
  const conversationSearch = document.getElementById('conversation-search');
  const refreshButton = document.getElementById('refresh-conversations');
  const conversationItems = document.querySelectorAll('.conversation-item');
  
  if (conversationSearch) {
    conversationSearch.addEventListener('input', filterConversations);
  }
  
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshConversations);
  }
  
  conversationItems.forEach(item => {
    item.addEventListener('click', () => {
      // Deselect all items
      conversationItems.forEach(i => i.classList.remove('active'));
      
      // Select clicked item
      item.classList.add('active');
      
      // Load conversation
      const conversationName = item.querySelector('.conversation-name').textContent;
      loadConversation(conversationName);
    });
  });
}

/**
 * Filter conversations based on search input
 */
function filterConversations() {
  const searchText = document.getElementById('conversation-search').value.toLowerCase();
  const conversationItems = document.querySelectorAll('.conversation-item');
  
  conversationItems.forEach(item => {
    const name = item.querySelector('.conversation-name').textContent.toLowerCase();
    const preview = item.querySelector('.conversation-preview').textContent.toLowerCase();
    
    if (name.includes(searchText) || preview.includes(searchText)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Refresh conversation list
 */
function refreshConversations() {
  // In a real implementation, this would fetch conversations from Rhetor
  // For demo purposes, just show an alert
  alert('Refreshing conversations...');
}

/**
 * Load a specific conversation
 */
function loadConversation(conversationName) {
  // In a real implementation, this would fetch conversation details from Rhetor
  // For demo purposes, update the conversation header
  const conversationHeader = document.querySelector('.conversation-header h3');
  
  if (conversationHeader) {
    conversationHeader.textContent = conversationName;
  }
}

/**
 * Initialize budget dashboard functionality
 */
function initBudgetDashboard() {
  const periodSelect = document.getElementById('budget-period');
  const refreshButton = document.getElementById('refresh-budget');
  const saveBudgetSettingsButton = document.getElementById('save-budget-settings');
  
  if (periodSelect) {
    periodSelect.addEventListener('change', updateBudgetPeriod);
  }
  
  if (refreshButton) {
    refreshButton.addEventListener('click', fetchBudgetData);
  }
  
  if (saveBudgetSettingsButton) {
    saveBudgetSettingsButton.addEventListener('click', saveBudgetSettings);
  }
  
  // Initialize budget manager (will be moved to budget-dashboard.js)
  activeBudgetManager = {
    updateBudgetData: function(budgetData) {
      // Update budget cards and charts
      console.log('Budget data updated:', budgetData);
    }
  };
  
  // Initialize range sliders
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const valueDisplay = slider.nextElementSibling;
    
    if (valueDisplay && valueDisplay.classList.contains('slider-value')) {
      slider.addEventListener('input', () => {
        const value = slider.value;
        // For warning threshold, add % sign
        if (slider.id === 'warning-threshold') {
          valueDisplay.textContent = `${value}%`;
        } else {
          valueDisplay.textContent = value;
        }
      });
    }
  });
}

/**
 * Update budget period and refresh data
 */
function updateBudgetPeriod() {
  fetchBudgetData();
}

/**
 * Fetch budget data from Rhetor
 */
async function fetchBudgetData() {
  if (!rhetorClient) return;
  
  try {
    const period = document.getElementById('budget-period')?.value || 'month';
    const budgetData = await rhetorClient.getBudgetData(period);
    
    if (budgetData) {
      updateBudgetUI(budgetData);
    }
  } catch (error) {
    console.error('Failed to fetch budget data:', error);
  }
}

/**
 * Update budget UI with data
 */
function updateBudgetUI(budgetData) {
  // In a real implementation, this would update all budget UI elements
  console.log('Updating budget UI with data:', budgetData);
}

/**
 * Save budget settings
 */
async function saveBudgetSettings() {
  if (!rhetorClient) return;
  
  const dailyBudget = document.getElementById('daily-budget')?.value;
  const weeklyBudget = document.getElementById('weekly-budget')?.value;
  const monthlyBudget = document.getElementById('monthly-budget')?.value;
  const enforcementPolicy = document.getElementById('enforcement-policy')?.value;
  const allowFreeModels = document.getElementById('allow-free-models')?.checked;
  const warningThreshold = document.getElementById('warning-threshold')?.value;
  const anthropicBudget = document.getElementById('anthropic-budget')?.value;
  const openAIBudget = document.getElementById('openai-budget')?.value;
  
  const settings = {
    daily_limit: parseFloat(dailyBudget),
    weekly_limit: parseFloat(weeklyBudget),
    monthly_limit: parseFloat(monthlyBudget),
    enforcement_policy: enforcementPolicy,
    allow_free_models: allowFreeModels,
    warning_threshold: parseInt(warningThreshold, 10),
    provider_limits: {
      anthropic: parseFloat(anthropicBudget),
      openai: parseFloat(openAIBudget)
    }
  };
  
  try {
    await rhetorClient.saveBudgetSettings(settings);
    // Show success message
    alert('Budget settings saved successfully.');
  } catch (error) {
    console.error('Failed to save budget settings:', error);
    // Show error message
    alert('Failed to save budget settings. Check console for details.');
  }
}

/**
 * RhetorClient class for communicating with the Rhetor API
 */
class RhetorClient {
  constructor(options) {
    this.baseUrl = options.rhetorUrl || 'http://localhost:8300';
    this.componentId = options.componentId || 'hephaestus-ui';
    this.autoReconnect = options.autoReconnect || true;
    this.connected = false;
    this.ws = null;
    this.eventHandlers = {
      status: [],
      error: [],
      typing: []
    };
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this._handleWebSocketMessage = this._handleWebSocketMessage.bind(this);
    this._reconnect = this._reconnect.bind(this);
  }
  
  /**
   * Connect to the Rhetor WebSocket API
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`ws://${this.baseUrl.replace(/^https?:\/\//, '')}/ws`);
        
        this.ws.onopen = () => {
          this.connected = true;
          
          // Send identification message
          this.ws.send(JSON.stringify({
            type: 'IDENTIFY',
            component_id: this.componentId
          }));
          
          console.log('Connected to Rhetor WebSocket');
          resolve();
        };
        
        this.ws.onmessage = this._handleWebSocketMessage;
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this._triggerEvent('error', { message: 'WebSocket connection error' });
          
          if (!this.connected) {
            reject(new Error('Failed to connect to Rhetor'));
          }
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.connected = false;
          
          if (this.autoReconnect) {
            setTimeout(this._reconnect, 5000);
          }
          
          this._triggerEvent('status', { connected: false });
        };
      } catch (error) {
        console.error('Failed to connect to Rhetor:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Reconnect to the WebSocket
   */
  _reconnect() {
    if (!this.connected) {
      console.log('Attempting to reconnect to Rhetor...');
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        setTimeout(this._reconnect, 5000);
      });
    }
  }
  
  /**
   * Handle WebSocket messages
   */
  _handleWebSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'STATUS':
          this._triggerEvent('status', message.data);
          break;
        case 'TYPING':
          this._triggerEvent('typing', message.data.isTyping, message.data.contextId);
          break;
        case 'ERROR':
          this._triggerEvent('error', { message: message.data.message });
          break;
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  /**
   * Register an event handler
   */
  on(eventName, handler) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].push(handler);
    }
  }
  
  /**
   * Trigger an event
   */
  _triggerEvent(eventName, ...args) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      });
    }
  }
  
  /**
   * Get available providers
   */
  async getProviders() {
    return this._get('/providers');
  }
  
  /**
   * Get models for a provider
   */
  async getModels(provider) {
    return this._get(`/providers/${provider}/models`);
  }
  
  /**
   * Get current settings
   */
  async getSettings() {
    return this._get('/settings');
  }
  
  /**
   * Save settings
   */
  async saveSettings(settings) {
    return this._post('/settings', settings);
  }
  
  /**
   * Test connection to a provider and model
   */
  async testConnection(provider, model) {
    return this._post('/test_connection', { provider, model });
  }
  
  /**
   * Get budget data
   */
  async getBudgetData(period = 'month') {
    return this._get(`/budget?period=${period}`);
  }
  
  /**
   * Save budget settings
   */
  async saveBudgetSettings(settings) {
    return this._post('/budget/settings', settings);
  }
  
  /**
   * Send a GET request to the Rhetor API
   */
  async _get(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Send a POST request to the Rhetor API
   */
  async _post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }
}