"""
Component Lifecycle Module for Hephaestus

This module implements component lifecycle management with deadlock prevention
for the Hephaestus GUI system, integrating with Tekton's enhanced lifecycle system.
"""

from tekton.core.storage.graph.memory.store import MemoryGraphStore

from hephaestus.core.lifecycle.states import ComponentState
from hephaestus.core.lifecycle.observer import ComponentObserver
from hephaestus.core.lifecycle.manager import LifecycleManager
from hephaestus.core.lifecycle.dependencies import DependencyResolver

__all__ = [
    "ComponentState",
    "ComponentObserver", 
    "LifecycleManager",
    "DependencyResolver"
]