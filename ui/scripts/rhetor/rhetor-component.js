/**
 * Rhetor Component JavaScript
 * Main controller for the Rhetor UI component in Hephaestus
 * Updated to use State Management Pattern with Shadow DOM isolation
 */

(function(component) {
  // Reference to the component's shadow root
  const root = component.root;
  
  // Reference to the Rhetor service
  let rhetorService = null;
  
  // Initialize the component when mounted
  initRhetorComponent();
  
  // Register cleanup for when component is unmounted
  component.registerCleanup(cleanupRhetorComponent);
  
  /**
   * Initialize the Rhetor component
   */
  function initRhetorComponent() {
    setupTabNavigation();
    initRhetorService();
    initProviderSelector();
    initTemplateManager();
    initConversationViewer();
    initBudgetDashboard();
    
    // Set up temperature slider value display
    const temperatureSlider = component.$('#temperature-slider');
    const sliderValue = component.$('.rhetor-slider__value');
    
    if (temperatureSlider && sliderValue) {
      temperatureSlider.addEventListener('input', () => {
        sliderValue.textContent = temperatureSlider.value;
      });
    }
  }
  
  /**
   * Clean up component resources when unmounted
   */
  function cleanupRhetorComponent() {
    // Unsubscribe from service events
    if (rhetorService) {
      // Remove event listeners from service
      rhetorService.removeEventListener('connected', handleConnected);
      rhetorService.removeEventListener('connectionFailed', handleConnectionFailed);
      rhetorService.removeEventListener('providersUpdated', handleProvidersUpdated);
      rhetorService.removeEventListener('modelsUpdated', handleModelsUpdated);
      rhetorService.removeEventListener('settingsUpdated', handleSettingsUpdated);
      rhetorService.removeEventListener('budgetUpdated', handleBudgetUpdated);
      rhetorService.removeEventListener('error', handleServiceError);
      rhetorService.removeEventListener('websocketConnected', handleWebSocketConnected);
      rhetorService.removeEventListener('websocketDisconnected', handleWebSocketDisconnected);
      rhetorService.removeEventListener('message', handleServiceMessage);
    }
  }
  
  /**
   * Initialize the Rhetor service connection
   */
  function initRhetorService() {
    // Get the service from the global registry
    rhetorService = window.tektonUI.services.rhetorService;
    
    if (!rhetorService) {
      console.error('Rhetor service not found in global registry');
      showNotification('Rhetor service unavailable', 'error');
      return;
    }
    
    // Subscribe to service events
    rhetorService.addEventListener('connected', handleConnected);
    rhetorService.addEventListener('connectionFailed', handleConnectionFailed);
    rhetorService.addEventListener('providersUpdated', handleProvidersUpdated);
    rhetorService.addEventListener('modelsUpdated', handleModelsUpdated);
    rhetorService.addEventListener('settingsUpdated', handleSettingsUpdated);
    rhetorService.addEventListener('budgetUpdated', handleBudgetUpdated);
    rhetorService.addEventListener('error', handleServiceError);
    rhetorService.addEventListener('websocketConnected', handleWebSocketConnected);
    rhetorService.addEventListener('websocketDisconnected', handleWebSocketDisconnected);
    rhetorService.addEventListener('message', handleServiceMessage);
    
    // Get current connection status
    const state = rhetorService.getState();
    updateConnectionStatus(state.connected);
    
    // Connect to service if not already connected
    if (!state.connected) {
      rhetorService.connect().then(() => {
        // Service will emit events that will update UI
      });
    } else {
      // Initialize UI with current state
      initializeUIFromState(state);
    }
  }
  
  /**
   * Initialize UI from current service state
   */
  function initializeUIFromState(state) {
    // Update connection status
    updateConnectionStatus(state.connected);
    
    // Update providers if available
    if (state.providers && state.providers.length > 0) {
      updateProviderSelect(state.providers);
    }
    
    // Update selected provider and model
    if (state.selectedProvider) {
      const providerSelect = component.$('#provider-select');
      if (providerSelect) {
        providerSelect.value = state.selectedProvider;
      }
    }
    
    if (state.selectedModel) {
      const modelSelect = component.$('#model-select');
      if (modelSelect) {
        modelSelect.value = state.selectedModel;
      }
    }
    
    // Update budget data if available
    if (state.budget) {
      updateBudgetUI(state.budget);
    }
  }
  
  /**
   * Handle connected event from service
   */
  function handleConnected(event) {
    updateConnectionStatus(true);
    showNotification('Connected to Rhetor service', 'success');
  }
  
  /**
   * Handle connection failed event from service
   */
  function handleConnectionFailed(event) {
    updateConnectionStatus(false);
    showNotification(`Failed to connect to Rhetor: ${event.detail.error}`, 'error');
  }
  
  /**
   * Handle providers updated event from service
   */
  function handleProvidersUpdated(event) {
    updateProviderSelect(event.detail.providers);
  }
  
  /**
   * Handle models updated event from service
   */
  function handleModelsUpdated(event) {
    updateModelSelect(event.detail.provider, event.detail.models);
  }
  
  /**
   * Handle settings updated event from service
   */
  function handleSettingsUpdated(event) {
    updateSettingsUI(event.detail.settings);
  }
  
  /**
   * Handle budget updated event from service
   */
  function handleBudgetUpdated(event) {
    updateBudgetUI(event.detail.budget);
  }
  
  /**
   * Handle error event from service
   */
  function handleServiceError(event) {
    showNotification(event.detail.error, 'error');
  }
  
  /**
   * Handle WebSocket connected event from service
   */
  function handleWebSocketConnected(event) {
    console.log('WebSocket connected');
  }
  
  /**
   * Handle WebSocket disconnected event from service
   */
  function handleWebSocketDisconnected(event) {
    console.log('WebSocket disconnected');
  }
  
  /**
   * Handle message event from service
   */
  function handleServiceMessage(event) {
    console.log('Service message:', event.detail);
  }
  
  /**
   * Update the connection status display
   */
  function updateConnectionStatus(connected) {
    const statusElement = component.$('.rhetor-stat-card__value');
    if (statusElement) {
      if (connected) {
        statusElement.textContent = 'Connected';
        statusElement.classList.remove('rhetor-stat-card__value--disconnected');
        statusElement.classList.add('rhetor-stat-card__value--connected');
      } else {
        statusElement.textContent = 'Disconnected';
        statusElement.classList.remove('rhetor-stat-card__value--connected');
        statusElement.classList.add('rhetor-stat-card__value--disconnected');
      }
    }
  }
  
  /**
   * Set up tab navigation for the Rhetor component
   */
  function setupTabNavigation() {
    const tabButtons = component.$$('.rhetor-tabs__button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Deactivate all tabs
        tabButtons.forEach(btn => btn.classList.remove('rhetor-tabs__button--active'));
        component.$$('.rhetor-tabs__content').forEach(content => {
          content.classList.remove('rhetor-tabs__content--active');
        });
        
        // Activate selected tab
        button.classList.add('rhetor-tabs__button--active');
        const contentElement = component.$(`#${tabName}-content`);
        if (contentElement) {
          contentElement.classList.add('rhetor-tabs__content--active');
        }
      });
    });
  }
  
  /**
   * Initialize provider selector functionality
   */
  function initProviderSelector() {
    const providerSelect = component.$('#provider-select');
    const modelSelect = component.$('#model-select');
    const saveButton = component.$('#save-provider');
    const testButton = component.$('#test-provider');
    
    if (providerSelect && modelSelect) {
      // Handle provider selection change
      providerSelect.addEventListener('change', async () => {
        const provider = providerSelect.value;
        await rhetorService.getModels(provider, true); // Force refresh
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
   * Update the provider selection dropdown
   */
  function updateProviderSelect(providers) {
    const providerSelect = component.$('#provider-select');
    
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
      rhetorService.getModels(selectedProvider);
    }
  }
  
  /**
   * Update the model selection dropdown
   */
  function updateModelSelect(provider, models) {
    const modelSelect = component.$('#model-select');
    
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
  }
  
  /**
   * Update the settings UI with current settings
   */
  function updateSettingsUI(settings) {
    const providerSelect = component.$('#provider-select');
    const modelSelect = component.$('#model-select');
    const temperatureSlider = component.$('#temperature-slider');
    const sliderValue = component.$('.rhetor-slider__value');
    const maxTokens = component.$('#max-tokens');
    
    if (settings.defaultProvider && providerSelect) {
      providerSelect.value = settings.defaultProvider;
      
      // Load models for this provider if needed
      rhetorService.getModels(settings.defaultProvider);
    }
    
    if (settings.defaultModel && modelSelect) {
      modelSelect.value = settings.defaultModel;
    }
    
    if (settings.temperature && temperatureSlider) {
      temperatureSlider.value = settings.temperature;
      
      if (sliderValue) {
        sliderValue.textContent = settings.temperature;
      }
    }
    
    if (settings.maxTokens && maxTokens) {
      maxTokens.value = settings.maxTokens;
    }
  }
  
  /**
   * Save provider settings
   */
  async function saveProviderSettings() {
    if (!rhetorService) return;
    
    const providerSelect = component.$('#provider-select');
    const modelSelect = component.$('#model-select');
    const temperatureSlider = component.$('#temperature-slider');
    const maxTokens = component.$('#max-tokens');
    
    if (providerSelect && modelSelect && temperatureSlider && maxTokens) {
      const settings = {
        default_provider: providerSelect.value,
        default_model: modelSelect.value,
        temperature: parseFloat(temperatureSlider.value),
        max_tokens: parseInt(maxTokens.value, 10)
      };
      
      try {
        await rhetorService.saveSettings(settings);
        // UI will be updated via the settingsUpdated event
      } catch (error) {
        console.error('Failed to save settings:', error);
        showNotification('Failed to save settings. Check console for details.', 'error');
      }
    }
  }
  
  /**
   * Test the provider connection
   */
  async function testProviderConnection() {
    if (!rhetorService) return;
    
    const providerSelect = component.$('#provider-select');
    const modelSelect = component.$('#model-select');
    
    if (providerSelect && modelSelect) {
      const provider = providerSelect.value;
      const model = modelSelect.value;
      
      try {
        const result = await rhetorService.testConnection(provider, model);
        
        if (result.success) {
          showNotification(`Connection successful. Provider: ${provider}, Model: ${model}`, 'success');
        } else {
          showNotification(`Connection failed: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Test connection failed:', error);
        showNotification('Connection test failed. Check console for details.', 'error');
      }
    }
  }
  
  /**
   * Show notification message
   */
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `rhetor-notification rhetor-notification--${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '10000';
    
    // Set colors based on type
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#28a745';
        notification.style.color = 'white';
        break;
      case 'error':
        notification.style.backgroundColor = '#dc3545';
        notification.style.color = 'white';
        break;
      default:
        notification.style.backgroundColor = '#007bff';
        notification.style.color = 'white';
        break;
    }
    
    // Add to shadow DOM
    root.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  /**
   * Initialize template manager functionality
   */
  function initTemplateManager() {
    const createTemplateButton = component.$('#create-template');
    const templateCategoryFilter = component.$('#template-category');
    const templateItems = component.$$('.rhetor-template-item');
    
    // Template editor buttons
    const saveTemplateButton = component.$('#save-template');
    const cancelTemplateButton = component.$('#cancel-template-edit');
    const testTemplateButton = component.$('#test-template');
    
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
      const buttons = item.querySelectorAll('.rhetor-template-item__button');
      
      if (buttons.length >= 3) {
        const editButton = buttons[0];
        const testButton = buttons[1];
        const historyButton = buttons[2];
        
        if (editButton) {
          editButton.addEventListener('click', () => {
            const templateName = item.querySelector('.rhetor-template-item__name').textContent;
            showTemplateEditor(templateName);
          });
        }
        
        if (testButton) {
          testButton.addEventListener('click', () => {
            const templateName = item.querySelector('.rhetor-template-item__name').textContent;
            testTemplate(templateName);
          });
        }
        
        if (historyButton) {
          historyButton.addEventListener('click', () => {
            const templateName = item.querySelector('.rhetor-template-item__name').textContent;
            showTemplateHistory(templateName);
          });
        }
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
    
    // Load templates from service
    if (rhetorService) {
      rhetorService.getTemplates().then(templates => {
        // In a real implementation, this would update the template list
        console.log('Templates loaded:', templates);
      });
    }
  }
  
  /**
   * Filter templates by category
   */
  function filterTemplates() {
    const category = component.$('#template-category').value;
    const templateItems = component.$$('.rhetor-template-item');
    
    templateItems.forEach(item => {
      const templateCategory = item.querySelector('.rhetor-template-item__badge').classList[1].split('--')[1];
      
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
    const templateList = component.$('.rhetor-template-list');
    const templateEditor = component.$('#template-editor');
    const templateNameSpan = component.$('#edit-template-name');
    const templateNameInput = component.$('#template-name-input');
    const templateCategoryInput = component.$('#template-category-input');
    const templateDescriptionInput = component.$('#template-description-input');
    const templateContent = component.$('#template-content');
    
    if (templateEditor && templateList) {
      // Hide template list, show editor
      templateList.style.display = 'none';
      templateEditor.style.display = 'block';
      
      if (templateName) {
        // Editing existing template
        if (templateNameSpan) templateNameSpan.textContent = templateName;
        
        // In a real implementation, fetch the template data from service
        // For now, we'll just use the UI data
        const templateItem = Array.from(component.$$('.rhetor-template-item')).find(
          item => item.querySelector('.rhetor-template-item__name').textContent === templateName
        );
        
        if (templateItem) {
          const category = templateItem.querySelector('.rhetor-template-item__badge').classList[1].split('--')[1];
          const description = templateItem.querySelector('.rhetor-template-item__description').textContent.trim();
          
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
    const templateList = component.$('.rhetor-template-list');
    const templateEditor = component.$('#template-editor');
    
    if (templateEditor && templateList) {
      templateList.style.display = 'grid';
      templateEditor.style.display = 'none';
    }
  }
  
  /**
   * Save template
   */
  async function saveTemplate() {
    if (!rhetorService) return;
    
    const templateNameInput = component.$('#template-name-input');
    const templateCategoryInput = component.$('#template-category-input');
    const templateDescriptionInput = component.$('#template-description-input');
    const templateContent = component.$('#template-content');
    
    if (templateNameInput && templateCategoryInput && templateDescriptionInput && templateContent) {
      const template = {
        name: templateNameInput.value,
        category: templateCategoryInput.value,
        description: templateDescriptionInput.value,
        content: templateContent.value
      };
      
      try {
        await rhetorService.saveTemplate(template);
        hideTemplateEditor();
        showNotification('Template saved successfully', 'success');
      } catch (error) {
        console.error('Failed to save template:', error);
        showNotification('Failed to save template. Check console for details.', 'error');
      }
    }
  }
  
  /**
   * Test a template
   */
  function testTemplate(templateName) {
    // In a real implementation, this would use the service to test the template
    showNotification(`Testing template: ${templateName}`, 'info');
  }
  
  /**
   * Test the template currently in the editor
   */
  function testTemplateInEditor() {
    // In a real implementation, this would use the service to test the template
    showNotification('Testing template in editor', 'info');
  }
  
  /**
   * Show template version history
   */
  function showTemplateHistory(templateName) {
    // In a real implementation, this would use the service to show template history
    showNotification(`Template history for: ${templateName}`, 'info');
  }
  
  /**
   * Initialize conversation viewer functionality
   */
  function initConversationViewer() {
    const conversationSearch = component.$('#conversation-search');
    const refreshButton = component.$('#refresh-conversations');
    const conversationItems = component.$$('.rhetor-conversation-item');
    
    if (conversationSearch) {
      conversationSearch.addEventListener('input', filterConversations);
    }
    
    if (refreshButton) {
      refreshButton.addEventListener('click', refreshConversations);
    }
    
    conversationItems.forEach(item => {
      item.addEventListener('click', () => {
        // Deselect all items
        conversationItems.forEach(i => i.classList.remove('rhetor-conversation-item--active'));
        
        // Select clicked item
        item.classList.add('rhetor-conversation-item--active');
        
        // Load conversation
        const conversationName = item.querySelector('.rhetor-conversation-item__name').textContent;
        loadConversation(conversationName);
      });
    });
    
    // Load conversations from service
    if (rhetorService) {
      rhetorService.getConversations().then(conversations => {
        // In a real implementation, this would update the conversation list
        console.log('Conversations loaded:', conversations);
      });
    }
  }
  
  /**
   * Filter conversations based on search input
   */
  function filterConversations() {
    const searchText = component.$('#conversation-search').value.toLowerCase();
    const conversationItems = component.$$('.rhetor-conversation-item');
    
    conversationItems.forEach(item => {
      const name = item.querySelector('.rhetor-conversation-item__name').textContent.toLowerCase();
      const preview = item.querySelector('.rhetor-conversation-item__preview').textContent.toLowerCase();
      
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
  async function refreshConversations() {
    if (!rhetorService) return;
    
    try {
      await rhetorService.getConversations(true); // Force refresh
      showNotification('Conversations refreshed', 'success');
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
      showNotification('Failed to refresh conversations', 'error');
    }
  }
  
  /**
   * Load a specific conversation
   */
  async function loadConversation(conversationName) {
    if (!rhetorService) return;
    
    // In a real implementation, we would have conversation IDs
    // For demo purposes, just update the conversation header
    const conversationHeader = component.$('.rhetor-conversation-detail__header h3');
    
    if (conversationHeader) {
      conversationHeader.textContent = conversationName;
    }
  }
  
  /**
   * Initialize budget dashboard functionality
   */
  function initBudgetDashboard() {
    const periodSelect = component.$('#budget-period');
    const refreshButton = component.$('#refresh-budget');
    const saveBudgetSettingsButton = component.$('#save-budget-settings');
    
    if (periodSelect) {
      periodSelect.addEventListener('change', updateBudgetPeriod);
    }
    
    if (refreshButton) {
      refreshButton.addEventListener('click', refreshBudgetData);
    }
    
    if (saveBudgetSettingsButton) {
      saveBudgetSettingsButton.addEventListener('click', saveBudgetSettings);
    }
    
    // Initialize range sliders
    const sliders = component.$$('input[type="range"]');
    sliders.forEach(slider => {
      const sliderContainer = slider.closest('.rhetor-slider-container');
      if (sliderContainer) {
        const valueDisplay = sliderContainer.querySelector('.rhetor-slider__value');
        
        if (valueDisplay) {
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
      }
    });
    
    // Fetch initial budget data
    if (rhetorService) {
      refreshBudgetData();
    }
  }
  
  /**
   * Update budget period and refresh data
   */
  function updateBudgetPeriod() {
    refreshBudgetData();
  }
  
  /**
   * Refresh budget data from service
   */
  async function refreshBudgetData() {
    if (!rhetorService) return;
    
    try {
      const period = component.$('#budget-period')?.value || 'monthly';
      await rhetorService.getBudget(period, true); // Force refresh
    } catch (error) {
      console.error('Failed to refresh budget data:', error);
      showNotification('Failed to refresh budget data', 'error');
    }
  }
  
  /**
   * Update budget UI with data
   */
  function updateBudgetUI(budgetData) {
    if (!budgetData) return;
    
    // Update budget usage card
    const usedElement = component.$('.budget-card__value--used');
    const remainingElement = component.$('.budget-card__value--remaining');
    const limitElement = component.$('.budget-card__value--limit');
    const progressBar = component.$('.budget-progress__bar');
    
    if (usedElement) {
      usedElement.textContent = `$${budgetData.used.toFixed(2)}`;
    }
    
    if (remainingElement) {
      remainingElement.textContent = `$${budgetData.remaining.toFixed(2)}`;
    }
    
    if (limitElement) {
      limitElement.textContent = `$${budgetData.limit.toFixed(2)}`;
    }
    
    if (progressBar) {
      const percentage = budgetData.limit > 0 ? (budgetData.used / budgetData.limit) * 100 : 0;
      progressBar.style.width = `${Math.min(percentage, 100)}%`;
      
      // Update color based on usage
      if (percentage > 90) {
        progressBar.style.backgroundColor = '#dc3545'; // Red
      } else if (percentage > 75) {
        progressBar.style.backgroundColor = '#ffc107'; // Yellow
      } else {
        progressBar.style.backgroundColor = '#28a745'; // Green
      }
    }
    
    // Update budget form fields
    const dailyBudget = component.$('#daily-budget');
    const weeklyBudget = component.$('#weekly-budget');
    const monthlyBudget = component.$('#monthly-budget');
    const warningThreshold = component.$('#warning-threshold');
    const thresholdValue = warningThreshold?.closest('.rhetor-slider-container')?.querySelector('.rhetor-slider__value');
    
    if (budgetData.limits) {
      if (dailyBudget && budgetData.limits.daily) {
        dailyBudget.value = budgetData.limits.daily;
      }
      
      if (weeklyBudget && budgetData.limits.weekly) {
        weeklyBudget.value = budgetData.limits.weekly;
      }
      
      if (monthlyBudget && budgetData.limits.monthly) {
        monthlyBudget.value = budgetData.limits.monthly;
      }
    }
    
    if (budgetData.alerts && warningThreshold) {
      warningThreshold.value = budgetData.alerts.threshold;
      
      if (thresholdValue) {
        thresholdValue.textContent = `${budgetData.alerts.threshold}%`;
      }
    }
  }
  
  /**
   * Save budget settings
   */
  async function saveBudgetSettings() {
    if (!rhetorService) return;
    
    const dailyBudget = component.$('#daily-budget')?.value;
    const weeklyBudget = component.$('#weekly-budget')?.value;
    const monthlyBudget = component.$('#monthly-budget')?.value;
    const enforcementPolicy = component.$('#enforcement-policy')?.value;
    const allowFreeModels = component.$('#allow-free-models')?.checked;
    const warningThreshold = component.$('#warning-threshold')?.value;
    const anthropicBudget = component.$('#anthropic-budget')?.value;
    const openAIBudget = component.$('#openai-budget')?.value;
    
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
      await rhetorService.saveBudgetSettings(settings);
      // UI will be updated via the budgetUpdated event
    } catch (error) {
      console.error('Failed to save budget settings:', error);
      showNotification('Failed to save budget settings. Check console for details.', 'error');
    }
  }
})(component);