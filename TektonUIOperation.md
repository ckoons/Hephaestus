# Tekton UI Operation: AI Interoperation Guide

## Overview

This document describes how AI components will interact with the Tekton UI system. Each component in the Tekton platform has an associated AI that specializes in a specific domain. This guide outlines the communication protocols, interface mechanisms, and operational patterns for these AIs to interoperate with the Hephaestus UI.

## AI Component Architecture

Each Tekton component has:
1. A specialized AI service
2. A UI representation in Hephaestus
3. A communication channel between them
4. Persistent storage of context and state

## Communication Protocol

### WebSocket Communication

All AI-UI interaction occurs through a WebSocket interface with the following message structure:

```json
{
  "type": "MESSAGE_TYPE",
  "source": "COMPONENT_ID",
  "target": "UI|COMPONENT_ID",
  "timestamp": "ISO_DATE_STRING",
  "payload": {
    // Message-specific content
  }
}
```

Common message types include:
- `COMMAND` - Commands from UI to AI
- `RESPONSE` - AI responses to commands
- `UPDATE` - UI state updates
- `NOTIFICATION` - System notifications
- `ERROR` - Error messages

### Component-UI Lifecycle

1. **Initialization**:
   - UI loads component interface
   - Component registers with UI
   - UI requests initial state
   - Component sends state data

2. **Operation**:
   - User interacts with UI controls
   - UI sends `COMMAND` messages to component AI
   - AI processes commands and sends `RESPONSE` messages
   - UI updates based on responses

3. **State Persistence**:
   - UI stores user input in localStorage
   - Component AI maintains conversation context
   - Both synchronize on reconnection

## AI Integration Points

### 1. Chat Interface Integration

The footer chat input provides a universal interface to all component AIs:

- Component AI receives chat messages when active
- Input context is stored in localStorage by component ID
- Previous context is restored when switching back to a component
- AI responses are displayed in the main panel or terminal

Implementation:
```javascript
// Store input context
function saveInputContext(componentId, text) {
  localStorage.setItem(`tekton_input_${componentId}`, text);
}

// Retrieve input context
function getInputContext(componentId) {
  return localStorage.getItem(`tekton_input_${componentId}`) || '';
}

// Send message to AI
function sendMessageToAI(componentId, message) {
  websocket.send(JSON.stringify({
    type: "COMMAND",
    source: "UI",
    target: componentId,
    timestamp: new Date().toISOString(),
    payload: {
      command: "process_message",
      message: message
    }
  }));
}
```

### 2. Terminal Integration

For components that utilize terminal interfaces:

- AI can send terminal commands and outputs
- Terminal state is component-specific
- Command history is preserved
- AI can process terminal input directly

Implementation:
```javascript
// Terminal update from AI
function updateTerminal(componentId, text, isCommand = false) {
  if (activeComponent !== componentId) return;
  
  const terminal = document.getElementById('terminal');
  
  if (isCommand) {
    terminal.writeln(`$ ${text}`);
    // Process command...
  } else {
    terminal.writeln(text);
  }
  
  // Store in history
  terminalHistory[componentId] = terminalHistory[componentId] || [];
  terminalHistory[componentId].push({
    type: isCommand ? 'command' : 'output',
    text: text
  });
}
```

### 3. Component-Specific Controls

AIs can interact with component-specific HTML controls:

- Update display elements (charts, lists, etc.)
- Respond to control events (buttons, forms, etc.)
- Provide contextual information in the header
- Adapt UI based on conversation context

Implementation:
```javascript
// Update component UI from AI
function updateComponentUI(componentId, updates) {
  if (activeComponent !== componentId) return;
  
  Object.entries(updates).forEach(([elementId, update]) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (update.text) element.textContent = update.text;
    if (update.html) element.innerHTML = update.html;
    if (update.value) element.value = update.value;
    if (update.classes) {
      update.classes.add.forEach(cls => element.classList.add(cls));
      update.classes.remove.forEach(cls => element.classList.remove(cls));
    }
    // Other update types...
  });
}
```

## Component-Specific AI Operation

### Tekton - Projects AI
- Manages project dashboard
- Creates and updates project cards
- Processes project queries and commands
- Updates project status visualizations

