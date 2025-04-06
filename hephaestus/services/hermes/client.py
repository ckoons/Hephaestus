"""
Hermes client for Hephaestus.

This module provides integration with Hermes message bus for the Hephaestus GUI.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Callable, Union, TypeVar

# This will be imported from Hermes once available
# from hermes.api.client import HermesClient
# For now, we'll use a placeholder

logger = logging.getLogger(__name__)

T = TypeVar('T')


class HermesClient:
    """Placeholder Hermes client until actual client is available."""
    
    def __init__(self, service_name: str, host: str = "localhost", port: int = 8000):
        self.service_name = service_name
        self.host = host
        self.port = port
        self.connected = False
        logger.info(f"Initialized Hermes client for {service_name}")
        
    async def connect(self) -> bool:
        """Connect to Hermes server."""
        # Placeholder
        self.connected = True
        logger.info(f"Connected to Hermes server at {self.host}:{self.port}")
        return True
        
    async def publish(self, topic: str, message: Any) -> bool:
        """Publish a message to a topic."""
        # Placeholder
        logger.info(f"Published to {topic}: {message}")
        return True
        
    async def subscribe(self, topic: str, callback: Callable[[str, Any], None]) -> bool:
        """Subscribe to a topic."""
        # Placeholder
        logger.info(f"Subscribed to {topic}")
        return True
        
    async def request(self, service: str, endpoint: str, data: Any = None) -> Any:
        """Send a request to a service."""
        # Placeholder
        logger.info(f"Request to {service}/{endpoint}: {data}")
        return {"status": "ok", "message": "This is a placeholder response"}
        
    async def close(self) -> None:
        """Close the connection."""
        # Placeholder
        self.connected = False
        logger.info("Closed Hermes connection")


class HephaestusHermesAdapter:
    """
    Adapter for Hermes integration with Hephaestus.
    
    This class provides a simplified interface for Hephaestus to interact with
    the Hermes message bus, handling topics specific to GUI operations.
    """
    
    def __init__(self, 
                 service_name: str = "hephaestus", 
                 host: str = "localhost", 
                 port: int = 8000):
        """
        Initialize the Hermes adapter.
        
        Args:
            service_name: Name of this service in Hermes
            host: Hermes server host
            port: Hermes server port
        """
        self.client = HermesClient(service_name, host, port)
        self.callbacks: Dict[str, List[Callable]] = {}
        self.component_status: Dict[str, Dict[str, Any]] = {}
        self.connected = False
        
    async def connect(self) -> bool:
        """Connect to Hermes server and set up subscriptions."""
        try:
            await self.client.connect()
            self.connected = True
            
            # Subscribe to component status updates
            await self.client.subscribe("components/status/#", self._handle_component_status)
            
            # Subscribe to component events
            await self.client.subscribe("components/events/#", self._handle_component_event)
            
            logger.info("Hephaestus connected to Hermes")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Hermes: {e}")
            return False
            
    async def _handle_component_status(self, topic: str, message: Any) -> None:
        """Handle component status updates."""
        try:
            # Extract component ID from topic (e.g., "components/status/athena")
            parts = topic.split("/")
            if len(parts) >= 3:
                component_id = parts[2]
                self.component_status[component_id] = message
                
                # Invoke callbacks for component status
                await self._invoke_callbacks("component_status", {
                    "component_id": component_id,
                    "status": message
                })
        except Exception as e:
            logger.error(f"Error handling component status: {e}")
            
    async def _handle_component_event(self, topic: str, message: Any) -> None:
        """Handle component events."""
        try:
            # Extract component ID and event from topic (e.g., "components/events/athena/started")
            parts = topic.split("/")
            if len(parts) >= 4:
                component_id = parts[2]
                event_type = parts[3]
                
                # Invoke callbacks for component events
                await self._invoke_callbacks("component_event", {
                    "component_id": component_id,
                    "event_type": event_type,
                    "data": message
                })
        except Exception as e:
            logger.error(f"Error handling component event: {e}")
            
    async def _invoke_callbacks(self, event_type: str, data: Any) -> None:
        """Invoke all callbacks registered for an event type."""
        if event_type in self.callbacks:
            for callback in self.callbacks[event_type]:
                try:
                    await callback(data)
                except Exception as e:
                    logger.error(f"Error in callback for {event_type}: {e}")
                    
    def register_callback(self, event_type: str, callback: Callable[[Any], None]) -> None:
        """
        Register a callback for a specific event type.
        
        Args:
            event_type: Event type to listen for (e.g., "component_status", "component_event")
            callback: Async function to call when event occurs
        """
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        self.callbacks[event_type].append(callback)
        
    async def send_command(self, component_id: str, command: str, data: Any = None) -> Any:
        """
        Send a command to a component.
        
        Args:
            component_id: ID of the component to send command to
            command: Command to send
            data: Additional data for the command
            
        Returns:
            Command response
        """
        topic = f"components/commands/{component_id}/{command}"
        payload = {
            "command": command,
            "data": data or {},
            "sender": "hephaestus"
        }
        
        await self.client.publish(topic, payload)
        logger.info(f"Sent command {command} to {component_id}")
        
        # In a real implementation, we would wait for a response
        # For now, return a placeholder response
        return {"status": "sent"}
        
    async def get_component_list(self) -> List[Dict[str, Any]]:
        """
        Get list of available components.
        
        Returns:
            List of component information
        """
        try:
            # In a real implementation, this would make a request to Hermes
            # For now, return a placeholder list
            return [
                {
                    "id": "athena",
                    "name": "Athena",
                    "description": "Knowledge Graph",
                    "status": "active"
                },
                {
                    "id": "engram",
                    "name": "Engram",
                    "description": "Memory Management",
                    "status": "active"
                },
                {
                    "id": "hermes",
                    "name": "Hermes",
                    "description": "Message Bus",
                    "status": "active"
                }
            ]
        except Exception as e:
            logger.error(f"Error getting component list: {e}")
            return []
            
    async def get_component_status(self, component_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of a specific component.
        
        Args:
            component_id: ID of the component
            
        Returns:
            Component status or None if not available
        """
        return self.component_status.get(component_id)
        
    async def close(self) -> None:
        """Close the connection to Hermes."""
        if self.connected:
            await self.client.close()
            self.connected = False