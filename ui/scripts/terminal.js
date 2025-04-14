/**
 * Terminal Manager
 * Handles the terminal interface with history and component-specific state
 */

class TerminalManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.history = {}; // Component-specific terminal history
        this.maxHistoryLines = 1000; // Maximum number of lines to keep in history
    }
    
    /**
     * Initialize the terminal
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`Terminal container #${this.containerId} not found`);
            return;
        }
        
        // Initialize with a welcome message
        this.clear();
        this.write("Welcome to Tekton Terminal");
        this.write("Type your commands in the input box below");
        this.write("-----------------------------------");
        
        console.log('Terminal Manager initialized');
    }
    
    /**
     * Write content to the terminal
     * @param {string} text - Text to write
     * @param {boolean} isCommand - Whether this is a user command (prefixed with >)
     */
    write(text, isCommand = false) {
        if (!this.container) return;
        
        // Create a new line element
        const line = document.createElement('div');
        line.className = isCommand ? 'terminal-command' : 'terminal-output';
        
        // Format the text based on its type
        const formattedText = this.formatText(text, isCommand);
        line.innerHTML = formattedText;
        
        // Add to the terminal
        this.container.appendChild(line);
        
        // Scroll to bottom
        this.container.scrollTop = this.container.scrollHeight;
        
        // Add to history for the current component
        const componentId = tektonUI.activeComponent;
        this.addToHistory(componentId, {
            type: isCommand ? 'command' : 'output',
            text: text
        });
    }
    
    /**
     * Format text for display in the terminal
     * @param {string} text - Text to format
     * @param {boolean} isCommand - Whether this is a user command
     * @returns {string} Formatted text
     */
    formatText(text, isCommand) {
        // Sanitize the text to prevent HTML injection
        let sanitized = this.sanitizeHtml(text);
        
        // Apply basic markdown-like formatting
        // Replace ```code``` with <pre><code>code</code></pre>
        sanitized = sanitized.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Replace `code` with <code>code</code>
        sanitized = sanitized.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Replace **bold** with <strong>bold</strong>
        sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Replace *italic* with <em>italic</em>
        sanitized = sanitized.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Add command prefix
        if (isCommand) {
            sanitized = `<span class="command-prefix">&gt;</span> ${sanitized}`;
        }
        
        return sanitized;
    }
    
    /**
     * Sanitize HTML to prevent injection
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }
    
    /**
     * Clear the terminal
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    /**
     * Add an entry to the terminal history for a specific component
     * @param {string} componentId - Component ID
     * @param {Object} entry - History entry with type and text properties
     */
    addToHistory(componentId, entry) {
        if (!this.history[componentId]) {
            this.history[componentId] = [];
        }
        
        this.history[componentId].push(entry);
        
        // Trim history if it exceeds the maximum size
        if (this.history[componentId].length > this.maxHistoryLines) {
            this.history[componentId] = this.history[componentId].slice(
                this.history[componentId].length - this.maxHistoryLines
            );
        }
        
        // Save history to localStorage
        this.saveHistory(componentId);
    }
    
    /**
     * Save terminal history to localStorage
     * @param {string} componentId - Component ID
     */
    saveHistory(componentId) {
        if (window.storageManager && this.history[componentId]) {
            storageManager.setItem(`terminal_history_${componentId}`, JSON.stringify(this.history[componentId]));
        }
    }
    
    /**
     * Load terminal history for a component
     * @param {string} componentId - Component ID
     */
    loadHistory(componentId) {
        if (!window.storageManager) return;
        
        // Clear terminal
        this.clear();
        
        // Try to load from memory first
        if (this.history[componentId] && this.history[componentId].length > 0) {
            this.replayHistory(this.history[componentId]);
            return;
        }
        
        // Otherwise load from localStorage
        const savedHistory = storageManager.getItem(`terminal_history_${componentId}`);
        if (savedHistory) {
            try {
                const historyEntries = JSON.parse(savedHistory);
                this.history[componentId] = historyEntries;
                this.replayHistory(historyEntries);
            } catch (e) {
                console.error('Error loading terminal history:', e);
                this.write('Error loading history');
            }
        } else {
            // If no history, just show a welcome message
            this.write(`Terminal ready for ${componentId}`);
        }
    }
    
    /**
     * Replay a sequence of history entries in the terminal
     * @param {Array} entries - History entries to replay
     */
    replayHistory(entries) {
        if (!entries || !Array.isArray(entries)) return;
        
        // Only replay the last 50 entries to avoid overwhelming the terminal
        const recentEntries = entries.slice(-50);
        
        recentEntries.forEach(entry => {
            if (entry && entry.text) {
                this.write(entry.text, entry.type === 'command');
            }
        });
    }
}