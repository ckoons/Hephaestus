#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Hephaestus UI Setup ===${NC}"
echo "This script will set up the Hephaestus UI"

# Get the absolute path to the Hephaestus directory
HEPHAESTUS_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Hephaestus directory: ${HEPHAESTUS_DIR}"

# Get the absolute path to the Tekton directory
TEKTON_DIR="$(cd "${HEPHAESTUS_DIR}/.." && pwd)"
echo "Tekton directory: ${TEKTON_DIR}"

# Install Tekton core dependencies
echo -e "${YELLOW}Installing Tekton core...${NC}"
if [ -d "${TEKTON_DIR}/tekton-core" ]; then
    if command -v uv &> /dev/null; then
        echo "Using uv to install tekton-core in development mode"
        cd "${TEKTON_DIR}" && uv pip install -e ./tekton-core
    else
        echo "Using pip to install tekton-core in development mode"
        cd "${TEKTON_DIR}" && pip install -e ./tekton-core
    fi
else
    echo -e "${RED}Error: tekton-core directory not found${NC}"
    exit 1
fi

# Check if uv is installed for Python dependencies
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}Warning: uv is not installed${NC}"
    echo "Tekton uses uv for Python dependency management"
    echo "Consider installing it with: pip install uv"
    echo ""
    echo "Installing Python dependencies with pip instead..."
    pip install fastapi uvicorn aiohttp websockets pydantic
else
    echo -e "${YELLOW}Installing Python dependencies using uv...${NC}"
    # Skip hermes-client which is a local component
    uv pip install fastapi uvicorn aiohttp websockets pydantic
fi

# Create a new UI directory
STATIC_DIR="${HEPHAESTUS_DIR}/hephaestus/ui/static"

# Create static directory
mkdir -p "${STATIC_DIR}"

# Create a minimal HTML file
echo -e "${YELLOW}Creating a minimal UI...${NC}"
cat > "${STATIC_DIR}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hephaestus - Tekton Platform UI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #f8fafc;
      background-color: #1e293b;
    }
    
    .container {
      display: flex;
      min-height: 100vh;
    }
    
    .sidebar {
      width: 250px;
      background-color: #0f172a;
      padding: 20px 0;
      display: flex;
      flex-direction: column;
    }
    
    .logo-container {
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 1px solid #334155;
    }
    
    .logo {
      font-size: 24px;
      font-weight: bold;
    }
    
    .logo-subtitle {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 5px;
    }
    
    .component-list {
      flex-grow: 1;
      padding: 0 10px;
    }
    
    .component-item {
      padding: 10px 15px;
      border-radius: 5px;
      margin-bottom: 5px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
    }
    
    .component-item:hover {
      background-color: #334155;
    }
    
    .component-item.active {
      background-color: #3b82f6;
    }
    
    .component-name {
      flex-grow: 1;
    }
    
    .component-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 10px;
    }
    
    .status-active {
      background-color: #10b981;
    }
    
    .status-inactive {
      background-color: #6b7280;
    }
    
    .status-error {
      background-color: #ef4444;
    }
    
    .content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      background-color: #1e293b;
      padding: 15px 30px;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
    }
    
    .header-title {
      font-size: 18px;
      font-weight: bold;
    }
    
    .main-content {
      flex-grow: 1;
      padding: 30px;
      background-color: #0f172a;
      height: 100%;
    }
    
    .landing-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      height: 80vh;
    }
    
    .landing-logo {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #3b82f6;
    }
    
    .landing-subtitle {
      font-size: 20px;
      color: #64748b;
      margin-bottom: 40px;
    }
    
    .chat-input {
      border-top: 1px solid #334155;
      padding: 20px;
    }
    
    input {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #475569;
      background-color: #1e293b;
      color: #f8fafc;
    }
    
    ul {
      list-style-type: none;
      padding: 0;
    }
    
    .footer {
      background-color: #1e293b;
      padding: 10px;
      text-align: center;
      color: #64748b;
      border-top: 1px solid #334155;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="logo-container">
        <div class="logo">Tekton</div>
        <div class="logo-subtitle">Multi-AI Engineering Platform</div>
      </div>
      
      <div class="component-list">
        <ul>
          <li class="component-item active">
            <div class="component-name">Dashboard</div>
          </li>
          <li class="component-item">
            <div class="component-name">Telos</div>
            <div class="component-status status-active"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Athena</div>
            <div class="component-status status-active"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Engram</div>
            <div class="component-status status-inactive"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Ergon</div>
            <div class="component-status status-active"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Hermes</div>
            <div class="component-status status-active"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Sophia</div>
            <div class="component-status status-inactive"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Prometheus</div>
            <div class="component-status status-inactive"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Rhetor</div>
            <div class="component-status status-inactive"></div>
          </li>
          <li class="component-item">
            <div class="component-name">Settings</div>
          </li>
        </ul>
      </div>
    </div>
    
    <!-- Content Area -->
    <div class="content">
      <div class="header">
        <div class="header-title">Hephaestus</div>
      </div>
      
      <div class="main-content">
        <div class="landing-page">
          <div class="landing-logo">Hephaestus</div>
          <div class="landing-subtitle">Tekton UI System</div>
          <p>Welcome to Hephaestus, the GUI system for Tekton.</p>
          <p id="status-message">Connecting to components...</p>
        </div>
      </div>
      
      <div class="chat-input">
        <input type="text" placeholder="Type your message here..." />
      </div>
    </div>
  </div>

  <script>
    // Simple JavaScript to simulate component interactions
    document.addEventListener('DOMContentLoaded', function() {
      const statusMessage = document.getElementById('status-message');
      const componentItems = document.querySelectorAll('.component-item');
      const headerTitle = document.querySelector('.header-title');
      const input = document.querySelector('input');
      
      // Simulate connection
      setTimeout(() => {
        statusMessage.textContent = 'Connected to components. Ready to go!';
      }, 2000);
      
      // Handle component selection
      componentItems.forEach(item => {
        item.addEventListener('click', function() {
          // Remove active class from all items
          componentItems.forEach(i => i.classList.remove('active'));
          
          // Add active class to clicked item
          this.classList.add('active');
          
          // Update header title
          const componentName = this.querySelector('.component-name').textContent;
          headerTitle.textContent = componentName;
        });
      });
      
      // Handle input
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          statusMessage.textContent = `Received: "${e.target.value}"`;
          e.target.value = '';
        }
      });
    });
  </script>
</body>
</html>
EOF

# Also install Hephaestus package in development mode
echo -e "${YELLOW}Installing Hephaestus in development mode...${NC}"
if command -v uv &> /dev/null; then
    cd "${HEPHAESTUS_DIR}" && uv pip install -e .
else
    cd "${HEPHAESTUS_DIR}" && pip install -e .
fi

echo -e "${GREEN}Setup complete!${NC}"
echo "A minimal UI has been created to get you started."
echo "You can now run the Hephaestus UI with:"
echo "  python -m hephaestus.ui.main"
echo "  or"
echo "  ./run_ui.sh"