#!/usr/bin/env python3
"""
Component Lifecycle Module for Hephaestus

This module implements component lifecycle management with deadlock prevention
for the Hephaestus GUI system, integrating with Tekton's enhanced lifecycle system.
"""

# Re-export from the refactored modules
from hephaestus.core.lifecycle.states import ComponentState
from hephaestus.core.lifecycle.observer import ComponentObserver
from hephaestus.core.lifecycle.dependencies import DependencyResolver
from hephaestus.core.lifecycle.manager import LifecycleManager

# For backward compatibility
__all__ = [
    "ComponentState",
    "ComponentObserver", 
    "DependencyResolver",
    "LifecycleManager"
]