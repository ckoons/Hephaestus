#!/usr/bin/env python3
"""
Test imports for Hephaestus to diagnose any issues.
"""

import sys
import os

# Print Python version and paths
print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'Not set')}")
print(f"Sys.path: {sys.path}")

# Try importing Tekton core
try:
    import tekton
    print(f"Tekton version: {tekton.__version__ if hasattr(tekton, '__version__') else 'Unknown'}")
    print(f"Tekton path: {tekton.__file__}")
    
    # Try importing specific module
    try:
        from tekton.core.storage.graph.memory.store import MemoryGraphStore
        print("Successfully imported MemoryGraphStore")
    except ImportError as e:
        print(f"Error importing MemoryGraphStore: {e}")
        
except ImportError as e:
    print(f"Error importing Tekton: {e}")

# Try importing Hephaestus
try:
    import hephaestus
    print(f"Hephaestus path: {hephaestus.__file__}")
    
    # Try importing specific modules
    try:
        from hephaestus.core.lifecycle import ComponentState, HephaestusLifecycleManager
        print("Successfully imported ComponentState and HephaestusLifecycleManager")
    except ImportError as e:
        print(f"Error importing ComponentState or HephaestusLifecycleManager: {e}")
        
    try:
        from hephaestus.ui.server import start_server
        print("Successfully imported start_server")
    except ImportError as e:
        print(f"Error importing start_server: {e}")
        
    try:
        from hephaestus.core.component_manager import ComponentManager
        print("Successfully imported ComponentManager")
    except ImportError as e:
        print(f"Error importing ComponentManager: {e}")
        
except ImportError as e:
    print(f"Error importing Hephaestus: {e}")

print("\nDone with import tests.")