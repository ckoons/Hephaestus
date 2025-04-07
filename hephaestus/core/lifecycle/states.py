"""
Component lifecycle states for Hephaestus.
"""

from enum import Enum

class ComponentState(Enum):
    """Component lifecycle states."""
    UNKNOWN = "unknown"            # State not known or not tracked
    INITIALIZING = "initializing"  # Starting up but not ready for operations
    READY = "ready"                # Fully operational and accepting requests
    DEGRADED = "degraded"          # Running with limited functionality
    FAILED = "failed"              # Failed to start or crashed
    STOPPING = "stopping"          # Graceful shutdown in progress
    RESTARTING = "restarting"      # Temporary unavailable during restart