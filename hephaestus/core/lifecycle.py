#!/usr/bin/env python3
"""
Component Lifecycle Module for Hephaestus

This module implements component lifecycle management with deadlock prevention
for the Hephaestus GUI system, integrating with Tekton's enhanced lifecycle system.
"""

import asyncio
import logging
import time
import uuid
from enum import Enum
from typing import Dict, List, Any, Callable, Optional, Set, Tuple

# Configure logging
logger = logging.getLogger(__name__)

class ComponentState(Enum):
    """Component lifecycle states."""
    UNKNOWN = "unknown"            # State not known or not tracked
    INITIALIZING = "initializing"  # Starting up but not ready for operations
    READY = "ready"                # Fully operational and accepting requests
    DEGRADED = "degraded"          # Running with limited functionality
    FAILED = "failed"              # Failed to start or crashed
    STOPPING = "stopping"          # Graceful shutdown in progress
    RESTARTING = "restarting"      # Temporary unavailable during restart


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
            component_id: ID of the component
            initial_state: Initial state
            metadata: Additional metadata
            
        Returns:
            True if registered successfully
        """
        self.component_states[component_id] = initial_state
        self.component_metadata[component_id] = metadata or {}
        logger.info(f"Registered component {component_id} in state {initial_state.value}")
        return True
        
    def update_component_state(self, 
                             component_id: str, 
                             state: ComponentState,
                             metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update a component's state.
        
        Args:
            component_id: ID of the component
            state: New state
            metadata: Additional metadata
            
        Returns:
            True if updated successfully
        """
        if component_id not in self.component_states:
            # Auto-register if not registered
            self.register_component(component_id, state, metadata)
            return True
            
        old_state = self.component_states[component_id]
        self.component_states[component_id] = state
        
        # Update metadata
        if metadata:
            self.component_metadata[component_id].update(metadata)
            
        # Log state change
        logger.info(f"Component {component_id} state changed: {old_state.value} -> {state.value}")
        
        # Invoke state callbacks
        self._invoke_state_callbacks(component_id, state)
        
        # Invoke component callbacks
        self._invoke_component_callbacks(component_id, state)
        
        return True
        
    def get_component_state(self, component_id: str) -> Tuple[ComponentState, Dict[str, Any]]:
        """
        Get a component's state and metadata.
        
        Args:
            component_id: ID of the component
            
        Returns:
            Tuple of (state, metadata)
        """
        state = self.component_states.get(component_id, ComponentState.UNKNOWN)
        metadata = self.component_metadata.get(component_id, {})
        return state, metadata
        
    def get_all_components(self) -> Dict[str, Tuple[ComponentState, Dict[str, Any]]]:
        """
        Get all components with their states and metadata.
        
        Returns:
            Dictionary mapping component IDs to (state, metadata) tuples
        """
        return {
            component_id: (self.component_states.get(component_id, ComponentState.UNKNOWN),
                          self.component_metadata.get(component_id, {}))
            for component_id in set(list(self.component_states.keys()) + list(self.component_metadata.keys()))
        }
        
    def register_state_callback(self, 
                              state: ComponentState, 
                              callback: Callable[[str, Dict[str, Any]], None]) -> None:
        """
        Register a callback for when any component enters a specific state.
        
        Args:
            state: State to monitor
            callback: Function to call with (component_id, metadata)
        """
        if state not in self.state_callbacks:
            self.state_callbacks[state] = []
        self.state_callbacks[state].append(callback)
        
    def register_component_callback(self, 
                                  component_id: str, 
                                  callback: Callable[[ComponentState, Dict[str, Any]], None]) -> None:
        """
        Register a callback for when a specific component changes state.
        
        Args:
            component_id: ID of the component to monitor
            callback: Function to call with (state, metadata)
        """
        if component_id not in self.component_callbacks:
            self.component_callbacks[component_id] = []
        self.component_callbacks[component_id].append(callback)
        
    def _invoke_state_callbacks(self, component_id: str, state: ComponentState) -> None:
        """Invoke callbacks for a specific state."""
        if state in self.state_callbacks:
            metadata = self.component_metadata.get(component_id, {})
            for callback in self.state_callbacks[state]:
                try:
                    callback(component_id, metadata)
                except Exception as e:
                    logger.error(f"Error in state callback for {state.value}: {e}")
                    
    def _invoke_component_callbacks(self, component_id: str, state: ComponentState) -> None:
        """Invoke callbacks for a specific component."""
        if component_id in self.component_callbacks:
            metadata = self.component_metadata.get(component_id, {})
            for callback in self.component_callbacks[component_id]:
                try:
                    callback(state, metadata)
                except Exception as e:
                    logger.error(f"Error in component callback for {component_id}: {e}")
                    

