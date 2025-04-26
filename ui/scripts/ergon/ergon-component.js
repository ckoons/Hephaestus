/**
 * Ergon Component
 * 
 * This is the main component file for the Ergon AI agent management interface.
 * It uses the specialized Ergon state management system for optimized agent state handling.
 */

(function() {
  // Component initialization
  window.tektonUI = window.tektonUI || {};
  
  // Define component
  window.tektonUI.initErgonComponent = function(root) {
    // Create component context
    const component = {
      root: root,
      id: 'ergon',
      
      // DOM Element selectors
      $: function(selector) {
        return this.root.querySelector(selector);
      },
      
      $$: function(selector) {
        return Array.from(this.root.querySelectorAll(selector));
      }
    };
    
    // Initialize component
    initComponent(component);
    
    return component;
  };
  
  // Main initialization function
  function initComponent(component) {
    // Get utilities
    component.utils = window.tektonUI.componentUtils;
    
    // Cache DOM elements
    cacheElements(component);
    
    // Connect to Ergon state system
    connectToState(component);
    
    // Set up event handlers
    setupEventHandlers(component);
    
    // Set up reactive UI elements
    setupReactiveUI(component);
    
    // Initialize forms
    initForms(component);
    
    // Load initial data
    loadInitialData(component);
    
    console.log('Ergon component initialized');
  }
  
  // Cache DOM elements for better performance
  function cacheElements(component) {
    // Tab navigation
    component.elements = {
      // Tabs
      tabs: component.$$('.ergon__tab'),
      tabPanels: component.$$('.ergon__tab-panel'),
      
      // Agents tab elements
      agentsContainer: component.$('#agents-container'),
      agentsLoading: component.$('#agents-loading'),
      agentSearch: component.$('#agent-search'),
      agentTypeFilter: component.$('#agent-type-filter'),
      agentStatusFilter: component.$('#agent-status-filter'),
      createAgentButton: component.$('#create-agent-button'),
      
      // Executions tab elements
      executionsContainer: component.$('#executions-container'),
      executionsLoading: component.$('#executions-loading'),
      executionAgentFilter: component.$('#execution-agent-filter'),
      executionStatusFilter: component.$('#execution-status-filter'),
      executionTimeFilter: component.$('#execution-time-filter'),
      
      // Workflow tab elements
      workflowsContainer: component.$('#workflows-container'),
      workflowSearch: component.$('#workflow-search'),
      createWorkflowButton: component.$('#create-workflow-button'),
      
      // Modals
      agentDetailsModal: component.$('#agent-details-modal'),
      createAgentModal: component.$('#create-agent-modal'),
      runAgentModal: component.$('#run-agent-modal'),
      settingsModal: component.$('#settings-modal'),
      
      // Other controls
      refreshButton: component.$('#refresh-agents-button'),
      settingsButton: component.$('#settings-button'),
      notificationsContainer: component.$('#notifications-container')
    };
  }
  
  // Connect component to the state management system
  function connectToState(component) {
    // Initialize component with the Ergon state utilities
    const ergonStateUtils = window.tektonUI.componentErgonState.utils;
    if (!ergonStateUtils) {
      console.error('Ergon state utilities not available');
      return;
    }
    
    // Connect component to state
    ergonStateUtils.connect(component, {
      initialState: {
        activeTab: 'agents',
        componentReady: false,
        uiMode: 'default',
        selectedAgentId: null,
        modals: {
          agentDetails: { isOpen: false, agentId: null },
          createAgent: { isOpen: false },
          runAgent: { isOpen: false, agentId: null },
          settings: { isOpen: false }
        },
        forms: {
          createAgent: { isValid: false },
          runAgent: { isValid: false },
          settings: { isValid: true, unsavedChanges: false }
        }
      },
      persist: true,
      persistenceType: 'sessionStorage',
      excludeFromPersistence: ['modals', 'forms']
    });
    
    // Register component lifecycle
    component.utils.lifecycle.registerComponent(component);
    
    // Register state effects for reactive UI updates
    component.utils.lifecycle.registerStateEffect(component, 'activeTab', updateActiveTab);
    
    // Register effect for modal state changes
    component.utils.lifecycle.registerStateEffect(component, ['modals'], updateModals);
    
    // Register effect for UI mode changes
    component.utils.lifecycle.registerStateEffect(
      component, 
      ['uiMode'], 
      (state) => {
        if (state.uiMode === 'compact') {
          component.root.classList.add('ergon--compact');
        } else {
          component.root.classList.remove('ergon--compact');
        }
      }
    );
    
    // Register agent state effects
    component.utils.lifecycle.registerAgentStateEffect(
      component,
      ['filteredAgents', 'isLoading'],
      renderAgentList,
      { runImmediately: true }
    );
    
    // Register execution state effects
    component.utils.lifecycle.registerExecutionStateEffect(
      component,
      ['filteredExecutions', 'activeExecutions'],
      renderExecutionList,
      { runImmediately: true }
    );
    
    // Register settings effect
    component.utils.lifecycle.registerSettingsEffect(
      component,
      ['ui'],
      (settings) => {
        // Update UI based on settings
        if (settings.ui) {
          component.state.setLocal('uiMode', settings.ui.compactMode ? 'compact' : 'default');
        }
      },
      { runImmediately: true }
    );
  }
  
  // Set up event handlers
  function setupEventHandlers(component) {
    // Tab navigation
    component.elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        component.state.setLocal('activeTab', tabName);
      });
    });
    
    // Refresh button
    component.elements.refreshButton.addEventListener('click', () => {
      loadAgentData(component, { bypassCache: true });
    });
    
    // Settings button
    component.elements.settingsButton.addEventListener('click', () => {
      openSettingsModal(component);
    });
    
    // Create agent button
    component.elements.createAgentButton.addEventListener('click', () => {
      openCreateAgentModal(component);
    });
    
    // Agent search
    component.elements.agentSearch.addEventListener('input', debounce(() => {
      const searchTerm = component.elements.agentSearch.value;
      component.ergonState.updateAgentFilters({ search: searchTerm });
    }, 300));
    
    // Agent type filter
    component.elements.agentTypeFilter.addEventListener('change', () => {
      const type = component.elements.agentTypeFilter.value;
      component.ergonState.updateAgentFilters({ type });
    });
    
    // Agent status filter
    component.elements.agentStatusFilter.addEventListener('change', () => {
      const status = component.elements.agentStatusFilter.value;
      component.ergonState.updateAgentFilters({ status });
    });
    
    // Execution agent filter
    component.elements.executionAgentFilter.addEventListener('change', () => {
      const agentId = component.elements.executionAgentFilter.value;
      component.ergonState.updateExecutionFilters({ 
        agentId: agentId === 'all' ? null : agentId 
      });
    });
    
    // Execution status filter
    component.elements.executionStatusFilter.addEventListener('change', () => {
      const status = component.elements.executionStatusFilter.value;
      component.ergonState.updateExecutionFilters({ status });
    });
    
    // Execution time filter
    component.elements.executionTimeFilter.addEventListener('change', () => {
      const timeRange = component.elements.executionTimeFilter.value;
      component.ergonState.updateExecutionFilters({ timeRange });
    });
    
    // Modal close buttons
    component.$$('.ergon__modal-close, [id$="-close-btn"], [id$="-cancel"]').forEach(button => {
      button.addEventListener('click', () => {
        // Get modal ID from button ID
        const buttonId = button.id;
        let modalName;
        
        if (buttonId.includes('agent-details')) {
          modalName = 'agentDetails';
        } else if (buttonId.includes('create-agent')) {
          modalName = 'createAgent';
        } else if (buttonId.includes('run-agent')) {
          modalName = 'runAgent';
        } else if (buttonId.includes('settings')) {
          modalName = 'settings';
        }
        
        if (modalName) {
          closeModal(component, modalName);
        }
      });
    });
    
    // Create agent submit button
    component.$('#create-agent-submit').addEventListener('click', () => {
      submitCreateAgentForm(component);
    });
    
    // Run agent submit button
    component.$('#run-agent-submit').addEventListener('click', () => {
      submitRunAgentForm(component);
    });
    
    // Settings save button
    component.$('#settings-save').addEventListener('click', () => {
      saveSettings(component);
    });
  }
  
  // Set up reactive UI using templates
  function setupReactiveUI(component) {
    // Create reactive UI for agents with automatic state binding
    component.reactiveAgentsList = component.ergonState.createReactiveUI({
      '#agents-container': (state) => {
        if (state.isLoading) {
          return `
            <div class="ergon__loading">
              <div class="ergon__spinner"></div>
              <p>Loading agents...</p>
            </div>
          `;
        }
        
        const agents = state.filteredAgents || [];
        
        if (agents.length === 0) {
          return `
            <div class="ergon__empty-state">
              <p>No agents found. Create your first agent to get started.</p>
            </div>
          `;
        }
        
        return agents.map(agent => `
          <div class="ergon__agent-card" data-agent-id="${agent.id}">
            <div class="ergon__agent-header">
              <h3 class="ergon__agent-name">${escapeHtml(agent.name)}</h3>
              <span class="ergon__agent-type">${escapeHtml(agent.type || 'Unknown')}</span>
            </div>
            <p class="ergon__agent-description">${escapeHtml(agent.description || 'No description')}</p>
            <div class="ergon__agent-footer">
              <span class="ergon__agent-model">${escapeHtml(agent.model_name || 'Default model')}</span>
              <div class="ergon__agent-status">
                <span class="ergon__status-dot ergon__status-dot--${agent.status || 'inactive'}"></span>
                ${escapeHtml(agent.status || 'inactive')}
              </div>
            </div>
          </div>
        `).join('');
      }
    }, ['filteredAgents', 'isLoading']);
    
    // Create reactive UI for executions
    component.reactiveExecutionsList = component.ergonState.createReactiveUI({
      '#executions-container': (state) => {
        const activeExecutions = state.activeExecutions || {};
        const historicalExecutions = state.filteredExecutions || [];
        const hasExecutions = Object.keys(activeExecutions).length > 0 || historicalExecutions.length > 0;
        
        if (state.isLoading) {
          return `
            <div class="ergon__loading">
              <div class="ergon__spinner"></div>
              <p>Loading executions...</p>
            </div>
          `;
        }
        
        if (!hasExecutions) {
          return `
            <div class="ergon__empty-state">
              <p>No executions found. Run an agent to see results here.</p>
            </div>
          `;
        }
        
        let html = '';
        
        // Active executions
        if (Object.keys(activeExecutions).length > 0) {
          html += '<h3 class="ergon__section-title">Active Executions</h3>';
          
          html += Object.values(activeExecutions).map(execution => `
            <div class="ergon__execution-item" data-execution-id="${execution.id}">
              <div class="ergon__execution-header">
                <h4 class="ergon__execution-title">${escapeHtml(execution.agentName || 'Unknown Agent')}</h4>
                <span class="ergon__execution-status ergon__execution-status--running">Running</span>
              </div>
              <div class="ergon__execution-details">
                <div class="ergon__execution-input">${escapeHtml(execution.input || '')}</div>
              </div>
              <div class="ergon__execution-footer">
                <span>Started: ${formatDate(execution.startTime)}</span>
              </div>
            </div>
          `).join('');
        }
        
        // Historical executions
        if (historicalExecutions.length > 0) {
          html += '<h3 class="ergon__section-title">Execution History</h3>';
          
          html += historicalExecutions.map(execution => `
            <div class="ergon__execution-item" data-execution-id="${execution.id}">
              <div class="ergon__execution-header">
                <h4 class="ergon__execution-title">${escapeHtml(execution.agentName || 'Unknown Agent')}</h4>
                <span class="ergon__execution-status ergon__execution-status--${execution.status || 'completed'}">
                  ${capitalizeFirst(execution.status || 'completed')}
                </span>
              </div>
              <div class="ergon__execution-details">
                <div class="ergon__execution-input">${escapeHtml(execution.input || '')}</div>
                ${execution.output ? `<div class="ergon__execution-output">${escapeHtml(execution.output)}</div>` : ''}
                ${execution.error ? `<div class="ergon__execution-error">${escapeHtml(execution.error.message || 'Unknown error')}</div>` : ''}
              </div>
              <div class="ergon__execution-footer">
                <span>Completed: ${formatDate(execution.endTime)}</span>
                <span>Duration: ${formatDuration(execution.duration)}</span>
              </div>
            </div>
          `).join('');
        }
        
        return html;
      }
    }, ['filteredExecutions', 'activeExecutions', 'isLoading'], 'ergon_executions');
    
    // Add click handlers for agent cards after they're rendered
    component.utils.lifecycle.registerAgentStateEffect(
      component,
      ['filteredAgents'],
      () => {
        // Add click handlers for agent cards
        component.$$('.ergon__agent-card').forEach(card => {
          card.addEventListener('click', () => {
            const agentId = card.getAttribute('data-agent-id');
            openAgentDetailsModal(component, agentId);
          });
        });
      }
    );
  }
  
  // Initialize forms with validation
  function initForms(component) {
    // Create Agent Form
    component.createAgentForm = component.ergonState.createForm({
      formSelector: '#create-agent-form',
      fields: {
        name: {
          initialValue: '',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'Agent name is required';
            }
            if (value.length < 3) {
              return 'Name must be at least 3 characters';
            }
            return null;
          }
        },
        description: {
          initialValue: '',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'Description is required';
            }
            return null;
          }
        },
        type: {
          initialValue: '',
          validate: (value) => {
            if (!value || value === '') {
              return 'Agent type is required';
            }
            return null;
          }
        },
        model: {
          initialValue: '',
          validate: (value) => {
            if (!value || value === '') {
              return 'Model is required';
            }
            return null;
          }
        },
        temperature: {
          initialValue: 0.7,
          validate: (value) => null
        },
        tools: {
          initialValue: [],
          validate: (value) => null
        }
      }
    }, async (values) => {
      try {
        // Show loading state
        showNotification(component, 'Creating agent...', 'info');
        
        // Create agent data
        const agentData = {
          name: values.name,
          description: values.description,
          type: values.type,
          model_name: values.model,
          temperature: values.temperature,
          tools: values.tools
        };
        
        // Create agent via service
        const agent = await component.ergonState.getAgent();
        
        // Show success notification
        showNotification(component, 'Agent created successfully', 'success');
        
        // Close modal
        closeModal(component, 'createAgent');
        
        // Refresh agent list
        loadAgentData(component, { bypassCache: true });
        
        return agent;
      } catch (error) {
        showNotification(component, `Error creating agent: ${error.message}`, 'error');
        throw error;
      }
    });
    
    // Run Agent Form
    component.runAgentForm = component.ergonState.createForm({
      formSelector: '#run-agent-form',
      fields: {
        input: {
          initialValue: '',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'Input is required';
            }
            return null;
          }
        },
        streaming: {
          initialValue: true,
          validate: (value) => null
        }
      }
    }, async (values) => {
      try {
        // Get agent ID from modal state
        const { agentId } = component.state.getLocal('modals').runAgent;
        
        if (!agentId) {
          throw new Error('No agent selected');
        }
        
        // Show loading state
        showNotification(component, 'Running agent...', 'info');
        
        // Run agent via service
        const options = {
          input: values.input,
          streaming: values.streaming
        };
        
        const result = await component.ergonState.runAgent(agentId, options);
        
        // Close modal
        closeModal(component, 'runAgent');
        
        // Switch to executions tab
        component.state.setLocal('activeTab', 'executions');
        
        return result;
      } catch (error) {
        showNotification(component, `Error running agent: ${error.message}`, 'error');
        throw error;
      }
    });
    
    // Settings Form
    component.settingsForm = component.ergonState.createForm({
      formSelector: '#settings-form',
      fields: {
        defaultModel: {
          initialValue: '',
          validate: (value) => null
        },
        autoRefresh: {
          initialValue: 30,
          validate: (value) => {
            if (value < 0) {
              return 'Value must be 0 or higher';
            }
            return null;
          }
        },
        defaultTemperature: {
          initialValue: 0.7,
          validate: (value) => null
        },
        compactMode: {
          initialValue: false,
          validate: (value) => null
        },
        showExecutionDetails: {
          initialValue: true,
          validate: (value) => null
        },
        showAgentDetails: {
          initialValue: true,
          validate: (value) => null
        },
        developerMode: {
          initialValue: false,
          validate: (value) => null
        }
      }
    }, async (values) => {
      try {
        // Show loading state
        showNotification(component, 'Saving settings...', 'info');
        
        // Prepare settings update
        const settingsUpdate = {
          defaultModel: values.defaultModel,
          autoRefreshInterval: parseInt(values.autoRefresh, 10),
          defaultTemperature: parseFloat(values.defaultTemperature),
          developerMode: values.developerMode,
          ui: {
            compactMode: values.compactMode,
            showExecutionDetails: values.showExecutionDetails,
            showAgentDetails: values.showAgentDetails
          }
        };
        
        // Update settings
        const updatedSettings = await component.ergonState.updateSettings(settingsUpdate);
        
        // Show success notification
        showNotification(component, 'Settings saved successfully', 'success');
        
        // Close modal
        closeModal(component, 'settings');
        
        return updatedSettings;
      } catch (error) {
        showNotification(component, `Error saving settings: ${error.message}`, 'error');
        throw error;
      }
    });
    
    // Form input event handlers
    component.$('#agent-temperature').addEventListener('input', (e) => {
      component.$('#agent-temperature-value').textContent = e.target.value;
    });
    
    component.$('#default-temperature').addEventListener('input', (e) => {
      component.$('#default-temperature-value').textContent = e.target.value;
    });
  }
  
  // Load initial data
  function loadInitialData(component) {
    // Set component as ready
    component.state.setLocal('componentReady', true);
    
    // Load agent data
    loadAgentData(component);
    
    // Load agent types
    loadAgentTypes(component);
    
    // Load settings
    loadSettings(component);
  }
  
  // Load agent data from service
  async function loadAgentData(component, options = {}) {
    try {
      if (!window.tektonUI.ergonService) {
        throw new Error('Ergon service not available');
      }
      
      // Fetch agents via service
      const agents = await window.tektonUI.ergonService.fetchAgents(options);
      
      return agents;
    } catch (error) {
      showNotification(component, `Error loading agents: ${error.message}`, 'error');
      return [];
    }
  }
  
  // Load agent types from service
  async function loadAgentTypes(component) {
    try {
      if (!window.tektonUI.ergonService) {
        throw new Error('Ergon service not available');
      }
      
      // Fetch agent types
      const types = await window.tektonUI.ergonService.fetchAgentTypes();
      
      // Populate agent type dropdowns
      populateAgentTypeDropdowns(component, types);
      
      return types;
    } catch (error) {
      showNotification(component, `Error loading agent types: ${error.message}`, 'error');
      return [];
    }
  }
  
  // Load settings from service
  async function loadSettings(component) {
    try {
      if (!window.tektonUI.ergonService) {
        throw new Error('Ergon service not available');
      }
      
      // Fetch settings
      const settings = await window.tektonUI.ergonService.fetchSettings();
      
      // Update settings form with values
      updateSettingsForm(component, settings);
      
      return settings;
    } catch (error) {
      showNotification(component, `Error loading settings: ${error.message}`, 'error');
      return null;
    }
  }
  
  // Populate agent type dropdowns
  function populateAgentTypeDropdowns(component, types) {
    if (!types || !types.length) {
      return;
    }
    
    // Filter dropdown
    const typeFilter = component.elements.agentTypeFilter;
    const currentTypeValue = typeFilter.value;
    
    // Clear existing options except "All Types"
    while (typeFilter.options.length > 1) {
      typeFilter.remove(1);
    }
    
    // Add agent types
    types.forEach(type => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = type.name;
      typeFilter.appendChild(option);
    });
    
    // Restore selected value if it still exists
    if (currentTypeValue && currentTypeValue !== 'all') {
      const exists = Array.from(typeFilter.options).some(option => option.value === currentTypeValue);
      if (exists) {
        typeFilter.value = currentTypeValue;
      }
    }
    
    // Create agent form dropdown
    const typeSelect = component.$('#agent-type');
    if (typeSelect) {
      // Clear existing options
      typeSelect.innerHTML = '';
      
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select agent type';
      typeSelect.appendChild(defaultOption);
      
      // Add agent types
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        typeSelect.appendChild(option);
      });
    }
  }
  
  // Update settings form with values
  function updateSettingsForm(component, settings) {
    if (!settings) {
      return;
    }
    
    // Set form values if settings are loaded
    component.$('#default-model').value = settings.defaultModel || '';
    component.$('#auto-refresh').value = settings.autoRefreshInterval || 30;
    component.$('#default-temperature').value = settings.defaultTemperature || 0.7;
    component.$('#default-temperature-value').textContent = settings.defaultTemperature || 0.7;
    component.$('#compact-mode').checked = settings.ui?.compactMode || false;
    component.$('#show-execution-details').checked = settings.ui?.showExecutionDetails !== false;
    component.$('#show-agent-details').checked = settings.ui?.showAgentDetails !== false;
    component.$('#developer-mode').checked = settings.developerMode || false;
  }
  
  // Update active tab based on state
  function updateActiveTab(state) {
    const activeTab = state.activeTab || 'agents';
    
    // Update tab buttons
    component.elements.tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === activeTab) {
        tab.classList.add('ergon__tab--active');
      } else {
        tab.classList.remove('ergon__tab--active');
      }
    });
    
    // Update tab panels
    component.elements.tabPanels.forEach(panel => {
      if (panel.getAttribute('data-panel') === activeTab) {
        panel.classList.add('ergon__tab-panel--active');
      } else {
        panel.classList.remove('ergon__tab-panel--active');
      }
    });
  }
  
  // Update modals based on state
  function updateModals(state) {
    const modals = state.modals || {};
    
    // Agent details modal
    if (modals.agentDetails) {
      const modal = component.elements.agentDetailsModal;
      if (modals.agentDetails.isOpen) {
        openModal(modal);
        updateAgentDetailsModal(component, modals.agentDetails.agentId);
      } else {
        closeModal(modal);
      }
    }
    
    // Create agent modal
    if (modals.createAgent) {
      const modal = component.elements.createAgentModal;
      if (modals.createAgent.isOpen) {
        openModal(modal);
      } else {
        closeModal(modal);
      }
    }
    
    // Run agent modal
    if (modals.runAgent) {
      const modal = component.elements.runAgentModal;
      if (modals.runAgent.isOpen) {
        openModal(modal);
        updateRunAgentModal(component, modals.runAgent.agentId);
      } else {
        closeModal(modal);
      }
    }
    
    // Settings modal
    if (modals.settings) {
      const modal = component.elements.settingsModal;
      if (modals.settings.isOpen) {
        openModal(modal);
      } else {
        closeModal(modal);
      }
    }
  }
  
  // Open modal (DOM operation)
  function openModal(modal) {
    if (modal) {
      modal.classList.add('ergon__modal--active');
    }
  }
  
  // Close modal (DOM operation)
  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('ergon__modal--active');
    }
  }
  
  // Open agent details modal (state operation)
  function openAgentDetailsModal(component, agentId) {
    // Update local state
    const modals = component.state.getLocal('modals') || {};
    
    component.state.setLocal('modals', {
      ...modals,
      agentDetails: {
        isOpen: true,
        agentId
      }
    });
  }
  
  // Update agent details modal with agent data
  function updateAgentDetailsModal(component, agentId) {
    if (!agentId) return;
    
    const agent = component.ergonState.getAgentById(agentId);
    if (!agent) return;
    
    // Set modal title
    component.$('#agent-details-title').textContent = agent.name;
    
    // Set modal body
    component.$('#agent-details-body').innerHTML = `
      <div class="ergon__agent-details">
        <div class="ergon__agent-detail-item">
          <h4>Description</h4>
          <p>${escapeHtml(agent.description || 'No description')}</p>
        </div>
        <div class="ergon__agent-detail-item">
          <h4>Type</h4>
          <p>${escapeHtml(agent.type || 'Unknown')}</p>
        </div>
        <div class="ergon__agent-detail-item">
          <h4>Model</h4>
          <p>${escapeHtml(agent.model_name || 'Default model')}</p>
        </div>
        <div class="ergon__agent-detail-item">
          <h4>Status</h4>
          <p>
            <span class="ergon__status-dot ergon__status-dot--${agent.status || 'inactive'}"></span>
            ${escapeHtml(agent.status || 'inactive')}
          </p>
        </div>
        <div class="ergon__agent-detail-item">
          <h4>Created</h4>
          <p>${formatDate(agent.created_at)}</p>
        </div>
        ${agent.updated_at ? `
          <div class="ergon__agent-detail-item">
            <h4>Last Updated</h4>
            <p>${formatDate(agent.updated_at)}</p>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Open create agent modal
  function openCreateAgentModal(component) {
    // Reset form
    component.createAgentForm.reset();
    
    // Update local state
    const modals = component.state.getLocal('modals') || {};
    
    component.state.setLocal('modals', {
      ...modals,
      createAgent: {
        isOpen: true
      }
    });
  }
  
  // Open run agent modal
  function openRunAgentModal(component, agentId) {
    // Reset form
    component.runAgentForm.reset();
    
    // Update local state
    const modals = component.state.getLocal('modals') || {};
    
    component.state.setLocal('modals', {
      ...modals,
      runAgent: {
        isOpen: true,
        agentId
      }
    });
  }
  
  // Update run agent modal with agent data
  function updateRunAgentModal(component, agentId) {
    if (!agentId) return;
    
    const agent = component.ergonState.getAgentById(agentId);
    if (!agent) return;
    
    // Set modal title
    component.$('#run-agent-title').textContent = `Run Agent: ${agent.name}`;
  }
  
  // Open settings modal
  function openSettingsModal(component) {
    // Update local state
    const modals = component.state.getLocal('modals') || {};
    
    component.state.setLocal('modals', {
      ...modals,
      settings: {
        isOpen: true
      }
    });
  }
  
  // Close modal (state operation)
  function closeModal(component, modalName) {
    // Update local state
    const modals = component.state.getLocal('modals') || {};
    
    if (modals[modalName]) {
      component.state.setLocal('modals', {
        ...modals,
        [modalName]: {
          ...modals[modalName],
          isOpen: false
        }
      });
    }
  }
  
  // Submit create agent form
  function submitCreateAgentForm(component) {
    component.createAgentForm.submit();
  }
  
  // Submit run agent form
  function submitRunAgentForm(component) {
    component.runAgentForm.submit();
  }
  
  // Save settings
  function saveSettings(component) {
    component.settingsForm.submit();
  }
  
  // Render agent list
  function renderAgentList(state) {
    // This is handled by the reactive UI setup
  }
  
  // Render execution list
  function renderExecutionList(state) {
    // This is handled by the reactive UI setup
  }
  
  // Show notification
  function showNotification(component, message, type = 'info', duration = 5000) {
    const id = `notification-${Date.now()}`;
    const html = `
      <div class="ergon__notification ergon__notification--${type}" id="${id}">
        <div class="ergon__notification-content">
          <h4 class="ergon__notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
          <p class="ergon__notification-message">${escapeHtml(message)}</p>
        </div>
        <button class="ergon__notification-close" data-notification-id="${id}">&times;</button>
      </div>
    `;
    
    component.elements.notificationsContainer.insertAdjacentHTML('beforeend', html);
    
    // Add close button handler
    const closeButton = component.$(`#${id} .ergon__notification-close`);
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        removeNotification(component, id);
      });
    }
    
    // Auto-remove after duration
    setTimeout(() => {
      removeNotification(component, id);
    }, duration);
    
    return id;
  }
  
  // Remove notification
  function removeNotification(component, notificationId) {
    const notification = component.$(`#${notificationId}`);
    if (notification) {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }
  
  // Utility functions
  
  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
      return '';
    }
    
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Format date
  function formatDate(dateString) {
    if (!dateString) {
      return 'Unknown';
    }
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  }
  
  // Format duration in milliseconds to human-readable
  function formatDuration(ms) {
    if (!ms) {
      return 'Unknown';
    }
    
    const seconds = Math.floor(ms / 1000);
    
    if (seconds < 60) {
      return `${seconds} sec`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  // Capitalize first letter
  function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // Debounce function to limit rapid calls
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const later = () => {
        timeout = null;
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
})();