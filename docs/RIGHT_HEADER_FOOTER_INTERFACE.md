# RIGHT HEADER & RIGHT FOOTER Interface Implementation

This document provides an overview of the implementation for the RIGHT HEADER and RIGHT FOOTER interfaces in the Tekton UI.

## Overview

The implementation provides simple, reusable interfaces that allow Component AIs to:

1. Add custom controls to the RIGHT HEADER
2. Manage input context in the RIGHT FOOTER/ChatInput 
3. Set custom placeholder text in the ChatInput

## Implementation Details

The implementation follows a minimal approach that:

1. Uses Redux for state management (no additional servers or complex mechanisms)
2. Builds on the existing UI components without disrupting their functionality
3. Provides clean, simple interfaces for Component AIs

### Files Implemented

1. **Redux Slices**
   - `/src/store/slices/headerSlice.js`: Manages header control state
   - `/src/store/slices/footerSlice.js`: Manages input context and placeholder state

2. **Interface Utilities**
   - `/src/utils/HeaderInterface.js`: API for header interactions
   - `/src/utils/FooterInterface.js`: API for footer/ChatInput interactions

3. **Component Modifications**
   - `/src/components/layouts/MainLayout.js`: Updated to display custom header controls
   - `/src/components/chat/ChatInput.js`: Updated to preserve input context and support custom placeholders

4. **Documentation**
   - `/docs/UI_INTERFACE_API.md`: Detailed API documentation
   - `/docs/UI_INTERFACE_EXAMPLE.js`: Example component showing usage

### Architecture

The architecture consists of:

1. **Redux Store**:
   - `state.header.componentControls`: Stores controls for each component
   - `state.footer.inputContexts`: Stores input context for each component
   - `state.footer.placeholders`: Stores custom placeholders for each component

2. **Interface APIs**:
   - `HeaderInterface.setControls(componentId, controls)`: Adds custom controls
   - `HeaderInterface.clearControls(componentId)`: Removes custom controls
   - `FooterInterface.saveInputContext(componentId, inputText)`: Saves input context
   - `FooterInterface.setPlaceholder(componentId, placeholder)`: Sets custom placeholder
   - `FooterInterface.getInputContext(componentId)`: Gets saved input context

3. **Component Updates**:
   - `MainLayout`: Renders component-specific controls when active
   - `ChatInput`: Preserves and restores input context when switching components

## Usage Example

```javascript
// Import the interfaces
import HeaderInterface from '../../utils/HeaderInterface';
import FooterInterface from '../../utils/FooterInterface';
import RefreshIcon from '@mui/icons-material/Refresh';

// Example usage in a React component
useEffect(() => {
  // Set custom header controls
  HeaderInterface.setControls('component-123', [
    {
      icon: <RefreshIcon />,
      label: 'Refresh',
      onClick: () => refreshData(),
      color: 'primary'
    }
  ]);

  // Set custom placeholder
  FooterInterface.setPlaceholder(
    'component-123',
    'Type your message here...'
  );

  // Clean up on unmount
  return () => {
    HeaderInterface.clearControls('component-123');
  };
}, []);
```

## Key Features

1. **Component-Specific Controls**: Each component can define its own header controls
2. **Input Context Persistence**: Input is preserved when switching between components
3. **Custom Placeholders**: Components can set their own input placeholders
4. **Minimal Implementation**: Uses existing Redux store with no additional infrastructure
5. **Clean API**: Simple, well-documented interfaces for Component AIs

See the detailed API documentation in `/docs/UI_INTERFACE_API.md` for complete usage instructions.