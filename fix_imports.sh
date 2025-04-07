#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Hephaestus Import Fix ===${NC}"

# Get the absolute path to the Hephaestus directory
HEPHAESTUS_DIR="$(cd "$(dirname "$0")" && pwd)"
TEKTON_DIR="$(cd "${HEPHAESTUS_DIR}/.." && pwd)"
echo "Hephaestus directory: ${HEPHAESTUS_DIR}"
echo "Tekton directory: ${TEKTON_DIR}"

# Create a symlink for the missing module file
echo -e "${YELLOW}Creating missing module symlinks...${NC}"
mkdir -p "${TEKTON_DIR}/tekton-core/tekton/core/component_lifecycle"
ln -sf "${TEKTON_DIR}/tekton-core/tekton/core/graceful_degradation.py" "${TEKTON_DIR}/tekton-core/tekton/core/component_lifecycle/graceful_degradation.py"

echo -e "${GREEN}Fixed import paths. Now testing imports...${NC}"
cd "${HEPHAESTUS_DIR}"
# Export python path to include tekton directory
export PYTHONPATH="${TEKTON_DIR}:${PYTHONPATH}"
python3 test_imports.py

echo -e "${GREEN}Import test complete. Try running ./run_ui.sh now.${NC}"