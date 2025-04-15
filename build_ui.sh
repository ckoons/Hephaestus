#!/bin/bash
# build_ui.sh - Simple build process for Hephaestus UI
# This applies cache busting to CSS and JS files in index.html

# ANSI color codes for terminal output
BLUE="\033[94m"
GREEN="\033[92m"
YELLOW="\033[93m"
RED="\033[91m"
BOLD="\033[1m"
RESET="\033[0m"

# Find script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
UI_DIR="$SCRIPT_DIR/ui"

echo -e "${BLUE}${BOLD}Building Hephaestus UI...${RESET}"

# Generate a timestamp for cache busting
TIMESTAMP=$(date +%s)
echo -e "${BLUE}Using build timestamp: ${TIMESTAMP}${RESET}"

# Create a backup of the original index.html
cp "$UI_DIR/index.html" "$UI_DIR/index.html.bak"

# Replace CSS references with cache busting parameter
echo -e "${YELLOW}Adding cache busting to CSS files...${RESET}"
sed -i "s/\.css\"/\.css?v=${TIMESTAMP}\"/g" "$UI_DIR/index.html"
# Handle already versioned files
sed -i "s/\.css?v=[0-9]*/\.css?v=${TIMESTAMP}/g" "$UI_DIR/index.html"

# Replace JS references with cache busting parameter
echo -e "${YELLOW}Adding cache busting to JavaScript files...${RESET}"
sed -i "s/\.js\"/\.js?v=${TIMESTAMP}\"/g" "$UI_DIR/index.html"
# Handle already versioned files
sed -i "s/\.js?v=[0-9]*/\.js?v=${TIMESTAMP}/g" "$UI_DIR/index.html"

# Verify the changes were made
if grep -q "?v=${TIMESTAMP}" "$UI_DIR/index.html"; then
    echo -e "${GREEN}✓ Successfully applied cache busting (v=${TIMESTAMP})${RESET}"
    rm -f "$UI_DIR/index.html.bak"
else
    echo -e "${RED}✗ Failed to apply cache busting${RESET}"
    echo -e "${YELLOW}Restoring from backup...${RESET}"
    mv "$UI_DIR/index.html.bak" "$UI_DIR/index.html"
    exit 1
fi

# Add a small delay to ensure filesystem operations complete
sleep 1

echo -e "${GREEN}${BOLD}Hephaestus UI build complete${RESET}"