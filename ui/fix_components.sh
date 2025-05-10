#!/bin/bash

echo "Fixing component HTML files for proper rendering"
echo "======================================================================================"

# List of components to fix
components=(
  "athena"
  "ergon"
  "terma"
  "rhetor"
  "hermes"
  "engram"
  "telos"
  "prometheus"
  "harmonia"
  "synthesis"
  "sophia"
  "codex"
  "tekton"
)

# Fix HTML comments in component files
for comp in "${components[@]}"; do
  file="components/$comp/$comp-component.html"
  placeholder_file="components/$comp-component.html"
  
  # If the file exists in the component directory
  if [ -f "$file" ]; then
    echo "Fixing $file"
    # Replace HTML comments that are showing as text with proper comments
    sed -i '' 's/<!-- /<!-- /g; s/ -->/ -->/g' "$file"
    
    # Fix placeholder comment
    sed -i '' "s/<!-- $comp Component Stub -->/<!-- $comp Component -->/g" "$file"
  fi
  
  # If the file exists in the root components directory
  if [ -f "$placeholder_file" ]; then
    echo "Fixing $placeholder_file"
    # Replace HTML comments that are showing as text with proper comments
    sed -i '' 's/<!-- /<!-- /g; s/ -->/ -->/g' "$placeholder_file"
    
    # Fix placeholder comment
    sed -i '' "s/<!-- $comp Component Stub -->/<!-- $comp Component -->/g" "$placeholder_file"
    
    # Copy again to component directory to ensure it's updated
    mkdir -p "components/$comp"
    cp "$placeholder_file" "$file"
  fi
done

echo "======================================================================================"
echo "Component files fixed. Please restart your web server to see the changes."