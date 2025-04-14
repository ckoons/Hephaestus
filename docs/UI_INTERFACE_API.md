# Tekton UI Interface API

This document describes the APIs for Component AIs to interact with the RIGHT HEADER and RIGHT FOOTER (ChatInput) components in the Tekton UI.

## Overview

The Tekton UI provides simple interfaces for Component AIs to:

1. Add controls to the RIGHT HEADER
2. Manage input context in the RIGHT FOOTER/ChatInput
3. Set custom placeholder text in the ChatInput

These interfaces are designed to be minimal and straightforward, requiring no complex UI infrastructure or server mechanisms.

## 1. HeaderInterface

The HeaderInterface allows components to add custom controls to the RIGHT HEADER.

### Import

```javascript
import HeaderInterface from '../../utils/HeaderInterface';
```

### Methods

#### setControls(componentId, controls)

Adds custom control buttons to the RIGHT HEADER when this component is active.

- **componentId**: The ID of the component
- **controls**: Array of control objects with the following properties:
  - **icon**: React component with the icon to display
  - **label**: Optional tooltip text for the button
  - **onClick**: Function to execute when the button is clicked
  - **color**: Optional color for the button (e.g., 'primary', 'secondary', 'error')

Example:

```javascript
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';

// Add multiple controls to the header
HeaderInterface.setControls('codex-123', [
  {
    icon: <RefreshIcon />,
    label: 'Refresh',
    onClick: () => refreshData(),
    color: 'primary'
  },
  {
    icon: <SettingsIcon />,
    label: 'Settings',
    onClick: () => openSettings()
  }
]);
```

#### clearControls(componentId)

Removes all custom controls for the component from the header.

- **componentId**: The ID of the component

Example:

```javascript
HeaderInterface.clearControls('codex-123');
```

## 2. FooterInterface

The FooterInterface allows components to interact with the ChatInput in the RIGHT FOOTER.

### Import

```javascript
import FooterInterface from '../../utils/FooterInterface';
```

### Methods

#### saveInputContext(componentId, inputText)

Saves the current input text for a component to restore later.

- **componentId**: The ID of the component
- **inputText**: The text to save

Example:

```javascript
// Save the current input text
FooterInterface.saveInputContext('codex-123', 'Draft message being composed...');
```

#### setPlaceholder(componentId, placeholder)

Sets a custom placeholder text for the input field when this component is active.

- **componentId**: The ID of the component
- **placeholder**: The placeholder text to display

Example:

```javascript
FooterInterface.setPlaceholder('codex-123', 'Ask Codex about your code...');
```

#### getInputContext(componentId)

Gets the saved input context for a component.

- **componentId**: The ID of the component
- **Returns**: The saved input text or empty string if none exists

Example:

```javascript
const savedText = FooterInterface.getInputContext('codex-123');
```

## Implementation Examples

### Example 1: Integrating with Codex/Aider

```javascript
import HeaderInterface from '../../utils/HeaderInterface';
import FooterInterface from '../../utils/FooterInterface';
import CodeIcon from '@mui/icons-material/Code';
import RefreshIcon from '@mui/icons-material/Refresh';

class CodexComponent {
  constructor(componentId) {
    this.componentId = componentId;
    this.setupUI();
  }

  setupUI() {
    // Set custom header controls
    HeaderInterface.setControls(this.componentId, [
      {
        icon: <RefreshIcon />,
        label: 'Refresh Codebase',
        onClick: () => this.refreshCodebase(),
        color: 'primary'
      },
      {
        icon: <CodeIcon />,
        label: 'Code Actions',
        onClick: () => this.showCodeActions()
      }
    ]);

    // Set custom placeholder
    FooterInterface.setPlaceholder(
      this.componentId, 
      'Type your code-related questions here...'
    );
  }

  refreshCodebase() {
    // Implementation for refreshing codebase
    console.log('Refreshing codebase...');
  }

  showCodeActions() {
    // Implementation for showing code actions
    console.log('Showing code actions...');
  }

  // When component is unmounted or deactivated
  cleanup() {
    HeaderInterface.clearControls(this.componentId);
  }
}

export default CodexComponent;
```

### Example 2: Persisting Work in Progress

```javascript
import FooterInterface from '../../utils/FooterInterface';

// When a user is typing but switches to another component
function handleComponentSwitch() {
  const currentInput = document.querySelector('input[placeholder*="Message"]').value;
  
  if (currentInput.trim()) {
    FooterInterface.saveInputContext('my-component-id', currentInput);
    console.log('Saved input context for later');
  }
}

// When returning to a component
function checkForSavedWork() {
  const savedInput = FooterInterface.getInputContext('my-component-id');
  
  if (savedInput) {
    console.log('Restored previously saved work');
  }
}
```

## Technical Implementation

The interfaces are implemented using Redux for state management to avoid complex infrastructure. The components are modified to read from this shared state without disrupting their existing functionality.

- Header controls are stored in Redux under `state.header.componentControls`
- Input contexts are stored in Redux under `state.footer.inputContexts`
- Custom placeholders are stored in Redux under `state.footer.placeholders`

## Best Practices

1. Always clear header controls when your component is deactivated or unmounted
2. Only save input context when there's meaningful content to preserve
3. Set clear, descriptive placeholder text that guides the user
4. Keep header controls minimal and focused on the most important actions
5. Use consistent icons and labels across all components