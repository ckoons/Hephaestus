#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Building Hephaestus UI ===${NC}"

# Get the absolute path to the Hephaestus directory
HEPHAESTUS_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Hephaestus directory: ${HEPHAESTUS_DIR}"

# Paths
SRC_DIR="${HEPHAESTUS_DIR}/src"
STATIC_DIR="${HEPHAESTUS_DIR}/hephaestus/ui/static"

# Check if the src directory exists
if [ ! -d "${SRC_DIR}" ]; then
    echo -e "${RED}Error: src directory not found at ${SRC_DIR}${NC}"
    exit 1
fi

# Build the React app
echo -e "${YELLOW}Building React application...${NC}"
cd "${SRC_DIR}"
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi

# Ensure the static directory exists
mkdir -p "${STATIC_DIR}"

# Backup component directory if it exists
if [ -d "${STATIC_DIR}/component" ]; then
    echo -e "${YELLOW}Backing up component directory...${NC}"
    mkdir -p /tmp/hephaestus-component-backup
    cp -r "${STATIC_DIR}/component/"* /tmp/hephaestus-component-backup/
fi

# Clear the static directory
echo -e "${YELLOW}Clearing static directory...${NC}"
rm -rf "${STATIC_DIR:?}"/*

# Copy the build files to the static directory
echo -e "${YELLOW}Copying build files to static directory...${NC}"
cp -r "${SRC_DIR}/build/"* "${STATIC_DIR}/"

# Restore component directory from backup
mkdir -p "${STATIC_DIR}/component"
if [ -d "/tmp/hephaestus-component-backup" ] && [ "$(ls -A /tmp/hephaestus-component-backup)" ]; then
    echo -e "${YELLOW}Restoring component files...${NC}"
    cp -r /tmp/hephaestus-component-backup/* "${STATIC_DIR}/component/"
fi

# Create an asset directory to ensure static files are served correctly
echo -e "${YELLOW}Creating asset directories...${NC}"
mkdir -p "${STATIC_DIR}/static/css"
mkdir -p "${STATIC_DIR}/static/js"

# Ensure static files from build are properly copied to correct paths
if [ -d "${SRC_DIR}/build/static/css" ]; then
    cp -r "${SRC_DIR}/build/static/css/"* "${STATIC_DIR}/static/css/"
fi

if [ -d "${SRC_DIR}/build/static/js" ]; then
    cp -r "${SRC_DIR}/build/static/js/"* "${STATIC_DIR}/static/js/"
fi

echo -e "${GREEN}Build complete! Files copied to ${STATIC_DIR}${NC}"
echo "You can now restart the Hephaestus UI server to see your changes"