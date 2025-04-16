/**
 * Settings UI Handler
 * Manages the settings UI and connects it to the Settings Manager
 */

class SettingsUI {
    constructor() {
        this.initialized = false;
        this.containerId = 'settings-tab-content';
        this.container = null;
        this.settingsManager = window.settingsManager;
    }
    
    /**
     * Initialize the settings UI
     */
    init() {
        console.log('Initializing Settings UI...');
        
        // Make sure settings manager exists
        if (!window.settingsManager) {
            console.error('Settings Manager not found, creating a new one');
            window.settingsManager = new SettingsManager().init();
            this.settingsManager = window.settingsManager;
        }
        
        // Find container
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            // Delay initialization if container isn't ready
            console.log('Settings container not found, waiting...');
            setTimeout(() => this.init(), 500);
            return;
        }
        
        // Load the settings component if not already loaded
        if (this.container.children.length === 0) {
            this.loadSettingsComponent();
            return;
        }
        
        // Set up listeners
        this.setupEventListeners();
        
        // Update UI to reflect current settings
        this.updateSettingsUI();
        
        this.initialized = true;
        console.log('Settings UI initialized');
        return this;
    }
    
    /**
     * Load the settings component HTML
     */
    loadSettingsComponent() {
        console.log('Loading settings component...');
        
        // Load the component using fetch
        fetch('components/settings.html')
            .then(response => response.text())
            .then(html => {
                this.container.innerHTML = html;
                console.log('Settings component loaded');
                
                // Now that the component is loaded, finish initialization
                this.setupEventListeners();
                this.updateSettingsUI();
                this.initialized = true;
            })
            .catch(error => {
                console.error('Error loading settings component:', error);
            });
    }
    
    /**
     * Set up event listeners for settings controls
     */
    setupEventListeners() {
        // Theme mode buttons
        document.querySelectorAll('.theme-mode-button').forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                if (mode && this.settingsManager.settings.themeMode !== mode) {
                    this.settingsManager.settings.themeMode = mode;
                    this.settingsManager.save().applyTheme();
                    this.updateSettingsUI();
                }
            });
        });
        
        // Theme color buttons
        document.querySelectorAll('.theme-color-button').forEach(button => {
            button.addEventListener('click', () => {
                const color = button.getAttribute('data-color');
                if (color) {
                    this.settingsManager.setThemeColor(color);
                    this.updateSettingsUI();
                }
            });
        });
        
        // Greek names toggle
        const greekNamesToggle = document.getElementById('greek-names-toggle');
        if (greekNamesToggle) {
            greekNamesToggle.addEventListener('change', () => {
                this.settingsManager.toggleGreekNames();
                this.updateSettingsUI();
            });
        }
        
        // Terminal font size
        const fontSizeSelect = document.getElementById('terminal-font-size');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', () => {
                this.settingsManager.settings.terminalFontSize = fontSizeSelect.value;
                this.settingsManager.save();
                this.applyFontSize();
            });
        }
        
        // Chat history toggle
        const chatHistoryToggle = document.getElementById('chat-history-toggle');
        if (chatHistoryToggle) {
            chatHistoryToggle.addEventListener('change', () => {
                this.settingsManager.settings.chatHistoryEnabled = chatHistoryToggle.checked;
                this.settingsManager.save();
            });
        }
        
        // Chat history limit
        const chatHistoryLimit = document.getElementById('chat-history-limit');
        if (chatHistoryLimit) {
            chatHistoryLimit.addEventListener('change', () => {
                this.settingsManager.settings.maxChatHistoryEntries = parseInt(chatHistoryLimit.value);
                this.settingsManager.save();
            });
        }
        
        // Clear chat history button
        const clearHistoryButton = document.getElementById('clear-chat-history');
        if (clearHistoryButton) {
            clearHistoryButton.addEventListener('click', () => {
                this.clearAllChatHistory();
            });
        }
        
        // Hermes integration toggle
        const hermesToggle = document.getElementById('hermes-integration-toggle');
        if (hermesToggle) {
            hermesToggle.addEventListener('change', () => {
                const enabled = hermesToggle.checked;
                // Handle Hermes integration toggle
                this.settingsManager.settings.hermesIntegration = enabled;
                this.settingsManager.save();
                
                // Notify applicable components
                this.settingsManager.dispatchEvent('hermesIntegrationChanged', {
                    enabled: enabled
                });
            });
        }
        
        // Default message route
        const defaultRouteSelect = document.getElementById('default-message-route');
        if (defaultRouteSelect) {
            defaultRouteSelect.addEventListener('change', () => {
                this.settingsManager.settings.defaultMessageRoute = defaultRouteSelect.value;
                this.settingsManager.save();
            });
        }
        
        // Reset all settings button
        const resetButton = document.getElementById('reset-all-settings');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetAllSettings();
            });
        }
        
        // Save all settings button
        const saveButton = document.getElementById('save-all-settings');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.settingsManager.save();
                this.showSaveConfirmation();
            });
        }
    }
    
    /**
     * Update the UI to reflect current settings
     */
    updateSettingsUI() {
        if (!this.initialized) return;
        
        const settings = this.settingsManager.settings;
        
        // Update theme mode buttons
        document.querySelectorAll('.theme-mode-button').forEach(button => {
            const mode = button.getAttribute('data-mode');
            if (mode === settings.themeMode) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update theme color buttons
        document.querySelectorAll('.theme-color-button').forEach(button => {
            const color = button.getAttribute('data-color');
            if (color === settings.themeColor) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update Greek names toggle
        const greekNamesToggle = document.getElementById('greek-names-toggle');
        if (greekNamesToggle) {
            greekNamesToggle.checked = settings.showGreekNames;
        }
        
        // Update terminal font size
        const fontSizeSelect = document.getElementById('terminal-font-size');
        if (fontSizeSelect) {
            fontSizeSelect.value = settings.terminalFontSize || 'medium';
        }
        
        // Update chat history toggle
        const chatHistoryToggle = document.getElementById('chat-history-toggle');
        if (chatHistoryToggle) {
            chatHistoryToggle.checked = settings.chatHistoryEnabled !== false;
        }
        
        // Update chat history limit
        const chatHistoryLimit = document.getElementById('chat-history-limit');
        if (chatHistoryLimit) {
            chatHistoryLimit.value = settings.maxChatHistoryEntries || '50';
        }
        
        // Update Hermes integration toggle
        const hermesToggle = document.getElementById('hermes-integration-toggle');
        if (hermesToggle) {
            hermesToggle.checked = settings.hermesIntegration !== false;
        }
        
        // Update default message route
        const defaultRouteSelect = document.getElementById('default-message-route');
        if (defaultRouteSelect) {
            defaultRouteSelect.value = settings.defaultMessageRoute || 'team';
        }
        
        this.applyFontSize();
    }
    
    /**
     * Apply font size to terminal elements
     */
    applyFontSize() {
        const size = this.settingsManager.settings.terminalFontSize || 'medium';
        
        // Get the base font size
        let fontSize;
        switch (size) {
            case 'small': fontSize = '0.85rem'; break;
            case 'large': fontSize = '1.1rem'; break;
            default: fontSize = '0.95rem'; break;
        }
        
        // Apply to terminals and chat containers
        document.querySelectorAll('.terminal, .terminal-chat-messages').forEach(el => {
            el.style.fontSize = fontSize;
        });
        
        // Also adjust input fields
        document.querySelectorAll('.terminal-input, .terminal-chat-input').forEach(el => {
            el.style.fontSize = fontSize;
        });
    }
    
    /**
     * Clear all chat history from storage
     */
    clearAllChatHistory() {
        // Show confirmation dialog
        if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
            // Clear all chat history entries from localStorage
            if (window.storageManager) {
                const keys = [];
                
                // Find all chat history keys
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith(storageManager.prefix + 'terminal_chat_history_')) {
                        keys.push(key);
                    }
                }
                
                // Remove each key
                keys.forEach(key => {
                    localStorage.removeItem(key);
                });
                
                // Show confirmation
                alert(`Cleared ${keys.length} chat history entries.`);
                
                // Notify components
                this.settingsManager.dispatchEvent('chatHistoryCleared', {});
            }
        }
    }
    
    /**
     * Reset all settings to defaults
     */
    resetAllSettings() {
        // Show confirmation dialog
        if (confirm('Are you sure you want to reset all settings to their default values?')) {
            // Create default settings
            const defaultSettings = {
                showGreekNames: true,
                themeMode: 'dark',
                themeColor: 'blue',
                chatHistoryEnabled: true,
                maxChatHistoryEntries: 50,
                terminalFontSize: 'medium',
                hermesIntegration: true,
                defaultMessageRoute: 'team'
            };
            
            // Apply defaults
            this.settingsManager.settings = defaultSettings;
            this.settingsManager.save().apply();
            
            // Update UI
            this.updateSettingsUI();
            
            // Show confirmation
            alert('All settings have been reset to their defaults.');
        }
    }
    
    /**
     * Show a save confirmation message
     */
    showSaveConfirmation() {
        // Create or get the notification element
        let notification = document.getElementById('settings-saved-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'settings-saved-notification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.padding = '10px 20px';
            notification.style.background = 'var(--accent-primary)';
            notification.style.color = 'white';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            notification.style.zIndex = '9999';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = 'Settings saved successfully';
        notification.style.opacity = '1';
        
        // Hide after a delay
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
}

// Initialize the settings UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.settingsUI = new SettingsUI();
    
    // Initialize after UI elements are available
    setTimeout(() => {
        window.settingsUI.init();
    }, 1000);
});