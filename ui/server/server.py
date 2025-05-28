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
    
    # Configuration for API proxying - using environment variables
    ERGON_API_HOST = "localhost"
    ERGON_API_PORT = int(os.environ.get("ERGON_PORT", 8002))  # Ergon API port from environment
    
    # Add class variable to store the WebSocket server instance
    websocket_server = None
    
    def __init__(self, *args, directory=None, **kwargs):
        if directory is None:
            directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        super().__init__(*args, directory=directory, **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        # Add no-cache headers to force browser to reload content
        self.protocol_version = 'HTTP/1.1'
        
        # Check if this is a WebSocket connection upgrade request
        if self.path.startswith("/ws") and self.headers.get('Upgrade', '').lower() == 'websocket':
            self.handle_websocket_request()
            return
        
        # Check if this is an API request that needs to be proxied
        if self.path == "/health" or self.path == "/api/health":
            # Handle health check endpoint
            self.handle_health_check()
            return
        elif self.path.startswith("/api/config/ports"):
            # Handle port configuration endpoint
            self.serve_port_configuration()
            return
        elif self.path.startswith("/api/environment"):
            # Handle environment variable endpoints
            self.handle_environment_request("GET")
            return
        elif self.path.startswith("/api/settings"):
            # Handle settings endpoints
            self.handle_settings_request("GET")
            return
        elif self.path.startswith("/api/"):
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
        
    def handle_websocket_request(self):
        """Handle WebSocket upgrade request
        
        This implements the WebSocket protocol handshake as per RFC 6455:
        https://tools.ietf.org/html/rfc6455
        
        For the Single Port Architecture, we handle both HTTP and WebSocket 
        connections on the same port but with different URL paths.
        """
        try:
            # Import needed for WebSocket handling
            import asyncio
            import websockets
            import struct
            import time
            import threading
            from http import HTTPStatus
            
            # Log full headers for debugging
            logger.info(f"WebSocket request headers: {dict(self.headers)}")
            
            # Check for proper WebSocket protocol headers
            connection_header = self.headers.get("Connection", "")
            if not connection_header or "upgrade" not in connection_header.lower():
                logger.error(f"Invalid Connection header: {connection_header}")
                self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Connection header")
                return
                
            upgrade_header = self.headers.get("Upgrade", "")
            if not upgrade_header or upgrade_header.lower() != "websocket":
                logger.error(f"Invalid Upgrade header: {upgrade_header}")
                self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Upgrade header")
                return
                
            # Check for WebSocket specific headers
            if "Sec-WebSocket-Key" not in self.headers:
                logger.error("Missing Sec-WebSocket-Key header")
                self.send_error(HTTPStatus.BAD_REQUEST, "Missing Sec-WebSocket-Key header")
                return
                
            if "Sec-WebSocket-Version" not in self.headers:
                logger.error("Missing Sec-WebSocket-Version header")
                self.send_error(HTTPStatus.BAD_REQUEST, "Missing Sec-WebSocket-Version header")
                return
                
            # Calculate accept key
            websocket_key = self.headers.get("Sec-WebSocket-Key")
            accept_key = self._calculate_accept_key(websocket_key)
            
            # Log handshake details
            logger.info(f"WebSocket handshake - Key: {websocket_key}, Accept: {accept_key}")
            
            # Send WebSocket upgrade response
            handshake_response = (
                f"HTTP/1.1 101 Switching Protocols\r\n"
                f"Upgrade: websocket\r\n"
                f"Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept_key}\r\n"
                f"\r\n"
            )
            
            logger.info("Sending WebSocket handshake response")
            self.wfile.write(handshake_response.encode())
            
            # At this point, the socket is upgraded to WebSocket protocol
            logger.info("WebSocket connection established")
            
            # Get the client socket
            client_socket = self.request
            
            # Start a separate thread to handle this WebSocket connection
            ws_thread = threading.Thread(
                target=self._handle_websocket_connection,
                args=(client_socket,),
                daemon=True
            )
            ws_thread.start()
            
            # Keep the request handler running until the connection is closed
            # This prevents the HTTP server from closing the connection
            while ws_thread.is_alive():
                time.sleep(0.1)
                
            logger.info("WebSocket connection handler finished")
            
        except Exception as e:
            logger.error(f"Error handling WebSocket request: {str(e)}")
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"WebSocket error: {str(e)}")
    
    def _handle_websocket_connection(self, client_socket):
        """Handle the WebSocket connection after upgrade
        
        Args:
            client_socket: The socket connection to the client
        """
        import select
        import json
        import struct
        import time
        
        try:
            # Helper function to decode WebSocket frames
            def decode_websocket_frame(data):
                """Decode a WebSocket frame"""
                if len(data) < 2:
                    return None, None, 0
                
                # Parse the first two bytes
                fin = (data[0] & 0x80) != 0
                opcode = data[0] & 0x0F
                masked = (data[1] & 0x80) != 0
                payload_length = data[1] & 0x7F
                
                # Get the index where the header ends
                header_length = 2
                
                # Handle extended payload length
                if payload_length == 126:
                    if len(data) < 4:
                        return None, None, 0
                    payload_length = struct.unpack("!H", data[2:4])[0]
                    header_length = 4
                elif payload_length == 127:
                    if len(data) < 10:
                        return None, None, 0
                    payload_length = struct.unpack("!Q", data[2:10])[0]
                    header_length = 10
                
                # Get the masking key if present
                mask_key = None
                if masked:
                    if len(data) < header_length + 4:
                        return None, None, 0
                    mask_key = data[header_length:header_length+4]
                    header_length += 4
                
                # Check if we have enough data
                if len(data) < header_length + payload_length:
                    return None, None, 0
                
                # Get the payload
                payload = data[header_length:header_length+payload_length]
                
                # Unmask the payload if needed
                if masked and mask_key:
                    payload = bytearray(payload)
                    for i in range(len(payload)):
                        payload[i] ^= mask_key[i % 4]
                
                return opcode, payload, header_length + payload_length
            
            # Helper function to encode WebSocket frames
            def encode_websocket_frame(opcode, payload):
                """Encode a WebSocket frame"""
                # First byte: FIN bit set, opcode
                first_byte = 0x80 | opcode
                
                # Determine payload length bytes
                payload_length = len(payload)
                if payload_length <= 125:
                    length_bytes = struct.pack("!B", payload_length)
                elif payload_length <= 65535:
                    length_bytes = struct.pack("!BH", 126, payload_length)
                else:
                    length_bytes = struct.pack("!BQ", 127, payload_length)
                
                # Build frame
                frame = bytes([first_byte]) + length_bytes + payload
                return frame
            
            # Main connection loop
            logger.info("Starting WebSocket connection handler")
            buffer = bytearray()
            client_socket.setblocking(0)  # Non-blocking mode
            
            # Send a welcome message
            welcome_message = {
                "type": "SYSTEM",
                "source": "SERVER",
                "target": "CLIENT",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "payload": {
                    "message": "Welcome to Tekton UI WebSocket server"
                }
            }
            welcome_frame = encode_websocket_frame(1, json.dumps(welcome_message).encode())
            client_socket.sendall(welcome_frame)
            
            # Main loop
            while True:
                # Check if there's data to read
                readable, _, _ = select.select([client_socket], [], [], 0.1)
                
                if not readable:
                    continue
                
                # Read data
                try:
                    data = client_socket.recv(4096)
                except BlockingIOError:
                    continue
                
                # Check for disconnection
                if not data:
                    logger.info("Client disconnected")
                    break
                
                # Add to buffer
                buffer.extend(data)
                
                # Process frames in buffer
                while buffer:
                    opcode, payload, consumed = decode_websocket_frame(buffer)
                    
                    # If we don't have a complete frame yet
                    if opcode is None:
                        break
                    
                    # Remove consumed bytes from buffer
                    buffer = buffer[consumed:]
                    
                    # Handle different opcodes
                    if opcode == 0x1:  # Text frame
                        try:
                            message = payload.decode('utf-8')
                            logger.info(f"Received message: {message[:100]}")
                            
                            # Parse as JSON
                            data = json.loads(message)
                            
                            # Forward to WebSocket server if available
                            if self.websocket_server:
                                # Simple echo response
                                response = {
                                    "type": "RESPONSE",
                                    "source": "SERVER",
                                    "target": data.get("source", "CLIENT"),
                                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                                    "payload": {
                                        "message": f"Received: {message[:50]}...",
                                        "status": "ok"
                                    }
                                }
                                
                                # Encode and send response
                                response_frame = encode_websocket_frame(1, json.dumps(response).encode())
                                client_socket.sendall(response_frame)
                            
                        except Exception as e:
                            logger.error(f"Error processing message: {str(e)}")
                    
                    elif opcode == 0x8:  # Close frame
                        logger.info("Received close frame")
                        # Send close frame response
                        close_frame = encode_websocket_frame(0x8, b'')
                        client_socket.sendall(close_frame)
                        return
                    
                    elif opcode == 0x9:  # Ping frame
                        logger.info("Received ping frame")
                        # Send pong frame
                        pong_frame = encode_websocket_frame(0xA, payload)
                        client_socket.sendall(pong_frame)
                    
                    elif opcode == 0xA:  # Pong frame
                        logger.info("Received pong frame")
                    
                    else:
                        logger.warning(f"Unsupported opcode: {opcode}")
            
        except Exception as e:
            logger.error(f"WebSocket connection handler error: {str(e)}")
        finally:
            logger.info("WebSocket connection handler ending")
            try:
                client_socket.close()
            except:
                pass
    
    def _calculate_accept_key(self, key):
        """Calculate the Sec-WebSocket-Accept header value based on the client's key
        
        This follows the WebSocket protocol (RFC 6455): 
        1. Append the magic string '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
        2. Take the SHA-1 hash of the result
        3. Return the base64 encoding of the hash
        """
        import hashlib
        import base64
        
        WEBSOCKET_MAGIC_STRING = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        accept_key = key + WEBSOCKET_MAGIC_STRING
        accept_key_hash = hashlib.sha1(accept_key.encode()).digest()
        return base64.b64encode(accept_key_hash).decode()
    
    def do_POST(self):
        """Handle POST requests"""
        # Check if this is an API request that needs to be proxied
        if self.path.startswith("/api/environment"):
            # Handle environment variable endpoints
            self.handle_environment_request("POST")
            return
        elif self.path.startswith("/api/settings"):
            # Handle settings endpoints
            self.handle_settings_request("POST")
            return
        elif self.path.startswith("/api/"):
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

    def handle_health_check(self):
        """Handle health check endpoint for component status monitoring"""
        import json

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()

        response = {
            "status": "healthy",
            "service": "hephaestus",
            "version": "1.0.0",
            "component_type": "ui_server",
            "port": int(os.environ.get("HEPHAESTUS_PORT", 8080)),
            "endpoints": [
                "/health",
                "/api/health",
                "/api/config/ports",
                "/api/environment",
                "/api/settings",
                "/ws"
            ],
            "message": "Hephaestus UI server is running"
        }

        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def serve_port_configuration(self):
        """Serve port configuration from environment variables"""
        # Get all environment variables for components
        port_vars = {
            "HEPHAESTUS_PORT": int(os.environ.get("HEPHAESTUS_PORT", 8080)),
            "ENGRAM_PORT": int(os.environ.get("ENGRAM_PORT", 8000)),
            "HERMES_PORT": int(os.environ.get("HERMES_PORT", 8001)),
            "ERGON_PORT": int(os.environ.get("ERGON_PORT", 8002)),
            "RHETOR_PORT": int(os.environ.get("RHETOR_PORT", 8003)),
            "TERMA_PORT": int(os.environ.get("TERMA_PORT", 8004)),
            "ATHENA_PORT": int(os.environ.get("ATHENA_PORT", 8005)),
            "PROMETHEUS_PORT": int(os.environ.get("PROMETHEUS_PORT", 8006)),
            "HARMONIA_PORT": int(os.environ.get("HARMONIA_PORT", 8007)),
            "TELOS_PORT": int(os.environ.get("TELOS_PORT", 8008)),
            "SYNTHESIS_PORT": int(os.environ.get("SYNTHESIS_PORT", 8009)),
            "TEKTON_CORE_PORT": int(os.environ.get("TEKTON_CORE_PORT", 8010))
        }
        
        # Send port configuration
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        
        # Convert to JSON and send
        import json
        self.wfile.write(json.dumps(port_vars).encode('utf-8'))

    def handle_environment_request(self, method):
        """Handle environment variable API requests"""
        try:
            if method == "GET":
                # Load environment using TektonEnvManager
                sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "shared", "utils"))
                
                try:
                    from env_manager import TektonEnvManager
                    env_manager = TektonEnvManager()
                    
                    if self.path == "/api/environment":
                        # Return all environment variables
                        env_data = env_manager.load_environment()
                    elif self.path == "/api/environment/tekton":
                        # Return only Tekton-specific variables
                        env_data = env_manager.get_tekton_variables()
                    else:
                        self.send_error(404, "Environment endpoint not found")
                        return
                    
                    # Send response
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    
                    import json
                    self.wfile.write(json.dumps(env_data).encode('utf-8'))
                    
                except ImportError as e:
                    logger.error(f"Could not import TektonEnvManager: {e}")
                    # Fallback to simple environment reading
                    env_data = dict(os.environ)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    
                    import json
                    self.wfile.write(json.dumps(env_data).encode('utf-8'))
                    
            else:
                self.send_error(405, "Method not allowed for environment endpoint")
                
        except Exception as e:
            logger.error(f"Error handling environment request: {e}")
            self.send_error(500, f"Environment request error: {str(e)}")
            
    def handle_settings_request(self, method):
        """Handle settings API requests"""
        try:
            if method == "GET":
                # Load current settings from environment
                sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "shared", "utils"))
                
                try:
                    from env_manager import TektonEnvManager
                    env_manager = TektonEnvManager()
                    tekton_vars = env_manager.get_tekton_variables()
                    
                    # Send response
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    
                    import json
                    self.wfile.write(json.dumps(tekton_vars).encode('utf-8'))
                    
                except ImportError as e:
                    logger.error(f"Could not import TektonEnvManager: {e}")
                    self.send_error(500, "TektonEnvManager not available")
                    
            elif method == "POST":
                # Save settings to .env.tekton
                try:
                    # Read request body
                    content_length = int(self.headers.get('Content-Length', 0))
                    post_data = self.rfile.read(content_length)
                    
                    import json
                    settings = json.loads(post_data.decode('utf-8'))
                    
                    # Load TektonEnvManager and save settings
                    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "shared", "utils"))
                    from env_manager import TektonEnvManager
                    
                    env_manager = TektonEnvManager()
                    env_manager.save_tekton_settings(settings)
                    
                    # Send success response
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    
                    response = {"status": "success", "message": "Settings saved successfully"}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    
                except ImportError as e:
                    logger.error(f"Could not import TektonEnvManager: {e}")
                    self.send_error(500, "TektonEnvManager not available")
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in settings request: {e}")
                    self.send_error(400, "Invalid JSON data")
                except Exception as e:
                    logger.error(f"Error saving settings: {e}")
                    self.send_error(500, f"Settings save error: {str(e)}")
                    
            else:
                self.send_error(405, "Method not allowed for settings endpoint")
                
        except Exception as e:
            logger.error(f"Error handling settings request: {e}")
            self.send_error(500, f"Settings request error: {str(e)}")
        
    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(format % args)

