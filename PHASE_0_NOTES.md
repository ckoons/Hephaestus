# Hephaestus UI Reimplementation - Phase 0 Notes

## Overview

This document contains notes from the Phase 0 analysis of the Hephaestus UI codebase, focusing on understanding the current implementation, identifying issues, and preparing for the reimplementation strategy.

## Core Files and Structure

### Main Files
- **index.html**: Main entry point containing the basic UI structure
- **main.js**: Core initialization, manages global state
- **ui-manager.js**: Handles component switching and panel management
- **component_registry.json**: Defines available components and their configurations

### CSS Organization
- **styles/main.css**: Global styles and variables
- **styles/themes/**: Theme variations
- **styles/[component]/**: Component-specific styles

### Component Loading
- **ui-manager.js** handles component activation and loading
- Special case loading for Rhetor, Budget, and Terma components
- Registry-based loading for other components

## Flow of Control

1. **Initialization (main.js)**:
   - Sets up global tektonUI object
   - Initializes UIManager, TerminalManager, StorageManager, WebSocketManager
   - Loads component registry
   - Activates default component (tekton)

2. **Component Activation (ui-manager.js)**:
   - User clicks on navigation item
   - `activateComponent(componentId)` is called
   - Special case handling for Rhetor and Budget
   - For other components, either activates existing component or loads new one

3. **Component Loading (ui-manager.js)**:
   - `loadComponentUI(componentId)` checks if component is loaded already
   - For registry components, calls `loadRegistryComponent()`
   - For special components, calls dedicated loading methods (e.g., `loadRhetorComponent()`)
   - Fetches HTML content and injects into DOM
   - Loads associated CSS and JS files

4. **Panel Management (ui-manager.js)**:
   - `activatePanel(panelId)` controls visibility of terminal, HTML, settings, and profile panels
   - Hides all panels first, then shows the requested panel
   - Special handling for HTML panel to ensure proper container visibility

## Identified Issues

### Component Loading Mechanism Issues
- **Duplication of Loading Logic**: Nearly identical code blocks for loading Rhetor and Budget components
- **Lack of Isolation**: Components are directly inserted into DOM without proper boundaries
- **Panel Clearing**: HTML panel is completely cleared when loading special components
- **Multiple Fetch Patterns**: Different methods for loading components with similar steps

### CSS Isolation Problems
- **Global CSS Variables**: Duplicate definitions across component CSS files
- **Non-Namespaced Classes**: Generic class names used across components (e.g., `.tab-content`, `.tab-button`)
- **Inconsistent BEM Implementation**: Mix of BEM and nested selectors
- **Style Bleeding**: No isolation boundary for component styles

### DOM Structure Issues
- **Direct HTML Insertion**: Raw HTML content inserted without sanitization or structure
- **Potential Recursive Inclusion**: No checks to prevent main UI elements from being included in component content
- **No Shadow DOM or Iframes**: Lack of isolation mechanisms for component DOM

### Event Handler Duplication
- **Multiple Initialization Points**: Component JS files have their own DOMContentLoaded handlers
- **Duplicate Tab Navigation**: Tab handlers set up in multiple places
- **No Event Delegation**: Direct binding to elements instead of delegation pattern

### Component Interdependencies
- **Tight Coupling**: Budget component depends on RhetorClient class
- **Shared Functionality**: Duplicated code between components (e.g., tab navigation, budget tracking)

## Constants and IDs

### Component IDs
- tekton, prometheus, telos, ergon, harmonia, synthesis, athena, sophia, engram, rhetor, hermes, codex, terma, budget, profile, settings

### HTML Element IDs
1. **Main Containers**:
   - `terminal-panel`: Terminal UI container
   - `html-panel`: Dynamic component container
   - `settings-panel`: Settings interface container
   - `profile-panel`: User profile container

2. **Component Containers**:
   - `[componentId]-container`: Container for each component (e.g., `rhetor-container`)

3. **Common UI Elements**:
   - `budget-button`: Budget panel access button
   - `profile-button`: Profile panel access button
   - `settings-button`: Settings panel access button
   - `terminal-content`: Terminal output container
   - `simple-terminal-input`: Main terminal input field

4. **Rhetor UI Elements**:
   - `providers-content`: Provider selection tab content
   - `templates-content`: Template management tab content
   - `conversations-content`: Conversation history tab content
   - `budget-content`: Budget management tab content
   - `settings-content`: Settings tab content

5. **Budget UI Elements**:
   - `daily-budget`: Daily budget limit input
   - `weekly-budget`: Weekly budget limit input
   - `monthly-budget`: Monthly budget limit input
   - `enforcement-policy`: Budget enforcement selector
   - `warning-threshold`: Budget warning threshold slider

6. **Profile UI Elements**:
   - `profile-details`: User profile information container
   - `api-keys`: API key management section
   - `usage-summary`: Usage statistics display
   - `notification-settings`: User notification preferences

7. **Settings UI Elements**:
   - `theme-selector`: Theme selection dropdown
   - `debug-toggle`: Debug mode toggle switch
   - `connection-settings`: Connection configuration section
   - `save-settings`: Settings save button

### CSS Class Names

1. **Layout Classes**:
   - `.app-container`: Main application container
   - `.left-panel`: Navigation sidebar
   - `.main-content`: Right content area
   - `.panel`: Content panel base class
   - `.active`: Applied to active elements

2. **Navigation Classes**:
   - `.component-nav`: Navigation list
   - `.nav-item`: Navigation item
   - `.nav-label`: Navigation item text
   - `.status-indicator`: Component status indicator

3. **Rhetor Component Classes**:
   - `.rhetor-container`: Main Rhetor component wrapper
   - `.rhetor-tabs`: Tab navigation container
   - `.tab-button`: Tab selector button
   - `.tab-content`: Tab content container
   - `.rhetor-section-header`: Section title container

4. **Budget Component Classes**:
   - `.budget-container`: Main Budget component wrapper
   - `.budget-tabs`: Tab navigation container
   - `.budget-overview`: Budget summary section
   - `.budget-card`: Individual budget metric card
   - `.budget-progress`: Budget progress bar container

5. **Profile Component Classes**:
   - `.profile-container`: Main Profile component wrapper
   - `.profile-section`: Profile information section
   - `.api-key-item`: Individual API key container
   - `.usage-chart`: Usage visualization element
   - `.profile-action`: Profile action button

6. **Settings Component Classes**:
   - `.settings-container`: Main Settings component wrapper
   - `.settings-section`: Settings group container
   - `.setting-row`: Individual setting container
   - `.theme-preview`: Theme selection preview
   - `.toggle-switch`: Settings toggle element

## Recommended Constant Ranges

To avoid conflicts between component constants and IDs, I recommend the following range allocations:

1. **Core UI**: 1-99
   - Main layout, navigation, and shared components

2. **Tekton Core**: 100-199
   - Dashboard and system management components

3. **Planning Components**: 200-299
   - Prometheus (200-249)
   - Telos (250-299)

4. **Agent Components**: 300-399
   - Ergon (300-349)
   - Harmonia (350-399)

5. **Integration Components**: 400-499
   - Synthesis (400-449)
   - Athena (450-499)

6. **Knowledge Components**: 500-599
   - Sophia (500-549)
   - Engram (550-599)

7. **Communication Components**: 600-699
   - Rhetor (600-649)
   - Hermes (650-699)

8. **Development Components**: 700-799
   - Codex (700-749)
   - Terma (750-799)

9. **Management Components**: 800-899
   - Budget (800-849)
   - Profile (850-899)
   - Settings (900-949)

10. **Utility Components**: 950-999
    - System utilities and helpers

## Next Steps for Reimplementation

Based on this analysis, I recommend the following specific next steps for Phase 1:

1. **Create Component Isolation Framework**:
   - Implement Shadow DOM approach as recommended in the reimplementation guide
   - Create a unified component loading system with proper boundaries

2. **Standardize CSS Naming**:
   - Apply consistent BEM methodology across all components
   - Implement CSS namespacing using the recommended constant ranges

3. **Refactor Component Loading**:
   - Extract common loading logic into a shared method
   - Implement proper lifecycle management for components

4. **Fix Event Handling**:
   - Use event delegation pattern for UI interactions
   - Implement cleanup routines to prevent memory leaks

5. **Resolve Component Dependencies**:
   - Decouple tightly coupled components
   - Create shared services for common functionality