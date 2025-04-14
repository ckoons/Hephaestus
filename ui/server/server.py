#!/usr/bin/env python3
"""
Simple HTTP server for Tekton UI
Serves static files and proxies WebSocket connections to the Tekton backend
"""

import os
import sys
import json
import argparse
import logging
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import asyncio
import websockets
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class TektonUIRequestHandler(SimpleHTTPRequestHandler):
    """Handler for serving the Tekton UI"""
    
    def __init__(self, *args, directory=None, **kwargs):
        if directory is None:
            directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        super().__init__(*args, directory=directory, **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        # Serve index.html for root path or if file doesn't exist
        if self.path == "/" or not os.path.exists(os.path.join(self.directory, self.path[1:])):
            self.path = "/index.html"
        
        return SimpleHTTPRequestHandler.do_GET(self)
    
    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(format % args)

class WebSocketServer:
    """WebSocket server for Tekton UI backend communication"""
    
    def __init__(self, port=8081):
        self.port = port
        self.clients = set()
        self.component_servers = {}
    
    async def register_client(self, websocket):
        """Register a new client connection"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client disconnected")
        finally:
            self.clients.remove(websocket)
    
    async def handle_message(self, websocket, message):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            logger.debug(f"Received message: {data}")
            
            # For demo purposes, echo the message back with a response
            if data.get('type') == 'COMMAND':
                response = {
                    'type': 'RESPONSE',
                    'source': data.get('target', 'SYSTEM'),
                    'target': data.get('source', 'UI'),
                    'timestamp': self.get_timestamp(),
                    'payload': {
                        'response': f"Received command: {data.get('payload', {}).get('command')}",
                        'status': 'success'
                    }
                }
                await websocket.send(json.dumps(response))
            
            # If this is a registration message, acknowledge it
            elif data.get('type') == 'REGISTER':
                response = {
                    'type': 'RESPONSE',
                    'source': 'SYSTEM',
                    'target': data.get('source', 'UNKNOWN'),
                    'timestamp': self.get_timestamp(),
                    'payload': {
                        'status': 'registered',
                        'message': 'Client registered successfully'
                    }
                }
                await websocket.send(json.dumps(response))
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message: {message}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    def get_timestamp(self):
        """Get current ISO timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting WebSocket server on port {self.port}")
        async with websockets.serve(self.register_client, "localhost", self.port):
            await asyncio.Future()  # Run forever

def run_websocket_server(port):
    """Run the WebSocket server in a separate thread"""
    ws_server = WebSocketServer(port)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(ws_server.start_server())
    except KeyboardInterrupt:
        logger.info("WebSocket server stopped")
    finally:
        loop.close()

def run_http_server(directory, port):
    """Run the HTTP server"""
    handler = lambda *args, **kwargs: TektonUIRequestHandler(*args, directory=directory, **kwargs)
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        logger.info(f"Serving at http://localhost:{port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            logger.info("HTTP server stopped")
            httpd.server_close()

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Tekton UI Server')
    parser.add_argument('--http-port', type=int, default=8080, help='HTTP server port')
    parser.add_argument('--ws-port', type=int, default=8081, help='WebSocket server port')
    parser.add_argument('--directory', type=str, default=None, help='Directory to serve')
    args = parser.parse_args()
    
    # Determine directory to serve
    if args.directory:
        directory = os.path.abspath(args.directory)
    else:
        # Default to the ui directory (parent of this script)
        directory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    logger.info(f"Serving files from: {directory}")
    
    # Start WebSocket server in a separate thread
    ws_thread = threading.Thread(target=run_websocket_server, args=(args.ws_port,))
    ws_thread.daemon = True
    ws_thread.start()
    
    # Start HTTP server in the main thread
    run_http_server(directory, args.http_port)

if __name__ == "__main__":
    main()