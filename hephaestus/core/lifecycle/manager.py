"""
Lifecycle manager for Hephaestus components.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Callable, Optional, Set, Tuple

from hephaestus.core.lifecycle.states import ComponentState
from hephaestus.core.lifecycle.observer import ComponentObserver
from hephaestus.core.lifecycle.dependencies import DependencyResolver

# Configure logging
logger = logging.getLogger(__name__)

class HephaestusLifecycleManager:
    """
    Component lifecycle manager with deadlock prevention.
    
    Coordinates component startup, shutdown, and monitors
    for deadlocks in the dependency graph.
    """
    
    def __init__(self):
        """Initialize the lifecycle manager."""
        self.observer = ComponentObserver()
        self.dependency_resolver = DependencyResolver()
        self.component_callbacks = {}
        self.deadlock_detection_interval = 10.0  # seconds
        self.deadlock_detection_task = None
        
    async def start(self):
        """Start the lifecycle manager with deadlock detection."""
        logger.info("Starting lifecycle manager")
        
        # Start deadlock detection
        if self.deadlock_detection_task is None:
            self.deadlock_detection_task = asyncio.create_task(self._deadlock_detection_loop())
            
    async def stop(self):
        """Stop the lifecycle manager."""
        logger.info("Stopping lifecycle manager")
        
        # Stop deadlock detection
        if self.deadlock_detection_task is not None:
            self.deadlock_detection_task.cancel()
            try:
                await self.deadlock_detection_task
            except asyncio.CancelledError:
                pass
            self.deadlock_detection_task = None
            
    async def register_component(self, 
                              component_id: str, 
                              initial_state: ComponentState = ComponentState.INITIALIZING,
                              metadata: Optional[Dict[str, Any]] = None,
                              dependencies: Optional[List[str]] = None) -> bool:
        """
        Register a component with the lifecycle manager.
        
        Args:
            component_id: Unique identifier for the component
            initial_state: Initial state of the component
            metadata: Optional metadata for the component
            dependencies: Optional list of component dependencies
            
        Returns:
            True if registration was successful
        """
        # Register with observer
        if not self.observer.register_component(component_id, initial_state, metadata):
            return False
            
        # Add dependencies if provided
        if dependencies:
            for dep_id in dependencies:
                if not self.dependency_resolver.add_dependency(component_id, dep_id):
                    logger.warning(f"Failed to add dependency: {component_id} -> {dep_id}")
                    
        return True
        
    async def unregister_component(self, component_id: str) -> bool:
        """
        Unregister a component from the lifecycle manager.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            True if unregistration was successful
        """
        # Remove from observer
        if not self.observer.unregister_component(component_id):
            return False
            
        # Remove dependencies
        deps = self.dependency_resolver.get_dependencies(component_id)
        for dep_id in deps:
            self.dependency_resolver.remove_dependency(component_id, dep_id)
            
        # Remove as a dependency for other components
        dependents = list(self.dependency_resolver.get_dependents(component_id))
        for dep_id in dependents:
            self.dependency_resolver.remove_dependency(dep_id, component_id)
            
        return True
        
    async def update_component_state(self, 
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
        return self.observer.update_state(component_id, new_state, metadata_updates)
        
    async def get_component_state(self, component_id: str) -> ComponentState:
        """
        Get the current state of a component.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            Current state of the component
        """
        return self.observer.get_state(component_id)
        
    async def get_component_metadata(self, component_id: str) -> Dict[str, Any]:
        """
        Get metadata for a component.
        
        Args:
            component_id: Unique identifier for the component
            
        Returns:
            Component metadata dictionary
        """
        return self.observer.get_metadata(component_id)
        
    async def add_dependency(self, component_id: str, dependency_id: str) -> bool:
        """
        Add a dependency between components.
        
        Args:
            component_id: Component that depends on dependency_id
            dependency_id: Component that component_id depends on
            
        Returns:
            True if dependency was added successfully
        """
        return self.dependency_resolver.add_dependency(component_id, dependency_id)
        
    async def remove_dependency(self, component_id: str, dependency_id: str) -> bool:
        """
        Remove a dependency between components.
        
        Args:
            component_id: Component that depends on dependency_id
            dependency_id: Component that component_id depends on
            
        Returns:
            True if dependency was removed
        """
        return self.dependency_resolver.remove_dependency(component_id, dependency_id)
        
    async def get_startup_order(self) -> List[Set[str]]:
        """
        Compute the optimal startup order for components.
        
        Returns:
            List of sets of components that can be started in parallel
        """
        return self.dependency_resolver.get_startup_order()
        
    async def register_state_callback(self, 
                                    state: ComponentState, 
                                    callback: Callable[[str, Dict[str, Any]], None]) -> None:
        """
        Register a callback for a specific component state.
        
        Args:
            state: State to trigger the callback
            callback: Function to call when a component enters the state
        """
        self.observer.register_state_callback(state, callback)
        
    async def register_component_callback(self, 
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
        return self.observer.register_component_callback(component_id, callback)
        
    async def get_component_dependencies(self, component_id: str) -> Set[str]:
        """
        Get direct dependencies of a component.
        
        Args:
            component_id: Component to get dependencies for
            
        Returns:
            Set of dependency component IDs
        """
        return self.dependency_resolver.get_dependencies(component_id)
        
    async def get_component_dependents(self, component_id: str) -> Set[str]:
        """
        Get direct dependents of a component.
        
        Args:
            component_id: Component to get dependents for
            
        Returns:
            Set of dependent component IDs
        """
        return self.dependency_resolver.get_dependents(component_id)
        
    async def get_all_component_dependencies(self, component_id: str) -> Set[str]:
        """
        Get all dependencies of a component (direct and indirect).
        
        Args:
            component_id: Component to get dependencies for
            
        Returns:
            Set of all dependency component IDs
        """
        return self.dependency_resolver.get_all_dependencies(component_id)
        
    async def get_all_component_dependents(self, component_id: str) -> Set[str]:
        """
        Get all dependents of a component (direct and indirect).
        
        Args:
            component_id: Component to get dependents for
            
        Returns:
            Set of all dependent component IDs
        """
        return self.dependency_resolver.get_all_dependents(component_id)
        
    async def _deadlock_detection_loop(self):
        """Background task for deadlock detection."""
        try:
            while True:
                # Detect deadlocks
                deadlocks = self.dependency_resolver.detect_deadlocks(self.observer.component_states)
                
                if deadlocks:
                    # Log deadlock information
                    for i, cycle in enumerate(deadlocks):
                        components = ", ".join(cycle)
                        states = ", ".join(f"{cid}: {self.observer.get_state(cid).value}" for cid in cycle)
                        logger.warning(f"Potential deadlock detected (cycle {i+1}): {components} with states {states}")
                        
                        # Look for components in a failed state that might be causing the deadlock
                        failed = [cid for cid in cycle 
                                if self.observer.get_state(cid) == ComponentState.FAILED]
                        if failed:
                            logger.warning(f"Failed components in deadlock cycle {i+1}: {', '.join(failed)}")
                
                # Wait for next detection interval
                await asyncio.sleep(self.deadlock_detection_interval)
                
        except asyncio.CancelledError:
            logger.info("Deadlock detection loop cancelled")
        except Exception as e:
            logger.error(f"Error in deadlock detection loop: {e}")
            # Restart the loop
            if self.deadlock_detection_task is not None:
                self.deadlock_detection_task = asyncio.create_task(self._deadlock_detection_loop())