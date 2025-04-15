/**
 * Ergon Component Integration for Tekton UI
 * This script integrates the Ergon agent management system into the Tekton UI
 */

// Ergon component handler
window.ergonComponent = {
  // Component state
  state: {
    initialized: false,
    activeTab: 'agents', // Default tab
    tabHistory: {}      // History for each tab
  },
  
  // Called when the component is activated
  initialize: function() {
    console.log('Initializing Ergon component');
    
    // First, add a terminal message to inform the user
    if (window.websocketManager) {
      websocketManager.addToTerminal("", 'white'); // blank line for spacing
      websocketManager.addToTerminal("=== ERGON COMPONENT ACTIVATED ===", '#00bfff');
      websocketManager.addToTerminal("Switching to the Ergon interface panel.", '#aaaaaa');
      websocketManager.addToTerminal("You can still use the terminal for all Ergon commands.", '#aaaaaa');
      websocketManager.addToTerminal("", 'white'); // blank line for spacing
    }
    
    // Then switch to HTML panel mode
    uiManager.activatePanel('html');
    
    if (!this.state.initialized) {
      // First-time initialization
      this.loadErgonUI();
      this.state.initialized = true;
    } else {
      // Already initialized, just restore state
      this.restoreComponentState();
    }
    
    // Update the component status indicator
    this.updateStatusIndicator();
  },
  
  // Save current component state
  saveComponentState: function() {
    // Save active tab
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
      this.state.activeTab = activeTab.getAttribute('data-tab');
    }
    
    // Save to localStorage if available
    if (window.storageManager) {
      storageManager.setItem('ergon_component_state', JSON.stringify(this.state));
    }
    
    console.log('Ergon component state saved, active tab:', this.state.activeTab);
  },
  
  // Restore component state
  restoreComponentState: function() {
    // Load state from localStorage if available
    if (window.storageManager) {
      const savedState = storageManager.getItem('ergon_component_state');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          // Merge with current state
          this.state = {...this.state, ...parsedState};
        } catch (e) {
          console.error('Error parsing saved Ergon state:', e);
        }
      }
    }
    
    // Do not force Ergon tab to avoid flashing AWT-Team message
    
    // Activate the previously active tab (now forced to ergon)
    if (this.state.activeTab) {
      const tabButton = document.querySelector(`.tab-button[data-tab="${this.state.activeTab}"]`);
      if (tabButton) {
        // Simulate a click on the tab button
        tabButton.click();
      }
    }
    
    console.log('Ergon component state restored, forced tab to ergon for testing');
  },
  
  // Load the Ergon UI into the HTML panel
  loadErgonUI: function() {
    // Fetch the Ergon HTML content
    fetch('components/ergon.html')
      .then(response => response.text())
      .then(html => {
        // Insert the HTML into the panel
        document.getElementById('html-panel').innerHTML = html;
        
        // Initialize the UI components
        this.setupTabs();
        this.setupEventListeners();
        
        // Initialize chat components
        this.initChatInterfaces();
        
        // Load agent data
        this.loadAgentData();
      })
      .catch(error => {
        console.error('Error loading Ergon UI:', error);
        document.getElementById('html-panel').innerHTML = '<div class="error-message">Error loading Ergon component UI</div>';
      });
  },
  
  // Initialize the chat interfaces for Ergon and AWT-Team
  initChatInterfaces: function() {
    console.log("Note: Chat interfaces removed in terminal-focused UI");
    
    // Check if containers exist
    const ergonContainer = document.getElementById('ergon-chat-container');
    const awtContainer = document.getElementById('awt-team-chat-container');
    
    if (ergonContainer) {
      ergonContainer.innerHTML = `
        <div style="padding: 20px; background: #1e1e1e; color: white;">
          <h3>Chat functionality replaced with terminal interface</h3>
          <p>Please use the terminal in the main panel for all interactions.</p>
          <p>All components now use a unified terminal interface.</p>
        </div>
      `;
    }
    
    if (awtContainer) {
      awtContainer.innerHTML = `
        <div style="padding: 20px; background: #1e1e1e; color: white;">
          <h3>Chat functionality replaced with terminal interface</h3>
          <p>Please use the terminal in the main panel for all interactions.</p>
          <p>All components now use a unified terminal interface.</p>
        </div>
      `;
    }
  },
  
  // Set up the tabbed interface
  setupTabs: function() {
    const tabs = document.querySelectorAll('.tab-button');
    
    // Helper function to activate a tab
    const activateTab = (tabId) => {
      // Update active tab
      document.querySelectorAll('.tab-button').forEach(t => {
        t.classList.remove('active');
      });
      const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
      if (tabButton) {
        tabButton.classList.add('active');
      }
      
      // Show the corresponding content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      
      // Always show terminal-redirect content first for guidance
      const terminalRedirect = document.getElementById('terminal-redirect');
      if (terminalRedirect) {
        terminalRedirect.style.display = 'block';
      }
      
      // Then show the specific tab content below it
      const tabContent = document.getElementById(`${tabId}-content`);
      if (tabContent) {
        tabContent.style.display = 'block';
      }
      
      // Save active tab to state
      this.state.activeTab = tabId;
      this.saveComponentState();
      
      // Update terminal prompt with relevant context
      if (window.websocketManager) {
        websocketManager.addToTerminal(`Active context: Ergon ${tabId}`, '#888888');
        websocketManager.addToTerminal(`Type 'help ${tabId}' for available commands`, '#888888');
      }
    };
    
    // Add click handlers to tabs
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        activateTab(tabId);
      });
    });
    
    // Show the terminal message first, but set agents as active tab
    console.log('Initializing Ergon with agents tab active');
    activateTab('agents');
  },
  
  // Set up event listeners for UI elements
  setupEventListeners: function() {
    // Create agent button
    const createButton = document.getElementById('create-agent-button');
    if (createButton) {
      createButton.addEventListener('click', () => {
        document.getElementById('agent-creation-form').style.display = 'block';
      });
    }
    
    // Cancel agent creation
    const cancelButton = document.getElementById('cancel-creation');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        document.getElementById('agent-creation-form').style.display = 'none';
      });
    }
    
    // Submit agent creation
    const submitButton = document.getElementById('submit-creation');
    if (submitButton) {
      submitButton.addEventListener('click', () => {
        const name = document.getElementById('agent-name').value;
        const type = document.getElementById('agent-type').value;
        const description = document.getElementById('agent-description').value;
        
        if (name && description) {
          // Send create agent command
          tektonUI.sendCommand('create_agent', {
            name: name,
            type: type,
            description: description
          });
          
          // Hide form
          document.getElementById('agent-creation-form').style.display = 'none';
        } else {
          alert('Please fill in all required fields');
        }
      });
    }
    
    // Agent run buttons
    document.querySelectorAll('.agent-action-button').forEach(button => {
      if (button.textContent === 'Run') {
        button.addEventListener('click', (e) => {
          const agentCard = e.target.closest('.agent-card');
          const agentName = agentCard.querySelector('.agent-name').textContent;
          
          // Send run agent command
          tektonUI.sendCommand('run_agent', {
            agent_name: agentName
          });
          
          // Update status indicator
          agentCard.querySelector('.agent-status').classList.add('active');
        });
      } else if (button.textContent === 'Delete') {
        button.addEventListener('click', (e) => {
          const agentCard = e.target.closest('.agent-card');
          const agentName = agentCard.querySelector('.agent-name').textContent;
          
          if (confirm(`Are you sure you want to delete the agent "${agentName}"?`)) {
            // Send delete agent command
            tektonUI.sendCommand('delete_agent', {
              agent_name: agentName
            });
            
            // Remove the card with animation
            agentCard.style.opacity = '0';
            setTimeout(() => {
              agentCard.remove();
            }, 300);
          }
        });
      }
    });
    
    // Save settings button
    const saveSettingsButton = document.getElementById('save-settings');
    if (saveSettingsButton) {
      saveSettingsButton.addEventListener('click', () => {
        // Collect settings
        const settings = {
          default_model: document.getElementById('default-model').value,
          memory_enabled: document.getElementById('default-memory-enabled').checked
        };
        
        // Send save settings command
        tektonUI.sendCommand('save_settings', settings);
        
        // Show success message
        alert('Settings saved successfully');
      });
    }
    
    // Chat clear buttons
    const clearErgonButton = document.getElementById('clear-ergon-chat');
    if (clearErgonButton && window.ergonChatManager) {
      clearErgonButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
          ergonChatManager.clear();
          ergonChatManager.addSystemMessage('Chat history cleared');
          
          // Clear history in storage
          if (window.storageManager) {
            storageManager.removeItem('terminal_chat_history_ergon');
          }
        }
      });
    }
    
    const clearAwtButton = document.getElementById('clear-awt-chat');
    if (clearAwtButton && window.awtChatManager) {
      clearAwtButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
          awtChatManager.clear();
          awtChatManager.addSystemMessage('Chat history cleared');
          
          // Clear history in storage
          if (window.storageManager) {
            storageManager.removeItem('terminal_chat_history_awt-team');
          }
        }
      });
    }
    
    // Add event listener to chat input for sending messages to active chat
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    if (chatInput && sendButton) {
      // REMOVED CHAT-SPECIFIC HANDLERS - Messages are now handled by the terminal directly
      console.log("Chat input handlers removed - using terminal input only");
      
      // Show a message in terminal
      if (window.terminalManager) {
        terminalManager.write("Ergon component active - use terminal for all commands", false);
        terminalManager.write("Example: 'list agents' or 'create agent'", false);
      }
      
      // Hardcoded input handling remains active
      const hardcodedInput = document.getElementById('hardcoded-input');
      if (hardcodedInput) {
        console.log("Found hardcoded input field:", hardcodedInput);
        hardcodedInput.focus();
      }
      
      // Add keyboard navigation to chat input
      chatInput.addEventListener('keydown', (e) => {
        const activeTab = document.querySelector('.tab-button.active');
        if (!activeTab) return;
        
        const tabId = activeTab.getAttribute('data-tab');
        
        // Only handle history for chat tabs
        if (tabId !== 'ergon' && tabId !== 'awt-team') return;
        
        const history = this.messageHistory[tabId];
        
        // Arrow up: navigate back in history
        if (e.key === 'ArrowUp' && !e.shiftKey) {
          e.preventDefault();
          
          // Save current input if at beginning of history
          if (this.historyPosition === -1) {
            this.currentInput = chatInput.value;
          }
          
          // Move through history if there are entries
          if (history.length > 0 && this.historyPosition < history.length - 1) {
            this.historyPosition++;
            chatInput.value = history[this.historyPosition];
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            
            // Move cursor to end
            setTimeout(() => {
              chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
            }, 0);
          }
        }
        
        // Arrow down: navigate forward in history
        else if (e.key === 'ArrowDown' && !e.shiftKey) {
          e.preventDefault();
          
          if (this.historyPosition > 0) {
            // Move forward in history
            this.historyPosition--;
            chatInput.value = history[this.historyPosition];
          } 
          else if (this.historyPosition === 0) {
            // Return to current input when reaching the end of history
            this.historyPosition = -1;
            chatInput.value = this.currentInput;
          }
          
          chatInput.style.height = 'auto';
          chatInput.style.height = (chatInput.scrollHeight) + 'px';
          
          // Move cursor to end
          setTimeout(() => {
            chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
          }, 0);
        }
      });
    }
  },
  
  // Load agent data from the backend
  loadAgentData: function() {
    // In a real implementation, this would fetch data from the backend
    // For demo purposes, we're using the pre-populated data in the HTML
    console.log('Loading agent data');
    
    // Send a command to request agent data
    tektonUI.sendCommand('get_agents', {});
  },
  
  // Update the status indicator in the left panel
  updateStatusIndicator: function() {
    const indicator = document.querySelector('.nav-item[data-component="ergon"] .status-indicator');
    if (indicator) {
      // For demo purposes, set it to active
      indicator.classList.add('active');
    }
  },
  
  // Handle incoming messages
  receiveMessage: function(message) {
    console.log('Received message in Ergon component:', message);
    
    // Handle different message types
    if (message.type === 'RESPONSE') {
      const payload = message.payload || {};
      
      // Handle chat responses
      if (payload.message && payload.context) {
        this.handleChatResponse(payload.message, payload.context);
      }
      // Handle agent list responses
      else if (payload.agents) {
        // Update agent list
        this.updateAgentList(payload.agents);
      } 
      // Handle agent creation response
      else if (payload.agent_created) {
        // Add new agent to list
        this.addAgentToList(payload.agent_created);
      }
      // Handle general responses
      else if (payload.response) {
        // If we have a active chat tab, show response there
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
          const tabId = activeTab.getAttribute('data-tab');
          if (tabId === 'ergon' && window.ergonChatManager) {
            ergonChatManager.addAIMessage(payload.response, 'ergon');
          } else if (tabId === 'awt-team' && window.awtChatManager) {
            awtChatManager.addAIMessage(payload.response, 'awt-team');
          }
        }
      }
    } 
    // Handle typing indicators and status updates
    else if (message.type === 'UPDATE') {
      const payload = message.payload || {};
      
      // Handle typing status
      if (payload.status === 'typing') {
        const context = payload.context || '';
        
        if (context === 'ergon' && window.ergonChatManager) {
          if (payload.isTyping) {
            ergonChatManager.showTypingIndicator();
          } else {
            ergonChatManager.hideTypingIndicator();
          }
        } 
        else if (context === 'awt-team' && window.awtChatManager) {
          if (payload.isTyping) {
            awtChatManager.showTypingIndicator();
          } else {
            awtChatManager.hideTypingIndicator();
          }
        }
      }
      // Handle agent status updates
      else if (payload.agent_status) {
        // Update agent status
        this.updateAgentStatus(payload.agent_status);
      }
    }
  },
  
  // Handle chat responses from AI
  handleChatResponse: function(message, context) {
    if (context === 'ergon' && window.ergonChatManager) {
      // Hide typing indicator if still showing
      ergonChatManager.hideTypingIndicator();
      
      // Add AI message to chat
      ergonChatManager.addAIMessage(message, 'ergon');
    } 
    else if (context === 'awt-team' && window.awtChatManager) {
      // Hide typing indicator if still showing
      awtChatManager.hideTypingIndicator();
      
      // Add AI message to chat
      awtChatManager.addAIMessage(message, 'awt-team');
    }
  },
  
  // Update the agent list with data from the backend
  updateAgentList: function(agents) {
    // This would update the agent list in a real implementation
    console.log('Would update agent list with:', agents);
  },
  
  // Add a new agent to the list
  addAgentToList: function(agent) {
    // This would add a new agent card in a real implementation
    console.log('Would add new agent to list:', agent);
  },
  
  // Update an agent's status
  updateAgentStatus: function(status) {
    // This would update an agent's status indicator in a real implementation
    console.log('Would update agent status:', status);
  }
};

// Register the component
document.addEventListener('DOMContentLoaded', function() {
  // When the ergon component is clicked in the left panel, initialize it
  const ergonNavItem = document.querySelector('.nav-item[data-component="ergon"]');
  if (ergonNavItem) {
    ergonNavItem.addEventListener('click', function() {
      window.ergonComponent.initialize();
    });
  }
});