class WebSocketServer:
    """WebSocket server for Tekton UI backend communication"""
    
    def __init__(self, port=None):
        # Use the same port as HTTP server for Single Port Architecture
        self.port = port or int(os.environ.get("HEPHAESTUS_PORT", 8080))
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
        
        # In the new Single Port Architecture, WebSocket uses the same port as HTTP
        # The HTTP server will handle the upgrade to WebSocket protocol
        # This will be handled by the request handler
        await asyncio.Future()  # Placeholder - actual server is started in the HTTP handler

def run_websocket_server(port):
    """Initialize the WebSocket server instance
    
    In the Single Port Architecture, we don't run a separate WebSocket server.
    Instead, we initialize the WebSocket server instance and make it available
    to the HTTP server for handling WebSocket upgrades.
    """
    ws_server = WebSocketServer(port)
    
    # Store the WebSocket server instance in the request handler class
    TektonUIRequestHandler.websocket_server = ws_server
    
    logger.info("WebSocket server initialized for Single Port Architecture")

def run_http_server(directory, port):
    """Run the HTTP server"""
    handler = lambda *args, **kwargs: TektonUIRequestHandler(*args, directory=directory, **kwargs)
    
    # Create a custom TCPServer that allows address reuse
    class TektonTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
    
    with TektonTCPServer(("", port), handler) as httpd:
        logger.info(f"Serving at http://localhost:{port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            logger.info("HTTP server stopped")
            httpd.server_close()

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Tekton UI Server')
    parser.add_argument('--port', type=int, default=int(os.environ.get("HEPHAESTUS_PORT", 8080)), 
                      help='HTTP/WebSocket Server port')
    parser.add_argument('--directory', type=str, default=None, help='Directory to serve')
    args = parser.parse_args()
    
    # Determine directory to serve
    if args.directory:
        directory = os.path.abspath(args.directory)
    else:
        # Default to the ui directory (parent of this script)
        directory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    logger.info(f"Serving files from: {directory}")
    
    # Register with Hermes
    try:
        hermes_url = f"http://localhost:{os.environ.get('HERMES_PORT', 8001)}/api/register"
        registration_data = {
            "name": "hephaestus",
            "version": "1.0.0",
            "type": "ui",
            "endpoint": f"http://localhost:{args.port}",
            "capabilities": ["ui", "visualization", "websocket"],
            "metadata": {"description": "Tekton UI and visualization component"}
        }
        
        req = urllib.request.Request(
            hermes_url,
            data=json.dumps(registration_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                logger.info("Successfully registered with Hermes")
            else:
                logger.warning(f"Failed to register with Hermes: HTTP {response.status}")
    except Exception as e:
        logger.warning(f"Could not register with Hermes: {e}")
    
    # Initialize the WebSocket server (but don't run it separately)
    # In Single Port Architecture, the same port handles both HTTP and WebSocket
    run_websocket_server(args.port)
    
    # Start HTTP server in the main thread (will also handle WebSocket upgrades)
    run_http_server(directory, args.port)

if __name__ == "__main__":
    main()