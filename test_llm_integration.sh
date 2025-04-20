#!/bin/bash
# Test script for the Ergon-Terminal LLM integration

# Set terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=== TEKTON TERMINAL-LLM INTEGRATION TEST ===${NC}"
echo "This script tests the integration between the Hephaestus UI terminal and the Ergon LLM."
echo ""

# Step 1: Check that Ergon API is running
echo -e "${YELLOW}Step 1: Checking Ergon API availability...${NC}"
if curl -s http://localhost:8000/ > /dev/null; then
    echo -e "${GREEN}✓ Ergon API is running at http://localhost:8000/${NC}"
else
    echo -e "${RED}✗ Ergon API is not running. Please start the Ergon API first:${NC}"
    echo "   cd /Users/cskoons/projects/github/Tekton/Ergon"
    echo "   uvicorn ergon.api.app:app --host 0.0.0.0 --port 8000"
    exit 1
fi

# Step 2: Start the Hephaestus UI server
echo -e "\n${YELLOW}Step 2: Starting Hephaestus UI server...${NC}"
echo "  The server will run in the background. Check logs in hephaestus_ui.log"
cd /Users/cskoons/projects/github/Tekton/Hephaestus
python ui/server/server.py > hephaestus_ui.log 2>&1 &
SERVER_PID=$!
sleep 2

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✓ Hephaestus UI server started successfully with PID $SERVER_PID${NC}"
else
    echo -e "${RED}✗ Failed to start Hephaestus UI server. Check logs in hephaestus_ui.log${NC}"
    exit 1
fi

# Step 3: Test endpoints
echo -e "\n${YELLOW}Step 3: Testing server endpoints...${NC}"

# Test status endpoint
echo -n "  Testing Hermes status endpoint: "
if curl -s http://localhost:8080/api/status > /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

# Step 4: Testing WebSocket connection
echo -e "\n${YELLOW}Step 4: Testing WebSocket connection...${NC}"
echo "  This requires wscat. Install with 'npm install -g wscat' if needed."
echo "  To test manually, run: wscat -c ws://localhost:8081/ws"
echo "  Then send: {\"type\":\"REGISTER\",\"source\":\"test\",\"target\":\"SYSTEM\"}"
echo -e "${GREEN}  Skipping automated WebSocket test - requires interactive client${NC}"

# Step 5: Print access information
echo -e "\n${YELLOW}Step 5: Access instructions${NC}"
echo -e "${GREEN}✓ Integration test setup complete!${NC}"
echo -e "  1. Open a web browser and navigate to ${BLUE}http://localhost:8080/${NC}"
echo -e "  2. Navigate to the Ergon component"
echo -e "  3. Test typing a message in the Ergon, Symposium, or Agora chat tabs"
echo -e "  4. Verify that responses appear in the chat window"
echo
echo -e "${YELLOW}To stop the server:${NC}"
echo "  kill $SERVER_PID"
echo
echo -e "${BLUE}=== TEST COMPLETE ===${NC}"