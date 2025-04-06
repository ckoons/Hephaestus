"""
Server implementation for the Hephaestus UI.

This module provides a FastAPI server that serves the UI and exposes
WebSocket endpoints for real-time communication with deadlock prevention.
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Any, Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from ..services.hermes.client import HephaestusHermesAdapter
from ..core.component_manager import ComponentManager
from ..core.lifecycle import ComponentState

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Hephaestus UI Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Websocket manager for handling multiple connections
class ConnectionManager:
    """Manager for WebSocket connections."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        """Connect a new websocket client."""
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        """Disconnect a websocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients."""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                # Remove failed connection
                self.disconnect(connection)
            
    async def send_to_client(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send a message to a specific client."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")
            # Disconnect client on error
            self.disconnect(websocket)


# Create connection manager
manager = ConnectionManager()

# Create Hermes adapter and component manager
hermes_adapter = None
component_manager = None


# Dependency for getting component manager
async def get_component_manager() -> ComponentManager:
    """Get the component manager. Create and initialize if needed."""
    global component_manager, hermes_adapter
    if component_manager is None:
        # Create Hermes adapter if needed
        if hermes_adapter is None:
            hermes_adapter = HephaestusHermesAdapter()
            
        # Create and initialize component manager
        component_manager = ComponentManager(hermes_adapter)
        
        # Register callback for component status updates
        component_manager.register_status_update_callback(handle_component_update)
        
        # Initialize the component manager
        await component_manager.initialize()
        
        # Start periodic deadlock check
        asyncio.create_task(periodic_deadlock_check())
        
    return component_manager


# Periodic deadlock check
async def periodic_deadlock_check():
    """Periodically check for deadlocks."""
    while True:
        try:
            await asyncio.sleep(60)  # Check every minute
            if component_manager:
                await component_manager.check_for_deadlocks()
        except Exception as e:
            logger.error(f"Error in deadlock check: {e}")


# Callback for component updates
async def handle_component_update(component: Dict[str, Any]):
    """Handle component updates from the component manager."""
    await manager.broadcast({
        "type": "component_update",
        "data": component
    })


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    try:
        # Get component manager
        comp_manager = await get_component_manager()
        
        # Send initial component list
        components = await comp_manager.get_component_list()
        await manager.send_to_client(websocket, {
            "type": "component_list",
            "data": components
        })
        
        # Handle messages from client
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            message_type = data.get("type")
            if message_type == "send_command":
                # Send command to component
                component_id = data.get("component_id")
                command = data.get("command")
                command_data = data.get("data")
                
                if component_id and command:
                    result = await comp_manager.send_command(component_id, command, command_data)
                    
                    # Send response to client
                    await manager.send_to_client(websocket, {
                        "type": "command_response",
                        "request_id": data.get("request_id"),
                        "data": result
                    })
                    
            elif message_type == "get_component_status":
                # Get status of a specific component
                component_id = data.get("component_id")
                
                if component_id:
                    status = await comp_manager.get_component_status(component_id)
                    
                    # Send response to client
                    await manager.send_to_client(websocket, {
                        "type": "component_status",
                        "request_id": data.get("request_id"),
                        "data": {
                            "component_id": component_id,
                            "status": status
                        }
                    })
                    
            elif message_type == "check_deadlocks":
                # Manually check for deadlocks
                await comp_manager.check_for_deadlocks()
                
                # Send confirmation to client
                await manager.send_to_client(websocket, {
                    "type": "deadlock_check",
                    "request_id": data.get("request_id"),
                    "data": {"status": "completed"}
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Error in websocket connection: {e}")
        manager.disconnect(websocket)


# API endpoints
@app.get("/api/components")
async def get_components(comp_manager: ComponentManager = Depends(get_component_manager)):
    """Get list of available components."""
    components = await comp_manager.get_component_list()
    return {"components": components}


@app.get("/api/components/{component_id}")
async def get_component(
    component_id: str,
    comp_manager: ComponentManager = Depends(get_component_manager)
):
    """Get status of a specific component."""
    status = await comp_manager.get_component_status(component_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return {"component_id": component_id, "status": status}


@app.post("/api/components/{component_id}/command/{command}")
async def send_command(
    component_id: str,
    command: str,
    data: Dict[str, Any],
    comp_manager: ComponentManager = Depends(get_component_manager)
):
    """Send a command to a component."""
    result = await comp_manager.send_command(component_id, command, data)
    return {"component_id": component_id, "command": command, "result": result}


@app.post("/api/system/check-deadlocks")
async def check_deadlocks(comp_manager: ComponentManager = Depends(get_component_manager)):
    """Manually check for deadlocks."""
    await comp_manager.check_for_deadlocks()
    return {"status": "completed"}


# Serve static files (if available)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# Serve frontend files
@app.get("/{path:path}")
async def serve_frontend(path: str):
    """Serve frontend files."""
    # Check if the path exists in the static directory
    frontend_dir = os.path.join(os.path.dirname(__file__), "static")
    requested_file = os.path.join(frontend_dir, path)
    
    # If the file exists, serve it
    if os.path.exists(requested_file) and os.path.isfile(requested_file):
        return FileResponse(requested_file)
    
    # Otherwise, serve the index.html for client-side routing
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    # If frontend files are not available yet, show a placeholder
    return JSONResponse({
        "message": "Hephaestus UI is starting...",
        "status": "initializing"
    })


# Function to start the server
def start_server(host: str = "localhost", port: int = 8080, debug: bool = False):
    """Start the FastAPI server."""
    logger.info(f"Starting Hephaestus UI server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="debug" if debug else "info")


# Function to start the server in a separate thread
async def start_server_async(host: str = "localhost", port: int = 8080, debug: bool = False):
    """Start the FastAPI server asynchronously."""
    config = uvicorn.Config(app, host=host, port=port, log_level="debug" if debug else "info")
    server = uvicorn.Server(config)
    await server.serve()