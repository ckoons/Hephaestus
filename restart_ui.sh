#!/bin/bash

echo "Stopping Hephaestus UI server..."
pkill -f "python.*server.py" || echo "No running server found"

# Find and kill any process using port 8080
echo "Checking for processes using port 8080..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "No process found on port 8080"

# Wait for the port to be released
echo "Waiting for port to be released..."
sleep 2

echo "Starting Hephaestus UI server..."
cd /Users/cskoons/projects/github/Tekton/Hephaestus/ui/server
python server.py &

echo "Hephaestus UI server restarted\!"

