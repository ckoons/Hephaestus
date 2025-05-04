#!/bin/bash
# Script to install Athena UI component into Hephaestus
# This script copies the Athena UI files to the correct Hephaestus directories
# and updates the component registry

echo "Installing Athena UI component into Hephaestus..."

# Set up paths
TEKTON_DIR=$(cd "$(dirname "$0")/.." && pwd)
ATHENA_DIR="${TEKTON_DIR}/Athena"
HEPHAESTUS_DIR="${TEKTON_DIR}/Hephaestus"

# Check if Athena UI files exist
if [ ! -d "${ATHENA_DIR}/ui" ]; then
  echo "Error: Athena UI directory not found at ${ATHENA_DIR}/ui"
  exit 1
fi

# Create necessary directories in Hephaestus
mkdir -p "${HEPHAESTUS_DIR}/ui/components/athena"
mkdir -p "${HEPHAESTUS_DIR}/ui/scripts/athena"
mkdir -p "${HEPHAESTUS_DIR}/ui/styles/athena"

# Copy Athena UI files to Hephaestus
echo "Copying Athena component HTML..."
cp "${ATHENA_DIR}/ui/athena-component.html" "${HEPHAESTUS_DIR}/ui/components/athena/athena-component.html"

echo "Copying Athena scripts..."
cp "${ATHENA_DIR}/ui/scripts/athena-component.js" "${HEPHAESTUS_DIR}/ui/scripts/athena/athena-component.js"
cp "${ATHENA_DIR}/ui/scripts/athena-service.js" "${HEPHAESTUS_DIR}/ui/scripts/athena/athena-service.js"
cp "${ATHENA_DIR}/ui/scripts/graph-visualization.js" "${HEPHAESTUS_DIR}/ui/scripts/athena/graph-visualization.js"
cp "${ATHENA_DIR}/ui/scripts/knowledge-chat.js" "${HEPHAESTUS_DIR}/ui/scripts/athena/knowledge-chat.js"
cp "${ATHENA_DIR}/ui/scripts/tekton-llm-client.js" "${HEPHAESTUS_DIR}/ui/scripts/athena/tekton-llm-client.js"

echo "Copying Athena styles..."
cp "${ATHENA_DIR}/ui/styles/athena.css" "${HEPHAESTUS_DIR}/ui/styles/athena/athena-component.css"

# Update component registry
REGISTRY_FILE="${HEPHAESTUS_DIR}/ui/server/component_registry.json"
echo "Updating component registry at ${REGISTRY_FILE}..."

# Create a temporary file for the modified registry
TMP_FILE=$(mktemp)
TMP_REGISTRY=$(mktemp)

# Use jq to update the Athena component entry if jq is available
if command -v jq >/dev/null 2>&1; then
  # Save current registry
  cp "${REGISTRY_FILE}" "${TMP_REGISTRY}"
  
  # First create the updated Athena component definition
  cat > "${TMP_FILE}" << EOF
{
  "id": "athena",
  "name": "Athena",
  "description": "Knowledge graph and information retrieval",
  "icon": "🧠",
  "defaultMode": "html",
  "capabilities": [
    "knowledge_graph", 
    "information_retrieval", 
    "fact_lookup", 
    "shadow_dom", 
    "component_isolation"
  ],
  "componentPath": "components/athena/athena-component.html",
  "scripts": [
    "scripts/athena/tekton-llm-client.js",
    "scripts/athena/athena-service.js",
    "scripts/athena/graph-visualization.js",
    "scripts/athena/knowledge-chat.js",
    "scripts/athena/athena-component.js"
  ],
  "styles": [
    "styles/athena/athena-component.css"
  ],
  "usesShadowDom": true
}
EOF

  # Create a new registry with the updated Athena component
  jq --argjson athena "$(cat ${TMP_FILE})" '.components = [.components[] | if .id == "athena" then $athena else . end]' "${TMP_REGISTRY}" > "${REGISTRY_FILE}"
  
  # Cleanup temporary files
  rm "${TMP_FILE}" "${TMP_REGISTRY}"
else
  echo "Warning: jq not installed. Will try to use sed for a simple replacement."
  
  # Backup the registry file
  cp "${REGISTRY_FILE}" "${REGISTRY_FILE}.bak"
  
  # Use a simple sed replacement (less robust but works in simple cases)
  sed -i.bak 's/"defaultMode": "terminal"/"defaultMode": "html"/' "${REGISTRY_FILE}"
  
  echo "Registry updated with basic modification."
  echo "For full component functionality, you should manually verify the registry configuration."
fi

echo "Installation complete!"
echo "Restart the Hephaestus UI server to apply changes."