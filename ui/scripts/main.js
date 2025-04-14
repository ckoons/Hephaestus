/**
 * Main JavaScript file for Tekton UI
 * Handles core functionality and initialization
 */

// Global tektonUI object for public API
window.tektonUI = {
    activeComponent: 'tekton',
    activePanel: 'terminal',
    
    // Methods that will be exposed to component UIs
    sendCommand: function(command, params = {}) {
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
        }
    },
    
    switchComponent: function(componentId) {
        if (componentId && componentId !== this.activeComponent) {
            uiManager.activateComponent(componentId);
        }
    },
    
    updateTerminal: function(text, isCommand = false) {
        if (window.terminalManager) {
            terminalManager.write(text, isCommand);
        }
    },
    
    showError: function(message) {
        const errorContainer = document.getElementById('error-container');
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    },
    
    showModal: function(title, content) {
        const modal = document.getElementById('system-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'block';
    },
    
    hideModal: function() {
        const modal = document.getElementById('system-modal');
        modal.style.display = 'none';
    }
};

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Set up settings buttons
    document.getElementById('budget-button').addEventListener('click', function() {
        tektonUI.showModal('Budget', '<div class="budget-panel"><h3>Resource Usage</h3><p>AI Credits: 2,450 / 5,000</p><p>Storage: 1.2 GB / 10 GB</p><p>API Calls: 325 / 1,000</p></div>');
    });
    
    document.getElementById('profile-button').addEventListener('click', function() {
        tektonUI.showModal('Profile', '<div class="profile-panel"><h3>User Profile</h3><p>Name: Admin User</p><p>Role: System Administrator</p><p>Last Login: Today at 12:34 PM</p></div>');
    });
    
    document.getElementById('settings-button').addEventListener('click', function() {
        // Include theme toggle in settings
        const currentTheme = document.querySelector('body').classList.contains('theme-dark') ? 'dark' : 'light';
        
        tektonUI.showModal('Settings', `
            <div class="settings-panel">
                <h3>System Settings</h3>
                <div class="setting-row">
                    <label>Theme:</label>
                    <select id="theme-select">
                        <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
                    </select>
                </div>
                <div class="setting-row">
                    <label>AI Model:</label>
                    <select>
                        <option>Claude</option>
                        <option>Ollama</option>
                    </select>
                </div>
                <div class="setting-row">
                    <label>Debug Mode:</label>
                    <input type="checkbox">
                </div>
                <button class="settings-save" id="save-settings">Save Settings</button>
            </div>
        `);
        
        // Add event listener to the save button
        setTimeout(() => {
            document.getElementById('save-settings').addEventListener('click', function() {
                const themeSelect = document.getElementById('theme-select');
                const selectedTheme = themeSelect.value;
                const body = document.querySelector('body');
                const stylesheet = document.getElementById('theme-stylesheet');
                
                if (selectedTheme === 'light' && body.classList.contains('theme-dark')) {
                    body.classList.replace('theme-dark', 'theme-light');
                    stylesheet.href = 'styles/themes/light.css';
                    storageManager.setItem('theme', 'light');
                } else if (selectedTheme === 'dark' && body.classList.contains('theme-light')) {
                    body.classList.replace('theme-light', 'theme-dark');
                    stylesheet.href = 'styles/themes/dark.css';
                    storageManager.setItem('theme', 'dark');
                }
                
                tektonUI.hideModal();
            });
        }, 100);
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
    
    // Load saved theme preference
    const savedTheme = storageManager.getItem('theme') || 'dark';
    const body = document.querySelector('body');
    const stylesheet = document.getElementById('theme-stylesheet');
    
    if (savedTheme === 'light') {
        body.classList.replace('theme-dark', 'theme-light');
        stylesheet.href = 'styles/themes/light.css';
    }
    
    // Set up chat input functionality
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    
    // Auto-resize textarea as user types
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        // Save draft as user types
        storageManager.setInputContext(tektonUI.activeComponent, this.value);
    });
    
    // Handle sending messages
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // Save to terminal history
            terminalManager.write(`> ${message}`, true);
            
            // Send via websocket
            tektonUI.sendCommand('process_message', { message: message });
            
            // Clear input but save to history
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // Clear saved draft
            storageManager.setInputContext(tektonUI.activeComponent, '');
        }
    }
    
    sendButton.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            sendMessage();
        }
    });
    
    // Restore any saved input for the active component
    const savedInput = storageManager.getInputContext(tektonUI.activeComponent);
    if (savedInput) {
        chatInput.value = savedInput;
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }
    
    console.log('Tekton UI initialized');
});