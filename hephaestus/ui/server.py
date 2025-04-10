"""
Server implementation for the Hephaestus UI.

This module provides a FastAPI server that serves the UI and exposes
WebSocket endpoints for real-time communication with deadlock prevention.
"""

import asyncio
import json
import logging
import os
import random
import datetime
from typing import Dict, List, Any, Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from ..services.hermes.client import HephaestusHermesAdapter
from ..services.ergon.client import ErgonClient
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

# Create service instances
hermes_adapter = None
component_manager = None
ergon_client = None  # Ergon client instance


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


# Dependency for getting Ergon client
def get_ergon_client() -> ErgonClient:
    """Get the Ergon client. Create if needed."""
    global ergon_client
    if ergon_client is None:
        # Create Ergon client
        ergon_client = ErgonClient()
        logger.info("Initialized Ergon client")
    return ergon_client


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


@app.get("/api/component-interfaces")
async def get_component_interfaces(comp_manager: ComponentManager = Depends(get_component_manager)):
    """Get list of available component UI interfaces."""
    component_dir = os.path.join(os.path.dirname(__file__), "static", "component")
    
    interfaces = []
    
    # Get UI-enabled components from component manager
    components = await comp_manager.get_component_list()
    components_with_ui = [comp for comp in components if comp.get("ui_enabled") or comp.get("ui_component")]
    
    # Check for HTML files for each component
    for component in components_with_ui:
        ui_component = component.get("ui_component", component.get("id"))
        html_file = f"{ui_component}.html"
        
        if os.path.exists(os.path.join(component_dir, html_file)):
            interfaces.append({
                "id": component.get("id"),
                "name": component.get("name", ui_component.capitalize()),
                "description": component.get("description", ""),
                "url": f"/component/{html_file}",
                "status": component.get("status", "unknown")
            })
    
    # Add static interfaces from component directory
    if os.path.exists(component_dir):
        for file in os.listdir(component_dir):
            if file.endswith('.html'):
                component_id = file.split('.')[0]
                
                # Skip components already added
                if any(interface["id"] == component_id for interface in interfaces):
                    continue
                    
                interfaces.append({
                    "id": component_id,
                    "name": component_id.capitalize(),
                    "description": f"{component_id.capitalize()} Component",
                    "url": f"/component/{file}",
                    "status": "active"
                })
    
    return {"interfaces": interfaces}


# Ergon API endpoints
@app.get("/api/ergon/agents")
async def list_agents(client: ErgonClient = Depends(get_ergon_client)):
    """List all Ergon agents."""
    result = client.list_agents()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to list agents"))
    return result["data"]


