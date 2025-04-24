#\!/bin/bash

echo "Stopping Hephaestus UI server..."
pkill -f "python.*server.py" || echo "No running server found"

echo "Starting Hephaestus UI server..."
cd /Users/cskoons/projects/github/Tekton/Hephaestus/ui/server
python server.py &

echo "Hephaestus UI server restarted\!"

