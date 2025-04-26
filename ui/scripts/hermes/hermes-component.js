/**
 * Hermes Component
 * 
 * Provides a UI for interacting with the Hermes message bus and service registry.
 * Implements real-time monitoring of service registrations and message routing.
 */

(function(component) {
    'use strict';
    
    // Component-specific utilities
    const dom = component.utils.dom;
    const notifications = component.utils.notifications;
    const loading = component.utils.loading;
    const lifecycle = component.utils.lifecycle;
    
    // Service reference
    let hermesService = null;
    
    // Initialize state
    const initialState = {
        // UI State
        activeTab: 'registry',
        registryViewMode: 'grid',
        isModalOpen: false,
        modalContent: null,
        isPaused: false,
        
        // Filters
        registrySearch: '',
        registryTypeFilter: 'all',
        messageFilters: {
            types: {
                registration: true,
                heartbeat: true,
                query: true,
                data: true
            },
            components: {}
        },
        historyFilters: {
            search: '',
            types: [],
            components: [],
            startDate: null,
            endDate: null
        },
        
        // Data
        services: [],
        connections: [],
        messages: [],
        selectedService: null,
        selectedConnection: null,
        
        // Settings
        autoRefreshInterval: 10000,
        maxMessageCount: 100
    };
    
    /**
     * Initialize the Hermes component
     */
    function initHermesComponent() {
        console.log('Initializing Hermes component...');
        
        // Connect component to state system
        component.utils.componentState.utils.connect(component, {
            namespace: 'hermes',
            initialState: initialState,
            persist: true, // Persist state between sessions
            persistenceType: 'localStorage',
            excludeFromPersistence: ['messages', 'isModalOpen', 'modalContent'] // Don't persist ephemeral data
        });
        
        // Initialize Hermes service
        initHermesService();
        
        // Set up UI event handlers
        setupEventHandlers();
        
        // Set up state effects
        setupStateEffects();
        
        // Register cleanup function
        component.registerCleanup(cleanupComponent);
        
        console.log('Hermes component initialized');
    }
    
    /**
     * Initialize or get the Hermes service
     */
    function initHermesService() {
        // Check if the service already exists globally
        if (window.tektonUI?.services?.hermesService) {
            hermesService = window.tektonUI.services.hermesService;
            
            // Connect to service now if possible
            connectToHermesService();
        } else {
            // Dynamically load and initialize the service
            const script = document.createElement('script');
            script.src = '/scripts/hermes/hermes-service.js';
            document.head.appendChild(script);
            
            // Create a polling mechanism to wait for service initialization
            const checkServiceInterval = setInterval(() => {
                if (window.tektonUI?.services?.hermesService) {
                    hermesService = window.tektonUI.services.hermesService;
                    clearInterval(checkServiceInterval);
                    
                    // Connect to service when available
                    connectToHermesService();
                }
            }, 100);
            
            // Give up after 5 seconds
            setTimeout(() => {
                if (!window.tektonUI?.services?.hermesService) {
                    clearInterval(checkServiceInterval);
                    notifications.show(component, 'Error', 'Failed to load Hermes service. Some features may not work.', 'error');
                    
                    // Update state to show error
                    component.state.set({
                        'serviceError': 'Failed to load Hermes service'
                    });
                }
            }, 5000);
        }
    }
    
    /**
     * Connect to the Hermes service and set up listeners
     */
    function connectToHermesService() {
        if (!hermesService) return;
        
        // Set auto-refresh interval from state
        const autoRefreshInterval = component.state.get('autoRefreshInterval');
        hermesService.setAutoRefreshInterval(autoRefreshInterval);
        
        // Set up service event listeners
        hermesService.addEventListener('connected', handleServiceConnected);
        hermesService.addEventListener('connectionFailed', handleConnectionFailed);
        hermesService.addEventListener('servicesUpdated', handleServicesUpdated);
        hermesService.addEventListener('connectionsUpdated', handleConnectionsUpdated);
        hermesService.addEventListener('messageReceived', handleMessageReceived);
        hermesService.addEventListener('monitoringStarted', handleMonitoringStarted);
        hermesService.addEventListener('monitoringStopped', handleMonitoringStopped);
        hermesService.addEventListener('pauseStateChanged', handlePauseStateChanged);
        hermesService.addEventListener('error', handleServiceError);
        
        // Connect to service
        hermesService.connect().then(connected => {
            if (connected) {
                // Load initial data
                loadInitialData();
            }
        });
    }
    
    /**
     * Load initial data from Hermes service
     */
    function loadInitialData() {
        if (!hermesService) return;
        
        // Show loading indicator
        loading.show(component, 'Loading services...');
        
        // Get registered services
        hermesService.getRegisteredServices()
            .then(services => {
                // Update state with services
                component.state.set({
                    'services': services
                });
                
                // Get connections
                return hermesService.getConnections();
            })
            .then(connections => {
                // Update state with connections
                component.state.set({
                    'connections': connections
                });
                
                // Hide loading indicator
                loading.hide(component);
                
                // Start message monitoring if we're on the messaging tab
                if (component.state.get('activeTab') === 'messaging') {
                    hermesService.startMessageMonitoring();
                }
            })
            .catch(error => {
                // Hide loading indicator
                loading.hide(component);
                
                // Show error
                notifications.show(component, 'Error', `Failed to load data: ${error.message}`, 'error');
            });
    }
    
    /**
     * Set up UI event handlers
     */
    function setupEventHandlers() {
        // Tab switching
        component.on('click', '.hermes-tabs__button', function(event) {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
        
        // Registry view mode toggle
        component.on('click', '.hermes-view-controls__button', function(event) {
            const viewMode = this.getAttribute('data-view');
            switchRegistryViewMode(viewMode);
        });
        
        // Registry search input
        const registrySearch = component.$('#registry-search');
        if (registrySearch) {
            registrySearch.addEventListener('input', (event) => {
                component.state.set('registrySearch', event.target.value);
            });
            
            // Set initial value from state
            registrySearch.value = component.state.get('registrySearch') || '';
        }
        
        // Filter type selector
        const filterType = component.$('#filter-type');
        if (filterType) {
            filterType.addEventListener('change', (event) => {
                component.state.set('registryTypeFilter', event.target.value);
            });
            
            // Set initial value from state
            filterType.value = component.state.get('registryTypeFilter') || 'all';
        }
        
        // Message filter checkboxes
        component.on('change', '#filter-registration, #filter-heartbeat, #filter-query, #filter-data', function(event) {
            const filterType = this.id.replace('filter-', '');
            const currentFilters = component.state.get('messageFilters');
            
            currentFilters.types[filterType] = this.checked;
            component.state.set('messageFilters', currentFilters);
        });
        
        // Refresh button
        const refreshButton = component.$('#refresh-registry');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                refreshData();
            });
        }
        
        // Auto-refresh interval selector
        const autoRefreshInterval = component.$('#auto-refresh-interval');
        if (autoRefreshInterval) {
            autoRefreshInterval.addEventListener('change', (event) => {
                const interval = parseInt(event.target.value, 10);
                setAutoRefreshInterval(interval);
            });
            
            // Set initial value from state
            autoRefreshInterval.value = component.state.get('autoRefreshInterval') || '10000';
        }
        
        // Pause/Resume message stream
        const pauseButton = component.$('#pause-messages');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                const isPaused = component.state.get('isPaused');
                toggleMessagePause(!isPaused);
            });
        }
        
        // Clear messages button
        const clearMessagesButton = component.$('#clear-messages');
        if (clearMessagesButton) {
            clearMessagesButton.addEventListener('click', () => {
                component.state.set('messages', []);
            });
        }
        
        // Clear history button
        const clearHistoryButton = component.$('#clear-history');
        if (clearHistoryButton) {
            clearHistoryButton.addEventListener('click', () => {
                if (hermesService) {
                    showConfirmationDialog(
                        'Clear Message History',
                        'Are you sure you want to clear all message history? This cannot be undone.',
                        () => {
                            hermesService.clearMessageHistory();
                        }
                    );
                }
            });
        }
        
        // Export history button
        const exportHistoryButton = component.$('#export-history');
        if (exportHistoryButton) {
            exportHistoryButton.addEventListener('click', () => {
                exportMessageHistory();
            });
        }
        
        // Add connection button
        const addConnectionButton = component.$('#add-connection');
        if (addConnectionButton) {
            addConnectionButton.addEventListener('click', () => {
                showAddConnectionModal();
            });
        }
        
        // History search
        const historySearch = component.$('#history-search');
        if (historySearch) {
            historySearch.addEventListener('input', (event) => {
                const historyFilters = component.state.get('historyFilters');
                historyFilters.search = event.target.value;
                component.state.set('historyFilters', historyFilters);
            });
        }
        
        // History type filter
        const historyFilter = component.$('#history-filter');
        if (historyFilter) {
            historyFilter.addEventListener('change', (event) => {
                const historyFilters = component.state.get('historyFilters');
                
                if (event.target.value === 'all') {
                    historyFilters.types = [];
                } else {
                    historyFilters.types = [event.target.value];
                }
                
                component.state.set('historyFilters', historyFilters);
            });
        }
        
        // Date filters
        const startDateInput = component.$('#history-start-date');
        const endDateInput = component.$('#history-end-date');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', (event) => {
                const historyFilters = component.state.get('historyFilters');
                historyFilters.startDate = event.target.value ? event.target.value : null;
                component.state.set('historyFilters', historyFilters);
            });
        }
        
        if (endDateInput) {
            endDateInput.addEventListener('change', (event) => {
                const historyFilters = component.state.get('historyFilters');
                historyFilters.endDate = event.target.value ? event.target.value : null;
                component.state.set('historyFilters', historyFilters);
            });
        }
        
        // Modal close buttons
        component.on('click', '#close-modal, #modal-cancel', function(event) {
            closeModal();
        });
        
        // Close modal when clicking overlay
        component.on('click', '.hermes-modal__overlay', function(event) {
            closeModal();
        });
    }
    
    /**
     * Set up state effects
     */
    function setupStateEffects() {
        // Handle tab changes
        lifecycle.registerStateEffect(component, 
            ['activeTab'], 
            (state) => {
                updateActiveTab(state.activeTab);
            },
            { runImmediately: true }
        );
        
        // Handle registry view mode changes
        lifecycle.registerStateEffect(component, 
            ['registryViewMode'], 
            (state) => {
                updateRegistryViewMode(state.registryViewMode);
            },
            { runImmediately: true }
        );
        
        // Handle services updates
        lifecycle.registerStateEffect(component, 
            ['services', 'registrySearch', 'registryTypeFilter'], 
            (state) => {
                renderServiceRegistry(
                    state.services, 
                    state.registrySearch, 
                    state.registryTypeFilter
                );
            }
        );
        
        // Handle connection updates
        lifecycle.registerStateEffect(component, 
            ['connections'], 
            (state) => {
                renderConnectionsGraph(state.connections);
            }
        );
        
        // Handle message updates
        lifecycle.registerStateEffect(component, 
            ['messages', 'messageFilters'], 
            (state) => {
                renderMessages(state.messages, state.messageFilters);
            }
        );
        
        // Handle message pause state changes
        lifecycle.registerStateEffect(component, 
            ['isPaused'], 
            (state) => {
                updatePauseButton(state.isPaused);
            }
        );
        
        // Handle modal state changes
        lifecycle.registerStateEffect(component, 
            ['isModalOpen', 'modalContent'], 
            (state) => {
                updateModal(state.isModalOpen, state.modalContent);
            }
        );
        
        // Handle history filter changes
        lifecycle.registerStateEffect(component, 
            ['historyFilters'], 
            (state) => {
                renderHistoryTable(state.historyFilters);
            }
        );
    }
    
    /**
     * Switch to a different tab
     * @param {string} tabId - Tab ID to switch to
     */
    function switchTab(tabId) {
        // Update state with new active tab
        component.state.set('activeTab', tabId);
        
        // Start or stop message monitoring based on active tab
        if (tabId === 'messaging' && hermesService) {
            hermesService.startMessageMonitoring();
        } else if (tabId !== 'messaging' && hermesService && hermesService.monitoringMessages) {
            hermesService.stopMessageMonitoring();
        }
        
        // Load history data if on history tab
        if (tabId === 'history') {
            renderHistoryTable(component.state.get('historyFilters'));
        }
    }
    
    /**
     * Update active tab in the UI
     * @param {string} tabId - Active tab ID
     */
    function updateActiveTab(tabId) {
        // Update tab buttons
        component.$$('.hermes-tabs__button').forEach(button => {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('hermes-tabs__button--active');
            } else {
                button.classList.remove('hermes-tabs__button--active');
            }
        });
        
        // Update tab panels
        component.$$('.hermes-tab-panel').forEach(panel => {
            if (panel.getAttribute('data-panel') === tabId) {
                panel.classList.add('hermes-tab-panel--active');
            } else {
                panel.classList.remove('hermes-tab-panel--active');
            }
        });
    }
    
    /**
     * Switch registry view mode
     * @param {string} viewMode - View mode ('grid' or 'list')
     */
    function switchRegistryViewMode(viewMode) {
        component.state.set('registryViewMode', viewMode);
    }
    
    /**
     * Update registry view mode in the UI
     * @param {string} viewMode - View mode ('grid' or 'list')
     */
    function updateRegistryViewMode(viewMode) {
        // Update view mode buttons
        component.$$('.hermes-view-controls__button').forEach(button => {
            if (button.getAttribute('data-view') === viewMode) {
                button.classList.add('hermes-view-controls__button--active');
            } else {
                button.classList.remove('hermes-view-controls__button--active');
            }
        });
        
        // Update view containers
        const gridView = component.$('#registry-grid-view');
        const listView = component.$('#registry-list-view');
        
        if (gridView && listView) {
            if (viewMode === 'grid') {
                gridView.style.display = 'grid';
                listView.style.display = 'none';
            } else {
                gridView.style.display = 'none';
                listView.style.display = 'block';
            }
        }
    }
    
    /**
     * Refresh data from the Hermes service
     */
    function refreshData() {
        if (!hermesService) return;
        
        // Show loading indicator
        loading.show(component, 'Refreshing data...');
        
        // Refresh services and connections
        Promise.all([
            hermesService.refreshRegistry(),
            hermesService.getConnections()
        ])
        .then(([services, connections]) => {
            // Hide loading indicator
            loading.hide(component);
            
            // Show success notification
            notifications.show(component, 'Data Refreshed', 'Hermes data refreshed successfully', 'success');
        })
        .catch(error => {
            // Hide loading indicator
            loading.hide(component);
            
            // Show error notification
            notifications.show(component, 'Error', `Failed to refresh data: ${error.message}`, 'error');
        });
    }
    
    /**
     * Set auto-refresh interval
     * @param {number} interval - Interval in milliseconds
     */
    function setAutoRefreshInterval(interval) {
        // Update state
        component.state.set('autoRefreshInterval', interval);
        
        // Update service if available
        if (hermesService) {
            hermesService.setAutoRefreshInterval(interval);
        }
    }
    
    /**
     * Toggle message pause state
     * @param {boolean} paused - Whether messages should be paused
     */
    function toggleMessagePause(paused) {
        // Update state
        component.state.set('isPaused', paused);
        
        // Update service if available
        if (hermesService) {
            hermesService.setPaused(paused);
        }
    }
    
    /**
     * Update pause button state
     * @param {boolean} isPaused - Whether messages are paused
     */
    function updatePauseButton(isPaused) {
        const pauseButton = component.$('#pause-messages');
        const pauseIcon = component.$('#pause-icon');
        
        if (pauseButton && pauseIcon) {
            if (isPaused) {
                pauseButton.textContent = ' Resume';
                pauseIcon.textContent = '▶️';
                pauseButton.prepend(pauseIcon);
            } else {
                pauseButton.textContent = ' Pause';
                pauseIcon.textContent = '⏸️';
                pauseButton.prepend(pauseIcon);
            }
        }
    }
    
    /**
     * Render the service registry
     * @param {Array} services - List of services
     * @param {string} searchTerm - Search filter term
     * @param {string} typeFilter - Type filter
     */
    function renderServiceRegistry(services, searchTerm, typeFilter) {
        // Filter services based on search term and type filter
        const filteredServices = services.filter(service => {
            // Apply search filter
            const searchMatch = !searchTerm || 
                service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                service.component_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Apply type filter
            const typeMatch = typeFilter === 'all' || 
                service.component_type === typeFilter;
            
            return searchMatch && typeMatch;
        });
        
        // Render grid view
        renderGridView(filteredServices);
        
        // Render list view
        renderListView(filteredServices);
        
        // Update component filters for message monitoring
        updateComponentFilters(services);
    }
    
    /**
     * Render grid view of services
     * @param {Array} services - List of services
     */
    function renderGridView(services) {
        const gridView = component.$('#registry-grid-view');
        
        if (!gridView) return;
        
        // Clear current content
        gridView.innerHTML = '';
        
        if (services.length === 0) {
            gridView.innerHTML = `
                <div class="hermes-registry__loading">
                    No services found matching the current filters.
                </div>
            `;
            return;
        }
        
        // Create card for each service
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'hermes-card';
            card.setAttribute('data-component-id', service.component_id);
            
            // Determine status class
            let statusClass = 'hermes-card__status';
            if (service.healthy === true) {
                statusClass += ' hermes-card__status--online';
            } else if (service.healthy === false) {
                statusClass += ' hermes-card__status--offline';
            }
            
            // Format capabilities as comma-separated list or as tags
            let capabilitiesHtml = '';
            if (service.capabilities && service.capabilities.length > 0) {
                capabilitiesHtml = service.capabilities.map(capability => 
                    `<span class="hermes-card__capability">${capability}</span>`
                ).join('');
            }
            
            // Create card HTML
            card.innerHTML = `
                <div class="hermes-card__header">
                    <h3 class="hermes-card__title">
                        <span class="${statusClass}"></span>
                        ${service.name || service.component_id}
                    </h3>
                </div>
                <div class="hermes-card__body">
                    <div class="hermes-card__info">
                        <span class="hermes-card__label">ID:</span>
                        <span class="hermes-card__value">${service.component_id}</span>
                    </div>
                    <div class="hermes-card__info">
                        <span class="hermes-card__label">Type:</span>
                        <span class="hermes-card__value">${service.component_type || 'Unknown'}</span>
                    </div>
                    <div class="hermes-card__info">
                        <span class="hermes-card__label">Status:</span>
                        <span class="hermes-card__value">${service.healthy ? 'Online' : (service.healthy === false ? 'Offline' : 'Unknown')}</span>
                    </div>
                    <div class="hermes-card__capabilities">
                        ${capabilitiesHtml}
                    </div>
                </div>
                <div class="hermes-card__footer">
                    <button class="hermes-button hermes-button--small view-details" data-id="${service.component_id}">Details</button>
                </div>
            `;
            
            // Add event listener for view details button
            const detailsButton = card.querySelector('.view-details');
            if (detailsButton) {
                detailsButton.addEventListener('click', () => {
                    viewServiceDetails(service.component_id);
                });
            }
            
            gridView.appendChild(card);
        });
    }
    
    /**
     * Render list view of services
     * @param {Array} services - List of services
     */
    function renderListView(services) {
        const tableBody = component.$('#registry-table-body');
        
        if (!tableBody) return;
        
        // Clear current content
        tableBody.innerHTML = '';
        
        if (services.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 20px;">
                    No services found matching the current filters.
                </td>
            `;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Create row for each service
        services.forEach(service => {
            const row = document.createElement('tr');
            
            // Format status indicator
            let statusHtml = '';
            if (service.healthy === true) {
                statusHtml = '<span class="hermes-card__status hermes-card__status--online" title="Online"></span>';
            } else if (service.healthy === false) {
                statusHtml = '<span class="hermes-card__status hermes-card__status--offline" title="Offline"></span>';
            } else {
                statusHtml = '<span class="hermes-card__status" title="Unknown"></span>';
            }
            
            // Format capabilities with limited display
            let capabilitiesText = 'None';
            if (service.capabilities && service.capabilities.length > 0) {
                if (service.capabilities.length <= 3) {
                    capabilitiesText = service.capabilities.join(', ');
                } else {
                    capabilitiesText = `${service.capabilities.slice(0, 3).join(', ')} +${service.capabilities.length - 3} more`;
                }
            }
            
            // Create row HTML
            row.innerHTML = `
                <td>${statusHtml}</td>
                <td>${service.name || service.component_id}</td>
                <td>${service.component_type || 'Unknown'}</td>
                <td title="${service.endpoint || ''}">${truncateText(service.endpoint || 'N/A', 40)}</td>
                <td title="${service.capabilities ? service.capabilities.join(', ') : ''}">${capabilitiesText}</td>
                <td>
                    <button class="hermes-button hermes-button--small view-details" data-id="${service.component_id}">Details</button>
                </td>
            `;
            
            // Add event listener for view details button
            const detailsButton = row.querySelector('.view-details');
            if (detailsButton) {
                detailsButton.addEventListener('click', () => {
                    viewServiceDetails(service.component_id);
                });
            }
            
            tableBody.appendChild(row);
        });
    }
    
    /**
     * View details for a specific service
     * @param {string} componentId - Component ID
     */
    function viewServiceDetails(componentId) {
        if (!hermesService) return;
        
        // Show loading indicator
        loading.show(component, 'Loading service details...');
        
        // Get service details
        hermesService.getServiceDetails(componentId)
            .then(service => {
                // Hide loading indicator
                loading.hide(component);
                
                if (!service) {
                    notifications.show(component, 'Error', 'Service details not found', 'error');
                    return;
                }
                
                // Show details in modal
                showServiceDetailsModal(service);
            })
            .catch(error => {
                // Hide loading indicator
                loading.hide(component);
                
                // Show error
                notifications.show(component, 'Error', `Failed to load service details: ${error.message}`, 'error');
            });
    }
    
    /**
     * Show service details in a modal
     * @param {Object} service - Service details
     */
    function showServiceDetailsModal(service) {
        // Format capabilities as a list
        let capabilitiesList = '<p>None</p>';
        if (service.capabilities && service.capabilities.length > 0) {
            capabilitiesList = `
                <ul class="hermes-modal__list">
                    ${service.capabilities.map(capability => `<li>${capability}</li>`).join('')}
                </ul>
            `;
        }
        
        // Format metadata for display
        let metadataHtml = '<p>None</p>';
        if (service.metadata && Object.keys(service.metadata).length > 0) {
            metadataHtml = `<div class="hermes-json-viewer">${formatJsonForDisplay(service.metadata)}</div>`;
        }
        
        // Determine status class and text
        let statusClass = 'hermes-card__status';
        let statusText = 'Unknown';
        if (service.healthy === true) {
            statusClass += ' hermes-card__status--online';
            statusText = 'Online';
        } else if (service.healthy === false) {
            statusClass += ' hermes-card__status--offline';
            statusText = 'Offline';
        }
        
        // Create modal content
        const modalContent = {
            title: `Service: ${service.name || service.component_id}`,
            body: `
                <div class="hermes-modal__service-details">
                    <div class="hermes-modal__section">
                        <h4 class="hermes-modal__section-title">Basic Information</h4>
                        <div class="hermes-modal__info-grid">
                            <div class="hermes-modal__info-label">Component ID:</div>
                            <div class="hermes-modal__info-value">${service.component_id}</div>
                            
                            <div class="hermes-modal__info-label">Name:</div>
                            <div class="hermes-modal__info-value">${service.name || 'N/A'}</div>
                            
                            <div class="hermes-modal__info-label">Type:</div>
                            <div class="hermes-modal__info-value">${service.component_type || 'Unknown'}</div>
                            
                            <div class="hermes-modal__info-label">Status:</div>
                            <div class="hermes-modal__info-value">
                                <span class="${statusClass}"></span> ${statusText}
                            </div>
                            
                            <div class="hermes-modal__info-label">Version:</div>
                            <div class="hermes-modal__info-value">${service.version || 'N/A'}</div>
                            
                            <div class="hermes-modal__info-label">Endpoint:</div>
                            <div class="hermes-modal__info-value">${service.endpoint || 'N/A'}</div>
                            
                            <div class="hermes-modal__info-label">Last Heartbeat:</div>
                            <div class="hermes-modal__info-value">${service.last_heartbeat ? new Date(service.last_heartbeat).toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div class="hermes-modal__section">
                        <h4 class="hermes-modal__section-title">Capabilities</h4>
                        ${capabilitiesList}
                    </div>
                    
                    <div class="hermes-modal__section">
                        <h4 class="hermes-modal__section-title">Metadata</h4>
                        ${metadataHtml}
                    </div>
                </div>
            `,
            actionButton: {
                label: 'View Connections',
                callback: () => {
                    // Switch to connections tab and highlight this component
                    component.state.set({
                        'activeTab': 'connections',
                        'selectedService': service.component_id
                    });
                    closeModal();
                }
            }
        };
        
        // Show the modal
        showModal(modalContent);
    }
    
    /**
     * Show modal for adding a new connection
     */
    function showAddConnectionModal() {
        const services = component.state.get('services');
        
        // Create options for source and target selects
        const serviceOptions = services.map(service => 
            `<option value="${service.component_id}">${service.name || service.component_id}</option>`
        ).join('');
        
        // Create modal content
        const modalContent = {
            title: 'Add Connection',
            body: `
                <div class="hermes-modal__form">
                    <div class="hermes-modal__form-group">
                        <label class="hermes-modal__label">Source Component:</label>
                        <select id="connection-source" class="hermes-select">
                            <option value="">Select source component...</option>
                            ${serviceOptions}
                        </select>
                    </div>
                    
                    <div class="hermes-modal__form-group">
                        <label class="hermes-modal__label">Target Component:</label>
                        <select id="connection-target" class="hermes-select">
                            <option value="">Select target component...</option>
                            ${serviceOptions}
                        </select>
                    </div>
                    
                    <div class="hermes-modal__form-group">
                        <label class="hermes-modal__label">Connection Type:</label>
                        <select id="connection-type" class="hermes-select">
                            <option value="default">Default</option>
                            <option value="message">Messaging</option>
                            <option value="data">Data</option>
                            <option value="control">Control</option>
                        </select>
                    </div>
                    
                    <div class="hermes-modal__form-group">
                        <label class="hermes-modal__label">Description:</label>
                        <input type="text" id="connection-description" class="hermes-input" placeholder="Optional description">
                    </div>
                </div>
            `,
            actionButton: {
                label: 'Create Connection',
                callback: () => {
                    createConnection();
                }
            }
        };
        
        // Show the modal
        showModal(modalContent);
    }
    
    /**
     * Create a new connection between components
     */
    function createConnection() {
        if (!hermesService) return;
        
        // Get form values
        const sourceId = component.$('#connection-source').value;
        const targetId = component.$('#connection-target').value;
        const type = component.$('#connection-type').value;
        const description = component.$('#connection-description').value;
        
        // Validate inputs
        if (!sourceId || !targetId) {
            notifications.show(component, 'Error', 'Source and target components are required', 'error');
            return;
        }
        
        if (sourceId === targetId) {
            notifications.show(component, 'Error', 'Source and target cannot be the same component', 'error');
            return;
        }
        
        // Show loading indicator
        loading.show(component, 'Creating connection...');
        
        // Create connection
        hermesService.addConnection(sourceId, targetId, {
            type: type || 'default',
            metadata: {
                description: description || 'User-created connection'
            }
        })
        .then(connection => {
            // Hide loading indicator
            loading.hide(component);
            
            if (connection) {
                // Show success notification
                notifications.show(component, 'Connection Created', 'Connection created successfully', 'success');
                
                // Close modal
                closeModal();
            } else {
                notifications.show(component, 'Error', 'Failed to create connection', 'error');
            }
        })
        .catch(error => {
            // Hide loading indicator
            loading.hide(component);
            
            // Show error
            notifications.show(component, 'Error', `Failed to create connection: ${error.message}`, 'error');
        });
    }
    
    /**
     * Render the connections graph
     * @param {Array} connections - List of connections
     */
    function renderConnectionsGraph(connections) {
        const graphContainer = component.$('#connection-graph');
        
        if (!graphContainer) return;
        
        // If we have no connections, show a message
        if (!connections || connections.length === 0) {
            graphContainer.innerHTML = `
                <div class="hermes-connections__placeholder">
                    <p>No connections found. Click "Add Connection" to create a new connection.</p>
                </div>
            `;
            return;
        }
        
        // In a real implementation, we would use a visualization library like D3.js
        // For the prototype, just show a simple representation
        graphContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p>Connection graph visualization would be rendered here.</p>
                <p>Found ${connections.length} connections between components.</p>
                <p><em>This is a placeholder for a proper graph visualization.</em></p>
            </div>
        `;
        
        // In a full implementation, we would render a force-directed graph here
        // with nodes for each component and edges for connections
    }
    
    /**
     * Update component filters for message monitoring
     * @param {Array} services - List of services
     */
    function updateComponentFilters(services) {
        const filterContainer = component.$('#component-filters');
        
        if (!filterContainer) return;
        
        // Clear current filters
        filterContainer.innerHTML = '';
        
        if (!services || services.length === 0) {
            filterContainer.innerHTML = `
                <div class="hermes-component-filters__loading">
                    No components available for filtering.
                </div>
            `;
            return;
        }
        
        // Get current message filters
        const messageFilters = component.state.get('messageFilters');
        
        // Create a checkbox for each service
        services.forEach(service => {
            const componentId = service.component_id;
            const checked = messageFilters.components[componentId] !== false; // Default to true if not set
            
            const checkbox = document.createElement('label');
            checkbox.className = 'hermes-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" data-component-id="${componentId}" ${checked ? 'checked' : ''}>
                <span class="hermes-checkbox__label">${service.name || componentId}</span>
            `;
            
            // Add event listener for checkbox
            const input = checkbox.querySelector('input');
            input.addEventListener('change', () => {
                const currentFilters = component.state.get('messageFilters');
                currentFilters.components[componentId] = input.checked;
                component.state.set('messageFilters', currentFilters);
            });
            
            filterContainer.appendChild(checkbox);
        });
        
        // Add "Select All" and "Clear All" buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'hermes-filter-buttons';
        buttonContainer.innerHTML = `
            <button class="hermes-button hermes-button--small" id="select-all-components">Select All</button>
            <button class="hermes-button hermes-button--small" id="clear-all-components">Clear All</button>
        `;
        
        // Add event listeners for buttons
        const selectAllButton = buttonContainer.querySelector('#select-all-components');
        const clearAllButton = buttonContainer.querySelector('#clear-all-components');
        
        selectAllButton.addEventListener('click', () => {
            const currentFilters = component.state.get('messageFilters');
            services.forEach(service => {
                currentFilters.components[service.component_id] = true;
            });
            component.state.set('messageFilters', currentFilters);
            
            // Update checkboxes
            filterContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
        });
        
        clearAllButton.addEventListener('click', () => {
            const currentFilters = component.state.get('messageFilters');
            services.forEach(service => {
                currentFilters.components[service.component_id] = false;
            });
            component.state.set('messageFilters', currentFilters);
            
            // Update checkboxes
            filterContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
        
        filterContainer.appendChild(buttonContainer);
    }
    
    /**
     * Render messages in the message container
     * @param {Array} messages - List of messages
     * @param {Object} filters - Message filters
     */
    function renderMessages(messages, filters) {
        const messageContainer = component.$('#message-container');
        
        if (!messageContainer) return;
        
        // Check if we have messages
        if (!messages || messages.length === 0) {
            messageContainer.innerHTML = `
                <div class="hermes-message-container__placeholder">
                    Messages will appear here. Start a component that uses Hermes to see messages.
                </div>
            `;
            return;
        }
        
        // Filter messages
        const filteredMessages = messages.filter(message => {
            // Filter by message type
            if (!filters.types[message.type]) {
                return false;
            }
            
            // Filter by component
            if (Object.keys(filters.components).length > 0) {
                const sourceMatch = !filters.components[message.source] === false;
                const targetMatch = message.target ? !filters.components[message.target] === false : true;
                return sourceMatch && targetMatch;
            }
            
            return true;
        });
        
        // Clear current content if container is getting too full
        if (messageContainer.children.length > 100) {
            messageContainer.innerHTML = '';
        }
        
        // Add filtered messages to container
        filteredMessages.forEach(message => {
            // Check if message is already displayed
            const messageId = message.id || `${message.timestamp}-${message.source}-${message.type}`;
            const existingMessage = messageContainer.querySelector(`[data-message-id="${messageId}"]`);
            
            if (existingMessage) {
                return; // Skip if already displayed
            }
            
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = `hermes-message hermes-message--${message.type}`;
            messageElement.setAttribute('data-message-id', messageId);
            
            // Format message content
            const contentHtml = formatMessageContent(message);
            
            // Create message HTML
            messageElement.innerHTML = `
                <div class="hermes-message__header">
                    <div class="hermes-message__title">${getMessageTitle(message)}</div>
                    <div class="hermes-message__timestamp">${formatTimestamp(message.timestamp)}</div>
                </div>
                <div class="hermes-message__content">
                    ${contentHtml}
                </div>
                <div class="hermes-message__footer">
                    <span>From: ${message.source}</span>
                    ${message.target ? `<span>To: ${message.target}</span>` : ''}
                </div>
            `;
            
            // Add to beginning of container for most recent first
            messageContainer.insertBefore(messageElement, messageContainer.firstChild);
        });
        
        // Limit the number of displayed messages
        const maxMessages = component.state.get('maxMessageCount') || 100;
        while (messageContainer.children.length > maxMessages) {
            messageContainer.removeChild(messageContainer.lastChild);
        }
    }
    
    /**
     * Render the history table based on filters
     * @param {Object} filters - History filters
     */
    function renderHistoryTable(filters) {
        if (!hermesService) return;
        
        const historyTableBody = component.$('#history-table-body');
        
        if (!historyTableBody) return;
        
        // Show loading indicator
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px;">
                    Loading message history...
                </td>
            </tr>
        `;
        
        // Get filtered history
        const filteredHistory = hermesService.getMessageHistory(filters);
        
        // Clear table
        historyTableBody.innerHTML = '';
        
        // Check if we have messages
        if (filteredHistory.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px;">
                        No messages found matching the current filters.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Add rows for each message
        filteredHistory.forEach(message => {
            const row = document.createElement('tr');
            
            // Determine status class and text
            let statusHtml = 'N/A';
            if (message.status) {
                if (message.status === 'success') {
                    statusHtml = '<span style="color: var(--color-success);">Success</span>';
                } else if (message.status === 'error') {
                    statusHtml = '<span style="color: var(--color-danger);">Error</span>';
                } else {
                    statusHtml = message.status;
                }
            }
            
            // Create row HTML
            row.innerHTML = `
                <td>${formatTimestamp(message.timestamp)}</td>
                <td>${message.type}</td>
                <td>${message.source}</td>
                <td>${message.target || 'N/A'}</td>
                <td>${statusHtml}</td>
                <td>
                    <button class="hermes-button hermes-button--small view-message-details" data-index="${filteredHistory.indexOf(message)}">
                        View
                    </button>
                </td>
            `;
            
            // Add event listener for view details button
            const detailsButton = row.querySelector('.view-message-details');
            if (detailsButton) {
                detailsButton.addEventListener('click', () => {
                    const index = detailsButton.getAttribute('data-index');
                    showMessageDetailsModal(filteredHistory[index]);
                });
            }
            
            historyTableBody.appendChild(row);
        });
    }
    
    /**
     * Show message details in a modal
     * @param {Object} message - Message object
     */
    function showMessageDetailsModal(message) {
        // Format message content
        const contentHtml = formatMessageContent(message, true);
        
        // Create modal content
        const modalContent = {
            title: `Message Details: ${getMessageTitle(message)}`,
            body: `
                <div class="hermes-modal__message-details">
                    <div class="hermes-modal__section">
                        <h4 class="hermes-modal__section-title">Basic Information</h4>
                        <div class="hermes-modal__info-grid">
                            <div class="hermes-modal__info-label">Type:</div>
                            <div class="hermes-modal__info-value">${message.type}</div>
                            
                            <div class="hermes-modal__info-label">Source:</div>
                            <div class="hermes-modal__info-value">${message.source}</div>
                            
                            <div class="hermes-modal__info-label">Target:</div>
                            <div class="hermes-modal__info-value">${message.target || 'N/A'}</div>
                            
                            <div class="hermes-modal__info-label">Timestamp:</div>
                            <div class="hermes-modal__info-value">${formatTimestamp(message.timestamp, true)}</div>
                            
                            <div class="hermes-modal__info-label">Status:</div>
                            <div class="hermes-modal__info-value">${message.status || 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div class="hermes-modal__section">
                        <h4 class="hermes-modal__section-title">Message Content</h4>
                        ${contentHtml}
                    </div>
                </div>
            `,
            actionButton: {
                label: 'Close',
                callback: () => {
                    closeModal();
                }
            }
        };
        
        // Show the modal
        showModal(modalContent);
    }
    
    /**
     * Export message history to a file
     */
    function exportMessageHistory() {
        if (!hermesService) return;
        
        // Get history data
        const historyData = hermesService.exportMessageHistory();
        
        // Create blob and download link
        const blob = new Blob([historyData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `hermes-message-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.style.display = 'none';
        
        // Add to document, click, and remove
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    /**
     * Show a modal dialog
     * @param {Object} content - Modal content
     */
    function showModal(content) {
        component.state.set({
            isModalOpen: true,
            modalContent: content
        });
    }
    
    /**
     * Update the modal with content
     * @param {boolean} isOpen - Whether the modal is open
     * @param {Object} content - Modal content
     */
    function updateModal(isOpen, content) {
        const modal = component.$('#detail-modal');
        
        if (!modal) return;
        
        if (isOpen && content) {
            // Set modal content
            const modalTitle = component.$('#modal-title');
            const modalBody = component.$('#modal-body');
            const modalAction = component.$('#modal-action');
            
            if (modalTitle) modalTitle.textContent = content.title || 'Details';
            if (modalBody) modalBody.innerHTML = content.body || '';
            
            // Update action button if provided
            if (content.actionButton && modalAction) {
                modalAction.textContent = content.actionButton.label || 'OK';
                modalAction.onclick = content.actionButton.callback || closeModal;
                modalAction.style.display = 'block';
            } else if (modalAction) {
                modalAction.style.display = 'none';
            }
            
            // Show modal
            modal.style.display = 'flex';
        } else {
            // Hide modal
            modal.style.display = 'none';
        }
    }
    
    /**
     * Close the modal dialog
     */
    function closeModal() {
        component.state.set({
            isModalOpen: false,
            modalContent: null
        });
    }
    
    /**
     * Show a confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Function} onConfirm - Function to call when confirmed
     */
    function showConfirmationDialog(title, message, onConfirm) {
        const modalContent = {
            title: title,
            body: `<p>${message}</p>`,
            actionButton: {
                label: 'Confirm',
                callback: () => {
                    closeModal();
                    if (typeof onConfirm === 'function') {
                        onConfirm();
                    }
                }
            }
        };
        
        showModal(modalContent);
    }
    
    /* Event handlers */
    
    /**
     * Handle service connected event
     * @param {Object} event - Event object
     */
    function handleServiceConnected(event) {
        notifications.show(component, 'Connected', 'Connected to Hermes API', 'success');
    }
    
    /**
     * Handle connection failed event
     * @param {Object} event - Event object
     */
    function handleConnectionFailed(event) {
        notifications.show(component, 'Connection Failed', event.detail.error, 'error');
    }
    
    /**
     * Handle services updated event
     * @param {Object} event - Event object
     */
    function handleServicesUpdated(event) {
        component.state.set('services', event.detail.services);
    }
    
    /**
     * Handle connections updated event
     * @param {Object} event - Event object
     */
    function handleConnectionsUpdated(event) {
        component.state.set('connections', event.detail.connections);
    }
    
    /**
     * Handle message received event
     * @param {Object} event - Event object
     */
    function handleMessageReceived(event) {
        const message = event.detail.message;
        
        // Add message to state
        const messages = component.state.get('messages');
        
        // Add to beginning for most recent first
        const updatedMessages = [message, ...messages];
        
        // Limit to max message count to prevent performance issues
        const maxMessageCount = component.state.get('maxMessageCount') || 100;
        const trimmedMessages = updatedMessages.slice(0, maxMessageCount);
        
        component.state.set('messages', trimmedMessages);
    }
    
    /**
     * Handle monitoring started event
     * @param {Object} event - Event object
     */
    function handleMonitoringStarted(event) {
        notifications.show(component, 'Monitoring', 'Message monitoring started', 'info');
    }
    
    /**
     * Handle monitoring stopped event
     * @param {Object} event - Event object
     */
    function handleMonitoringStopped(event) {
        notifications.show(component, 'Monitoring', 'Message monitoring stopped', 'info');
    }
    
    /**
     * Handle pause state changed event
     * @param {Object} event - Event object
     */
    function handlePauseStateChanged(event) {
        component.state.set('isPaused', event.detail.isPaused);
    }
    
    /**
     * Handle service error event
     * @param {Object} event - Event object
     */
    function handleServiceError(event) {
        notifications.show(component, 'Error', event.detail.error, 'error');
    }
    
    /* Utility functions */
    
    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @param {boolean} includeMilliseconds - Whether to include milliseconds
     * @returns {string} - Formatted timestamp
     */
    function formatTimestamp(timestamp, includeMilliseconds = false) {
        if (!timestamp) return 'Unknown';
        
        try {
            const date = new Date(timestamp);
            
            if (includeMilliseconds) {
                return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
            }
            
            return date.toLocaleTimeString();
        } catch (error) {
            return timestamp;
        }
    }
    
    /**
     * Format JSON data for display
     * @param {Object} data - JSON data
     * @returns {string} - Formatted HTML
     */
    function formatJsonForDisplay(data) {
        // Convert JSON to string with indentation
        const jsonString = JSON.stringify(data, null, 2);
        
        // Replace tokens with HTML-formatted versions
        return jsonString
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
                let cls = 'hermes-json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'hermes-json-key';
                    } else {
                        cls = 'hermes-json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'hermes-json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'hermes-json-null';
                }
                return '<span class="' + cls + '">' + match.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
            });
    }
    
    /**
     * Get message title based on type
     * @param {Object} message - Message object
     * @returns {string} - Message title
     */
    function getMessageTitle(message) {
        switch(message.type) {
            case 'registration':
                return 'Component Registration';
            case 'heartbeat':
                return 'Heartbeat';
            case 'query':
                return 'Service Query';
            case 'data':
                return 'Data Message';
            default:
                return message.type.charAt(0).toUpperCase() + message.type.slice(1);
        }
    }
    
    /**
     * Format message content for display
     * @param {Object} message - Message object
     * @param {boolean} detailed - Whether to show detailed content
     * @returns {string} - Formatted HTML
     */
    function formatMessageContent(message, detailed = false) {
        // Different handling based on message type
        switch (message.type) {
            case 'registration':
                if (detailed) {
                    return `<div class="hermes-json-viewer">${formatJsonForDisplay(message)}</div>`;
                }
                return `Component "${message.data?.name || message.source}" registered with ${message.data?.capabilities?.length || 0} capabilities.`;
                
            case 'heartbeat':
                if (detailed) {
                    return `<div class="hermes-json-viewer">${formatJsonForDisplay(message)}</div>`;
                }
                return `Heartbeat from "${message.source}" with status: ${message.data?.healthy ? 'Healthy' : 'Unhealthy'}`;
                
            case 'query':
                if (detailed) {
                    return `<div class="hermes-json-viewer">${formatJsonForDisplay(message)}</div>`;
                }
                return `Query for services with ${message.data?.capabilities ? `capabilities: ${message.data.capabilities.join(', ')}` : 'all capabilities'}`;
                
            case 'data':
                if (detailed) {
                    return `<div class="hermes-json-viewer">${formatJsonForDisplay(message)}</div>`;
                }
                return `Data message: ${truncateText(JSON.stringify(message.data), 100)}`;
                
            default:
                if (detailed) {
                    return `<div class="hermes-json-viewer">${formatJsonForDisplay(message)}</div>`;
                }
                return `${truncateText(JSON.stringify(message.data), 100)}`;
        }
    }
    
    /**
     * Truncate text to a maximum length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    function truncateText(text, maxLength) {
        if (!text) return '';
        
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * Clean up component resources
     */
    function cleanupComponent() {
        console.log('Cleaning up Hermes component');
        
        // Stop message monitoring
        if (hermesService && hermesService.monitoringMessages) {
            hermesService.stopMessageMonitoring();
        }
        
        // Remove service event listeners
        if (hermesService) {
            hermesService.removeEventListener('connected', handleServiceConnected);
            hermesService.removeEventListener('connectionFailed', handleConnectionFailed);
            hermesService.removeEventListener('servicesUpdated', handleServicesUpdated);
            hermesService.removeEventListener('connectionsUpdated', handleConnectionsUpdated);
            hermesService.removeEventListener('messageReceived', handleMessageReceived);
            hermesService.removeEventListener('monitoringStarted', handleMonitoringStarted);
            hermesService.removeEventListener('monitoringStopped', handleMonitoringStopped);
            hermesService.removeEventListener('pauseStateChanged', handlePauseStateChanged);
            hermesService.removeEventListener('error', handleServiceError);
        }
    }
    
    // Initialize the component
    initHermesComponent();
    
})(component);