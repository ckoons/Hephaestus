#!/bin/bash

echo "Updating component placeholder files to ensure all components load properly"
echo "======================================================================================"

# Ensure component directories exist
echo "Creating component directories if they don't exist..."
mkdir -p components/terma
mkdir -p components/rhetor
mkdir -p components/hermes
mkdir -p components/engram
mkdir -p components/telos
mkdir -p components/prometheus
mkdir -p components/harmonia
mkdir -p components/synthesis
mkdir -p components/sophia
mkdir -p components/codex
mkdir -p components/tekton

# Copy placeholder component files to appropriate subdirectories
echo "Copying component placeholders to appropriate directories..."

# Create backup of any existing files
for comp in athena ergon terma rhetor hermes engram telos prometheus harmonia synthesis sophia codex tekton; do
  if [ -f "components/$comp/$comp-component.html" ]; then
    echo "Backing up components/$comp/$comp-component.html to components/$comp/$comp-component.html.bak"
    cp "components/$comp/$comp-component.html" "components/$comp/$comp-component.html.bak"
  fi
done

# Copy component files to subdirectories
for comp in athena ergon terma rhetor hermes engram telos prometheus harmonia synthesis sophia codex tekton; do
  if [ -f "components/$comp-component.html" ]; then
    echo "Copying components/$comp-component.html to components/$comp/$comp-component.html"
    cp "components/$comp-component.html" "components/$comp/$comp-component.html"
  fi
done

echo "======================================================================================"
echo "Component placeholders updated. Please restart your web server to see the changes."
echo "NOTE: Placeholder components are for UI testing only and do not have full functionality."