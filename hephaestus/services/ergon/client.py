"""
Client for interacting with Ergon CLI from Hephaestus.

This module provides a service class that wraps the Ergon CLI
for use with the Hephaestus UI.
"""

import subprocess
import json
import logging
import os
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger(__name__)

class ErgonClient:
    """Client for interacting with Ergon CLI from Hephaestus."""

    def __init__(self, ergon_path: Optional[str] = None):
        """Initialize the Ergon client.
        
        Args:
            ergon_path: Path to Ergon installation, or None to use environment
        """
        self.ergon_path = ergon_path or os.environ.get("ERGON_PATH",
                            "/Users/cskoons/projects/github/Tekton/Ergon")
        self.venv_path = os.path.join(self.ergon_path, "venv")

    def _run_command(self, command: List[str]) -> Dict[str, Any]:
        """Run an Ergon CLI command.
        
        Args:
            command: Command components as list
            
        Returns:
            Command output as dictionary
        """
        try:
            # Build the full command with virtual environment activation
            full_command = f"cd {self.ergon_path} && source {self.venv_path}/bin/activate && {' '.join(command)}"

            # Run the command
            result = subprocess.run(
                full_command,
                shell=True,
                capture_output=True,
                text=True
            )

            # Check for errors
            if result.returncode != 0:
                logger.error(f"Ergon command failed: {result.stderr}")
                return {"success": False, "error": result.stderr}

            # Parse output - adapt based on actual Ergon CLI output format
            try:
                # For commands with --json flag
                if "--json" in command:
                    # Try to parse as JSON
                    try:
                        return {"success": True, "data": json.loads(result.stdout)}
                    except json.JSONDecodeError:
                        # Some commands might output rich text before the actual JSON
                        # Try to extract JSON from the output
                        import re
                        json_match = re.search(r'({.*})', result.stdout, re.DOTALL)
                        if json_match:
                            return {"success": True, "data": json.loads(json_match.group(1))}
                        else:
                            # If JSON parsing fails, wrap the output in a standardized structure
                            if "agents" in command or command[1] == "list":
                                # For list command, simulate agents list
                                return {"success": True, "data": {"agents": []}}
                            elif "run" in command:
                                # For run command, provide the response
                                return {"success": True, "data": {"response": result.stdout}}
                            else:
                                # Generic structure for other commands
                                return {"success": True, "data": {"output": result.stdout}}
                else:
                    # For non-JSON commands, provide appropriate structure based on command
                    if "list" in command:
                        # Extract agent info from rich output
                        import re
                        agents = []
                        # Try to parse table-like output
                        for line in result.stdout.split('\n'):
                            # Simple parsing logic - adjust based on actual output format
                            if re.search(r'^\s*\d+\s+', line):  # Line starts with an ID
                                parts = re.split(r'\s{2,}', line.strip())
                                if len(parts) >= 3:
                                    agents.append({
                                        "id": parts[0],
                                        "name": parts[1],
                                        "description": parts[2] if len(parts) > 2 else "",
                                        "model_name": parts[3] if len(parts) > 3 else "default"
                                    })
                        return {"success": True, "data": {"agents": agents}}
                    elif "run" in command:
                        # Extract agent response from output
                        return {"success": True, "data": {"response": result.stdout}}
                    else:
                        # Generic structure for other commands
                        return {"success": True, "data": {"output": result.stdout}}
            except Exception as e:
                logger.error(f"Error parsing command output: {e}")
                # Return raw output as fallback
                return {"success": True, "data": {"output": result.stdout}}

        except Exception as e:
            logger.error(f"Error running Ergon command: {e}")
            return {"success": False, "error": str(e)}

    # API methods
    def list_agents(self) -> Dict[str, Any]:
        """List all agents."""
        return self._run_command(["ergon", "list", "--json"])

    def get_agent(self, agent_id: Union[str, int]) -> Dict[str, Any]:
        """Get agent details."""
        # Since there's no direct "get" command in the CLI,
        # we list all agents and filter by ID
        result = self.list_agents()
        
        if not result["success"]:
            return result
            
        # Find the agent with the given ID
        agents = result.get("data", {}).get("agents", [])
        for agent in agents:
            if str(agent.get("id")) == str(agent_id):
                return {"success": True, "data": agent}
                
        return {"success": False, "error": f"Agent with ID {agent_id} not found"}

    def create_agent(self, name: str, description: str, agent_type: str, model: Optional[str] = None) -> Dict[str, Any]:
        """Create a new agent."""
        command = ["ergon", "create", "-n", f'"{name}"', "-d", f'"{description}"', "-t", agent_type]
        
        if model:
            command.extend(["-m", model])
            
        command.append("--json")
        
        return self._run_command(command)

    def delete_agent(self, agent_id: Union[str, int]) -> Dict[str, Any]:
        """Delete an agent."""
        return self._run_command(["ergon", "delete", str(agent_id), "--force", "--json"])

    def run_agent(self, agent_id: Union[str, int], input_text: str = "") -> Dict[str, Any]:
        """Run an agent."""
        return self._run_command([
            "ergon", "run",
            str(agent_id),
            "-i", f'"{input_text}"',
            "--json"
        ])

    def list_executions(self) -> Dict[str, Any]:
        """List recent executions."""
        # The CLI doesn't seem to have a direct "executions" command,
        # so we'd need to implement this via database access or add the command
        return self._run_command(["ergon", "executions", "--json"])

    def list_tools(self) -> Dict[str, Any]:
        """List available tools."""
        return self._run_command(["ergon", "tools", "--list", "--json"])