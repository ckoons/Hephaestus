/**
 * Athena Component
 * Main component logic for the Athena knowledge graph interface
 */
class AthenaComponent {
    constructor(container) {
        this.container = container;
        this.service = window.athenaService;
        this.activeTab = 'graph';
        this.initialized = false;
        
        console.log('Initializing Athena Component');
    }
    
    /**
     * Initialize the component
     */
    async init() {
        if (this.initialized) {
            return this;
        }
        
        console.log('Initializing Athena component...');
        
        try {
            // Initialize the service
            await this.service.init();
            
            // Load the graph stats
            this.loadGraphStats();
            
            // Set up tab switching
            this.setupTabs();
            
            // Set up chat functionality
            this.setupChat();
            
            // Mark as initialized
            this.initialized = true;
            console.log('Athena component initialized');
            
            // Load mock data for demonstration
            setTimeout(() => this.loadMockGraphData(), 1000);
            
            return this;
        } catch (error) {
            console.error('Failed to initialize Athena component:', error);
            this.showError('Failed to initialize the Athena component. Please try refreshing the page.');
            return this;
        }
    }
    
    /**
     * Set up tab switching functionality
     */
    setupTabs() {
        const tabs = this.container.querySelectorAll('.tab');
        if (!tabs.length) {
            console.error('No tabs found');
            return;
        }
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                this.container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show active panel
                const panelId = tab.dataset.panel + '-panel';
                this.container.querySelectorAll('.panel').forEach(panel => {
                    panel.classList.toggle('active', panel.id === panelId);
                });
                
                // Store active tab
                this.activeTab = tab.dataset.panel;
            });
        });
    }
    
    /**
     * Set up chat functionality
     */
    setupChat() {
        const textarea = this.container.querySelector('.chat-input');
        const sendButton = this.container.querySelector('.send-button');
        const messageList = this.container.querySelector('.message-list');
        
        if (!textarea || !sendButton || !messageList) {
            console.error('Chat elements not found');
            return;
        }
        
        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
        
        // Send button
        sendButton.addEventListener('click', () => {
            this.sendChatMessage(textarea, messageList);
        });
        
        // Enter key (with shift for new line)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage(textarea, messageList);
            }
        });
    }
    
    /**
     * Send a chat message
     */
    async sendChatMessage(textarea, messageList) {
        const message = textarea.value.trim();
        if (!message) return;
        
        // Add user message to the UI
        messageList.innerHTML = '';
        const userMsgElement = document.createElement('div');
        userMsgElement.className = 'user-message';
        userMsgElement.textContent = message;
        messageList.appendChild(userMsgElement);
        
        // Add loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.className = 'system-message loading';
        loadingElement.textContent = 'Thinking...';
        messageList.appendChild(loadingElement);
        
        // Clear the input
        textarea.value = '';
        textarea.style.height = 'auto';
        
        // Scroll to bottom
        messageList.scrollTop = messageList.scrollHeight;
        
        try {
            // Send to service and get response
            const response = await this.service.askQuestion(message);
            
            // Replace loading with actual response
            loadingElement.className = 'system-message';
            loadingElement.textContent = response.answer;
            
            // Add sources if available
            if (response.sources && response.sources.length) {
                const sourcesElement = document.createElement('div');
                sourcesElement.className = 'message-sources';
                sourcesElement.innerHTML = '<span class="sources-label">Sources:</span> ' + 
                    response.sources.map(source => `${source.entity} (${Math.round(source.relevance * 100)}%)`).join(', ');
                messageList.appendChild(sourcesElement);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            loadingElement.className = 'system-message error';
            loadingElement.textContent = 'Error: Failed to get a response. Please try again.';
        }
        
        // Scroll to bottom again after response
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    /**
     * Load graph statistics
     */
    async loadGraphStats() {
        try {
            const stats = await this.service.getGraphStats();
            
            const entityCountElement = this.container.querySelector('.stats .entity-count');
            const relationshipCountElement = this.container.querySelector('.stats .relationship-count');
            
            if (entityCountElement) {
                entityCountElement.textContent = stats.entities;
            }
            
            if (relationshipCountElement) {
                relationshipCountElement.textContent = stats.relationships;
            }
        } catch (error) {
            console.error('Failed to load graph statistics:', error);
        }
    }
    
    /**
     * Load mock graph data for demonstration
     */
    async loadMockGraphData() {
        const graphContainer = this.container.querySelector('.graph-container');
        if (!graphContainer) return;
        
        // Remove placeholder
        const placeholder = graphContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Create a simple visualization
        graphContainer.innerHTML = `
            <div style="height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <svg id="athena-graph" width="100%" height="100%" viewBox="0 0 800 600" style="max-height: 600px;"></svg>
                <div style="position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 4px;">
                    <div style="font-size: 12px; opacity: 0.8;">Knowledge Graph Visualization</div>
                    <div style="font-size: 11px; opacity: 0.6;">* This is a simplified visualization for demonstration purposes.</div>
                </div>
            </div>
        `;
        
        // Create a simple force-directed graph
        this.createSimpleGraphVisualization();
    }
    
    /**
     * Create a simplified graph visualization
     */
    createSimpleGraphVisualization() {
        // This would typically use a library like D3.js or Cytoscape.js
        // For now, let's create a very simple representation with SVG
        
        const svg = this.container.querySelector('#athena-graph');
        if (!svg) return;
        
        const svgNS = "http://www.w3.org/2000/svg";
        
        // Define some nodes and links
        const nodes = [
            { id: 'n1', name: 'Tekton', color: '#4a86e8', size: 30, x: 400, y: 300 },
            { id: 'n2', name: 'Athena', color: '#8e44ad', size: 25, x: 250, y: 200 },
            { id: 'n3', name: 'Rhetor', color: '#e67e22', size: 25, x: 550, y: 200 },
            { id: 'n4', name: 'Engram', color: '#27ae60', size: 25, x: 300, y: 400 },
            { id: 'n5', name: 'Knowledge Graph', color: '#8e44ad', size: 20, x: 150, y: 150 },
            { id: 'n6', name: 'Python', color: '#3498db', size: 20, x: 200, y: 300 },
            { id: 'n7', name: 'JavaScript', color: '#f1c40f', size: 20, x: 500, y: 400 },
        ];
        
        const links = [
            { source: 'n1', target: 'n2', label: 'CONTAINS' },
            { source: 'n1', target: 'n3', label: 'CONTAINS' },
            { source: 'n1', target: 'n4', label: 'CONTAINS' },
            { source: 'n2', target: 'n5', label: 'IMPLEMENTS' },
            { source: 'n2', target: 'n6', label: 'USES' },
            { source: 'n3', target: 'n7', label: 'USES' },
            { source: 'n4', target: 'n6', label: 'USES' },
        ];
        
        // Draw links
        links.forEach(link => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            
            if (!source || !target) return;
            
            // Create line
            const linkElement = document.createElementNS(svgNS, 'line');
            linkElement.setAttribute('x1', source.x);
            linkElement.setAttribute('y1', source.y);
            linkElement.setAttribute('x2', target.x);
            linkElement.setAttribute('y2', target.y);
            linkElement.setAttribute('stroke', '#777');
            linkElement.setAttribute('stroke-width', '2');
            svg.appendChild(linkElement);
            
            // Create label
            const labelElement = document.createElementNS(svgNS, 'text');
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            labelElement.setAttribute('x', midX);
            labelElement.setAttribute('y', midY);
            labelElement.setAttribute('text-anchor', 'middle');
            labelElement.setAttribute('fill', '#aaa');
            labelElement.setAttribute('font-size', '10');
            labelElement.textContent = link.label;
            svg.appendChild(labelElement);
        });
        
        // Draw nodes
        nodes.forEach(node => {
            // Create circle
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', node.size);
            circle.setAttribute('fill', node.color);
            svg.appendChild(circle);
            
            // Create label
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y + node.size + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#eee');
            text.textContent = node.name;
            svg.appendChild(text);
        });
    }
    
    /**
     * Show an error message in the component
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'athena-error';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
        `;
        
        // Remove any existing error
        const existingError = this.container.querySelector('.athena-error');
        if (existingError) {
            existingError.remove();
        }
        
        this.container.appendChild(errorDiv);
    }
}

// Export the component class
window.AthenaComponent = AthenaComponent;

// Initialize when included in a Shadow DOM context
if (window.shadowRoot) {
    const container = window.shadowRoot.host;
    const component = new AthenaComponent(container);
    component.init();
}