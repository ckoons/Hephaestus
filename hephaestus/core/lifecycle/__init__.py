"""
Component Lifecycle Module for Hephaestus

This module implements component lifecycle management with deadlock prevention
for the Hephaestus GUI system, integrating with Tekton's enhanced lifecycle system.
"""

from tekton.core.storage.graph.memory.store import MemoryGraphStore

from hephaestus.core.lifecycle.states import ComponentState
from hephaestus.core.lifecycle.observer import ComponentObserver
from hephaestus.core.lifecycle.manager import HephaestusLifecycleManager
from hephaestus.core.lifecycle.dependencies import DependencyResolver

# Define a temporary DeadlockMonitor class for compatibility
class DeadlockMonitor:
    """Temporary DeadlockMonitor class for compatibility."""
    
    def __init__(self):
        """Initialize the deadlock monitor."""
        pass
        
    async def check_for_deadlocks(self):
        """Check for deadlocks."""
        return []

# Add methods to ComponentObserver for compatibility
def update_component_state(self, component_id, state, metadata=None):
    """Update component state (compatibility method)."""
    return self.update_state(component_id, state, metadata)
    
ComponentObserver.update_component_state = update_component_state

# Add methods to HephaestusLifecycleManager for compatibility
HephaestusLifecycleManager.start_monitoring = HephaestusLifecycleManager.start
HephaestusLifecycleManager.get_all_component_status = lambda self: []
HephaestusLifecycleManager.get_component_status = lambda self, component_id: {"state": "UNKNOWN", "metadata": {}}
HephaestusLifecycleManager.deadlock_monitor = DeadlockMonitor()

__all__ = [
    "ComponentState",
    "ComponentObserver", 
    "HephaestusLifecycleManager",
    "DeadlockMonitor",
    "DependencyResolver"
]