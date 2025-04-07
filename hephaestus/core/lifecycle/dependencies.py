"""
Dependency resolution for component lifecycle in Hephaestus.
"""

import logging
import asyncio
from typing import Dict, List, Set, Tuple, Optional, Any, Callable
from collections import defaultdict

from hephaestus.core.lifecycle.states import ComponentState

# Configure logging
logger = logging.getLogger(__name__)

class DependencyResolver:
    """
    Handles component dependency resolution with deadlock detection.
    """
    
    def __init__(self):
        """Initialize the dependency resolver."""
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.dependents: Dict[str, Set[str]] = defaultdict(set)
        self.deadlock_detection_enabled = True
        
    def add_dependency(self, component_id: str, dependency_id: str) -> bool:
        """
        Add a dependency between components.
        
        Args:
            component_id: Component that depends on dependency_id
            dependency_id: Component that component_id depends on
            
        Returns:
            True if dependency was added successfully, False if it would create a cycle
        """
        # Check for circular dependencies
        if self.would_create_cycle(component_id, dependency_id):
            logger.error(f"Circular dependency detected: {component_id} -> {dependency_id}")
            return False
            
        # Add the dependency
        self.dependencies[component_id].add(dependency_id)
        self.dependents[dependency_id].add(component_id)
        logger.debug(f"Added dependency: {component_id} -> {dependency_id}")
        return True
        
    def remove_dependency(self, component_id: str, dependency_id: str) -> bool:
        """
        Remove a dependency between components.
        
        Args:
            component_id: Component that depends on dependency_id
            dependency_id: Component that component_id depends on
            
        Returns:
            True if dependency was removed
        """
        if dependency_id in self.dependencies[component_id]:
            self.dependencies[component_id].remove(dependency_id)
            self.dependents[dependency_id].remove(component_id)
            logger.debug(f"Removed dependency: {component_id} -> {dependency_id}")
            return True
        return False
        
    def get_dependencies(self, component_id: str) -> Set[str]:
        """
        Get all direct dependencies of a component.
        
        Args:
            component_id: Component to get dependencies for
            
        Returns:
            Set of dependency component IDs
        """
        return set(self.dependencies.get(component_id, set()))
        
    def get_dependents(self, component_id: str) -> Set[str]:
        """
        Get all direct dependents of a component.
        
        Args:
            component_id: Component to get dependents for
            
        Returns:
            Set of dependent component IDs
        """
        return set(self.dependents.get(component_id, set()))
        
    def get_all_dependencies(self, component_id: str) -> Set[str]:
        """
        Get all dependencies of a component (direct and indirect).
        
        Args:
            component_id: Component to get dependencies for
            
        Returns:
            Set of all dependency component IDs
        """
        all_deps = set()
        stack = list(self.dependencies.get(component_id, set()))
        
        while stack:
            dep = stack.pop()
            if dep not in all_deps:
                all_deps.add(dep)
                stack.extend(self.dependencies.get(dep, set()))
                
        return all_deps
        
    def get_all_dependents(self, component_id: str) -> Set[str]:
        """
        Get all dependents of a component (direct and indirect).
        
        Args:
            component_id: Component to get dependents for
            
        Returns:
            Set of all dependent component IDs
        """
        all_deps = set()
        stack = list(self.dependents.get(component_id, set()))
        
        while stack:
            dep = stack.pop()
            if dep not in all_deps:
                all_deps.add(dep)
                stack.extend(self.dependents.get(dep, set()))
                
        return all_deps
        
    def would_create_cycle(self, component_id: str, dependency_id: str) -> bool:
        """
        Check if adding a dependency would create a cycle.
        
        Args:
            component_id: Component that would depend on dependency_id
            dependency_id: Component that component_id would depend on
            
        Returns:
            True if adding the dependency would create a cycle
        """
        # If the dependency already depends on the component (directly or indirectly),
        # adding this dependency would create a cycle
        return component_id == dependency_id or component_id in self.get_all_dependencies(dependency_id)
        
    def detect_deadlocks(self, component_states: Dict[str, ComponentState]) -> List[Set[str]]:
        """
        Detect potential deadlocks in the current dependency graph.
        
        Args:
            component_states: Dictionary mapping component IDs to their states
            
        Returns:
            List of sets representing deadlock cycles
        """
        if not self.deadlock_detection_enabled:
            return []
            
        deadlocks = []
        
        # Check for cycles where all components are in a non-READY state
        visited = set()
        stack = []
        rec_stack = set()
        
        def dfs(node):
            if node in rec_stack:
                # Found a cycle
                cycle = set()
                i = len(stack) - 1
                while i >= 0 and stack[i] != node:
                    cycle.add(stack[i])
                    i -= 1
                cycle.add(node)
                
                # Check if all components in the cycle are not READY
                if all(component_states.get(cid, ComponentState.UNKNOWN) != ComponentState.READY 
                       for cid in cycle):
                    deadlocks.append(cycle)
                return
                
            if node in visited:
                return
                
            visited.add(node)
            rec_stack.add(node)
            stack.append(node)
            
            for dep in self.dependencies.get(node, set()):
                dfs(dep)
                
            stack.pop()
            rec_stack.remove(node)
            
        # Run DFS from each unvisited node
        for component_id in self.dependencies.keys():
            if component_id not in visited:
                dfs(component_id)
                
        return deadlocks
        
    def get_startup_order(self) -> List[Set[str]]:
        """
        Compute the optimal startup order for components.
        
        Returns:
            List of sets of components that can be started in parallel
        """
        result = []
        remaining = set(self.dependencies.keys())
        remaining.update(dep for deps in self.dependencies.values() for dep in deps)
        
        while remaining:
            # Find all components with no remaining dependencies
            ready = {component for component in remaining
                   if not any(dep in remaining for dep in self.dependencies.get(component, set()))}
            
            if not ready:
                # Circular dependency detected
                logger.error("Circular dependency detected during startup order computation")
                # Add all remaining components to ensure we don't get stuck
                ready = remaining
                
            result.append(ready)
            remaining -= ready
            
        return result