@app.get("/api/ergon/agents/{agent_id}")
async def get_agent(agent_id: str, client: ErgonClient = Depends(get_ergon_client)):
    """Get agent details by ID."""
    result = client.get_agent(agent_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Agent not found"))
    return result["data"]


@app.post("/api/ergon/agents")
async def create_agent(
    request: Dict[str, Any],
    client: ErgonClient = Depends(get_ergon_client)
):
    """Create a new agent."""
    name = request.get("name")
    description = request.get("description", "")
    agent_type = request.get("agent_type", "standard")
    model = request.get("model")
    
    if not name:
        raise HTTPException(status_code=400, detail="Agent name is required")
        
    result = client.create_agent(name, description, agent_type, model)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to create agent"))
    return result["data"]


@app.delete("/api/ergon/agents/{agent_id}")
async def delete_agent(agent_id: str, client: ErgonClient = Depends(get_ergon_client)):
    """Delete an agent by ID."""
    result = client.delete_agent(agent_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to delete agent"))
    return {"success": True, "message": f"Agent {agent_id} deleted successfully"}


@app.post("/api/ergon/agents/{agent_id}/run")
async def run_agent(
    agent_id: str,
    request: Dict[str, Any],
    client: ErgonClient = Depends(get_ergon_client)
):
    """Run an agent with input."""
    input_text = request.get("input_text", "")
    result = client.run_agent(agent_id, input_text)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to run agent"))
    return result["data"]


@app.get("/api/ergon/executions")
async def list_executions(client: ErgonClient = Depends(get_ergon_client)):
    """List recent agent executions."""
    result = client.list_executions()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to list executions"))
    return result["data"]


@app.get("/api/ergon/tools")
async def list_tools(client: ErgonClient = Depends(get_ergon_client)):
    """List available tools for agents."""
    result = client.list_tools()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to list tools"))
    return result["data"]


# Documentation API endpoints
@app.post("/api/ergon/docs/crawl")
async def start_doc_crawl(
    request: Dict[str, Any],
    client: ErgonClient = Depends(get_ergon_client)
):
    """Start a documentation crawl."""
    url = request.get("url")
    max_pages = request.get("max_pages", 100)
    max_depth = request.get("max_depth", 3)
    timeout = request.get("timeout", 300)
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        # This would be replaced with an actual crawl command
        # For now, we'll simulate success
        crawl_id = random.randint(1000, 9999)
        return {
            "crawl_id": crawl_id,
            "status": "started",
            "url": url,
            "max_pages": max_pages,
            "max_depth": max_depth,
            "timeout": timeout
        }
    except Exception as e:
        logger.error(f"Error starting documentation crawl: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ergon/docs/crawls")
async def list_doc_crawls(client: ErgonClient = Depends(get_ergon_client)):
    """List recent documentation crawls."""
    try:
        # This would be replaced with an actual database query
        # For now, we'll return a placeholder response
        return {
            "crawls": [
                {
                    "id": 1001,
                    "url": "https://docs.anthropic.com/claude",
                    "pages_crawled": 57,
                    "max_pages": 100,
                    "status": "completed",
                    "created_at": datetime.datetime.now().isoformat()
                },
                {
                    "id": 1002,
                    "url": "https://anthropic.com/news",
                    "pages_crawled": 20,
                    "max_pages": 50,
                    "status": "completed",
                    "created_at": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat()
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error listing documentation crawls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ergon/docs/crawls/{crawl_id}")
async def get_doc_crawl(crawl_id: str, client: ErgonClient = Depends(get_ergon_client)):
    """Get details of a documentation crawl."""
    try:
        # This would be replaced with an actual database query
        # For now, we'll return a placeholder response
        crawl_id_int = int(crawl_id)
        
        if crawl_id_int == 1001:
            url = "https://docs.anthropic.com/claude"
        else:
            url = "https://anthropic.com/news"
            
        return {
            "id": crawl_id_int,
            "url": url,
            "status": "completed",
            "created_at": datetime.datetime.now().isoformat(),
            "pages": [
                {
                    "url": f"{url}/docs/getting-started",
                    "title": "Getting Started with Claude API",
                    "crawled_at": datetime.datetime.now().isoformat(),
                    "content_length": 15000,
                    "snippet": "Learn how to get started with the Claude API. This guide walks through the basic steps to set up your environment and make your first request."
                },
                {
                    "url": f"{url}/docs/claude-models",
                    "title": "Claude Models Overview",
                    "crawled_at": datetime.datetime.now().isoformat(),
                    "content_length": 25000,
                    "snippet": "Explore the different Claude models available, their capabilities, and how to choose the right one for your application."
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error getting documentation crawl details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ergon/docs/sources")
async def list_doc_sources(client: ErgonClient = Depends(get_ergon_client)):
    """List documentation sources."""
    try:
        # This would be replaced with an actual database query
        # For now, we'll return a placeholder response
        return {
            "sources": [
                {
                    "id": 1,
                    "name": "Claude Documentation",
                    "url": "https://docs.anthropic.com/claude",
                    "count": 57,
                    "last_updated": datetime.datetime.now().isoformat()
                },
                {
                    "id": 2,
                    "name": "Anthropic News",
                    "url": "https://anthropic.com/news",
                    "count": 20,
                    "last_updated": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat()
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error listing documentation sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ergon/docs/preload")
async def preload_docs(client: ErgonClient = Depends(get_ergon_client)):
    """Preload essential documentation."""
    try:
        # This would be replaced with an actual preload command
        # For now, we'll simulate success
        return {
            "success": True,
            "message": "Essential documentation preloaded successfully",
            "sources_added": 2,
            "pages_added": 77
        }
    except Exception as e:
        logger.error(f"Error preloading documentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ergon/docs/search")
async def search_docs(
    request: Dict[str, Any],
    client: ErgonClient = Depends(get_ergon_client)
):
    """Search documentation."""
    query = request.get("query")
    source_id = request.get("source_id")
    
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        # This would be replaced with an actual search command
        # For now, we'll return a placeholder response
        results = [
            {
                "title": "Getting Started with Claude API",
                "url": "https://docs.anthropic.com/claude/docs/getting-started",
                "source": "Claude Documentation",
                "snippet": f"Learn how to get started with the Claude API. This guide walks through the basic steps to set up your environment and make your first {query}."
            },
            {
                "title": "Claude Models Overview",
                "url": "https://docs.anthropic.com/claude/docs/claude-models",
                "source": "Claude Documentation",
                "snippet": f"Explore the different Claude models available, their capabilities, and how to choose the right one for your {query}."
            }
        ]
        
        return {
            "results": results,
            "query": query,
            "source_id": source_id
        }
    except Exception as e:
        logger.error(f"Error searching documentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Serve static files (if available)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    # Mount component files directory if it exists
    component_dir = os.path.join(static_dir, "component")
    if os.path.exists(component_dir):
        app.mount("/component", StaticFiles(directory=component_dir, html=True), name="component")
    
    # Mount js directory
    js_dir = os.path.join(static_dir, "js")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")
    
    # Mount images directory
    images_dir = os.path.join(static_dir, "images")
    if os.path.exists(images_dir):
        app.mount("/images", StaticFiles(directory=images_dir), name="images")
    
    # Mount static directory for index.html and other root files
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="root")
    
    # Mount static/css and static/js directories for compiled assets
    static_css_dir = os.path.join(static_dir, "static", "css")
    if os.path.exists(static_css_dir):
        app.mount("/static/css", StaticFiles(directory=static_css_dir), name="css")
        
    static_js_dir = os.path.join(static_dir, "static", "js")
    if os.path.exists(static_js_dir):
        app.mount("/static/js", StaticFiles(directory=static_js_dir), name="js")


# We'll use StaticFiles to handle all static content
# This catch-all route is commented out since it conflicts with the StaticFiles mount
"""
@app.get("/{path:path}")
async def serve_frontend(path: str):
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
"""

# Fallback for SPA routing - serve index.html for any other routes
@app.get("/{path:path}")
async def serve_spa(path: str):
    """Serve index.html for client-side routing."""
    index_file = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
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