#!/bin/bash
# DEPRECATED: Use launch-tekton.sh instead

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Hephaestus UI Runner ===${NC}"

# Get the absolute path to the Hephaestus directory
HEPHAESTUS_DIR="$(cd "$(dirname "$0")" && pwd)"
TEKTON_DIR="$(cd "${HEPHAESTUS_DIR}/.." && pwd)"
echo "Hephaestus directory: ${HEPHAESTUS_DIR}"
echo "Tekton directory: ${TEKTON_DIR}"

# Check if static directory exists with index.html
if [ ! -f "${HEPHAESTUS_DIR}/hephaestus/ui/static/index.html" ]; then
    echo -e "${YELLOW}UI files not found. Running setup first...${NC}"
    
    # Run setup script
    "${HEPHAESTUS_DIR}/setup_ui.sh"
    
    # Check if setup was successful
    if [ $? -ne 0 ]; then
        echo -e "${RED}Setup failed. Cannot continue.${NC}"
        exit 1
    fi
fi

# Check if tekton core module is installed
echo -e "${YELLOW}Checking if tekton core is installed...${NC}"
python -c "import tekton" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Installing tekton-core...${NC}"
    
    if command -v uv &> /dev/null; then
        cd "${TEKTON_DIR}" && uv pip install -e ./tekton-core
    else
        cd "${TEKTON_DIR}" && pip install -e ./tekton-core
    fi
fi

# Check if Hephaestus module is installed
echo -e "${YELLOW}Checking if Hephaestus is installed...${NC}"
python -c "import hephaestus" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Installing Hephaestus...${NC}"
    
    if command -v uv &> /dev/null; then
        cd "${HEPHAESTUS_DIR}" && uv pip install -e .
    else
        cd "${HEPHAESTUS_DIR}" && pip install -e .
    fi
fi

# Check if required Python dependencies are installed
echo -e "${YELLOW}Checking Python dependencies...${NC}"
if command -v uv &> /dev/null; then
    # Use uv to check if required packages are installed
    if ! uv pip freeze | grep -q "fastapi" || ! uv pip freeze | grep -q "uvicorn"; then
        echo -e "${YELLOW}Installing required Python packages with uv...${NC}"
        uv pip install fastapi uvicorn aiohttp websockets pydantic
    fi
else
    echo -e "${YELLOW}uv not found, checking dependencies with pip...${NC}"
    if ! pip freeze | grep -q "fastapi" || ! pip freeze | grep -q "uvicorn"; then
        echo -e "${YELLOW}Installing required Python packages with pip...${NC}"
        pip install fastapi uvicorn aiohttp websockets pydantic
    fi
fi

# Set up the Python path to include Tekton core if not already in PYTHONPATH
export PYTHONPATH="${TEKTON_DIR}:${PYTHONPATH}"

# Run the UI server
echo -e "${GREEN}Starting Hephaestus UI server...${NC}"
cd "${HEPHAESTUS_DIR}"
python -m hephaestus.ui.main "$@"