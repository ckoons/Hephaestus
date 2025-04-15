/**
 * Terminal Chat Manager
 * Enhanced terminal with AI chat capabilities for Tekton
 */

class TerminalChatManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            showTimestamps: true,
            showTypingIndicator: true,
            markdownFormatting: true,
            ...options
        };
        this.history = {};
        this.isTyping = false;
        this.typingTimer = null;
        this.activeComponent = null;
    }
    
    /**
     * Initialize the chat terminal
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`Terminal chat container #${this.containerId} not found`);
            return;
        }
        
        // Add chat class to container
        this.container.classList.add('terminal-chat');
        
        // Initialize with a welcome message
        this.clear();
        this.addSystemMessage("Welcome to Tekton AI Terminal");
        
        console.log('Terminal Chat Manager initialized');
    }
    
    /**
     * Add a user message to the chat
     * @param {string} text - User message text
     */
    addUserMessage(text) {
        this.addMessage('user', text);
    }
    
    /**
     * Add an AI message to the chat
     * @param {string} text - AI message text
     * @param {string} componentId - Component ID (for styling)
     */
    addAIMessage(text, componentId = null) {
        this.addMessage('ai', text, componentId);
        this.hideTypingIndicator();
    }
    
    /**
     * Add a system message to the chat
     * @param {string} text - System message text
     */
    addSystemMessage(text) {
        this.addMessage('system', text);
    }
    
    /**
     * Add a message to the chat
     * @param {string} type - Message type (user, ai, system)
     * @param {string} text - Message text
     * @param {string} componentId - Component ID (optional)
     */
    addMessage(type, text, componentId = null) {
        if (!this.container) return;
        
        // Set active component if not already set
        if (!this.activeComponent && componentId) {
            this.activeComponent = componentId;
        }
        
        // Use passed componentId or the active one
        componentId = componentId || this.activeComponent;
        
        // Create message container
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${type}-message`;
        
        let messageContent = '';
        
        // Add header for user and AI messages
        if (type === 'user' || type === 'ai') {
            const sender = type === 'user' ? 'You' : componentId.charAt(0).toUpperCase() + componentId.slice(1);
            
            const header = document.createElement('div');
            header.className = 'message-header';
            header.innerHTML = `
                <span class="message-sender">${sender}</span>
                ${this.options.showTimestamps ? `<span class="message-timestamp">${this.getFormattedTime()}</span>` : ''}
            `;
            messageEl.appendChild(header);
        }
        
        // Create and format message content
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        
        // Format the text (apply markdown if enabled)
        if (this.options.markdownFormatting) {
            contentEl.innerHTML = this.formatMarkdown(this.sanitizeHtml(text));
        } else {
            contentEl.textContent = text;
        }
        
        messageEl.appendChild(contentEl);
        
        // Add timestamp for system messages (which don't have headers)
        if (type === 'system' && this.options.showTimestamps) {
            const timestamp = document.createElement('div');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = this.getFormattedTime();
            messageEl.appendChild(timestamp);
        }
        
        // Add to the container
        this.container.appendChild(messageEl);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Add to history for the current component
        this.addToHistory(componentId, {
            type: type,
            text: text,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Show typing indicator
     * @param {string} componentId - Component ID
     */
    showTypingIndicator(componentId = null) {
        if (!this.container || this.isTyping) return;
        
        // Use passed componentId or the active one
        componentId = componentId || this.activeComponent;
        if (!componentId) return;
        
        // Remove any existing typing indicators
        this.hideTypingIndicator();
        
        // Create typing indicator
        const typingEl = document.createElement('div');
        typingEl.className = 'chat-message typing-indicator';
        typingEl.innerHTML = `
            <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
        
        // Add to container
        this.container.appendChild(typingEl);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Set typing status
        this.isTyping = true;
    }
    
    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        if (!this.container) return;
        
        // Remove any existing typing indicators
        const typingIndicators = this.container.querySelectorAll('.typing-indicator');
        typingIndicators.forEach(el => el.remove());
        
        // Reset typing status
        this.isTyping = false;
        
        // Clear any typing timers
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
    }
    
    /**
     * Set the active component ID
     * @param {string} componentId - Component ID
     */
    setActiveComponent(componentId) {
        this.activeComponent = componentId;
    }
    
    /**
     * Format text with markdown-like syntax
     * @param {string} text - Text to format
     * @returns {string} Formatted HTML
     */
    formatMarkdown(text) {
        if (!text) return '';
        
        // Replace ```code``` with <pre><code>code</code></pre>
        let formatted = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Replace `code` with <code>code</code>
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Replace **bold** with <strong>bold</strong>
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Replace *italic* with <em>italic</em>
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Convert URLs to links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        return formatted;
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
     * Get formatted time for timestamps
     * @returns {string} Formatted time (HH:MM AM/PM)
     */
    getFormattedTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Scroll to the bottom of the chat container
     */
    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
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
        
        // Save history to localStorage if storage manager is available
        this.saveHistory(componentId);
    }
    
    /**
     * Save terminal history to localStorage
     * @param {string} componentId - Component ID
     */
    saveHistory(componentId) {
        if (window.storageManager && this.history[componentId]) {
            storageManager.setItem(`terminal_chat_history_${componentId}`, JSON.stringify(this.history[componentId]));
        }
    }
    
    /**
     * Load terminal history for a component
     * @param {string} componentId - Component ID
     */
    loadHistory(componentId) {
        if (!window.storageManager) return;
        
        // Set active component
        this.activeComponent = componentId;
        
        // Clear terminal
        this.clear();
        
        // Try to load from memory first
        if (this.history[componentId] && this.history[componentId].length > 0) {
            this.replayHistory(this.history[componentId]);
            return;
        }
        
        // Otherwise load from localStorage
        const savedHistory = storageManager.getItem(`terminal_chat_history_${componentId}`);
        if (savedHistory) {
            try {
                const historyEntries = JSON.parse(savedHistory);
                this.history[componentId] = historyEntries;
                this.replayHistory(historyEntries);
            } catch (e) {
                console.error('Error loading terminal history:', e);
                this.addSystemMessage('Error loading conversation history');
            }
        } else {
            // If no history, just show a welcome message
            this.addSystemMessage(`Welcome to ${componentId.charAt(0).toUpperCase() + componentId.slice(1)} AI assistant`);
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
                if (entry.type === 'user') {
                    this.addUserMessage(entry.text);
                } else if (entry.type === 'ai') {
                    this.addAIMessage(entry.text);
                } else if (entry.type === 'system') {
                    this.addSystemMessage(entry.text);
                }
            }
        });
    }
}