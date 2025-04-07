"""
Component observer for Hephaestus.

Tracks component state changes and provides observation capabilities.
"""

import logging
import time
import uuid
from typing import Dict, List, Any, Callable, Optional, Set, Tuple

from hephaestus.core.lifecycle.states import ComponentState

# Configure logging
logger = logging.getLogger(__name__)

class ComponentObserver:
    """
    Component observer that tracks component state changes and 
    provides deadlock prevention monitoring.
    """
    
    def __init__(self):
        """Initialize the component observer."""
        self.component_states: Dict[str, ComponentState] = {}
        self.component_metadata: Dict[str, Dict[str, Any]] = {}
        self.state_callbacks: Dict[ComponentState, List[Callable[[str, Dict[str, Any]], None]]] = {}
        self.component_callbacks: Dict[str, List[Callable[[ComponentState, Dict[str, Any]], None]]] = {}
        self.instance_id = str(uuid.uuid4())
        self.startup_time = time.time()
        
    def register_component(self, 
                          component_id: str, 
                          initial_state: ComponentState = ComponentState.UNKNOWN,
                          metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Register a component for observation.
        
        Args:
            component_id: Unique identifier for the component
            initial_state: Initial state of the component
            metadata: Optional metadata for the component
            
        Returns:
            True if registration was successful
        """
        if component_id in self.component_states:
            logger.warning(f"Component {component_id} already registered")
            return False
            
        self.component_states[component_id] = initial_state
        self.component_metadata[component_id] = metadata or {}
        logger.info(f"Registered component {component_id} in state {initial_state.value}")
        return True
        
    def unregister_component(self, component_id: str) -> bool:
        """
        Unregister a component.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            True if unregistration was successful
        """
        if component_id not in self.component_states:
            logger.warning(f"Component {component_id} not registered")
            return False
            
        # Remove from states and metadata
        del self.component_states[component_id]
        del self.component_metadata[component_id]
        
        # Remove component callbacks
        if component_id in self.component_callbacks:
            del self.component_callbacks[component_id]
            
        logger.info(f"Unregistered component {component_id}")
        return True
        
    def update_state(self, 
                    component_id: str, 
                    new_state: ComponentState,
                    metadata_updates: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update the state of a component.
        
        Args:
            component_id: Unique identifier for the component
            new_state: New state of the component
            metadata_updates: Optional metadata updates
            
        Returns:
            True if update was successful
        """
        if component_id not in self.component_states:
            logger.warning(f"Cannot update state for unknown component {component_id}")
            return False
            
        old_state = self.component_states[component_id]
        self.component_states[component_id] = new_state
        
        # Update metadata if provided
        if metadata_updates:
            self.component_metadata[component_id].update(metadata_updates)
            
        # Add state transition timestamp
        self.component_metadata[component_id]["last_state_change"] = time.time()
        self.component_metadata[component_id]["previous_state"] = old_state.value
        
        # Full metadata for callbacks
        callback_metadata = dict(self.component_metadata[component_id])
        callback_metadata["component_id"] = component_id
        
        # Trigger state callbacks
        if new_state in self.state_callbacks:
            for callback in self.state_callbacks[new_state]:
                try:
                    callback(component_id, callback_metadata)
                except Exception as e:
                    logger.error(f"Error in state callback: {e}")
                    
        # Trigger component callbacks
        if component_id in self.component_callbacks:
            for callback in self.component_callbacks[component_id]:
                try:
                    callback(new_state, callback_metadata)
                except Exception as e:
                    logger.error(f"Error in component callback: {e}")
                    
        logger.info(f"Component {component_id} state changed: {old_state.value} -> {new_state.value}")
        return True
        
    def get_state(self, component_id: str) -> ComponentState:
        """
        Get the current state of a component.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            Current state of the component
        """
        return self.component_states.get(component_id, ComponentState.UNKNOWN)
        
    def get_metadata(self, component_id: str) -> Dict[str, Any]:
        """
        Get metadata for a component.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            Component metadata dictionary
        """
        return dict(self.component_metadata.get(component_id, {}))
        
    def register_state_callback(self, 
                              state: ComponentState, 
                              callback: Callable[[str, Dict[str, Any]], None]) -> None:
        """
        Register a callback for a specific component state.
        
        Args:
            state: State to trigger the callback
            callback: Function to call when a component enters the state
        """
        if state not in self.state_callbacks:
            self.state_callbacks[state] = []
            
        self.state_callbacks[state].append(callback)
        
    def register_component_callback(self, 
                                  component_id: str, 
                                  callback: Callable[[ComponentState, Dict[str, Any]], None]) -> bool:
        """
        Register a callback for a specific component.
        
        Args:
            component_id: Unique identifier for the component
            callback: Function to call when the component changes state
            
        Returns:
            True if registration was successful
        """
        if component_id not in self.component_states:
            logger.warning(f"Cannot register callback for unknown component {component_id}")
            return False
            
        if component_id not in self.component_callbacks:
            self.component_callbacks[component_id] = []
            
        self.component_callbacks[component_id].append(callback)
        return True
        
    def get_components_by_state(self, state: ComponentState) -> List[str]:
        """
        Get all components in a specific state.
        
        Args:
            state: State to filter by
            
        Returns:
            List of component IDs in the specified state
        """
        return [
            component_id for component_id, component_state 
            in self.component_states.items() 
            if component_state == state
        ]
        
    def get_all_components(self) -> Dict[str, ComponentState]:
        """
        Get all registered components and their states.
        
        Returns:
            Dictionary mapping component IDs to states
        """
        return dict(self.component_states)