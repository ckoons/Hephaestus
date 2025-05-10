# Hephaestus UI Refactoring Guide

## Overview

This document outlines the refactoring approach for the Tekton Hephaestus UI framework. The goal is to break down the monolithic `ui-manager.js` file (which was over 200KB / 50,000 tokens) into a modular architecture that is maintainable, extensible, and allows for better component isolation.

## Project Structure Before Refactoring

Previously, all UI management logic was contained in a single large file:

```
ui/
  scripts/
    ui-manager.js         # ~200KB monolithic UI management
    main.js               # Application initialization
    terminal.js           # Terminal handling
    websocket.js          # WebSocket communication
    component-loader.js   # Basic component loading (limited use)
    ...
```

## Project Structure After Refactoring

The new modular structure is as follows:

```
ui/
  scripts/
    core/
      ui-manager-core.js  # Core UI management functionality
      component-loader.js # Generic component loading utilities
      panel-manager.js    # Panel switching and management
    components/
      athena/
        athena-component.js  # Athena implementation
      ergon/
        ergon-component.js   # Ergon implementation
      shared/
        chat-panel.js        # Shared chat functionality
        tab-navigation.js    # Shared tab functionality
    main.js                # Application initialization
    ui-manager.js          # Legacy fallback (for backward compatibility)
    ...
```

## Key Changes

1. **Core Module Separation**:
   - Core functionality extracted into separate modules
   - Each module has a single responsibility
   - Clear APIs between modules

2. **Component Isolation**:
   - Each component now has its own directory and files
   - Component-specific code moved from ui-manager.js to dedicated files
   - Shared functionality extracted to reusable modules

3. **Backward Compatibility**:
   - Legacy ui-manager.js still loaded for backward compatibility
   - New code can fall back to legacy methods when needed
   - Gradual migration path for existing components

4. **Dependency Management**:
   - Clear loading order in index.html
   - Explicit dependencies between modules
   - Global objects for shared access where needed

## Modules and Responsibilities

### Core Modules

#### `ui-manager-core.js`
- Core UI state management
- Component activation and navigation
- Component availability monitoring
- High-level UI operations

#### `component-loader.js`
- Dynamic loading of component HTML and scripts
- Component registration and lifecycle management
- Shadow DOM support for component isolation
- Error handling and fallbacks

#### `panel-manager.js`
- Panel registration and activation
- Managing visibility of UI panels
- Mapping components to preferred panels
- Panel-related event handling

### Shared Component Modules

#### `chat-panel.js`
- Standardized chat interface
- Message input handling
- Message history and navigation
- Message formatting and display

#### `tab-navigation.js`
- Tabbed interface management
- Tab state persistence
- Tab activation and deactivation
- Tab-related event handling

### Component-Specific Modules

#### `athena-component.js`
- Athena knowledge graph functionality
- Knowledge chat implementation
- Entity management
- Graph visualization

#### `ergon-component.js`
- Ergon agent management
- Multi-context chat functionality
- Tool orchestration
- MCP integration

## Migration Approach

The refactoring follows these steps:

1. **Create Core Modules**: Extract core functionality into separate files
2. **Extract Shared Components**: Identify and extract reusable patterns
3. **Extract Component-Specific Code**: Move component implementations to dedicated files
4. **Update Loading Logic**: Modify index.html to load new module structure
5. **Maintain Backward Compatibility**: Keep legacy code for backward compatibility
6. **Incremental Testing**: Test each module as it's extracted
7. **Document New Architecture**: Add documentation for the new structure

## Future Improvements

1. **Service Workers**: Add support for offline operation and caching
2. **Dependency Injection**: Formalize module dependencies
3. **Event-Based Architecture**: Move to a more event-driven approach
4. **Lazy Loading**: Load components only when needed
5. **CSS Modularization**: Break down CSS into component-specific styles
6. **Testing Framework**: Add automated tests for UI components
7. **Type Safety**: Add TypeScript or JSDoc type annotations

## Migration Status

- ✅ Core modules created
- ✅ Shared components extracted
- ✅ Athena component extracted
- ✅ Ergon component extracted
- ✅ Loading order established
- ✅ Backward compatibility maintained
- ⬜ CSS modularization
- ⬜ Event-based architecture
- ⬜ Full testing
- ⬜ Additional component extraction

## Testing Plan

1. Test core module initialization
2. Test panel management
3. Test component loading
4. Test Athena functionality
5. Test Ergon functionality
6. Test with various screen sizes
7. Test WebSocket communication
8. Test terminal functionality
9. Test navigation
10. Test backward compatibility with existing code

## Installation

To use the new refactored UI:

1. Back up the existing files:
   ```bash
   cp /Users/cskoons/projects/github/Tekton/Hephaestus/ui/scripts/main.js /Users/cskoons/projects/github/Tekton/Hephaestus/ui/scripts/main.js.bak
   cp /Users/cskoons/projects/github/Tekton/Hephaestus/ui/index.html /Users/cskoons/projects/github/Tekton/Hephaestus/ui/index.html.bak
   ```

2. Install the new files:
   ```bash
   cp /Users/cskoons/projects/github/Tekton/Hephaestus/ui/scripts/main.js.new /Users/cskoons/projects/github/Tekton/Hephaestus/ui/scripts/main.js
   cp /Users/cskoons/projects/github/Tekton/Hephaestus/ui/index.html.new /Users/cskoons/projects/github/Tekton/Hephaestus/ui/index.html
   ```

3. Restart the Hephaestus UI server

## Rollback Procedure

If issues are encountered, roll back to the previous version:

```bash
cp /Users/cskoons/projects/github/Tekton/Hephaestus/ui/scripts/main.js.bak /Users/cskoons/projects/github/Tekton/Hephaestus/ui/scripts/main.js
cp /Users/cskoons/projects/github/Tekton/Hephaestus/ui/index.html.bak /Users/cskoons/projects/github/Tekton/Hephaestus/ui/index.html
```

## Conclusion

This refactoring addresses the critical issue of the UI manager becoming too large to work with effectively. By breaking it into smaller, focused modules and extracting component-specific code, we've made the codebase more maintainable and set the stage for future improvements. The modular architecture will make it easier to add new components, fix issues, and enhance functionality without risk of breaking existing features.