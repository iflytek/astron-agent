import requests
import hmac
import hashlib
import json

def trigger_astron_agent(api_url: str, secret_key: str, workflow_id: str, payload: dict) -> dict:
    """Secure trigger from OpenClaw to Astron Agent via HMAC-signed webhook."""
    endpoint = f"{api_url}/webhook/trigger"
    body = {
        "workflow_id": workflow_id,
        "payload": payload,
        "source": "openclaw"
    }
    message = json.dumps(body, sort_keys=True)
    signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Signature-256": signature
    }
    response = requests.post(endpoint, headers=headers, data=message, timeout=30)
    response.raise_for_status()
    return response.json()