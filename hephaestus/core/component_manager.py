#!/usr/bin/env python3
"""
Component Manager Module for Hephaestus

This module provides the ComponentManager class which manages Tekton component 
connections, status updates, and command routing for the Hephaestus GUI.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Callable, Optional, Set, Tuple

from .lifecycle import (
    HephaestusLifecycleManager,
    ComponentState,
    DeadlockMonitor
)

# Configure logging
logger = logging.getLogger(__name__)


class ComponentManager:
    """
    Manager for Tekton components with deadlock prevention.
    
    This class provides high-level functionality for monitoring and controlling
    Tekton components from the Hephaestus GUI.
    """
    
    def __init__(self, hermes_adapter=None):
        """
        Initialize the component manager.
        
        Args:
            hermes_adapter: Adapter for Hermes communication
        """
        self.hermes_adapter = hermes_adapter
        self.lifecycle_manager = HephaestusLifecycleManager()
        self.components: Dict[str, Dict[str, Any]] = {}
        self.status_update_callbacks: List[Callable[[Dict[str, Any]], None]] = []
        self.initialized = False
        
    async def initialize(self) -> bool:
        """
        Initialize the component manager.
        
        Returns:
            True if initialization was successful
        """
        if self.initialized:
            return True
            
        # Start lifecycle monitoring
        await self.lifecycle_manager.start_monitoring()
        
        # Set up Hermes connection if adapter is available
        if self.hermes_adapter:
            try:
                # Connect to Hermes
                await self.hermes_adapter.connect()
                
                # Set up status callback
                self.hermes_adapter.register_callback(
                    "component_status", 
                    self._handle_component_status_update
                )
                
                # Set up event callback
                self.hermes_adapter.register_callback(
                    "component_event",
                    self._handle_component_event
                )
                
                # Get initial component list
                components = await self.hermes_adapter.get_component_list()
                for component in components:
                    component_id = component["id"]
                    self.components[component_id] = component
                    
                    # Register with lifecycle manager
                    self.lifecycle_manager.register_component(
                        component_id=component_id,
                        metadata=component
                    )
                    
                logger.info(f"Initialized component manager with {len(components)} components")
                
            except Exception as e:
                logger.error(f"Error initializing component manager: {e}")
                return False
        
        self.initialized = True
        return True
        
    async def _handle_component_status_update(self, data: Dict[str, Any]) -> None:
        """
        Handle component status updates from Hermes.
        
        Args:
            data: Status update data
        """
        try:
            component_id = data.get("component_id")
            status = data.get("status", {})
            
            if not component_id or not status:
                return
                
            # Update component in registry
            state_str = status.get("state", "unknown")
            state = ComponentState(state_str) if hasattr(ComponentState, state_str.upper()) else ComponentState.UNKNOWN
            
            # Update in lifecycle manager
            self.lifecycle_manager.observer.update_component_state(
                component_id=component_id,
                state=state,
                metadata=status
            )
            
            # Update local cache
            if component_id in self.components:
                self.components[component_id].update({
                    "status": state.value,
                    "metadata": status
                })
            else:
                # New component
                self.components[component_id] = {
                    "id": component_id,
                    "name": status.get("name", component_id),
                    "status": state.value,
                    "metadata": status
                }
                
            # Notify callbacks
            for callback in self.status_update_callbacks:
                try:
                    callback(self.components[component_id])
                except Exception as e:
                    logger.error(f"Error in status update callback: {e}")
                    
        except Exception as e:
            logger.error(f"Error handling component status update: {e}")
            
    async def _handle_component_event(self, data: Dict[str, Any]) -> None:
        """
        Handle component events from Hermes.
        
        Args:
            data: Event data
        """
        try:
            component_id = data.get("component_id")
            event_type = data.get("event_type")
            event_data = data.get("data", {})
            
            if not component_id or not event_type:
                return
                
            logger.info(f"Event from {component_id}: {event_type}")
            
            # Map events to component states
            if event_type == "started":
                state = ComponentState.READY
            elif event_type == "stopped":
                state = ComponentState.STOPPING
            elif event_type == "failed":
                state = ComponentState.FAILED
            elif event_type == "restarted":
                state = ComponentState.RESTARTING
            else:
                # No state change for other events
                return
                
            # Update in lifecycle manager
            self.lifecycle_manager.observer.update_component_state(
                component_id=component_id,
                state=state,
                metadata={"event": event_type, "event_data": event_data}
            )
            
        except Exception as e:
            logger.error(f"Error handling component event: {e}")
            
    async def get_component_list(self) -> List[Dict[str, Any]]:
        """
        Get list of all components with their status.
        
        Returns:
            List of component information dictionaries
        """
        # Get status from lifecycle manager
        components_status = await self.lifecycle_manager.get_all_component_status()
        
        # Convert to list format
        result = []
        for component in components_status:
            component_id = component["id"]
            if component_id in self.components:
                # Merge with existing component information
                merged = self.components[component_id].copy()
                merged.update({
                    "status": component["state"],
                    "metadata": component["metadata"]
                })
                result.append(merged)
            else:
                # Use status information directly
                result.append({
                    "id": component_id,
                    "name": component["metadata"].get("name", component_id),
                    "status": component["state"],
                    "metadata": component["metadata"]
                })
                
        return result
        
    async def get_component_status(self, component_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status for a specific component.
        
        Args:
            component_id: ID of the component
            
        Returns:
            Component status or None if not found
        """
        try:
            # Get from lifecycle manager
            status = await self.lifecycle_manager.get_component_status(component_id)
            
            # Merge with existing component information
            if component_id in self.components:
                merged = self.components[component_id].copy()
                merged.update({
                    "status": status["state"],
                    "metadata": status["metadata"]
                })
                return merged
            else:
                # Use status information directly
                return {
                    "id": component_id,
                    "name": status["metadata"].get("name", component_id),
                    "status": status["state"],
                    "metadata": status["metadata"]
                }
        except Exception as e:
            logger.error(f"Error getting component status: {e}")
            return None
            
    async def send_command(self, component_id: str, command: str, data: Any = None) -> Any:
        """
        Send a command to a component.
        
        Args:
            component_id: ID of the component
            command: Command to send
            data: Additional data for the command
            
        Returns:
            Command response
        """
        if not self.hermes_adapter:
            logger.error("Hermes adapter not available")
            return {"error": "Hermes adapter not available"}
            
        try:
            # Send command via Hermes
            return await self.hermes_adapter.send_command(component_id, command, data)
        except Exception as e:
            logger.error(f"Error sending command to {component_id}: {e}")
            return {"error": str(e)}
            
    def register_status_update_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """
        Register a callback for component status updates.
        
        Args:
            callback: Function to call with component status
        """
        self.status_update_callbacks.append(callback)
        
    async def check_for_deadlocks(self) -> None:
        """Check for potential deadlocks in components."""
        # Forward to lifecycle manager
        await self.lifecycle_manager.deadlock_monitor.check_for_deadlocks()
        
    async def shutdown(self) -> None:
        """Shut down the component manager."""
        # Nothing to do for now
        pass