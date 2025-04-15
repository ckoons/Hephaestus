/**
 * Ergon Component Integration for Tekton UI
 * This script integrates the Ergon agent management system into the Tekton UI
 */

// Ergon component handler
window.ergonComponent = {
  // Called when the component is activated
  initialize: function() {
    console.log('Initializing Ergon component');
    
    // Switch to HTML panel mode
    uiManager.activatePanel('html');
    
    // Load the Ergon HTML content into the panel
    this.loadErgonUI();
    
    // Update the component status indicator
    this.updateStatusIndicator();
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
    // Initialize Ergon chat
    if (!window.ergonChatManager && document.getElementById('ergon-chat-container')) {
      window.ergonChatManager = new TerminalChatManager('ergon-chat-container');
      ergonChatManager.init();
      ergonChatManager.setActiveComponent('ergon');
      
      // Add welcome message
      ergonChatManager.addSystemMessage('Welcome to Ergon AI Assistant! I can help you manage agents, workflows, and tools. How can I assist you today?');
      
      // Demo message for example
      setTimeout(() => {
        ergonChatManager.addAIMessage('I\'m ready to help with agent creation, deployment, monitoring, and other tasks. Just let me know what you need!', 'ergon');
      }, 1000);
    }
    
    // Initialize AWT-Team chat
    if (!window.awtChatManager && document.getElementById('awt-team-chat-container')) {
      window.awtChatManager = new TerminalChatManager('awt-team-chat-container');
      awtChatManager.init();
      awtChatManager.setActiveComponent('awt-team');
      
      // Add welcome message
      awtChatManager.addSystemMessage('Welcome to AWT-Team Assistant! I can help with advanced workflow tools and team coordination.');
    }
  },
  
  // Set up the tabbed interface
  setupTabs: function() {
    const tabs = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Get the tab ID
        const tabId = tab.getAttribute('data-tab');
        
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(t => {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        
        // Show the corresponding content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.style.display = 'none';
        });
        document.getElementById(`${tabId}-content`).style.display = 'block';
      });
    });
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
      // Override the default send handler when Ergon component is active
      this.originalSendMessage = window.sendMessage;
      
      window.sendMessage = () => {
        const message = chatInput.value.trim();
        if (!message) return;
        
        const activeTab = document.querySelector('.tab-button.active');
        if (!activeTab) return this.originalSendMessage();
        
        const tabId = activeTab.getAttribute('data-tab');
        
        // Handle chat messages for Ergon and AWT-Team tabs
        if (tabId === 'ergon' && window.ergonChatManager) {
          // Add user message to chat
          ergonChatManager.addUserMessage(message);
          
          // Show typing indicator
          ergonChatManager.showTypingIndicator();
          
          // Send to backend
          tektonUI.sendCommand('process_message', { 
            message: message,
            context: 'ergon'
          });
          
          // Clear input
          chatInput.value = '';
          chatInput.style.height = 'auto';
          
          // Prevent default handling
          return false;
        } 
        else if (tabId === 'awt-team' && window.awtChatManager) {
          // Add user message to chat
          awtChatManager.addUserMessage(message);
          
          // Show typing indicator
          awtChatManager.showTypingIndicator();
          
          // Send to backend
          tektonUI.sendCommand('process_message', { 
            message: message,
            context: 'awt-team'
          });
          
          // Clear input
          chatInput.value = '';
          chatInput.style.height = 'auto';
          
          // Prevent default handling
          return false;
        }
        
        // Fall back to default behavior for other tabs
        return this.originalSendMessage();
      };
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