### Prometheus - Planning AI
- Handles planning and roadmap queries
- Updates Gantt charts and timelines
- Processes deadline and milestone management
- Integrates with other component plans

### Telos - Requirements AI
- Manages requirements documentation
- Creates requirement hierarchies
- Validates requirement completeness
- Tracks requirement fulfillment

### Athena - Knowledge AI
- Processes knowledge graph queries
- Visualizes knowledge relationships
- Answers factual questions
- Updates knowledge base content

### Sophia - Learning AI
- Manages machine learning operations
- Displays model training progress
- Provides insight explanations
- Visualizes data analysis

### Engram - Memory AI
- Manages conversation history
- Provides context retrieval
- Visualizes memory connections
- Supports memory operations (search, recall, forget)

### Rhetor - Context AI
- Manages active context switching
- Provides contextual awareness to other AIs
- Displays current context visualization
- Processes context commands

### Hermes - Messages/Data AI
- Manages data flow between components
- Provides data visualization
- Processes data queries
- Shows system message status

### Codex - Coding AI
- Manages code generation and review
- Displays code with syntax highlighting
- Processes code-related commands
- Shows documentation lookups

### Harmonia - Orchestration AI
- Manages component coordination
- Visualizes system workflow
- Processes orchestration commands
- Shows system health status

### Synthesis - Integration AI
- Manages system integration points
- Displays integration status
- Processes integration commands
- Shows external system connections

## Header Integration

The header area provides contextual information controlled by the active component AI:

- Component name and specialty
- Contextual actions (buttons, dropdown menus)
- Status indicators specific to the component
- Breadcrumb navigation when relevant

Example header update:
```javascript
function updateHeader(componentId, data) {
  const header = document.getElementById('component-header');
  
  // Update title
  header.querySelector('.component-title').textContent = data.title || '';
  
  // Update actions
  const actionsContainer = header.querySelector('.component-actions');
  actionsContainer.innerHTML = '';
  
  if (data.actions && data.actions.length) {
    data.actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'header-action-btn';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        sendMessageToAI(componentId, {
          command: 'execute_action',
          actionId: action.id
        });
      });
      actionsContainer.appendChild(button);
    });
  }
  
  // Update status indicators
  if (data.status) {
    header.querySelector('.component-status').textContent = data.status;
  }
}
```

## Context Persistence

AI components maintain conversation context across sessions through:

1. **Client-side Storage**:
   - User input stored in localStorage by component ID
   - Terminal history cached per component
   - UI state persisted between sessions

2. **Server-side Context**:
   - Component AIs maintain conversation history
   - Context is associated with user session
   - Long-term memory managed by Engram

3. **Context Synchronization**:
   - On component activation, UI requests current context
   - AI provides relevant context for display
   - Input box is populated with stored draft text

Implementation:
```javascript
// Activate component and restore context
function activateComponent(componentId) {
  // Update UI state
  setActiveComponent(componentId);
  
  // Restore input context
  const savedInput = getInputContext(componentId);
  document.getElementById('chat-input').value = savedInput;
  
  // Request current AI context
  websocket.send(JSON.stringify({
    type: "COMMAND",
    source: "UI",
    target: componentId,
    timestamp: new Date().toISOString(),
    payload: {
      command: "get_context"
    }
  }));
  
  // Restore terminal history if applicable
  if (terminalHistory[componentId]) {
    const terminal = document.getElementById('terminal');
    terminal.clear();
    terminalHistory[componentId].forEach(entry => {
      if (entry.type === 'command') {
        terminal.writeln(`$ ${entry.text}`);
      } else {
        terminal.writeln(entry.text);
      }
    });
  }
}
```

## Error Handling

When AI components encounter errors:

1. Error messages are displayed in the UI
2. Terminal shows error details when applicable
3. UI provides retry mechanisms for failed operations
4. Component state is preserved during error recovery

Example error handling:
```javascript
websocket.addEventListener('message', function(event) {
  const message = JSON.parse(event.data);
  
  if (message.type === "ERROR") {
    const errorContainer = document.getElementById('error-container');
    errorContainer.textContent = message.payload.message;
    errorContainer.style.display = 'block';
    
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
    
    // Log to terminal if active
    if (message.payload.showInTerminal && activeComponentMode === 'terminal') {
      const terminal = document.getElementById('terminal');
      terminal.writeln(`[ERROR] ${message.payload.message}`);
    }
  }
});
```

