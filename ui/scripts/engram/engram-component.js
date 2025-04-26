/**
 * Engram Memory Component
 * Provides an interface for browsing, searching, and managing Engram memory entries
 */

(function(component) {
    'use strict';
    
    // Component-specific utilities
    const dom = component.utils.dom;
    const notifications = component.utils.notifications;
    const loading = component.utils.loading;
    const lifecycle = component.utils.lifecycle;
    
    // Service reference
    let engramService = null;
    
    // Chart references
    let memoryGrowthChart = null;
    let compartmentDistributionChart = null;
    let accessFrequencyChart = null;
    let tagDistributionChart = null;
    
    // Graph visualization instance
    let memoryGraph = null;
    
    /**
     * Initialize component state
     */
    function initState() {
        component.utils.componentState.connect(component, {
            namespace: 'engram',
            initialState: {
                // UI State
                activeTab: 'browse',
                viewMode: 'list',
                isMemoryModalOpen: false,
                isCompartmentModalOpen: false,
                isMemoryEditModalOpen: false,
                selectedMemoryId: null,
                selectedCompartmentId: null,
                
                // Browse State
                browseFilter: '',
                browseCompartment: 'all',
                sortField: 'timestamp',
                sortDirection: 'desc',
                activeTags: [],
                
                // Data State
                memories: [],
                compartments: [],
                tags: [],
                
                // Search State
                searchQuery: '',
                searchType: 'semantic',
                searchCompartments: [],
                searchStartDate: '',
                searchEndDate: '',
                searchLimit: 50,
                searchResults: [],
                searchHistory: [],
                
                // Statistics State
                statistics: {
                    totalMemories: 0,
                    totalCompartments: 0,
                    recentActivity: 0,
                    memoryUsage: 0,
                    memoryGrowth: [],
                    compartmentDistribution: {},
                    accessFrequency: [],
                    tagDistribution: {}
                },
                
                // Form State
                newCompartment: {
                    name: '',
                    description: '',
                    type: 'general',
                    retention: 30
                },
                
                editMemory: {
                    id: '',
                    title: '',
                    content: '',
                    compartmentId: '',
                    tags: [],
                    importance: 'medium',
                    metadata: {}
                }
            },
            persist: true,
            excludeFromPersistence: [
                'memories', 
                'searchResults', 
                'isMemoryModalOpen', 
                'isCompartmentModalOpen', 
                'isMemoryEditModalOpen',
                'selectedMemoryId',
                'statistics'
            ]
        });
        
        // Register state effects for reactive UI updates
        registerStateEffects();
    }
    
    /**
     * Register state effects for reactive UI updates
     */
    function registerStateEffects() {
        // Update active tab display when tab changes
        lifecycle.registerStateEffect(component, 
            ['activeTab'], 
            (state) => updateActiveTab(state.activeTab)
        );
        
        // Update view mode when it changes
        lifecycle.registerStateEffect(component,
            ['viewMode'],
            (state) => updateViewMode(state.viewMode)
        );
        
        // Update memory list when memories, filters, or sorting changes
        lifecycle.registerStateEffect(component,
            ['memories', 'browseFilter', 'browseCompartment', 'sortField', 'sortDirection', 'activeTags'],
            (state) => renderMemoryList(state.memories, state)
        );
        
        // Update compartment list when compartments change
        lifecycle.registerStateEffect(component,
            ['compartments', 'selectedCompartmentId'],
            (state) => renderCompartmentList(state.compartments, state.selectedCompartmentId)
        );
        
        // Update compartment details when selected compartment changes
        lifecycle.registerStateEffect(component,
            ['selectedCompartmentId', 'compartments'],
            (state) => {
                if (state.selectedCompartmentId) {
                    const compartment = state.compartments.find(c => c.id === state.selectedCompartmentId);
                    if (compartment) {
                        renderCompartmentDetails(compartment);
                    }
                }
            }
        );
        
        // Update search results when they change
        lifecycle.registerStateEffect(component,
            ['searchResults'],
            (state) => renderSearchResults(state.searchResults)
        );
        
        // Update search history when it changes
        lifecycle.registerStateEffect(component,
            ['searchHistory'],
            (state) => renderSearchHistory(state.searchHistory)
        );
        
        // Update statistics when they change
        lifecycle.registerStateEffect(component,
            ['statistics'],
            (state) => renderStatistics(state.statistics)
        );
        
        // Handle memory modal visibility
        lifecycle.registerStateEffect(component,
            ['isMemoryModalOpen', 'selectedMemoryId'],
            (state) => {
                if (state.isMemoryModalOpen && state.selectedMemoryId) {
                    showMemoryModal(state.selectedMemoryId);
                } else {
                    hideMemoryModal();
                }
            }
        );
        
        // Handle compartment modal visibility
        lifecycle.registerStateEffect(component,
            ['isCompartmentModalOpen'],
            (state) => {
                if (state.isCompartmentModalOpen) {
                    showCompartmentModal();
                } else {
                    hideCompartmentModal();
                }
            }
        );
        
        // Handle memory edit modal visibility
        lifecycle.registerStateEffect(component,
            ['isMemoryEditModalOpen', 'editMemory'],
            (state) => {
                if (state.isMemoryEditModalOpen) {
                    showMemoryEditModal(state.editMemory);
                } else {
                    hideMemoryEditModal();
                }
            }
        );
    }
    
    /**
     * Initialize the component
     */
    function initComponent() {
        console.log('Initializing Engram component...');
        
        // Initialize state management
        initState();
        
        // Initialize or get required services
        initService();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data
        loadInitialData();
        
        // Register cleanup function
        component.registerCleanup(cleanupComponent);
        
        console.log('Engram component initialized');
    }
    
    /**
     * Initialize or get EngramService
     */
    function initService() {
        // Get existing service or create new one
        if (window.tektonUI?.services?.engramService) {
            engramService = window.tektonUI.services.engramService;
            console.log('Using existing EngramService');
        } else if (window.EngramService) {
            engramService = new EngramService();
            window.tektonUI.services.engramService = engramService;
            console.log('Created new EngramService');
        } else {
            console.error('EngramService not available - loading it dynamically');
            
            // Show loading state
            const loadingIndicator = loading.show(component, 'Loading Engram service...');
            
            // Try to load the service script
            const script = document.createElement('script');
            script.src = '/scripts/engram/engram-service.js';
            script.onload = () => {
                loading.hide(component);
                
                // Create service instance once loaded
                if (window.EngramService) {
                    engramService = new EngramService();
                    window.tektonUI.services.engramService = engramService;
                    
                    // Set up service event listeners
                    setupServiceEventListeners();
                    
                    // Load initial data now that service is available
                    loadInitialData();
                    
                    console.log('EngramService loaded dynamically');
                } else {
                    console.error('Failed to load EngramService dynamically');
                    showServiceError();
                }
            };
            
            script.onerror = () => {
                loading.hide(component);
                console.error('Failed to load EngramService script');
                showServiceError();
            };
            
            document.head.appendChild(script);
            return;
        }
        
        // Set up service event listeners
        setupServiceEventListeners();
    }
    
    /**
     * Set up event listeners for the EngramService
     */
    function setupServiceEventListeners() {
        if (!engramService) return;
        
        // Connect events
        engramService.addEventListener('connected', handleServiceConnected);
        engramService.addEventListener('connectionFailed', handleConnectionFailed);
        
        // Memory events
        engramService.addEventListener('memoryUpdated', handleMemoryUpdated);
        engramService.addEventListener('compartmentUpdated', handleCompartmentUpdated);
        engramService.addEventListener('statisticsUpdated', handleStatisticsUpdated);
        
        // WebSocket events
        engramService.addEventListener('websocketConnected', handleWebSocketConnected);
        engramService.addEventListener('websocketDisconnected', handleWebSocketDisconnected);
        
        // Error events
        engramService.addEventListener('error', handleServiceError);
    }
    
    /**
     * Set up event listeners for UI elements
     */
    function setupEventListeners() {
        // Tab switching
        component.on('click', '.engram-tabs__button', function() {
            const tab = this.getAttribute('data-tab');
            component.state.set('activeTab', tab);
        });
        
        // View mode switching
        component.on('click', '.engram-view-controls__button', function() {
            const viewMode = this.getAttribute('data-view');
            component.state.set('viewMode', viewMode);
        });
        
        // Memory list sorting
        component.on('change', '#sort-field', function() {
            component.state.set('sortField', this.value);
        });
        
        component.on('change', '#sort-direction', function() {
            component.state.set('sortDirection', this.value);
        });
        
        // Compartment filter for browse
        component.on('change', '#browse-compartment-filter', function() {
            component.state.set('browseCompartment', this.value);
            loadMemories();
        });
        
        // Memory search filtering
        component.on('input', '#browse-search', function() {
            component.state.set('browseFilter', this.value);
        });
        
        // Memory item click (for details)
        component.on('click', '.engram-memory-item, .engram-memory-card', function() {
            const memoryId = this.getAttribute('data-id');
            
            if (memoryId) {
                component.state.set({
                    selectedMemoryId: memoryId,
                    isMemoryModalOpen: true
                });
            }
        });
        
        // Search form submission
        component.on('submit', '.engram-search-form', function(e) {
            e.preventDefault();
            performSearch();
        });
        
        // Search button click
        component.on('click', '#search-submit', function() {
            performSearch();
        });
        
        // Search history item click
        component.on('click', '.engram-search-history-item', function() {
            const query = this.getAttribute('data-query');
            const type = this.getAttribute('data-type');
            
            if (query) {
                // Update form inputs
                component.$('#search-query').value = query;
                component.$('#search-type').value = type || 'semantic';
                
                // Update state
                component.state.set({
                    searchQuery: query,
                    searchType: type || 'semantic'
                });
                
                // Perform search
                performSearch();
            }
        });
        
        // Search result click
        component.on('click', '.engram-search-result', function() {
            const memoryId = this.getAttribute('data-id');
            
            if (memoryId) {
                component.state.set({
                    selectedMemoryId: memoryId,
                    isMemoryModalOpen: true
                });
            }
        });
        
        // Compartment item click
        component.on('click', '.engram-compartment-item', function() {
            const compartmentId = this.getAttribute('data-id');
            
            if (compartmentId) {
                component.state.set('selectedCompartmentId', compartmentId);
            }
        });
        
        // Create compartment button
        component.on('click', '#create-compartment', function() {
            component.state.set('isCompartmentModalOpen', true);
        });
        
        // Refresh statistics button
        component.on('click', '#refresh-stats', function() {
            loadStatistics();
        });
        
        // Export statistics button
        component.on('click', '#export-stats', function() {
            exportStatistics();
        });
        
        // Memory refresh button
        component.on('click', '#refresh-memory', function() {
            refreshData();
        });
        
        // Modal close buttons
        component.on('click', '#close-memory-modal, #memory-modal-cancel', function() {
            component.state.set('isMemoryModalOpen', false);
        });
        
        component.on('click', '#close-compartment-modal, #compartment-modal-cancel', function() {
            component.state.set('isCompartmentModalOpen', false);
        });
        
        component.on('click', '#close-memory-edit-modal, #memory-edit-modal-cancel', function() {
            component.state.set('isMemoryEditModalOpen', false);
        });
        
        // Delete memory button
        component.on('click', '#delete-memory-button', function() {
            const memoryId = component.state.get('selectedMemoryId');
            
            if (memoryId) {
                if (confirm('Are you sure you want to delete this memory entry? This action cannot be undone.')) {
                    deleteMemory(memoryId);
                }
            }
        });
        
        // Edit memory button
        component.on('click', '#edit-memory-button', function() {
            const memoryId = component.state.get('selectedMemoryId');
            
            if (memoryId) {
                prepareMemoryEdit(memoryId);
            }
        });
        
        // Compartment form submission
        component.on('submit', '#compartment-form', function(e) {
            e.preventDefault();
            submitCompartmentForm();
        });
        
        // Compartment modal submit button
        component.on('click', '#compartment-modal-submit', function() {
            submitCompartmentForm();
        });
        
        // Memory edit form submission
        component.on('submit', '#memory-edit-form', function(e) {
            e.preventDefault();
            submitMemoryEditForm();
        });
        
        // Memory edit modal submit button
        component.on('click', '#memory-edit-modal-submit', function() {
            submitMemoryEditForm();
        });
        
        // Add metadata button
        component.on('click', '#add-metadata', function() {
            addMetadataRow();
        });
        
        // Remove metadata button
        component.on('click', '.engram-metadata-remove', function() {
            removeMetadataRow(this);
        });
        
        // Graph controls
        component.on('input', '#graph-zoom', function() {
            if (memoryGraph) {
                memoryGraph.zoom(parseFloat(this.value));
            }
        });
        
        component.on('input', '#graph-link-strength', function() {
            if (memoryGraph) {
                memoryGraph.setLinkStrength(parseFloat(this.value));
            }
        });
        
        component.on('click', '#reset-graph', function() {
            if (memoryGraph) {
                memoryGraph.resetView();
            }
        });
    }
    
    /**
     * Load initial data from Engram service
     */
    async function loadInitialData() {
        if (!engramService) {
            console.error('EngramService not available for loading initial data');
            return;
        }
        
        const loadingIndicator = loading.show(component, 'Connecting to Engram...');
        
        try {
            // Connect to Engram service
            await engramService.connect();
            
            // Load compartments first (needed for other operations)
            await loadCompartments();
            
            // Load data in parallel
            await Promise.all([
                loadMemories(),
                loadTags(),
                loadStatistics()
            ]);
            
            loading.hide(component);
            
            // If on statistics tab, initialize charts
            if (component.state.get('activeTab') === 'statistics') {
                initCharts();
            }
            
            // Restore view mode
            updateViewMode(component.state.get('viewMode'));
        } catch (error) {
            loading.hide(component);
            console.error('Error loading initial data:', error);
            
            // Show connection error
            notifications.show(component, 'Connection Error', 'Failed to connect to Engram service', 'error');
        }
    }
    
    /**
     * Load memory entries
     */
    async function loadMemories() {
        if (!engramService) return;
        
        const browseCompartment = component.state.get('browseCompartment');
        const sortField = component.state.get('sortField');
        const sortDirection = component.state.get('sortDirection');
        
        try {
            const options = {
                limit: 100,
                sort: `${sortField}:${sortDirection}`,
                compartment: browseCompartment === 'all' ? undefined : browseCompartment
            };
            
            const memories = await engramService.getEntries(options);
            
            component.state.set('memories', memories);
            return memories;
        } catch (error) {
            console.error('Error loading memories:', error);
            notifications.show(component, 'Error', 'Failed to load memory entries', 'error');
            return [];
        }
    }
    
    /**
     * Load compartments
     */
    async function loadCompartments() {
        if (!engramService) return;
        
        try {
            const compartments = await engramService.getCompartments();
            
            component.state.set('compartments', compartments);
            
            // Update compartment filter dropdown
            updateCompartmentFilters(compartments);
            
            return compartments;
        } catch (error) {
            console.error('Error loading compartments:', error);
            notifications.show(component, 'Error', 'Failed to load compartments', 'error');
            return [];
        }
    }
    
    /**
     * Load memory tags
     */
    async function loadTags() {
        if (!engramService) return;
        
        try {
            const tags = await engramService.getTags();
            
            component.state.set('tags', tags);
            
            // Update tag filters
            updateTagFilters(tags);
            
            return tags;
        } catch (error) {
            console.error('Error loading tags:', error);
            notifications.show(component, 'Error', 'Failed to load memory tags', 'error');
            return [];
        }
    }
    
    /**
     * Load memory statistics
     */
    async function loadStatistics() {
        if (!engramService) return;
        
        try {
            const statistics = await engramService.getStatistics();
            
            component.state.set('statistics', statistics);
            
            // Update charts if they exist
            updateCharts(statistics);
            
            return statistics;
        } catch (error) {
            console.error('Error loading statistics:', error);
            notifications.show(component, 'Error', 'Failed to load memory statistics', 'error');
            return null;
        }
    }
    
    /**
     * Refresh all data
     */
    async function refreshData() {
        const loadingIndicator = loading.show(component, 'Refreshing Engram data...');
        
        try {
            // Load data in parallel
            await Promise.all([
                loadCompartments(),
                loadMemories(),
                loadTags(),
                loadStatistics()
            ]);
            
            loading.hide(component);
            notifications.show(component, 'Success', 'Engram data refreshed', 'success', 3000);
        } catch (error) {
            loading.hide(component);
            console.error('Error refreshing data:', error);
            notifications.show(component, 'Error', 'Failed to refresh Engram data', 'error');
        }
    }
    
    /**
     * Perform a memory search
     */
    async function performSearch() {
        // Get search parameters from form
        const query = component.$('#search-query').value.trim();
        
        if (!query) {
            notifications.show(component, 'Warning', 'Please enter a search query', 'warning', 3000);
            return;
        }
        
        const searchType = component.$('#search-type').value;
        const compartments = Array.from(component.$('#search-compartments')?.selectedOptions || [])
            .map(option => option.value);
        
        const startDate = component.$('#search-start-date').value;
        const endDate = component.$('#search-end-date').value;
        const limit = parseInt(component.$('#search-limit').value, 10) || 50;
        
        // Update state
        component.state.set({
            searchQuery: query,
            searchType: searchType,
            searchCompartments: compartments,
            searchStartDate: startDate,
            searchEndDate: endDate,
            searchLimit: limit
        });
        
        // Add to search history
        addToSearchHistory(query, searchType);
        
        // Perform search
        const loadingIndicator = loading.show(component, 'Searching memory...');
        
        try {
            const options = {
                type: searchType,
                compartments: compartments,
                limit: limit
            };
            
            if (startDate) {
                options.startDate = startDate;
            }
            
            if (endDate) {
                options.endDate = endDate;
            }
            
            const results = await engramService.searchMemory(query, options);
            
            // Update state with results
            component.state.set('searchResults', results);
            
            // Update result count
            component.$('#result-count').textContent = `${results.length} results`;
            
            loading.hide(component);
        } catch (error) {
            loading.hide(component);
            console.error('Error performing search:', error);
            notifications.show(component, 'Error', 'Failed to perform search', 'error');
        }
    }
    
    /**
     * Add a search to the search history
     * @param {string} query - The search query
     * @param {string} type - The search type
     */
    function addToSearchHistory(query, type) {
        const searchHistory = component.state.get('searchHistory') || [];
        
        // Check if this search already exists in history
        const existingIndex = searchHistory.findIndex(item => 
            item.query === query && item.type === type
        );
        
        // Create the new history item
        const newItem = {
            query,
            type,
            timestamp: new Date().toISOString()
        };
        
        // If it exists, remove it to move it to the top
        if (existingIndex !== -1) {
            searchHistory.splice(existingIndex, 1);
        }
        
        // Add to the beginning of the array
        searchHistory.unshift(newItem);
        
        // Keep only the last 10 searches
        const updatedHistory = searchHistory.slice(0, 10);
        
        // Update state
        component.state.set('searchHistory', updatedHistory);
    }
    
    /**
     * Delete a memory entry
     * @param {string} id - The memory entry ID
     */
    async function deleteMemory(id) {
        if (!engramService) return;
        
        const loadingIndicator = loading.show(component, 'Deleting memory entry...');
        
        try {
            await engramService.deleteMemoryEntry(id);
            
            // Close the modal
            component.state.set('isMemoryModalOpen', false);
            
            // Remove from local state
            const memories = component.state.get('memories').filter(m => m.id !== id);
            component.state.set('memories', memories);
            
            loading.hide(component);
            notifications.show(component, 'Success', 'Memory entry deleted successfully', 'success', 3000);
        } catch (error) {
            loading.hide(component);
            console.error('Error deleting memory entry:', error);
            notifications.show(component, 'Error', 'Failed to delete memory entry', 'error');
        }
    }
    
    /**
     * Prepare memory entry for editing
     * @param {string} id - The memory entry ID
     */
    async function prepareMemoryEdit(id) {
        if (!engramService) return;
        
        const loadingIndicator = loading.show(component, 'Loading memory details for editing...');
        
        try {
            const memory = await engramService.getMemoryEntry(id);
            
            // Format memory for the edit form
            const editMemory = {
                id: memory.id,
                title: memory.title || '',
                content: memory.content || '',
                compartmentId: memory.compartment_id || '',
                tags: memory.tags || [],
                importance: memory.importance || 'medium',
                metadata: memory.metadata || {}
            };
            
            // Update state
            component.state.set({
                editMemory: editMemory,
                isMemoryEditModalOpen: true
            });
            
            loading.hide(component);
        } catch (error) {
            loading.hide(component);
            console.error('Error loading memory for editing:', error);
            notifications.show(component, 'Error', 'Failed to load memory details', 'error');
        }
    }
    
    /**
     * Submit the compartment creation form
     */
    async function submitCompartmentForm() {
        const name = component.$('#compartment-name').value.trim();
        const description = component.$('#compartment-description').value.trim();
        const type = component.$('#compartment-type').value;
        const retention = parseInt(component.$('#compartment-retention').value, 10) || 30;
        
        if (!name) {
            notifications.show(component, 'Warning', 'Please enter a compartment name', 'warning', 3000);
            return;
        }
        
        const compartment = {
            name,
            description,
            type,
            retention_days: retention
        };
        
        const loadingIndicator = loading.show(component, 'Creating compartment...');
        
        try {
            const createdCompartment = await engramService.createCompartment(compartment);
            
            // Add to compartments list
            const compartments = [...component.state.get('compartments'), createdCompartment];
            component.state.set('compartments', compartments);
            
            // Update compartment filters
            updateCompartmentFilters(compartments);
            
            // Close modal
            component.state.set('isCompartmentModalOpen', false);
            
            // Reset form
            component.$('#compartment-form').reset();
            
            loading.hide(component);
            notifications.show(component, 'Success', 'Compartment created successfully', 'success', 3000);
        } catch (error) {
            loading.hide(component);
            console.error('Error creating compartment:', error);
            notifications.show(component, 'Error', 'Failed to create compartment', 'error');
        }
    }
    
    /**
     * Submit the memory edit form
     */
    async function submitMemoryEditForm() {
        const id = component.state.get('editMemory').id;
        const title = component.$('#memory-title').value.trim();
        const content = component.$('#memory-content').value.trim();
        const compartmentId = component.$('#memory-compartment').value;
        const tagsString = component.$('#memory-tags').value.trim();
        const importance = component.$('#memory-importance').value;
        
        if (!title || !content) {
            notifications.show(component, 'Warning', 'Title and content are required', 'warning', 3000);
            return;
        }
        
        // Parse tags from comma-separated string
        const tags = tagsString.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        // Parse metadata from form
        const metadata = {};
        const metadataRows = component.$$('.engram-metadata-row');
        
        metadataRows.forEach(row => {
            const keyInput = row.querySelector('.engram-metadata-key');
            const valueInput = row.querySelector('.engram-metadata-value');
            
            if (keyInput && valueInput && keyInput.value.trim()) {
                metadata[keyInput.value.trim()] = valueInput.value.trim();
            }
        });
        
        // Build update object
        const updates = {
            title,
            content,
            compartment_id: compartmentId,
            tags,
            importance,
            metadata
        };
        
        const loadingIndicator = loading.show(component, 'Updating memory entry...');
        
        try {
            const updatedMemory = await engramService.updateMemoryEntry(id, updates);
            
            // Update in state
            const memories = component.state.get('memories').map(m => 
                m.id === id ? updatedMemory : m
            );
            component.state.set('memories', memories);
            
            // If this is the selected memory, update selected memory details
            if (component.state.get('selectedMemoryId') === id) {
                component.state.set('selectedMemoryId', id);
                showMemoryModal(id);
            }
            
            // Close modal
            component.state.set('isMemoryEditModalOpen', false);
            
            loading.hide(component);
            notifications.show(component, 'Success', 'Memory entry updated successfully', 'success', 3000);
        } catch (error) {
            loading.hide(component);
            console.error('Error updating memory entry:', error);
            notifications.show(component, 'Error', 'Failed to update memory entry', 'error');
        }
    }
    
    /**
     * Add a new metadata key-value row to the form
     */
    function addMetadataRow() {
        const metadataEditor = component.$('#memory-metadata');
        const addButton = component.$('#add-metadata');
        
        const row = document.createElement('div');
        row.className = 'engram-metadata-row';
        
        row.innerHTML = `
            <input type="text" class="engram-metadata-key" placeholder="Key">
            <input type="text" class="engram-metadata-value" placeholder="Value">
            <button type="button" class="engram-metadata-remove">×</button>
        `;
        
        // Insert before the add button
        metadataEditor.insertBefore(row, addButton);
    }
    
    /**
     * Remove a metadata row from the form
     * @param {HTMLElement} button - The remove button element
     */
    function removeMetadataRow(button) {
        const row = button.closest('.engram-metadata-row');
        if (row) {
            row.remove();
        }
    }
    
    /**
     * Export statistics data as JSON
     */
    function exportStatistics() {
        const statistics = component.state.get('statistics');
        
        if (!statistics) {
            notifications.show(component, 'Warning', 'No statistics data available to export', 'warning', 3000);
            return;
        }
        
        try {
            // Convert to JSON string
            const jsonData = JSON.stringify(statistics, null, 2);
            
            // Create a blob and download link
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `engram-statistics-${new Date().toISOString().slice(0, 10)}.json`;
            
            // Trigger download and clean up
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            notifications.show(component, 'Success', 'Statistics exported successfully', 'success', 3000);
        } catch (error) {
            console.error('Error exporting statistics:', error);
            notifications.show(component, 'Error', 'Failed to export statistics', 'error');
        }
    }
    
    /*******************************************************************************
     * UI Update Functions
     *******************************************************************************/
    
    /**
     * Update the active tab
     * @param {string} tabId - The ID of the tab to activate
     */
    function updateActiveTab(tabId) {
        // Update tab buttons
        const tabButtons = component.$$('.engram-tabs__button');
        tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('engram-tabs__button--active');
            } else {
                button.classList.remove('engram-tabs__button--active');
            }
        });
        
        // Update tab panels
        const tabPanels = component.$$('.engram-tab-panel');
        tabPanels.forEach(panel => {
            if (panel.getAttribute('data-panel') === tabId) {
                panel.classList.add('engram-tab-panel--active');
            } else {
                panel.classList.remove('engram-tab-panel--active');
            }
        });
        
        // Initialize charts if statistics tab
        if (tabId === 'statistics') {
            initCharts();
        }
        
        // Initialize graph if browse tab and graph view is active
        if (tabId === 'browse' && component.state.get('viewMode') === 'graph') {
            initMemoryGraph();
        }
    }
    
    /**
     * Update the view mode
     * @param {string} viewMode - The view mode to activate
     */
    function updateViewMode(viewMode) {
        // Update view mode buttons
        const viewButtons = component.$$('.engram-view-controls__button');
        viewButtons.forEach(button => {
            if (button.getAttribute('data-view') === viewMode) {
                button.classList.add('engram-view-controls__button--active');
            } else {
                button.classList.remove('engram-view-controls__button--active');
            }
        });
        
        // Update view containers
        const viewContainers = component.$$('.engram-memory-view');
        viewContainers.forEach(container => {
            if (container.classList.contains(`engram-memory-view--${viewMode}`)) {
                container.style.display = 'flex';
            } else {
                container.style.display = 'none';
            }
        });
        
        // Initialize the graph if needed
        if (viewMode === 'graph') {
            initMemoryGraph();
        }
        
        // Rerender memory items for the active view
        renderMemoryList(component.state.get('memories'), component.state.get());
    }
    
    /**
     * Update compartment filter dropdowns
     * @param {Array} compartments - List of available compartments
     */
    function updateCompartmentFilters(compartments) {
        const browseFilter = component.$('#browse-compartment-filter');
        const searchFilter = component.$('#search-compartments');
        const memoryCompartment = component.$('#memory-compartment');
        
        if (!compartments || !compartments.length) return;
        
        // Update browse filter
        if (browseFilter) {
            const currentValue = browseFilter.value;
            browseFilter.innerHTML = '<option value="all">All Compartments</option>';
            
            compartments.forEach(compartment => {
                const option = document.createElement('option');
                option.value = compartment.id;
                option.textContent = compartment.name;
                browseFilter.appendChild(option);
            });
            
            browseFilter.value = currentValue;
        }
        
        // Update search filter
        if (searchFilter) {
            searchFilter.innerHTML = '';
            
            compartments.forEach(compartment => {
                const option = document.createElement('option');
                option.value = compartment.id;
                option.textContent = compartment.name;
                searchFilter.appendChild(option);
            });
        }
        
        // Update memory edit compartment dropdown
        if (memoryCompartment) {
            const currentValue = memoryCompartment.value;
            memoryCompartment.innerHTML = '';
            
            compartments.forEach(compartment => {
                const option = document.createElement('option');
                option.value = compartment.id;
                option.textContent = compartment.name;
                memoryCompartment.appendChild(option);
            });
            
            if (currentValue) {
                memoryCompartment.value = currentValue;
            }
        }
    }
    
    /**
     * Update tag filters
     * @param {Array} tags - List of available tags
     */
    function updateTagFilters(tags) {
        const tagFilter = component.$('#memory-tag-filter');
        
        if (!tagFilter || !tags || !tags.length) return;
        
        tagFilter.innerHTML = '';
        
        // Sort tags by frequency
        tags.sort((a, b) => b.count - a.count);
        
        // Take top 15 tags
        const topTags = tags.slice(0, 15);
        
        // Add tag buttons
        topTags.forEach(tag => {
            const tagButton = document.createElement('div');
            tagButton.className = 'engram-tag';
            tagButton.setAttribute('data-tag', tag.name);
            tagButton.textContent = `${tag.name} (${tag.count})`;
            
            // Check if this tag is active
            const activeTags = component.state.get('activeTags') || [];
            if (activeTags.includes(tag.name)) {
                tagButton.classList.add('engram-tag--active');
            }
            
            // Add click handler
            tagButton.addEventListener('click', () => {
                const activeTags = component.state.get('activeTags') || [];
                
                if (activeTags.includes(tag.name)) {
                    // Remove tag from active filters
                    const newActiveTags = activeTags.filter(t => t !== tag.name);
                    component.state.set('activeTags', newActiveTags);
                    tagButton.classList.remove('engram-tag--active');
                } else {
                    // Add tag to active filters
                    const newActiveTags = [...activeTags, tag.name];
                    component.state.set('activeTags', newActiveTags);
                    tagButton.classList.add('engram-tag--active');
                }
            });
            
            tagFilter.appendChild(tagButton);
        });
    }
    
    /**
     * Render the memory list based on current state
     * @param {Array} memories - The list of memory entries
     * @param {Object} state - The component state
     */
    function renderMemoryList(memories, state) {
        const viewMode = state.viewMode;
        const browseFilter = state.browseFilter.toLowerCase();
        const activeTags = state.activeTags || [];
        
        if (!memories || !memories.length) {
            renderEmptyMemoryList(viewMode);
            return;
        }
        
        // Filter memories based on filters
        let filteredMemories = memories;
        
        // Apply text filter
        if (browseFilter) {
            filteredMemories = filteredMemories.filter(memory => 
                (memory.title && memory.title.toLowerCase().includes(browseFilter)) || 
                (memory.content && memory.content.toLowerCase().includes(browseFilter))
            );
        }
        
        // Apply tag filters
        if (activeTags.length > 0) {
            filteredMemories = filteredMemories.filter(memory => 
                memory.tags && activeTags.every(tag => memory.tags.includes(tag))
            );
        }
        
        // Render based on view mode
        if (viewMode === 'list') {
            renderMemoryListView(filteredMemories);
        } else if (viewMode === 'grid') {
            renderMemoryGridView(filteredMemories);
        } else if (viewMode === 'graph') {
            updateMemoryGraph(filteredMemories);
        }
    }
    
    /**
     * Render empty memory list state
     * @param {string} viewMode - The current view mode
     */
    function renderEmptyMemoryList(viewMode) {
        if (viewMode === 'list') {
            const container = component.$('#memory-list-container');
            
            if (!container) return;
            
            container.innerHTML = `
                <div class="engram-empty-state">
                    <div class="engram-empty-state__icon">📂</div>
                    <h3 class="engram-empty-state__title">No Memories Found</h3>
                    <p class="engram-empty-state__message">
                        No memory entries match your current filters, or no memories exist yet.
                    </p>
                </div>
            `;
        } else if (viewMode === 'grid') {
            const container = component.$('#memory-grid-container');
            
            if (!container) return;
            
            container.innerHTML = `
                <div class="engram-empty-state">
                    <div class="engram-empty-state__icon">📂</div>
                    <h3 class="engram-empty-state__title">No Memories Found</h3>
                    <p class="engram-empty-state__message">
                        No memory entries match your current filters, or no memories exist yet.
                    </p>
                </div>
            `;
        }
    }
    
    /**
     * Render memory list view
     * @param {Array} memories - The filtered memory entries
     */
    function renderMemoryListView(memories) {
        const container = component.$('#memory-list-container');
        
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Get compartments for lookup
        const compartments = component.state.get('compartments') || [];
        const compartmentMap = new Map(compartments.map(c => [c.id, c]));
        
        // Render each memory item
        memories.forEach(memory => {
            const compartment = compartmentMap.get(memory.compartment_id);
            const compartmentName = compartment ? compartment.name : 'Unknown';
            
            const memoryItem = document.createElement('div');
            memoryItem.className = 'engram-memory-item';
            memoryItem.setAttribute('data-id', memory.id);
            
            const date = memory.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown date';
            
            memoryItem.innerHTML = `
                <div class="engram-memory-item__header">
                    <h3 class="engram-memory-item__title">${memory.title || 'Untitled'}</h3>
                    <span class="engram-memory-item__date">${date}</span>
                </div>
                <div class="engram-memory-item__content">${memory.content || 'No content'}</div>
                <div class="engram-memory-item__meta">
                    <span class="engram-memory-item__compartment">${compartmentName}</span>
                    <div class="engram-memory-item__tags">
                        ${(memory.tags || []).map(tag => `
                            <span class="engram-tag">${tag}</span>
                        `).join('')}
                    </div>
                </div>
            `;
            
            container.appendChild(memoryItem);
        });
    }
    
    /**
     * Render memory grid view
     * @param {Array} memories - The filtered memory entries
     */
    function renderMemoryGridView(memories) {
        const container = component.$('#memory-grid-container');
        
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Get compartments for lookup
        const compartments = component.state.get('compartments') || [];
        const compartmentMap = new Map(compartments.map(c => [c.id, c]));
        
        // Render each memory card
        memories.forEach(memory => {
            const compartment = compartmentMap.get(memory.compartment_id);
            const compartmentName = compartment ? compartment.name : 'Unknown';
            
            const memoryCard = document.createElement('div');
            memoryCard.className = 'engram-memory-card';
            memoryCard.setAttribute('data-id', memory.id);
            
            const date = memory.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown date';
            
            memoryCard.innerHTML = `
                <div class="engram-memory-card__header">
                    <h3 class="engram-memory-card__title">${memory.title || 'Untitled'}</h3>
                </div>
                <div class="engram-memory-card__content">${memory.content || 'No content'}</div>
                <div class="engram-memory-card__footer">
                    <span class="engram-memory-card__date">${date}</span>
                    <span class="engram-memory-card__compartment">${compartmentName}</span>
                </div>
            `;
            
            container.appendChild(memoryCard);
        });
    }
    
    /**
     * Initialize memory graph visualization
     */
    function initMemoryGraph() {
        const canvas = component.$('#memory-graph-canvas');
        
        if (!canvas) return;
        
        // Skip if already initialized
        if (memoryGraph) {
            updateMemoryGraph(component.state.get('memories'));
            return;
        }
        
        // Make sure the latest version of Chart.js is included (for SVG support)
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
        
        chartScript.onload = () => {
            if (window.d3) {
                // Create force-directed graph visualization
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;
                
                // Clear canvas
                while (canvas.firstChild) {
                    canvas.removeChild(canvas.firstChild);
                }
                
                // Create SVG
                const svg = d3.select(canvas)
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height);
                
                // Create force simulation
                const simulation = d3.forceSimulation()
                    .force('charge', d3.forceManyBody().strength(-300))
                    .force('center', d3.forceCenter(width / 2, height / 2))
                    .force('link', d3.forceLink().id(d => d.id).distance(100));
                
                // Create groups for links and nodes
                const links = svg.append('g').selectAll('.link');
                const nodes = svg.append('g').selectAll('.node');
                
                // Zoom behavior
                const zoom = d3.zoom()
                    .scaleExtent([0.1, 4])
                    .on('zoom', (event) => {
                        svg.select('g').attr('transform', event.transform);
                    });
                
                svg.call(zoom);
                
                // Track memory graph
                memoryGraph = {
                    svg: svg,
                    simulation: simulation,
                    links: links,
                    nodes: nodes,
                    zoom: (scale) => {
                        svg.transition()
                            .duration(500)
                            .call(zoom.scaleTo, scale);
                    },
                    setLinkStrength: (strength) => {
                        simulation.force('link').strength(strength);
                        simulation.alpha(1).restart();
                    },
                    resetView: () => {
                        svg.transition()
                            .duration(750)
                            .call(zoom.transform, d3.zoomIdentity);
                    }
                };
                
                // Update with current memories
                updateMemoryGraph(component.state.get('memories'));
            } else {
                console.error('Failed to load D3.js');
                notifications.show(component, 'Error', 'Failed to load graph visualization library', 'error');
            }
        };
        
        chartScript.onerror = () => {
            console.error('Error loading D3.js');
            notifications.show(component, 'Error', 'Failed to load graph visualization library', 'error');
        };
        
        document.head.appendChild(chartScript);
    }
    
    /**
     * Update memory graph with filtered memory entries
     * @param {Array} memories - The filtered memory entries
     */
    function updateMemoryGraph(memories) {
        if (!memoryGraph || !memories) return;
        
        // Prepare graph data
        const nodes = [];
        const links = [];
        
        // Get compartments for lookup
        const compartments = component.state.get('compartments') || [];
        const compartmentMap = new Map(compartments.map(c => [c.id, c]));
        
        // Create nodes for memories
        memories.forEach(memory => {
            const compartment = compartmentMap.get(memory.compartment_id);
            const compartmentName = compartment ? compartment.name : 'Unknown';
            
            nodes.push({
                id: memory.id,
                title: memory.title || 'Untitled',
                compartment: compartmentName,
                type: 'memory',
                group: memory.compartment_id
            });
        });
        
        // Create nodes for compartments
        compartments.forEach(compartment => {
            if (memories.some(m => m.compartment_id === compartment.id)) {
                nodes.push({
                    id: `compartment-${compartment.id}`,
                    title: compartment.name,
                    type: 'compartment',
                    group: 'compartment'
                });
            }
        });
        
        // Create links between memories and compartments
        memories.forEach(memory => {
            if (memory.compartment_id) {
                links.push({
                    source: memory.id,
                    target: `compartment-${memory.compartment_id}`,
                    type: 'in-compartment'
                });
            }
            
            // Create links between memories with shared tags
            memories.forEach(otherMemory => {
                if (memory.id !== otherMemory.id && 
                    memory.tags && 
                    otherMemory.tags &&
                    memory.tags.some(tag => otherMemory.tags.includes(tag))) {
                    
                    links.push({
                        source: memory.id,
                        target: otherMemory.id,
                        type: 'shared-tag'
                    });
                }
            });
        });
        
        // Update graph
        const svg = memoryGraph.svg;
        const simulation = memoryGraph.simulation;
        
        // Update links
        const link = svg.select('g').selectAll('.link')
            .data(links, d => `${d.source}-${d.target}`)
            .join(
                enter => enter.append('line')
                    .attr('class', 'link')
                    .attr('stroke', d => d.type === 'in-compartment' ? '#555' : '#007acc')
                    .attr('stroke-opacity', 0.6)
                    .attr('stroke-width', d => d.type === 'in-compartment' ? 1 : 2),
                update => update,
                exit => exit.remove()
            );
        
        // Update nodes
        const node = svg.select('g').selectAll('.node')
            .data(nodes, d => d.id)
            .join(
                enter => {
                    const nodeGroup = enter.append('g')
                        .attr('class', 'node')
                        .call(d3.drag()
                            .on('start', dragstarted)
                            .on('drag', dragged)
                            .on('end', dragended));
                    
                    // Add circle for node
                    nodeGroup.append('circle')
                        .attr('r', d => d.type === 'compartment' ? 15 : 8)
                        .attr('fill', d => {
                            if (d.type === 'compartment') {
                                return '#444';
                            } else {
                                // Generate color based on compartment
                                const hue = hashString(d.group) % 360;
                                return `hsl(${hue}, 70%, 50%)`;
                            }
                        })
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1.5);
                    
                    // Add title text
                    nodeGroup.append('text')
                        .attr('dx', d => d.type === 'compartment' ? 18 : 10)
                        .attr('dy', '.35em')
                        .attr('fill', '#f0f0f0')
                        .text(d => d.title);
                    
                    // Add click handler for memory nodes
                    nodeGroup.filter(d => d.type === 'memory')
                        .on('click', (event, d) => {
                            component.state.set({
                                selectedMemoryId: d.id,
                                isMemoryModalOpen: true
                            });
                            
                            // Prevent event propagation
                            event.stopPropagation();
                        });
                    
                    return nodeGroup;
                },
                update => update,
                exit => exit.remove()
            );
        
        // Update simulation
        simulation.nodes(nodes)
            .on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('transform', d => `translate(${d.x},${d.y})`);
            });
        
        simulation.force('link').links(links);
        simulation.alpha(1).restart();
        
        // Drag handlers
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }
    
    /**
     * Generate a hash number from a string
     * @param {string} str - The string to hash
     * @returns {number} - The hash value
     */
    function hashString(str) {
        if (!str) return 0;
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    
    /**
     * Render compartment list
     * @param {Array} compartments - List of compartments
     * @param {string} selectedId - ID of selected compartment
     */
    function renderCompartmentList(compartments, selectedId) {
        const container = component.$('#compartment-list-container');
        
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        if (!compartments || !compartments.length) {
            container.innerHTML = `
                <div class="engram-empty-state">
                    <div class="engram-empty-state__icon">📁</div>
                    <h3 class="engram-empty-state__title">No Compartments</h3>
                    <p class="engram-empty-state__message">
                        No memory compartments exist yet. Create your first compartment
                        to begin organizing your memories.
                    </p>
                </div>
            `;
            return;
        }
        
        // Sort compartments by name
        const sortedCompartments = [...compartments].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        // Render each compartment
        sortedCompartments.forEach(compartment => {
            const compartmentItem = document.createElement('div');
            compartmentItem.className = 'engram-compartment-item';
            compartmentItem.setAttribute('data-id', compartment.id);
            
            if (selectedId === compartment.id) {
                compartmentItem.classList.add('engram-compartment-item--active');
            }
            
            compartmentItem.innerHTML = `
                <span class="engram-compartment-item__name">${compartment.name}</span>
                <span class="engram-compartment-item__count">${compartment.memory_count || 0}</span>
            `;
            
            container.appendChild(compartmentItem);
        });
    }
    
    /**
     * Render compartment details
     * @param {Object} compartment - The selected compartment
     */
    function renderCompartmentDetails(compartment) {
        const container = component.$('#compartment-details');
        
        if (!container) return;
        
        // Create details view
        container.innerHTML = `
            <div class="engram-compartment-details">
                <div class="engram-compartment-details__header">
                    <h2 class="engram-compartment-details__title">${compartment.name}</h2>
                    <p class="engram-compartment-details__description">${compartment.description || 'No description provided.'}</p>
                    
                    <div class="engram-compartment-details__meta">
                        <div class="engram-compartment-meta-item">
                            <span class="engram-compartment-meta-item__label">Type</span>
                            <span class="engram-compartment-meta-item__value">${compartment.type || 'General'}</span>
                        </div>
                        
                        <div class="engram-compartment-meta-item">
                            <span class="engram-compartment-meta-item__label">Memories</span>
                            <span class="engram-compartment-meta-item__value">${compartment.memory_count || 0}</span>
                        </div>
                        
                        <div class="engram-compartment-meta-item">
                            <span class="engram-compartment-meta-item__label">Retention</span>
                            <span class="engram-compartment-meta-item__value">${compartment.retention_days || 'Unlimited'} days</span>
                        </div>
                        
                        <div class="engram-compartment-meta-item">
                            <span class="engram-compartment-meta-item__label">Created</span>
                            <span class="engram-compartment-meta-item__value">${new Date(compartment.created_at || Date.now()).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="engram-compartment-content">
                    <h3>Recent Memories</h3>
                    <div class="engram-compartment-memories" id="compartment-memories">
                        <p class="engram-compartment-memories__loading">Loading memories...</p>
                    </div>
                </div>
                
                <div class="engram-compartment-actions">
                    <button class="engram-button" id="edit-compartment" data-id="${compartment.id}">Edit</button>
                    <button class="engram-button engram-button--danger" id="delete-compartment" data-id="${compartment.id}">Delete</button>
                </div>
            </div>
        `;
        
        // Add event listeners for compartment actions
        const editButton = container.querySelector('#edit-compartment');
        const deleteButton = container.querySelector('#delete-compartment');
        
        if (editButton) {
            editButton.addEventListener('click', () => {
                // TODO: Implement compartment editing
                notifications.show(component, 'Info', 'Compartment editing is not yet implemented', 'info', 3000);
            });
        }
        
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete the compartment "${compartment.name}"? This will delete all memories in this compartment.`)) {
                    deleteCompartment(compartment.id);
                }
            });
        }
        
        // Load compartment memories
        loadCompartmentMemories(compartment.id);
    }
    
    /**
     * Load memories for a specific compartment
     * @param {string} compartmentId - The compartment ID
     */
    async function loadCompartmentMemories(compartmentId) {
        if (!engramService) return;
        
        const container = component.$('#compartment-memories');
        
        if (!container) return;
        
        try {
            const options = {
                compartment: compartmentId,
                limit: 10,
                sort: 'timestamp:desc'
            };
            
            const memories = await engramService.getEntries(options);
            
            if (!memories || memories.length === 0) {
                container.innerHTML = `
                    <p class="engram-compartment-memories__empty">
                        No memories in this compartment yet.
                    </p>
                `;
                return;
            }
            
            // Render memories
            container.innerHTML = '';
            
            memories.forEach(memory => {
                const memoryItem = document.createElement('div');
                memoryItem.className = 'engram-memory-item';
                memoryItem.setAttribute('data-id', memory.id);
                
                const date = memory.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown date';
                
                memoryItem.innerHTML = `
                    <div class="engram-memory-item__header">
                        <h3 class="engram-memory-item__title">${memory.title || 'Untitled'}</h3>
                        <span class="engram-memory-item__date">${date}</span>
                    </div>
                    <div class="engram-memory-item__content">${memory.content || 'No content'}</div>
                    <div class="engram-memory-item__meta">
                        <div class="engram-memory-item__tags">
                            ${(memory.tags || []).map(tag => `
                                <span class="engram-tag">${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                memoryItem.addEventListener('click', () => {
                    component.state.set({
                        selectedMemoryId: memory.id,
                        isMemoryModalOpen: true
                    });
                });
                
                container.appendChild(memoryItem);
            });
        } catch (error) {
            console.error('Error loading compartment memories:', error);
            container.innerHTML = `
                <p class="engram-compartment-memories__error">
                    Failed to load memories: ${error.message}
                </p>
            `;
        }
    }
    
    /**
     * Delete a compartment
     * @param {string} compartmentId - The compartment ID
     */
    async function deleteCompartment(compartmentId) {
        if (!engramService) return;
        
        const loadingIndicator = loading.show(component, 'Deleting compartment...');
        
        try {
            await engramService.deleteCompartment(compartmentId);
            
            // Update state
            const compartments = component.state.get('compartments').filter(c => c.id !== compartmentId);
            component.state.set({
                compartments,
                selectedCompartmentId: null
            });
            
            // Update compartment filters
            updateCompartmentFilters(compartments);
            
            loading.hide(component);
            notifications.show(component, 'Success', 'Compartment deleted successfully', 'success', 3000);
        } catch (error) {
            loading.hide(component);
            console.error('Error deleting compartment:', error);
            notifications.show(component, 'Error', 'Failed to delete compartment', 'error');
        }
    }
    
    /**
     * Render search results
     * @param {Array} results - The search results
     */
    function renderSearchResults(results) {
        const container = component.$('#search-results-container');
        
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="engram-empty-state">
                    <div class="engram-empty-state__icon">🔍</div>
                    <h3 class="engram-empty-state__title">No Results Found</h3>
                    <p class="engram-empty-state__message">
                        Try a different search query or change your search filters.
                    </p>
                </div>
            `;
            return;
        }
        
        // Get compartments for lookup
        const compartments = component.state.get('compartments') || [];
        const compartmentMap = new Map(compartments.map(c => [c.id, c]));
        
        // Render each search result
        results.forEach(result => {
            const memory = result.entry || {};
            const score = result.score ? Math.round(result.score * 100) / 100 : null;
            
            const compartment = compartmentMap.get(memory.compartment_id);
            const compartmentName = compartment ? compartment.name : 'Unknown';
            
            const resultItem = document.createElement('div');
            resultItem.className = 'engram-search-result';
            resultItem.setAttribute('data-id', memory.id);
            
            const date = memory.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown date';
            
            resultItem.innerHTML = `
                <div class="engram-search-result__header">
                    <h3 class="engram-search-result__title">${memory.title || 'Untitled'}</h3>
                    ${score !== null ? `<span class="engram-search-result__score">Score: ${score}</span>` : ''}
                </div>
                ${result.highlight ? `
                    <div class="engram-search-result__highlight">${result.highlight}</div>
                ` : `
                    <div class="engram-search-result__content">${memory.content ? memory.content.substring(0, 150) + '...' : 'No content'}</div>
                `}
                <div class="engram-search-result__meta">
                    <span class="engram-search-result__date">${date}</span>
                    <span class="engram-search-result__compartment">Compartment: ${compartmentName}</span>
                </div>
            `;
            
            container.appendChild(resultItem);
        });
    }
    
    /**
     * Render search history
     * @param {Array} history - The search history entries
     */
    function renderSearchHistory(history) {
        const container = component.$('#search-history-container');
        
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="engram-search-history__placeholder">
                    Your recent searches will appear here
                </div>
            `;
            return;
        }
        
        // Render each history item
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'engram-search-history-item';
            historyItem.setAttribute('data-query', item.query);
            historyItem.setAttribute('data-type', item.type);
            
            historyItem.innerHTML = `
                <span class="engram-search-history-item__query">${item.query}</span>
                <span class="engram-search-history-item__type">${item.type}</span>
                <span class="engram-search-history-item__repeat">↻</span>
            `;
            
            container.appendChild(historyItem);
        });
    }
    
    /**
     * Initialize charts for the statistics tab
     */
    function initCharts() {
        // Skip if charts are already initialized or stats tab is not active
        if (component.state.get('activeTab') !== 'statistics') return;
        
        // Ensure Chart.js is loaded
        if (!window.Chart) {
            const chartScript = document.createElement('script');
            chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            
            chartScript.onload = () => {
                if (window.Chart) {
                    createCharts();
                    updateCharts(component.state.get('statistics'));
                } else {
                    console.error('Failed to load Chart.js');
                    notifications.show(component, 'Error', 'Failed to load chart library', 'error');
                }
            };
            
            chartScript.onerror = () => {
                console.error('Error loading Chart.js');
                notifications.show(component, 'Error', 'Failed to load chart library', 'error');
            };
            
            document.head.appendChild(chartScript);
        } else {
            createCharts();
            updateCharts(component.state.get('statistics'));
        }
    }
    
    /**
     * Create chart instances
     */
    function createCharts() {
        // Memory Growth Chart
        const memoryGrowthCtx = component.$('#memory-growth-chart');
        if (memoryGrowthCtx && !memoryGrowthChart) {
            memoryGrowthChart = new Chart(memoryGrowthCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Memory Growth',
                        data: [],
                        borderColor: '#007acc',
                        backgroundColor: 'rgba(0, 122, 204, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Total Memories'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        }
        
        // Compartment Distribution Chart
        const compartmentDistributionCtx = component.$('#compartment-distribution-chart');
        if (compartmentDistributionCtx && !compartmentDistributionChart) {
            compartmentDistributionChart = new Chart(compartmentDistributionCtx, {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#007acc', '#5aa9e6', '#7fc8f8', '#add8e6', '#90ee90',
                            '#ffb347', '#ff6961', '#cb99c9', '#fdfd96', '#c1e1c1'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // Access Frequency Chart
        const accessFrequencyCtx = component.$('#access-frequency-chart');
        if (accessFrequencyCtx && !accessFrequencyChart) {
            accessFrequencyChart = new Chart(accessFrequencyCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Access Count',
                        data: [],
                        backgroundColor: '#5aa9e6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Access Count'
                            }
                        }
                    }
                }
            });
        }
        
        // Tag Distribution Chart
        const tagDistributionCtx = component.$('#tag-distribution-chart');
        if (tagDistributionCtx && !tagDistributionChart) {
            tagDistributionChart = new Chart(tagDistributionCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Tag Count',
                        data: [],
                        backgroundColor: '#cb99c9'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count'
                            }
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Update charts with statistics data
     * @param {Object} statistics - The statistics data
     */
    function updateCharts(statistics) {
        if (!statistics) return;
        
        // Update overview cards
        updateStatsOverview(statistics);
        
        // Update Memory Growth Chart
        if (memoryGrowthChart && statistics.memory_growth) {
            const data = statistics.memory_growth;
            
            memoryGrowthChart.data.labels = data.map(d => new Date(d.date).toLocaleDateString());
            memoryGrowthChart.data.datasets[0].data = data.map(d => d.count);
            memoryGrowthChart.update();
        }
        
        // Update Compartment Distribution Chart
        if (compartmentDistributionChart && statistics.compartment_distribution) {
            const distribution = statistics.compartment_distribution;
            const labels = Object.keys(distribution);
            const data = Object.values(distribution);
            
            compartmentDistributionChart.data.labels = labels;
            compartmentDistributionChart.data.datasets[0].data = data;
            compartmentDistributionChart.update();
        }
        
        // Update Access Frequency Chart
        if (accessFrequencyChart && statistics.access_frequency) {
            const data = statistics.access_frequency;
            
            accessFrequencyChart.data.labels = data.map(d => new Date(d.date).toLocaleDateString());
            accessFrequencyChart.data.datasets[0].data = data.map(d => d.count);
            accessFrequencyChart.update();
        }
        
        // Update Tag Distribution Chart
        if (tagDistributionChart && statistics.tag_distribution) {
            const distribution = statistics.tag_distribution;
            
            // Sort by count and take top 15
            const tagData = Object.entries(distribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15);
            
            tagDistributionChart.data.labels = tagData.map(d => d[0]);
            tagDistributionChart.data.datasets[0].data = tagData.map(d => d[1]);
            tagDistributionChart.update();
        }
    }
    
    /**
     * Update statistics overview cards
     * @param {Object} statistics - The statistics data
     */
    function updateStatsOverview(statistics) {
        if (!statistics) return;
        
        // Total Memories
        const totalMemoriesCard = component.$('#total-memories-card');
        if (totalMemoriesCard) {
            const valueElement = totalMemoriesCard.querySelector('.engram-stats-card__value');
            const trendElement = totalMemoriesCard.querySelector('.engram-stats-card__trend');
            
            if (valueElement) {
                valueElement.textContent = statistics.total_memories || '0';
            }
            
            if (trendElement && statistics.memory_growth && statistics.memory_growth.length >= 2) {
                const latest = statistics.memory_growth[statistics.memory_growth.length - 1].count;
                const previous = statistics.memory_growth[statistics.memory_growth.length - 2].count;
                const change = latest - previous;
                const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;
                
                if (change > 0) {
                    trendElement.textContent = `+${change} (+${percentage}%) since last week`;
                    trendElement.classList.add('engram-stats-card__trend--positive');
                } else if (change < 0) {
                    trendElement.textContent = `${change} (${percentage}%) since last week`;
                    trendElement.classList.add('engram-stats-card__trend--negative');
                } else {
                    trendElement.textContent = 'No change since last week';
                }
            }
        }
        
        // Total Compartments
        const totalCompartmentsCard = component.$('#total-compartments-card');
        if (totalCompartmentsCard) {
            const valueElement = totalCompartmentsCard.querySelector('.engram-stats-card__value');
            
            if (valueElement) {
                valueElement.textContent = statistics.total_compartments || '0';
            }
        }
        
        // Recent Activity
        const recentActivityCard = component.$('#recent-activity-card');
        if (recentActivityCard && statistics.recent_activity) {
            const valueElement = recentActivityCard.querySelector('.engram-stats-card__value');
            const trendElement = recentActivityCard.querySelector('.engram-stats-card__trend');
            
            if (valueElement) {
                valueElement.textContent = statistics.recent_activity.count || '0';
            }
            
            if (trendElement && statistics.recent_activity.trend) {
                const trend = statistics.recent_activity.trend;
                if (trend > 0) {
                    trendElement.textContent = `+${trend}% compared to last week`;
                    trendElement.classList.add('engram-stats-card__trend--positive');
                } else if (trend < 0) {
                    trendElement.textContent = `${trend}% compared to last week`;
                    trendElement.classList.add('engram-stats-card__trend--negative');
                } else {
                    trendElement.textContent = 'Same as last week';
                }
            }
        }
        
        // Memory Usage
        const memoryUsageCard = component.$('#memory-usage-card');
        if (memoryUsageCard && statistics.memory_usage) {
            const valueElement = memoryUsageCard.querySelector('.engram-stats-card__value');
            const percentageElement = memoryUsageCard.querySelector('.engram-stats-card__percentage');
            
            if (valueElement) {
                const usedMB = Math.round(statistics.memory_usage.used / (1024 * 1024) * 100) / 100;
                const totalMB = Math.round(statistics.memory_usage.total / (1024 * 1024) * 100) / 100;
                
                valueElement.textContent = `${usedMB} MB / ${totalMB} MB`;
            }
            
            if (percentageElement && statistics.memory_usage.percentage) {
                percentageElement.style.setProperty('--percentage', `${statistics.memory_usage.percentage}%`);
            }
        }
    }
    
    /**
     * Show memory modal with details
     * @param {string} memoryId - The memory entry ID
     */
    async function showMemoryModal(memoryId) {
        const modal = component.$('#memory-modal');
        
        if (!modal) return;
        
        modal.style.display = 'flex';
        
        const modalBody = component.$('#memory-modal-body');
        if (!modalBody) return;
        
        // Show loading state
        modalBody.innerHTML = `
            <div class="engram-loading">
                Loading memory details...
            </div>
        `;
        
        try {
            const memory = await engramService.getMemoryEntry(memoryId);
            
            // Get compartment info
            const compartments = component.state.get('compartments') || [];
            const compartment = compartments.find(c => c.id === memory.compartment_id);
            const compartmentName = compartment ? compartment.name : 'Unknown';
            
            // Format date
            const date = memory.timestamp ? new Date(memory.timestamp).toLocaleString() : 'Unknown date';
            const lastAccessed = memory.last_accessed ? new Date(memory.last_accessed).toLocaleString() : 'Never';
            
            // Update modal title
            const modalTitle = component.$('#memory-modal-title');
            if (modalTitle) {
                modalTitle.textContent = memory.title || 'Memory Details';
            }
            
            // Update modal body
            modalBody.innerHTML = `
                <div class="engram-memory-detail">
                    <div class="engram-memory-detail__content">
                        ${memory.content || 'No content'}
                    </div>
                    
                    <div class="engram-memory-detail__metadata">
                        <div class="engram-memory-detail__meta-item">
                            <span class="engram-memory-detail__meta-label">Compartment</span>
                            <span class="engram-memory-detail__meta-value">${compartmentName}</span>
                        </div>
                        
                        <div class="engram-memory-detail__meta-item">
                            <span class="engram-memory-detail__meta-label">Created</span>
                            <span class="engram-memory-detail__meta-value">${date}</span>
                        </div>
                        
                        <div class="engram-memory-detail__meta-item">
                            <span class="engram-memory-detail__meta-label">Last Accessed</span>
                            <span class="engram-memory-detail__meta-value">${lastAccessed}</span>
                        </div>
                        
                        <div class="engram-memory-detail__meta-item">
                            <span class="engram-memory-detail__meta-label">Importance</span>
                            <span class="engram-memory-detail__meta-value">${memory.importance || 'Medium'}</span>
                        </div>
                    </div>
                    
                    ${memory.tags && memory.tags.length > 0 ? `
                        <div class="engram-memory-detail__meta-item">
                            <span class="engram-memory-detail__meta-label">Tags</span>
                            <div class="engram-memory-detail__tags">
                                ${memory.tags.map(tag => `
                                    <span class="engram-tag">${tag}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${memory.metadata && Object.keys(memory.metadata).length > 0 ? `
                        <div class="engram-memory-detail__meta-section">
                            <h3 class="engram-memory-detail__section-title">Metadata</h3>
                            <table class="engram-memory-detail__meta-table">
                                <tbody>
                                    ${Object.entries(memory.metadata).map(([key, value]) => `
                                        <tr>
                                            <td>${key}</td>
                                            <td>${value}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.error('Error loading memory details:', error);
            
            modalBody.innerHTML = `
                <div class="engram-error">
                    <h3>Error Loading Memory</h3>
                    <p>Failed to load memory details: ${error.message}</p>
                </div>
            `;
        }
    }
    
    /**
     * Hide memory modal
     */
    function hideMemoryModal() {
        const modal = component.$('#memory-modal');
        
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Show compartment modal
     */
    function showCompartmentModal() {
        const modal = component.$('#compartment-modal');
        
        if (modal) {
            modal.style.display = 'flex';
            
            // Reset form
            const form = component.$('#compartment-form');
            if (form) {
                form.reset();
            }
            
            // Focus on name field
            const nameField = component.$('#compartment-name');
            if (nameField) {
                setTimeout(() => {
                    nameField.focus();
                }, 100);
            }
        }
    }
    
    /**
     * Hide compartment modal
     */
    function hideCompartmentModal() {
        const modal = component.$('#compartment-modal');
        
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Show memory edit modal
     * @param {Object} memory - The memory data to edit
     */
    function showMemoryEditModal(memory) {
        const modal = component.$('#memory-edit-modal');
        
        if (!modal) return;
        
        modal.style.display = 'flex';
        
        // Set form values
        const titleField = component.$('#memory-title');
        const contentField = component.$('#memory-content');
        const compartmentField = component.$('#memory-compartment');
        const tagsField = component.$('#memory-tags');
        const importanceField = component.$('#memory-importance');
        
        if (titleField) titleField.value = memory.title || '';
        if (contentField) contentField.value = memory.content || '';
        if (compartmentField) compartmentField.value = memory.compartmentId || '';
        if (tagsField) tagsField.value = (memory.tags || []).join(', ');
        if (importanceField) importanceField.value = memory.importance || 'medium';
        
        // Set up metadata fields
        const metadataContainer = component.$('#memory-metadata');
        if (metadataContainer) {
            // Clear existing rows except the add button
            const addButton = component.$('#add-metadata');
            while (metadataContainer.firstChild && metadataContainer.firstChild !== addButton) {
                metadataContainer.removeChild(metadataContainer.firstChild);
            }
            
            // Add metadata rows
            if (memory.metadata && Object.keys(memory.metadata).length > 0) {
                Object.entries(memory.metadata).forEach(([key, value]) => {
                    const row = document.createElement('div');
                    row.className = 'engram-metadata-row';
                    
                    row.innerHTML = `
                        <input type="text" class="engram-metadata-key" placeholder="Key" value="${key}">
                        <input type="text" class="engram-metadata-value" placeholder="Value" value="${value}">
                        <button type="button" class="engram-metadata-remove">×</button>
                    `;
                    
                    // Insert before the add button
                    metadataContainer.insertBefore(row, addButton);
                });
            } else {
                // Add one empty row
                const row = document.createElement('div');
                row.className = 'engram-metadata-row';
                
                row.innerHTML = `
                    <input type="text" class="engram-metadata-key" placeholder="Key">
                    <input type="text" class="engram-metadata-value" placeholder="Value">
                    <button type="button" class="engram-metadata-remove">×</button>
                `;
                
                // Insert before the add button
                metadataContainer.insertBefore(row, addButton);
            }
        }
        
        // Focus on title field
        if (titleField) {
            setTimeout(() => {
                titleField.focus();
            }, 100);
        }
    }
    
    /**
     * Hide memory edit modal
     */
    function hideMemoryEditModal() {
        const modal = component.$('#memory-edit-modal');
        
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Show service error message when Engram service is not available
     */
    function showServiceError() {
        const errorHtml = `
            <div class="engram-error-state">
                <div class="engram-error-state__icon">⚠️</div>
                <h2 class="engram-error-state__title">Engram Service Unavailable</h2>
                <p class="engram-error-state__message">
                    Unable to connect to the Engram memory service. Please check that the service
                    is running and try refreshing the page.
                </p>
                <div class="engram-error-state__details">
                    <h3>Troubleshooting Steps:</h3>
                    <ol>
                        <li>Verify that the Engram API is running using <code>tekton-status</code></li>
                        <li>Check the console for specific error messages</li>
                        <li>Ensure the Engram service is registered with Hermes</li>
                        <li>Try restarting the Tekton UI</li>
                    </ol>
                </div>
            </div>
        `;
        
        // Replace content in each tab panel
        const tabPanels = component.$$('.engram-tab-panel');
        tabPanels.forEach(panel => {
            panel.innerHTML = errorHtml;
        });
    }
    
    /*******************************************************************************
     * Event Handlers
     *******************************************************************************/
    
    /**
     * Handle service connection event
     * @param {Event} event - Connection event
     */
    function handleServiceConnected(event) {
        console.log('Connected to Engram service:', event.detail);
        notifications.show(component, 'Connected', 'Connected to Engram service', 'success', 3000);
    }
    
    /**
     * Handle service connection failure
     * @param {Event} event - Connection failure event
     */
    function handleConnectionFailed(event) {
        console.error('Failed to connect to Engram service:', event.detail);
        notifications.show(component, 'Connection Failed', `Could not connect to Engram: ${event.detail.message}`, 'error');
    }
    
    /**
     * Handle memory updates from service
     * @param {Event} event - Memory update event
     */
    function handleMemoryUpdated(event) {
        console.log('Memory updated:', event.detail);
        
        const { type, data } = event.detail;
        
        // Update local state based on update type
        if (type === 'memory_created') {
            const memories = [data, ...component.state.get('memories')];
            component.state.set('memories', memories);
        } else if (type === 'memory_updated') {
            const memories = component.state.get('memories').map(m => 
                m.id === data.id ? data : m
            );
            component.state.set('memories', memories);
            
            // If this is the selected memory, update modal
            if (component.state.get('selectedMemoryId') === data.id && 
                component.state.get('isMemoryModalOpen')) {
                showMemoryModal(data.id);
            }
        } else if (type === 'memory_deleted') {
            const memories = component.state.get('memories').filter(m => 
                m.id !== data.id
            );
            component.state.set('memories', memories);
            
            // If this is the selected memory, close modal
            if (component.state.get('selectedMemoryId') === data.id && 
                component.state.get('isMemoryModalOpen')) {
                component.state.set('isMemoryModalOpen', false);
            }
        }
    }
    
    /**
     * Handle compartment updates from service
     * @param {Event} event - Compartment update event
     */
    function handleCompartmentUpdated(event) {
        console.log('Compartment updated:', event.detail);
        
        const { type, data } = event.detail;
        
        // Update local state based on update type
        if (type === 'compartment_created') {
            const compartments = [...component.state.get('compartments'), data];
            component.state.set('compartments', compartments);
            
            // Update compartment filters
            updateCompartmentFilters(compartments);
        } else if (type === 'compartment_updated') {
            const compartments = component.state.get('compartments').map(c => 
                c.id === data.id ? data : c
            );
            component.state.set('compartments', compartments);
            
            // Update compartment filters
            updateCompartmentFilters(compartments);
            
            // If this is the selected compartment, update details
            if (component.state.get('selectedCompartmentId') === data.id) {
                renderCompartmentDetails(data);
            }
        } else if (type === 'compartment_deleted') {
            const compartments = component.state.get('compartments').filter(c => 
                c.id !== data.id
            );
            component.state.set('compartments', compartments);
            
            // Update compartment filters
            updateCompartmentFilters(compartments);
            
            // If this is the selected compartment, clear selection
            if (component.state.get('selectedCompartmentId') === data.id) {
                component.state.set('selectedCompartmentId', null);
            }
        }
    }
    
    /**
     * Handle statistics updates from service
     * @param {Event} event - Statistics update event
     */
    function handleStatisticsUpdated(event) {
        console.log('Statistics updated:', event.detail);
        
        // Update statistics in state
        component.state.set('statistics', event.detail.data);
        
        // Update charts if on statistics tab
        if (component.state.get('activeTab') === 'statistics') {
            updateCharts(event.detail.data);
        }
    }
    
    /**
     * Handle WebSocket connection
     * @param {Event} event - WebSocket connection event
     */
    function handleWebSocketConnected(event) {
        console.log('WebSocket connected:', event.detail);
        // Optionally show a notification or update UI
    }
    
    /**
     * Handle WebSocket disconnection
     * @param {Event} event - WebSocket disconnection event
     */
    function handleWebSocketDisconnected(event) {
        console.log('WebSocket disconnected:', event.detail);
        // Optionally show a notification or update UI
    }
    
    /**
     * Handle service errors
     * @param {Event} event - Error event
     */
    function handleServiceError(event) {
        console.error('Engram service error:', event.detail);
        notifications.show(component, 'Error', event.detail.message, 'error');
    }
    
    /**
     * Clean up component resources
     */
    function cleanupComponent() {
        console.log('Cleaning up Engram component');
        
        // Remove event listeners from the service
        if (engramService) {
            engramService.removeEventListener('connected', handleServiceConnected);
            engramService.removeEventListener('connectionFailed', handleConnectionFailed);
            engramService.removeEventListener('memoryUpdated', handleMemoryUpdated);
            engramService.removeEventListener('compartmentUpdated', handleCompartmentUpdated);
            engramService.removeEventListener('statisticsUpdated', handleStatisticsUpdated);
            engramService.removeEventListener('websocketConnected', handleWebSocketConnected);
            engramService.removeEventListener('websocketDisconnected', handleWebSocketDisconnected);
            engramService.removeEventListener('error', handleServiceError);
        }
        
        // Destroy charts if they exist
        if (memoryGrowthChart) {
            memoryGrowthChart.destroy();
            memoryGrowthChart = null;
        }
        
        if (compartmentDistributionChart) {
            compartmentDistributionChart.destroy();
            compartmentDistributionChart = null;
        }
        
        if (accessFrequencyChart) {
            accessFrequencyChart.destroy();
            accessFrequencyChart = null;
        }
        
        if (tagDistributionChart) {
            tagDistributionChart.destroy();
            tagDistributionChart = null;
        }
        
        // Clear references
        memoryGraph = null;
    }
    
    // Initialize the component
    initComponent();
    
})(component);