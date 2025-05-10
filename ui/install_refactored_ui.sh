#!/bin/bash

# This script installs the refactored UI components

# Create backup of original files
echo "Creating backups of original files..."
if [ -f "scripts/main.js" ]; then
  cp scripts/main.js scripts/main.js.bak
  echo "✅ Backed up main.js"
fi

if [ -f "index.html" ]; then
  cp index.html index.html.bak
  echo "✅ Backed up index.html"
fi

# Create directory structure if it doesn't exist
echo "Creating directory structure..."
mkdir -p scripts/core
mkdir -p scripts/components/athena
mkdir -p scripts/components/ergon
mkdir -p scripts/components/shared

# Move new files into place
echo "Installing new core modules..."
cp scripts/core/ui-manager-core.js scripts/core/
cp scripts/core/component-loader.js scripts/core/
cp scripts/core/panel-manager.js scripts/core/

echo "Installing component modules..."
cp scripts/components/athena/athena-component.js scripts/components/athena/
cp scripts/components/ergon/ergon-component.js scripts/components/ergon/
cp scripts/components/shared/chat-panel.js scripts/components/shared/
cp scripts/components/shared/tab-navigation.js scripts/components/shared/

echo "Installing main application files..."
cp scripts/main.js.new scripts/main.js
cp index.html.new index.html

echo "✅ Installation complete!"
echo
echo "If you encounter issues, you can roll back with:"
echo "cp scripts/main.js.bak scripts/main.js"
echo "cp index.html.bak index.html"
echo
echo "Please restart the Hephaestus UI server to apply changes."