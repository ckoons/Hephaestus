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
        
        // Load agent data
        this.loadAgentData();
      })
      .catch(error => {
        console.error('Error loading Ergon UI:', error);
        document.getElementById('html-panel').innerHTML = '<div class="error-message">Error loading Ergon component UI</div>';
      });
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
      
      if (payload.agents) {
        // Update agent list
        this.updateAgentList(payload.agents);
      } else if (payload.agent_created) {
        // Add new agent to list
        this.addAgentToList(payload.agent_created);
      }
    } else if (message.type === 'UPDATE') {
      // Handle updates
      const payload = message.payload || {};
      
      if (payload.agent_status) {
        // Update agent status
        this.updateAgentStatus(payload.agent_status);
      }
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