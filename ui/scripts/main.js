/**
 * Main JavaScript file for Tekton UI
 * Handles core functionality and initialization
 */

// Global tektonUI object for public API
window.tektonUI = {
    activeComponent: 'tekton',
    activePanel: 'terminal',
    debug: true, // Enable debug logging
    
    // Debug logging
    log: function(message, data = null) {
        if (!this.debug) return;
        
        const timestamp = new Date().toISOString();
        const component = "TektonUI";
        
        if (data) {
            console.log(`[${timestamp}] [${component}] ${message}`, data);
        } else {
            console.log(`[${timestamp}] [${component}] ${message}`);
        }
    },
    
    // Methods that will be exposed to component UIs
    sendCommand: function(command, params = {}) {
        this.log(`Sending command: ${command}`, params);
        
        if (window.websocketManager) {
            websocketManager.sendMessage({
                type: "COMMAND",
                source: "UI",
                target: this.activeComponent,
                timestamp: new Date().toISOString(),
                payload: {
                    command: command,
                    ...params
                }
            });
        } else {
            console.error("WebSocket not initialized");
            if (window.terminalManager) {
                terminalManager.write("Error: WebSocket not initialized. Command could not be sent.", false);
            }
        }
    },
    
    switchComponent: function(componentId) {
        if (componentId && componentId !== this.activeComponent) {
            this.log(`Switching component from ${this.activeComponent} to ${componentId}`);
            uiManager.activateComponent(componentId);
        }
    },
    
    updateTerminal: function(text, isCommand = false) {
        if (window.terminalManager) {
            this.log(`Updating terminal${isCommand ? ' (command)' : ''}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
            terminalManager.write(text, isCommand);
        } else {
            console.error("Terminal manager not initialized");
        }
    },
    
    showError: function(message) {
        this.log(`Showing error: ${message}`);
        
        // Also write to terminal if available
        if (window.terminalManager) {
            terminalManager.write(`ERROR: ${message}`, false);
        }
        
        const errorContainer = document.getElementById('error-container');
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    },
    
    showModal: function(title, content) {
        this.log(`Showing modal: ${title}`);
        
        const modal = document.getElementById('system-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'block';
    },
    
    hideModal: function() {
        this.log('Hiding modal');
        
        const modal = document.getElementById('system-modal');
        modal.style.display = 'none';
    }
};

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check for cache-busting version to ensure fresh content
    fetch('./.cache-version?' + new Date().getTime())
        .then(response => response.text())
        .then(version => {
            console.log('UI Version:', version);
            
            if (window.terminalManager) {
                terminalManager.write(`Tekton UI Version: ${version}`);
            }
        })
        .catch(() => console.log('No cache version file found, using existing files'));
    
    // Initialize UI manager
    window.uiManager = new UIManager();
    uiManager.init();
    
    // Initialize terminal
    window.terminalManager = new TerminalManager('terminal');
    terminalManager.init();
    
    // Initialize localStorage manager
    window.storageManager = new StorageManager();
    
    // Initialize WebSocket connection
    window.websocketManager = new WebSocketManager();
    websocketManager.connect();
    
    // Set up button handlers
    document.getElementById('budget-button').addEventListener('click', function() {
        tektonUI.showModal('Budget', '<div class="budget-panel"><h3>Resource Usage</h3><p>AI Credits: 2,450 / 5,000</p><p>Storage: 1.2 GB / 10 GB</p><p>API Calls: 325 / 1,000</p></div>');
    });
    
    document.getElementById('profile-button').addEventListener('click', function() {
        tektonUI.showModal('Profile', '<div class="profile-panel"><h3>User Profile</h3><p>Name: Admin User</p><p>Role: System Administrator</p><p>Last Login: Today at 12:34 PM</p></div>');
    });
    
    // Settings button now opens the settings panel instead of a modal
    document.getElementById('settings-button').addEventListener('click', function() {
        if (window.uiManager) {
            uiManager.showSettingsPanel();
        }
    });
    
    // Set up status indicators for demo
    setTimeout(() => {
        // Add some status indicators for demonstration
        document.querySelector('.nav-item[data-component="telos"] .status-indicator').classList.add('active');
        document.querySelector('.nav-item[data-component="codex"] .status-indicator').classList.add('attention');
        
        // After a bit longer, add an alert
        setTimeout(() => {
            document.querySelector('.nav-item[data-component="engram"] .status-indicator').classList.add('alert');
        }, 5000);
    }, 2000);
    
    // Set up modal close button
    document.querySelector('.close-modal').addEventListener('click', function() {
        tektonUI.hideModal();
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('system-modal');
        if (event.target === modal) {
            tektonUI.hideModal();
        }
    });
    
    // Theme and settings will now be handled by the settings manager
    // Load saved debug mode preference for compatibility
    const savedDebugMode = storageManager.getItem('debug_mode');
    if (savedDebugMode !== null) {
        tektonUI.debug = savedDebugMode === 'true';
        
        if (window.terminalManager) {
            terminalManager.debugMode = tektonUI.debug;
        }
    }
    
    // Notify user of initialization in terminal
    if (window.terminalManager) {
        terminalManager.write("Tekton Terminal UI initialized");
        terminalManager.write(`Debug mode: ${tektonUI.debug ? 'enabled' : 'disabled'}`);
        terminalManager.write("Type 'help' for available commands");
        
        // Focus terminal input when the terminal container is clicked
        const terminalContainer = document.getElementById('terminal');
        if (terminalContainer) {
            terminalContainer.addEventListener('click', (e) => {
                console.log('Terminal container clicked, focusing input');
                if (window.terminalManager) {
                    terminalManager.focusInput();
                }
                
                // Prevent event propagation
                e.stopPropagation();
            });
        }
        
        // Also focus on document click
        document.addEventListener('click', (e) => {
            // If the terminal panel is active, try to focus the input
            if (tektonUI.activePanel === 'terminal' && window.terminalManager) {
                console.log('Document clicked, focusing terminal input');
                setTimeout(() => terminalManager.focusInput(), 10);
            }
        });
    }
    
    tektonUI.log('Tekton UI initialized');
});