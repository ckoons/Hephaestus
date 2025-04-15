# Hephaestus

Hephaestus is the UI component for the Tekton system. This is a complete redesign focusing on simplicity, maintainability, and integration with all Tekton components.

![Tekton UI](../../images/Tekton.png)

## Purpose

The Hephaestus component provides a unified user interface for interacting with all Tekton system components. It serves as the main dashboard and control center for the entire Tekton orchestration system.

## Development Status

Implementation is in progress. The redesign uses a simpler architecture with vanilla JavaScript, HTML, and CSS instead of complex frameworks for better maintainability.

### Current Status:
- ✅ Core UI framework implemented
- ✅ Basic component integration pattern established
- ✅ Ergon component UI fully implemented
- ✅ WebSocket communication infrastructure built
- ✅ Terminal and HTML panel switching implemented
- ✅ Dark/light theme support added
- ⏳ Additional component UIs to be implemented
- ⏳ Backend integration to be completed

**See [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) for detailed information about current progress, architecture, and next steps.**

## Architecture

- **Vanilla Web Technologies**: Simple HTML/CSS/JS with no complex frameworks or build systems
- **Component-Based Design**: Each Tekton component has its own UI module
- **Logical Navigation**: Components organized in functional groups for intuitive access
- **AI Assistant Tabs**: Support for multiple AI contexts within components (e.g., Ergon/Ergon-Team)
- **Real-Time Communication**: WebSocket-based communication with backend services
- **Persistent State**: Client-side storage for user preferences and context
- **Dual Interface**: Support for both terminal and graphical interfaces

## Integration Points

- **Hermes Integration**: Connects with Hermes for service discovery
- **Component Interfaces**: Provides UI for all Tekton components
- **System Monitoring**: Visualizes system status and component health 
- **AI Communication**: Interfaces with component-specific AI models
- **WebSocket Protocol**: Standardized message format for all communication

## Running the UI

```bash
# Start the UI server on port 8080
./run_ui.sh

# Access the UI in your browser
# http://localhost:8080
```

## Adding New Components

Follow the established pattern to add new component UIs:

1. Create an HTML template in `/ui/components/`
2. Add CSS styling in `/ui/styles/`
3. Implement JavaScript functionality in `/ui/scripts/`
4. Add component to the navigation in `index.html`
5. Register the component in the UI system

Detailed component integration instructions are available in [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md#component-integration-guide).

## Component Structure

```
/ui/components/component-name.html   # HTML template
/ui/styles/component-name.css        # Component-specific styles
/ui/scripts/component-name.js        # Component functionality
```

## Technical Design

For more details on the UI implementation, see:
- [UI_STYLING_GUIDE.md](./UI_STYLING_GUIDE.md) - Styling guidelines and best practices
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Current status and implementation details
- [TektonUIOperation.md](./TektonUIOperation.md) - AI integration details
- [HephaestusRedesign.md](./HephaestusRedesign.md) - Historical design decisions and approach

## UI Image Management

Images used in the UI should follow these guidelines:

1. **Location:**
   - UI-specific images should be placed in: `/Hephaestus/ui/images/`
   - Shared Tekton images remain in: `/images/`

2. **Referencing Images:**
   - From HTML: Use relative paths (e.g., `images/icon.png`)
   - Always include fallbacks: `onerror="this.src='images/fallback.png'"`

3. **Image Formats:**
   - Use PNG for icons and logos
   - Use JPEG for photographs
   - Keep image sizes reasonable (under 200KB)

The UI server has been configured to properly serve images from these locations.