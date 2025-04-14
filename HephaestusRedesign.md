# Hephaestus UI Redesign

## Overview

We're rebuilding the Tekton UI system (Hephaestus) from scratch with simplicity as the primary goal. The previous React implementation became overly complex with nested directory structures and build issues. This document outlines the plan for a cleaner, simpler implementation.

## Core Requirements

- Simple UI with left sidebar, main content area, header, and footer chat input
- Persistent input context via localStorage
- No complex build systems or frameworks
- Direct loading of HTML/CSS/JS files
- Clean, maintainable code structure
- Support for both terminal interfaces and standard HTML controls in the main panel
- Seamless integration with various AI assistants for each component

## UI Structure

### LEFT PANEL
- **Top**: Tekton title and icon
- **Middle**: Navigation tabs for Component UIs in this specific order:
  * Tekton - Projects
  * Prometheus - Planning
  * Telos - Requirements
  * Athena - Knowledge
  * Sophia - Learning
  * Engram - Memory
  * Rhetor - Context
  * Hermes - Messages/Data
  * Codex - Coding
  * Harmonia - Orchestration
  * Synthesis - Integration
- **Bottom**: Budget, Profile, and Settings icons

### RIGHT SIDE
- **Header**: Component-specific controls and information (context-aware)
- **Main Panel**: Dynamic display area that can switch between:
  * Terminal interface (scrolling, command history, etc.)
  * HTML-based controls for CLI operations
  * Component-specific visualizations and interfaces
- **Footer**: Chat input area with input persistence via localStorage

## Tech Stack

- **HTML5** for structure
- **CSS** for styling (with CSS variables for theming)
- **Vanilla JavaScript** for interactivity
- **Lightweight Libraries**:
  * xterm.js for terminal emulation
  * marked.js for Markdown rendering (for chat/documentation)
  * Simple WebSocket client for real-time communication

## Implementation Plan

### Phase 1: Core Structure
1. Create basic HTML layout with all panels
2. Implement CSS for responsive layout and dark/light theming
3. Set up basic JavaScript for panel switching

### Phase 2: Component Navigation
1. Implement left panel navigation system
2. Create component selection mechanism
3. Build dynamic loading of component UIs

### Phase 3: Main Panel Functionality
1. Implement terminal interface with xterm.js
2. Create HTML control panel system
3. Build interface switching mechanism

### Phase 4: Persistent State & Communication
1. Implement localStorage for input persistence
2. Set up WebSocket communication for AI interactions
3. Create message handling system for component-AI communication

### Phase 5: Component Integration
1. Create documentation for component UI file format
2. Implement component registration mechanism
3. Build example component UIs for testing

## File Structure

```
/hephaestus/
  ├── ui/
  │   ├── index.html              # Main entry point
  │   ├── styles/
  │   │   ├── main.css            # Core styles
  │   │   ├── terminal.css        # Terminal-specific styles
  │   │   └── themes/
  │   │       ├── dark.css        # Dark theme
  │   │       └── light.css       # Light theme
  │   ├── scripts/
  │   │   ├── main.js             # Core functionality
  │   │   ├── ui-manager.js       # UI state management
  │   │   ├── terminal.js         # Terminal interface
  │   │   ├── storage.js          # localStorage handlers
  │   │   └── websocket.js        # WebSocket communication
  │   ├── components/             # Component UI files
  │   │   ├── tekton.html         # Projects component UI
  │   │   ├── prometheus.html     # Planning component UI
  │   │   └── ...                 # Other component UIs
  │   └── lib/                    # Third-party libraries
  │       ├── xterm/              # Terminal emulator
  │       └── marked/             # Markdown parser
  └── server/                     # Simple server for Tekton UI
      ├── server.py               # Python-based UI server
      └── component_registry.json # Component registration info
```

## Component UI Format

Each component will provide a simple HTML file that defines its UI. This file should:

1. Be self-contained with necessary HTML structure
2. Use predefined CSS classes from the main UI
3. Expose functions for communication with the main UI
4. Define event handlers for component-specific actions

Example:
```html
<div class="component-ui" data-component="tekton">
  <div class="component-header">
    <h2>Projects</h2>
    <div class="component-controls">
      <button class="btn" id="tekton-new-project">New Project</button>
    </div>
  </div>
  <div class="component-main">
    <div class="project-list">
      <!-- Project items will be loaded here -->
    </div>
  </div>
  <script>
    // Component-specific JavaScript
    document.getElementById('tekton-new-project').addEventListener('click', function() {
      // Send command to create new project
      window.tektonUI.sendCommand('create_project');
    });
    
    // Function exposed to main UI
    window.tektonComponent = {
      initialize: function() {
        // Setup code
      },
      
      receiveMessage: function(message) {
        // Handle messages from AI
      }
    };
  </script>
</div>
```

## UI-Component Communication

Communication between the main UI and component UIs will use a simple message passing system:

1. Main UI exposes a global `tektonUI` object with methods like:
   - `sendCommand(command, params)`
   - `switchComponent(componentId)`
   - `updateTerminal(text)`

2. Components expose their own objects (e.g., `tektonComponent`) with methods like:
   - `initialize()`
   - `receiveMessage(message)`
   - `updateState(state)`

This approach allows simple, direct communication without complex frameworks.

## Next Steps

1. Create base HTML, CSS, and JavaScript files
2. Implement core UI layout and navigation
3. Build terminal interface
4. Create localStorage persistence for chat input
5. Implement WebSocket communication for AI interaction
6. Develop and test component UI loading mechanism
7. Create example component UIs