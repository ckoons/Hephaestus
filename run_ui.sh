#!/bin/bash
# Simple script to run the Tekton UI server

# ANSI color codes for terminal output
BLUE="\033[94m"
GREEN="\033[92m"
YELLOW="\033[93m"
RED="\033[91m"
BOLD="\033[1m"
RESET="\033[0m"

# Default values
HTTP_PORT=8080
WS_PORT=8081
DEBUG=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port)
      HTTP_PORT="$2"
      shift 2
      ;;
    --ws-port)
      WS_PORT="$2"
      shift 2
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--port PORT] [--ws-port WS_PORT] [--debug]"
      exit 1
      ;;
  esac
done

# Find script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not found${RESET}"
    exit 1
fi

# Check for required Python packages
echo -e "${BLUE}Checking for required Python packages...${RESET}"
REQUIRED_PACKAGES=("websockets")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! python3 -c "import $package" &> /dev/null; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing missing packages: ${MISSING_PACKAGES[*]}${RESET}"
    pip install "${MISSING_PACKAGES[@]}"
fi

# Create logs directory
mkdir -p "$HOME/.tekton/logs"

# Run the server
echo -e "${GREEN}${BOLD}Starting Tekton UI Server${RESET}"
echo -e "${GREEN}HTTP Server: http://localhost:${HTTP_PORT}${RESET}"
echo -e "${GREEN}WebSocket Server: ws://localhost:${WS_PORT}${RESET}"

# Set Python log level
if $DEBUG; then
    export LOGLEVEL="DEBUG"
else
    export LOGLEVEL="INFO"
fi

# Run the server
cd "$SCRIPT_DIR"
python3 "$SCRIPT_DIR/ui/server/server.py" --http-port "$HTTP_PORT" --ws-port "$WS_PORT"