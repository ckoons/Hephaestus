#!/bin/bash
# Hephaestus UI DevTools MCP Server Launch Script

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEKTON_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Setup environment
source "$TEKTON_ROOT/shared/utils/setup_env.sh"
setup_tekton_env "$SCRIPT_DIR" "$TEKTON_ROOT"

# Set component-specific environment
export HEPHAESTUS_MCP_PORT="${HEPHAESTUS_MCP_PORT:-8088}"
export TEKTON_COMPONENT="hephaestus_mcp"

echo "Starting Hephaestus UI DevTools MCP Server..."
echo "Port: $HEPHAESTUS_MCP_PORT"
echo "Component: $TEKTON_COMPONENT"

# Start the MCP server
cd "$SCRIPT_DIR"
python -m hephaestus.mcp.mcp_server