## Implementation Guidelines for AI Components

When implementing a component AI for Tekton:

1. **Follow the Component Protocol**:
   - Use standard message format
   - Implement required lifecycle methods
   - Maintain conversation context

2. **Provide UI Information**:
   - Define component name and specialty
   - Specify UI mode (terminal or HTML controls)
   - Supply icon and description

3. **Handle Standard Commands**:
   - `get_context` - Return current AI context
   - `process_message` - Process user message
   - `execute_action` - Perform component action
   - `get_status` - Return component status

4. **Implement UI Updates**:
   - Send terminal updates when appropriate
   - Update HTML elements as needed
   - Manage header context and actions
   - Provide notifications as needed

5. **Document Component-Specific Commands**:
   - List available commands
   - Describe command parameters
   - Explain expected responses
   - Provide example interactions

## Security Considerations

AI components must adhere to these security guidelines:

1. Validate all user input before processing
2. Sanitize HTML content sent to the UI
3. Use proper authentication for API access
4. Limit terminal commands to safe operations
5. Implement proper error handling
6. Follow least-privilege principles

## Testing AI-UI Integration

To verify AI-UI integration:

1. Test component initialization and registration
2. Verify message passing in both directions
3. Confirm context persistence works correctly
4. Test error handling and recovery
5. Validate terminal command processing
6. Verify HTML control updates
7. Test cross-component interaction

## UI Element Reference

This section provides a reference of HTML element IDs, classes, and selectors for interacting with the Tekton UI programmatically.

### Navigation and Component Selection

**Component Navigation Items**:
- Selector: `.nav-item[data-component="COMPONENT_ID"]`
- Example: `.nav-item[data-component="tekton"]`
- Attributes: `data-component` - Contains the component identifier

**Status Indicators**:
- Selector: `.nav-item[data-component="COMPONENT_ID"] .status-indicator`
- Classes:
  - `.active` - Green indicator showing active status
  - `.attention` - Orange indicator for items needing attention
  - `.alert` - Red pulsing indicator for urgent matters

### Main UI Sections

**Left Panel**:
- ID: N/A
- Class: `.left-panel`

**Header Section**:
- Class: `.content-header`
- Child Elements:
  - `.component-title` - Title of the current component
  - `.component-controls` - Container for component-specific controls

**Main Content Area**:
- Class: `.content-main`
- Panels:
  - `#terminal-panel` - Contains the terminal interface
  - `#html-panel` - Contains HTML-based component UI

**Terminal**:
- ID: `#terminal`
- Class: `.terminal`

**Footer Chat Input**:
- ID: `#chat-input` - Textarea for user input
- ID: `#send-button` - Button to send messages

### Control Elements

**Settings Buttons**:
- ID: `#budget-button` - Opens budget information
- ID: `#profile-button` - Opens user profile
- ID: `#settings-button` - Opens settings dialog

**Modal Dialog**:
- ID: `#system-modal` - Container for modal dialogs
- ID: `#modal-title` - Title area of modal
- ID: `#modal-body` - Content area of modal

**Error Container**:
- ID: `#error-container` - Element for displaying error messages

### Component UI Integration Points

When creating a component-specific UI, register these functions:

```javascript
window.COMPONENT_ID_Component = {
  // Called when component is first activated
  initialize: function() {
    // Setup code
  },
  
  // Called to handle messages from AI
  receiveMessage: function(message) {
    // Process message from AI
  },
  
  // Called when component is being deactivated
  cleanup: function() {
    // Cleanup code
  }
};
```

### WebSocket Message Structure

When sending commands to the AI:

```javascript
// Send command to the active component
tektonUI.sendCommand("command_name", {
  // Command parameters
  param1: "value1",
  param2: "value2"
});
```

Component status indicators can be set via CSS classes:

```javascript
// Get the status indicator for a component
const indicator = document.querySelector('.nav-item[data-component="tekton"] .status-indicator');

// Set status (active, attention, alert)
indicator.classList.add('active');  // Green
indicator.classList.add('attention');  // Orange
indicator.classList.add('alert');  // Red, pulsing
```