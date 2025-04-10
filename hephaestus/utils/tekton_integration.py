#!/usr/bin/env python3
"""
Tekton Integration Module

This module provides utilities for integrating Hephaestus with the Tekton framework,
including component registration, lifecycle management, and deadlock prevention.
"""

import asyncio
import logging
import os
import sys
import time
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Try to import Tekton core modules
try:
    # Add Tekton to path
    TEKTON_DIR = os.environ.get("TEKTON_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../")))
    sys.path.insert(0, TEKTON_DIR)
    sys.path.insert(0, os.path.join(TEKTON_DIR, "tekton-core"))

    from tekton.core.lifecycle import ComponentState, ComponentRegistration
    from tekton.core.component_lifecycle import ComponentRegistry
    TEKTON_AVAILABLE = True
    logger.info("Tekton core modules available")
except ImportError:
    TEKTON_AVAILABLE = False
    logger.warning("Tekton core modules not available. Running in standalone mode.")


class TektonRegistrationManager:
    """
    Manages registration and lifecycle of Hephaestus with the Tekton framework.
    
    This class ensures that Hephaestus is properly registered with Tekton,
    reports its state transitions, and integrates with the component lifecycle system.
    """
    
    def __init__(self):
        """Initialize the registration manager."""
        self.registry = None
        self.instance_uuid = None
        self.registered = False
        self.heartbeat_task = None
        
    async def initialize(self) -> bool:
        """
        Initialize the Tekton integration.
        
        Returns:
            True if successful
        """
        if not TEKTON_AVAILABLE:
            logger.info("Running without Tekton integration")
            return False
            
        try:
            # Create component registry
            self.registry = ComponentRegistry()
            return True
        except Exception as e:
            logger.error(f"Error initializing Tekton integration: {e}")
            return False
            
    async def register_hephaestus(self, 
                                version: str = "0.1.0",
                                capabilities: Optional[List[Dict[str, Any]]] = None,
                                metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Register Hephaestus with Tekton.
        
        Args:
            version: Version string
            capabilities: List of capabilities
            metadata: Additional metadata
            
        Returns:
            True if registered successfully
        """
        if not TEKTON_AVAILABLE or not self.registry:
            return False
            
        try:
            # Create registration
            registration = ComponentRegistration(
                component_id="hephaestus",
                component_name="Hephaestus",
                component_type="gui",
                version=version,
                capabilities=capabilities or [{"type": "gui", "name": "Tekton GUI Interface"}],
                metadata=metadata or {"description": "Tekton GUI System"}
            )
            
            # Register with Tekton
            success, _ = await self.registry.register_component(registration)
            if success:
                self.instance_uuid = registration.instance_uuid
                self.registered = True
                logger.info(f"Hephaestus registered with Tekton (UUID: {self.instance_uuid})")
                
                # Start heartbeat
                self.start_heartbeat()
                
                return True
            else:
                logger.error("Failed to register Hephaestus with Tekton")
                return False
                
        except Exception as e:
            logger.error(f"Error registering Hephaestus with Tekton: {e}")
            return False
            
    def start_heartbeat(self) -> None:
        """Start sending heartbeats to Tekton."""
        if not TEKTON_AVAILABLE or not self.registry or not self.registered:
            return
            
        async def send_heartbeats():
            """Send periodic heartbeats."""
            while True:
                try:
                    # Update state to READY, which acts as a heartbeat
                    await self.registry.update_component_state(
                        component_id="hephaestus",
                        instance_uuid=self.instance_uuid,
                        state=ComponentState.READY.value,
                        metadata={"timestamp": time.time(), "heartbeat": True}
                    )
                    logger.debug("Sent heartbeat to Tekton")
                except Exception as e:
                    logger.error(f"Error sending heartbeat: {e}")
                    
                await asyncio.sleep(10)  # Send heartbeat every 10 seconds
                
        # Create heartbeat task
        self.heartbeat_task = asyncio.create_task(send_heartbeats())
        
    async def update_state(self, state: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update Hephaestus state in Tekton.
        
        Args:
            state: New state (must match ComponentState values)
            metadata: Additional metadata
            
        Returns:
            True if updated successfully
        """
        if not TEKTON_AVAILABLE or not self.registry or not self.registered:
            return False
            
        try:
            # Validate state
            if not hasattr(ComponentState, state.upper()):
                logger.error(f"Invalid state: {state}")
                return False
                
            # Update state
            await self.registry.update_component_state(
                component_id="hephaestus",
                instance_uuid=self.instance_uuid,
                state=getattr(ComponentState, state.upper()).value,
                metadata=metadata
            )
            
            logger.info(f"Updated Hephaestus state to {state}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating Hephaestus state: {e}")
            return False
            
    async def mark_ready(self, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Mark Hephaestus as ready in Tekton.
        
        Args:
            metadata: Additional metadata
            
        Returns:
            True if marked ready successfully
        """
        if not TEKTON_AVAILABLE or not self.registry or not self.registered:
            return False
            
        try:
            # Mark ready
            success, _ = await self.registry.mark_component_ready(
                component_id="hephaestus",
                instance_uuid=self.instance_uuid,
                metadata=metadata
            )
            
            if success:
                logger.info("Marked Hephaestus as ready in Tekton")
                return True
            else:
                logger.error("Failed to mark Hephaestus as ready in Tekton")
                return False
                
        except Exception as e:
            logger.error(f"Error marking Hephaestus as ready: {e}")
            return False
            
    async def shutdown(self) -> None:
        """Shut down Tekton integration."""
        if not TEKTON_AVAILABLE or not self.registry or not self.registered:
            return
            
        try:
            # Cancel heartbeat task
            if self.heartbeat_task:
                self.heartbeat_task.cancel()
                
            # Update state to STOPPING
            await self.update_state("STOPPING", {"reason": "shutdown"})
            
            logger.info("Tekton integration shut down")
            
        except Exception as e:
            logger.error(f"Error shutting down Tekton integration: {e}")


# Singleton instance
tekton_registration_manager = TektonRegistrationManager()

async def initialize_tekton_integration() -> bool:
    """
    Initialize Tekton integration.
    
    Returns:
        True if successful
    """
    return await tekton_registration_manager.initialize()

async def register_with_tekton() -> bool:
    """
    Register Hephaestus with Tekton.
    
    Returns:
        True if registered successfully
    """
    return await tekton_registration_manager.register_hephaestus()

async def mark_ready() -> bool:
    """
    Mark Hephaestus as ready in Tekton.
    
    Returns:
        True if marked ready successfully
    """
    return await tekton_registration_manager.mark_ready()

async def update_state(state: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """
    Update Hephaestus state in Tekton.
    
    Args:
        state: New state (must match ComponentState values)
        metadata: Additional metadata
        
    Returns:
        True if updated successfully
    """
    return await tekton_registration_manager.update_state(state, metadata)

async def shutdown_tekton_integration() -> None:
    """Shut down Tekton integration."""
    await tekton_registration_manager.shutdown()