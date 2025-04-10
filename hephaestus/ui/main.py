"""
Main entry point for the Hephaestus GUI.

This module provides the command-line interface for starting the Hephaestus UI
with deadlock prevention and Tekton integration.
"""
import argparse
import os
import sys
import logging
import asyncio
import webbrowser
import signal
from threading import Timer

from .server import start_server, start_server_async
from ..core.lifecycle import HephaestusLifecycleManager, ComponentState
from ..utils.tekton_integration import (
    initialize_tekton_integration,
    register_with_tekton,
    mark_ready,
    update_state,
    shutdown_tekton_integration
)

logger = logging.getLogger(__name__)

# Global lifecycle manager
lifecycle_manager = None

def open_browser(url):
    """Open web browser to the specified URL."""
    webbrowser.open(url)

async def initialize_lifecycle_manager():
    """Initialize the lifecycle manager for deadlock prevention."""
    global lifecycle_manager
    
    # Create lifecycle manager if not already created
    if lifecycle_manager is None:
        lifecycle_manager = HephaestusLifecycleManager()
        
        # Register Hephaestus as a component
        await lifecycle_manager.register_component(
            component_id="hephaestus",
            dependencies=["hermes"],  # Depends on Hermes for communication
            metadata={
                "name": "Hephaestus",
                "description": "Tekton GUI System",
                "version": "0.1.0"
            }
        )
        
        # Start monitoring
        await lifecycle_manager.start_monitoring()
        
        # Update component state to INITIALIZING
        lifecycle_manager.observer.update_component_state(
            component_id="hephaestus",
            state=ComponentState.INITIALIZING,
            metadata={"start_time": asyncio.get_event_loop().time()}
        )
        
        logger.info("Lifecycle manager initialized")
        
        # Initialize Tekton integration
        await initialize_tekton_integration()
        await register_with_tekton()
        await update_state("INITIALIZING", {"start_time": asyncio.get_event_loop().time()})
        
    return lifecycle_manager

async def shutdown_lifecycle_manager():
    """Shut down the lifecycle manager."""
    global lifecycle_manager
    
    if lifecycle_manager:
        # Update component state to STOPPING
        lifecycle_manager.observer.update_component_state(
            component_id="hephaestus",
            state=ComponentState.STOPPING,
            metadata={"stop_time": asyncio.get_event_loop().time()}
        )
        
        logger.info("Lifecycle manager stopping")
        
        # Shut down Tekton integration
        await update_state("STOPPING", {"stop_time": asyncio.get_event_loop().time()})
        await shutdown_tekton_integration()

async def start_gui(host="localhost", port=8080, debug=False, no_browser=False):
    """
    Start the Hephaestus GUI with deadlock prevention.
    
    Args:
        host: Server host
        port: Server port
        debug: Enable debug mode
        no_browser: Don't open a browser window
    """
    try:
        # Initialize lifecycle manager
        await initialize_lifecycle_manager()
        
        # Log startup
        logger.info(f"Starting Hephaestus GUI on http://{host}:{port}")
        
        # Open browser after a short delay
        if not no_browser:
            url = f"http://{host}:{port}"
            Timer(1.5, open_browser, [url]).start()
            logger.info(f"Opening browser to {url}")
        
        # Update component state to READY when server is starting
        if lifecycle_manager:
            lifecycle_manager.observer.update_component_state(
                component_id="hephaestus",
                state=ComponentState.READY,
                metadata={"server_host": host, "server_port": port}
            )
            
            # Update Tekton integration state
            await update_state("READY", {"server_host": host, "server_port": port})
            await mark_ready()
        
        # Handle signals for graceful shutdown
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(handle_shutdown(sig)))
        
        # Start server (this will block until server is stopped)
        await start_server_async(host=host, port=port, debug=debug)
        
    except Exception as e:
        # Update component state to FAILED
        if lifecycle_manager:
            lifecycle_manager.observer.update_component_state(
                component_id="hephaestus",
                state=ComponentState.FAILED,
                metadata={"error": str(e)}
            )
            
            # Update Tekton integration state
            await update_state("FAILED", {"error": str(e)})
            
        logger.error(f"Error starting Hephaestus GUI: {e}")
        raise

async def handle_shutdown(sig):
    """Handle shutdown signal."""
    logger.info(f"Received signal {sig.name}, shutting down")
    
    # Shutdown lifecycle manager
    await shutdown_lifecycle_manager()
    
    # Stop the event loop
    loop = asyncio.get_event_loop()
    loop.stop()

def main():
    """Main entry point for the Hephaestus GUI."""
    parser = argparse.ArgumentParser(description="Hephaestus - Tekton GUI")
    parser.add_argument("--host", default="localhost", help="Host to bind the server to")
    parser.add_argument("--port", type=int, default=8080, help="Port to bind the server to")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--no-browser", action="store_true", help="Don't open a browser window")
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    logger.info("Starting Hephaestus")
    
    try:
        # Run the server
        asyncio.run(start_gui(
            host=args.host, 
            port=args.port, 
            debug=args.debug,
            no_browser=args.no_browser
        ))
    except KeyboardInterrupt:
        logger.info("Hephaestus GUI shutting down")
    except Exception as e:
        logger.error(f"Unhandled exception: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()