class DeadlockMonitor:
    """
    Monitor for detecting and preventing deadlocks between components.
    """
    
    def __init__(self, component_observer: ComponentObserver):
        """
        Initialize the deadlock monitor.
        
        Args:
            component_observer: Component observer for state tracking
        """
        self.component_observer = component_observer
        self.dependency_graph: Dict[str, List[str]] = {}
        self.pending_operations: Dict[str, Dict[str, Any]] = {}
        self.operation_timeout = 60  # seconds
        self.operation_start_times: Dict[str, float] = {}
        
    def register_dependency(self, component_id: str, dependency_ids: List[str]) -> None:
        """
        Register dependencies for a component.
        
        Args:
            component_id: ID of the component
            dependency_ids: IDs of dependencies
        """
        self.dependency_graph[component_id] = dependency_ids
        logger.info(f"Registered dependencies for {component_id}: {dependency_ids}")
        
    def detect_cycles(self) -> List[List[str]]:
        """
        Detect cycles in the dependency graph.
        
        Returns:
            List of cycles, where each cycle is a list of component IDs
        """
        cycles = []
        visited = set()
        path = []
        
        def dfs(node):
            if node in path:
                # Found a cycle
                cycle_start = path.index(node)
                cycles.append(path[cycle_start:] + [node])
                return
                
            if node in visited:
                return
                
            visited.add(node)
            path.append(node)
            
            for dep in self.dependency_graph.get(node, []):
                dfs(dep)
                
            path.pop()
            
        for node in self.dependency_graph:
            dfs(node)
            
        return cycles
        
    def resolve_cycles(self) -> bool:
        """
        Attempt to resolve cycles in the dependency graph.
        
        Returns:
            True if all cycles were resolved
        """
        cycles = self.detect_cycles()
        if not cycles:
            return True
            
        logger.warning(f"Detected dependency cycles: {cycles}")
        
        # Attempt to resolve each cycle
        for cycle in cycles:
            # Find the least critical edge to break
            # For simplicity, we'll break the first edge
            if len(cycle) > 1:
                from_component = cycle[-2]
                to_component = cycle[-1]
                
                # Remove the dependency
                if from_component in self.dependency_graph:
                    deps = self.dependency_graph[from_component]
                    if to_component in deps:
                        deps.remove(to_component)
                        logger.info(f"Removed dependency {from_component} -> {to_component} to break cycle")
        
        # Check if all cycles are resolved
        remaining_cycles = self.detect_cycles()
        if remaining_cycles:
            logger.warning(f"Failed to resolve all cycles: {remaining_cycles}")
            return False
            
        logger.info("Successfully resolved all dependency cycles")
        return True
        
    def register_operation(self, 
                         operation_id: str, 
                         component_id: str, 
                         operation_type: str, 
                         metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Register an operation that might cause deadlocks.
        
        Args:
            operation_id: Unique ID for the operation
            component_id: ID of the component
            operation_type: Type of operation
            metadata: Additional metadata
        """
        self.pending_operations[operation_id] = {
            "component_id": component_id,
            "operation_type": operation_type,
            "metadata": metadata or {},
            "start_time": time.time()
        }
        self.operation_start_times[operation_id] = time.time()
        
    def complete_operation(self, operation_id: str) -> None:
        """
        Mark an operation as completed.
        
        Args:
            operation_id: ID of the operation
        """
        if operation_id in self.pending_operations:
            del self.pending_operations[operation_id]
        if operation_id in self.operation_start_times:
            del self.operation_start_times[operation_id]
            
    async def monitor_operations(self) -> None:
        """
        Monitor operations for timeouts and potential deadlocks.
        """
        while True:
            current_time = time.time()
            timed_out_operations = []
            
            # Check for timed out operations
            for op_id, start_time in self.operation_start_times.items():
                if current_time - start_time > self.operation_timeout:
                    timed_out_operations.append(op_id)
                    
            # Handle timed out operations
            for op_id in timed_out_operations:
                if op_id in self.pending_operations:
                    op_info = self.pending_operations[op_id]
                    logger.warning(f"Operation {op_id} timed out: {op_info}")
                    
                    # Update component state to FAILED
                    component_id = op_info["component_id"]
                    self.component_observer.update_component_state(
                        component_id=component_id,
                        state=ComponentState.FAILED,
                        metadata={
                            "error": f"Operation {op_info['operation_type']} timed out",
                            "failure_reason": "operation_timeout"
                        }
                    )
                    
                    # Clean up
                    self.complete_operation(op_id)
                    
            # Detect and resolve potential deadlocks
            await self.check_for_deadlocks()
            
            # Sleep for a bit
            await asyncio.sleep(5)
            
    async def check_for_deadlocks(self) -> None:
        """Check for potential deadlocks and attempt to resolve them."""
        # Look for components in INITIALIZING state for too long
        components = self.component_observer.get_all_components()
        current_time = time.time()
        
        initializing_timeout = 120  # 2 minutes
        
        for component_id, (state, metadata) in components.items():
            # Check for components stuck in INITIALIZING
            if state == ComponentState.INITIALIZING:
                start_time = metadata.get("start_time", 0)
                if start_time > 0 and current_time - start_time > initializing_timeout:
                    logger.warning(f"Component {component_id} stuck in INITIALIZING state for > {initializing_timeout}s")
                    
                    # Check for dependencies
                    if component_id in self.dependency_graph:
                        deps = self.dependency_graph[component_id]
                        blocked_by = []
                        
                        # Check if any dependencies are not READY
                        for dep in deps:
                            dep_state, _ = self.component_observer.get_component_state(dep)
                            if dep_state != ComponentState.READY:
                                blocked_by.append(dep)
                                
                        if blocked_by:
                            logger.warning(f"Component {component_id} is blocked by: {blocked_by}")
                            
                            # Try to resolve by marking as DEGRADED
                            self.component_observer.update_component_state(
                                component_id=component_id,
                                state=ComponentState.DEGRADED,
                                metadata={
                                    "blocked_by": blocked_by,
                                    "degraded_reason": "dependency_timeout"
                                }
                            )
                            
                            logger.info(f"Marked {component_id} as DEGRADED to prevent deadlock")
                            
        # Check for cycles that might cause deadlocks
        cycles = self.detect_cycles()
        if cycles:
            logger.warning(f"Detected potential deadlock cycles: {cycles}")
            self.resolve_cycles()


class HephaestusLifecycleManager:
    """
    Lifecycle manager for Hephaestus components with deadlock prevention.
    """
    
    def __init__(self):
        """Initialize the lifecycle manager."""
        self.observer = ComponentObserver()
        self.deadlock_monitor = DeadlockMonitor(self.observer)
        self.registered_components: Dict[str, Dict[str, Any]] = {}
        
    def register_component(self, 
                          component_id: str, 
                          dependencies: Optional[List[str]] = None,
                          metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Register a component with the lifecycle manager.
        
        Args:
            component_id: ID of the component
            dependencies: Optional list of dependencies
            metadata: Additional metadata
            
        Returns:
            True if registered successfully
        """
        # Register with observer
        self.observer.register_component(
            component_id=component_id,
            initial_state=ComponentState.UNKNOWN,
            metadata=metadata
        )
        
        # Register dependencies if any
        if dependencies:
            self.deadlock_monitor.register_dependency(component_id, dependencies)
            
        # Store component information
        self.registered_components[component_id] = {
            "dependencies": dependencies or [],
            "metadata": metadata or {}
        }
        
        return True
        
    async def start_component(self, 
                           component_id: str, 
                           start_func: Callable[[], Any],
                           timeout: int = 60) -> bool:
        """
        Start a component with deadlock prevention.
        
        Args:
            component_id: ID of the component
            start_func: Function to start the component
            timeout: Timeout in seconds
            
        Returns:
            True if started successfully
        """
        # Update component state to INITIALIZING
        self.observer.update_component_state(
            component_id=component_id,
            state=ComponentState.INITIALIZING,
            metadata={"start_time": time.time()}
        )
        
        # Register operation with deadlock monitor
        operation_id = f"{component_id}_start_{time.time()}"
        self.deadlock_monitor.register_operation(
            operation_id=operation_id,
            component_id=component_id,
            operation_type="start"
        )
        
        try:
            # Check dependencies first
            deps = self.registered_components.get(component_id, {}).get("dependencies", [])
            if deps:
                # Wait for dependencies to be ready
                for dep in deps:
                    dep_state, _ = self.observer.get_component_state(dep)
                    if dep_state != ComponentState.READY and dep_state != ComponentState.DEGRADED:
                        logger.warning(f"Dependency {dep} not ready for {component_id}, state: {dep_state.value}")
                        
                        # We'll continue anyway, but record the issue
                        self.observer.update_component_state(
                            component_id=component_id,
                            state=ComponentState.INITIALIZING,
                            metadata={"dependency_warning": f"Dependency {dep} not ready: {dep_state.value}"}
                        )
            
            # Start the component with timeout
            try:
                result = None
                if asyncio.iscoroutinefunction(start_func):
                    result = await asyncio.wait_for(start_func(), timeout=timeout)
                else:
                    result = await asyncio.wait_for(asyncio.to_thread(start_func), timeout=timeout)
                
                # Mark as READY if successful
                if result:
                    self.observer.update_component_state(
                        component_id=component_id,
                        state=ComponentState.READY,
                        metadata={"start_time": time.time()}
                    )
                    logger.info(f"Component {component_id} started successfully")
                    self.deadlock_monitor.complete_operation(operation_id)
                    return True
                else:
                    # Mark as FAILED
                    self.observer.update_component_state(
                        component_id=component_id,
                        state=ComponentState.FAILED,
                        metadata={"error": "Start function returned False"}
                    )
                    logger.error(f"Component {component_id} start function returned False")
                    self.deadlock_monitor.complete_operation(operation_id)
                    return False
                    
            except asyncio.TimeoutError:
                # Mark as FAILED due to timeout
                self.observer.update_component_state(
                    component_id=component_id,
                    state=ComponentState.FAILED,
                    metadata={"error": "Start timed out"}
                )
                logger.error(f"Component {component_id} start timed out after {timeout}s")
                self.deadlock_monitor.complete_operation(operation_id)
                return False
                
        except Exception as e:
            # Mark as FAILED due to exception
            self.observer.update_component_state(
                component_id=component_id,
                state=ComponentState.FAILED,
                metadata={"error": str(e)}
            )
            logger.error(f"Error starting component {component_id}: {e}")
            self.deadlock_monitor.complete_operation(operation_id)
            return False
        
    async def start_monitoring(self) -> None:
        """Start deadlock monitoring."""
        # Start deadlock monitor
        asyncio.create_task(self.deadlock_monitor.monitor_operations())
        logger.info("Deadlock monitoring started")
        
    async def get_component_status(self, component_id: str) -> Dict[str, Any]:
        """
        Get component status information.
        
        Args:
            component_id: ID of the component
            
        Returns:
            Status information
        """
        state, metadata = self.observer.get_component_state(component_id)
        return {
            "id": component_id,
            "state": state.value,
            "metadata": metadata
        }
        
    async def get_all_component_status(self) -> List[Dict[str, Any]]:
        """
        Get status information for all components.
        
        Returns:
            List of component status information
        """
        components = self.observer.get_all_components()
        return [
            {
                "id": component_id,
                "state": state.value,
                "metadata": metadata
            }
            for component_id, (state, metadata) in components.items()
        ]