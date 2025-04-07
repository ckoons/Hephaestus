# Hephaestus UI

The browser-based user interface for the Tekton multi-AI engineering platform.

## Overview

Hephaestus UI provides a unified interface for interacting with all Tekton components. It features:

- Component-centric views with dedicated interfaces
- Persistent chat interface across all components
- Budget controls and cost monitoring
- Clear attribution of messages from different components
- Real-time WebSocket communication

## Technology Stack

- **Backend**: FastAPI with WebSockets
- **Frontend**: HTML, CSS, and JavaScript (basic version)
  - Future version will use React with TypeScript and Material UI

## Setup Instructions

### Prerequisites

- Python 3.8+
- uv (Python dependency manager) or pip
- Tekton core and component installations

### Installation

1. **Run the Setup Script**

   The easiest way to set up Hephaestus UI is to use the provided setup script:

   ```bash
   ./setup_ui.sh
   ```

   This will:
   - Install Python dependencies using uv (or pip if uv is not available)
   - Create a basic HTML/CSS/JS interface
   - Set up the necessary directory structure

   If you don't have uv installed, you can install it with:
   ```bash
   pip install uv
   ```

### Running the UI

The simplest way to run the UI is with the provided run script:

```bash
./run_ui.sh
```

This script will:
- Check if the UI is built and run setup if needed
- Verify Python dependencies are installed (using uv if available)
- Start the server

Alternatively, start the server directly:

```bash
python -m hephaestus.ui.main
```

By default, the server will:
- Start on http://localhost:8080
- Open a browser window with the UI
- Connect to available Tekton components

### Command-line Options

```
usage: python -m hephaestus.ui.main [--host HOST] [--port PORT] [--debug] [--no-browser]

optional arguments:
  --host HOST     Host to bind the server to (default: localhost)
  --port PORT     Port to bind the server to (default: 8080)
  --debug         Enable debug mode
  --no-browser    Don't open a browser window
```

## Future React Implementation

The current implementation provides a basic static HTML interface. For a full React UI:

1. Create a React project in a separate directory:
   ```bash
   npm create vite@latest tekton-ui -- --template react-ts
   ```

2. Develop the UI components according to the UI design document

3. Build the React app:
   ```bash
   cd tekton-ui
   npm install
   npm run build
   ```

4. Copy the build files to the Hephaestus static directory:
   ```bash
   cp -r dist/* /path/to/Hephaestus/hephaestus/ui/static/
   ```

## Architecture

- **Client-Server Communication**: WebSockets for real-time updates
- **Component Integration**: API endpoints for each Tekton component
- **Authentication**: Optional JWT-based authentication
- **Deadlock Prevention**: Integrated with Tekton's deadlock prevention system

## Troubleshooting

- If the UI fails to connect to Tekton components, check that the Hermes message bus is running
- For WebSocket connection issues, verify there are no firewall rules blocking the connection
- Check the server logs (default: INFO level) for error messages
- Enable debug mode for more detailed logging: `--debug`