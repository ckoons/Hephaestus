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
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import asyncio
import websockets
import threading
import urllib.request
import urllib.error
import urllib.parse
from urllib.parse import urlparse
import http.client
import random

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG level for more detailed logs
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class TektonUIRequestHandler(SimpleHTTPRequestHandler):
    """Handler for serving the Tekton UI"""
    
    # Configuration for API proxying
    ERGON_API_HOST = "localhost"
    ERGON_API_PORT = 8200  # Ergon API port based on Tekton launch configuration
    
    def __init__(self, *args, directory=None, **kwargs):
        if directory is None:
            directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        super().__init__(*args, directory=directory, **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        # Add no-cache headers to force browser to reload content
        self.protocol_version = 'HTTP/1.1'
        
        # Check if this is an API request that needs to be proxied
        if self.path.startswith("/api/"):
            self.proxy_api_request("GET")
            return
            
        # Handle requests for Terma UI files
        if self.path.startswith("/components/terma/") or self.path.startswith("/scripts/terma/") or self.path.startswith("/styles/terma/"):
            # We have symlinks now that should handle this, but if there are issues,
            # we can directly serve from the Terma directory
            return SimpleHTTPRequestHandler.do_GET(self)
            
        # Handle direct requests to Terma UI files
        if self.path.startswith("/terma/ui/"):
            # Direct path to Terma UI files
            terma_path = self.path[len("/terma/ui/"):]
            file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "Terma", "ui", terma_path)
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                
                # Determine content type based on extension
                ext = os.path.splitext(file_path)[1].lower()
                content_type = {
                    '.html': 'text/html',
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                }.get(ext, 'application/octet-stream')
                
                self.send_header("Content-type", content_type)
                self.send_header("Content-Length", str(os.path.getsize(file_path)))
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            
        # Handle requests for images directory
        if self.path.startswith("/images/"):
            # Try to serve from Tekton root images directory
            tekton_images_dir = os.path.abspath(os.path.join(self.directory, "../../..", "images"))
            file_path = os.path.join(tekton_images_dir, self.path[8:])  # Remove '/images/' prefix
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                # File exists in Tekton images directory
                with open(file_path, 'rb') as f:
                    # Determine content type based on extension
                    ext = os.path.splitext(file_path)[1].lower()
                    content_type = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.ico': 'image/x-icon',
                    }.get(ext, 'application/octet-stream')
                    
                    self.send_response(200)
                    self.send_header("Content-type", content_type)
                    self.send_header("Content-Length", str(os.path.getsize(file_path)))
                    # Add cache control headers
                    self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                    self.send_header("Pragma", "no-cache")
                    self.send_header("Expires", "0")
                    self.end_headers()
                    self.wfile.write(f.read())
                return
            
        # Default behavior - serve index.html for root path or if file doesn't exist
        if self.path == "/" or not os.path.exists(os.path.join(self.directory, self.path[1:])):
            self.path = "/index.html"
        
        # Add our custom headers by extending the base method behavior
        old_end_headers = self.end_headers
        def new_end_headers():
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            old_end_headers()
        self.end_headers = new_end_headers
            
        return SimpleHTTPRequestHandler.do_GET(self)
    
    def do_POST(self):
        """Handle POST requests"""
        # Check if this is an API request that needs to be proxied
        if self.path.startswith("/api/"):
            self.proxy_api_request("POST")
            return
        
        # Handle any other POST requests with 404
        self.send_error(404, "Not Found")
    
    def proxy_api_request(self, method):
        """Proxy API requests to the appropriate backend service"""
        try:
            # Determine target based on path
            target_host = self.ERGON_API_HOST
            target_port = self.ERGON_API_PORT
            
            # Terminal/LLM endpoints
            if self.path.startswith("/api/terminal/"):
                # Convert /api/terminal/* to /terminal/* for Ergon API
                target_path = self.path.replace("/api/terminal/", "/terminal/")
            # Hermes registration endpoints
            elif self.path.startswith("/api/register"):
                # Direct to Hermes registration endpoint when available
                # For now, we'll mock this
                self.mock_registration_endpoint()
                return
            # General message endpoints
            elif self.path.startswith("/api/message"):
                # Direct to message bus when available
                # For now, we'll mock this
                self.mock_message_endpoint()
                return
            # Status endpoint
            elif self.path == "/api/status":
                self.mock_status_endpoint()
                return
            else:
                # Unknown API endpoint
                self.send_error(404, f"API endpoint not supported: {self.path}")
                return
            
            # Get content length for POST requests
            content_length = int(self.headers.get('Content-Length', 0))
            body = None
            if content_length > 0:
                body = self.rfile.read(content_length)
            
            # Get all headers to forward
            headers = {}
            for header, value in self.headers.items():
                if header.lower() not in ('host', 'content-length'):
                    headers[header] = value
            
            # Make request to backend
            logger.info(f"Proxying {method} request to {target_host}:{target_port}{target_path}")
            
            conn = http.client.HTTPConnection(target_host, target_port)
            conn.request(method, target_path, body=body, headers=headers)
            response = conn.getresponse()
            
            # Forward response status and headers
            self.send_response(response.status)
            for header, value in response.getheaders():
                if header.lower() not in ('transfer-encoding',):
                    self.send_header(header, value)
            self.end_headers()
            
            # Forward response body
            self.wfile.write(response.read())
            conn.close()
            
        except Exception as e:
            logger.error(f"Error proxying request: {e}")
            self.send_error(500, f"Error proxying request: {str(e)}")
    
    def mock_registration_endpoint(self):
        """Mock Hermes registration endpoint for development"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode('utf-8')
            request = json.loads(body)
            logger.info(f"Mock registration: {request}")
        
        # Return success response
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "success",
            "registered": True,
            "message": "Component registered successfully (mock)"
        }
        
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def mock_message_endpoint(self):
        """Mock Hermes message endpoint for development"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode('utf-8')
            message = json.loads(body)
            logger.info(f"Mock message received: {message}")
        
        # Return success response
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "success",
            "delivered": True,
            "message": "Message delivered successfully (mock)"
        }
        
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def mock_status_endpoint(self):
        """Mock Hermes status endpoint for development"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "ok",
            "service": "hermes",
            "version": "0.1.0",
            "components": ["ergon", "engram", "athena"],
            "message": "Hermes is running (mock)"
        }
        
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
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
                # Handle command message
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
            
            # LLM requests for terminal chats
            elif data.get('type') == 'LLM_REQUEST':
                # Forward LLM requests to the Ergon API
                await self.handle_llm_request(websocket, data)
                
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
            
    async def handle_llm_request(self, websocket, data):
        """Handle LLM request messages by simulating responses"""
        try:
            # Extract relevant information
            payload = data.get('payload', {})
            context_id = payload.get('context', 'ergon')
            message = payload.get('message', '')
            
            if not message:
                logger.error("Empty message in LLM request")
                return
            
            # Set up typing indicator response
            typing_response = {
                'type': 'UPDATE',
                'source': 'SYSTEM',
                'target': data.get('source', 'UI'),
                'timestamp': self.get_timestamp(),
                'payload': {
                    'status': 'typing',
                    'isTyping': True,
                    'context': context_id
                }
            }
            await websocket.send(json.dumps(typing_response))
            
            # Get simulation mode
            streaming = payload.get('streaming', True)
            
            # Create a simulated response based on context
            simulated_response = f"I received your message: \"{message}\". This is a simulated response as I'm not connected to an LLM. To use a real LLM, you should connect to the Ergon API which is configured with the appropriate LLM integration."
            
            # Add context-specific information
            if context_id == "ergon":
                simulated_response += "\n\nThis is a simulated response from the Ergon AI assistant. In a real implementation, I would help with agent creation, automation, and tool configuration."
            elif context_id == "awt-team":
                simulated_response += "\n\nThis is a simulated response from the AWT Team assistant. In a real implementation, I would help with workflow automation and process design."
            elif context_id == "agora":
                simulated_response += "\n\nThis is a simulated response from the Agora multi-component assistant. In a real implementation, I would coordinate between different AI systems."
            
            # Handle streaming vs non-streaming
            if streaming:
                # Simulate streaming response
                chunk_size = 5  # Characters per chunk
                for i in range(0, len(simulated_response), chunk_size):
                    chunk = simulated_response[i:i+chunk_size]
                    
                    # Send chunk
                    chunk_response = {
                        'type': 'UPDATE',
                        'source': context_id,
                        'target': data.get('source', 'UI'),
                        'timestamp': self.get_timestamp(),
                        'payload': {
                            'chunk': chunk,
                            'context': context_id
                        }
                    }
                    await websocket.send(json.dumps(chunk_response))
                    
                    # Add a short delay between chunks (50-150ms) for realistic effect
                    await asyncio.sleep(0.05 + (0.1 * random.random()))
                
                # Send done signal
                done_response = {
                    'type': 'UPDATE',
                    'source': context_id,
                    'target': data.get('source', 'UI'),
                    'timestamp': self.get_timestamp(),
                    'payload': {
                        'done': True,
                        'context': context_id
                    }
                }
                await websocket.send(json.dumps(done_response))
            else:
                # Create AI response (non-streaming)
                ai_response = {
                    'type': 'RESPONSE',
                    'source': context_id,
                    'target': data.get('source', 'UI'),
                    'timestamp': self.get_timestamp(),
                    'payload': {
                        'message': simulated_response,
                        'context': context_id
                    }
                }
                
                # Add a delay to simulate processing time
                await asyncio.sleep(1.0)
                
                # Send response
                await websocket.send(json.dumps(ai_response))
            
            # Send typing end indicator
            typing_end_response = {
                'type': 'UPDATE',
                'source': 'SYSTEM',
                'target': data.get('source', 'UI'),
                'timestamp': self.get_timestamp(),
                'payload': {
                    'status': 'typing',
                    'isTyping': False,
                    'context': context_id
                }
            }
            await websocket.send(json.dumps(typing_end_response))
                
        except Exception as e:
            logger.error(f"Error handling LLM request: {e}")
            
            # Send error response
            error_response = {
                'type': 'ERROR',
                'source': 'SYSTEM',
                'target': data.get('source', 'UI'),
                'timestamp': self.get_timestamp(),
                'payload': {
                    'error': f"Error processing request: {str(e)}",
                    'context': context_id if 'context_id' in locals() else 'unknown'
                }
            }
            await websocket.send(json.dumps(error_response))
            
            # End typing indicator if it was started
            if 'context_id' in locals():
                typing_end_response = {
                    'type': 'UPDATE',
                    'source': 'SYSTEM',
                    'target': data.get('source', 'UI'),
                    'timestamp': self.get_timestamp(),
                    'payload': {
                        'status': 'typing',
                        'isTyping': False,
                        'context': context_id
                    }
                }
                await websocket.send(json.dumps(typing_end_response))
    
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