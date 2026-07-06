import requests
import os
from typing import Dict, Any

OPENCLAW_TRIGGER_URL = os.getenv("OPENCLAW_TRIGGER_URL", "http://localhost:8080/trigger")
ASTRON_AGENT_API_URL = os.getenv("ASTRON_AGENT_API_URL", "http://astron-agent:8000/api/v1/workflow")
AUTH_TOKEN = os.getenv("ASTRON_AUTH_TOKEN", "default-token")

def trigger_astron_agent(event_data: Dict[str, Any]) -> bool:
    """
    Called by OpenClaw when a trigger event occurs.
    Validates the event and forwards to Astron Agent API.
    """
    # Security: validate event source (example: signature check)
    if not validate_event(event_data):
        raise PermissionError("Invalid event signature")

    # Build payload for Astron Agent
    payload = {
        "workflow_name": event_data.get("workflow_name", "default"),
        "parameters": event_data.get("parameters", {}),
        "trigger_source": "openclaw",
        "audit_info": {
            "event_id": event_data.get("id"),
            "timestamp": event_data.get("timestamp"),
        }
    }

    # Call Astron Agent API with authentication
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    response = requests.post(ASTRON_AGENT_API_URL, json=payload, headers=headers, timeout=10)
    return response.status_code == 200

def validate_event(event_data: Dict[str, Any]) -> bool:
    # Placeholder: implement actual signature verification
    return True
