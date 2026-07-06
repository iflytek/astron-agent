import requests
import json
import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configuration
ASTRON_AGENT_URL = "https://astron-agent.internal/api/v1/trigger"
SECRET_KEY = "your-secret-key"  # Shared secret for HMAC

@app.route('/trigger', methods=['POST'])
def trigger_workflow():
    """
    OpenClaw triggers a specific high-privilege workflow via Astron Agent.
    Expects JSON payload: {"workflow_id": "...", "parameters": {...}}
    """
    data = request.get_json()
    if not data or 'workflow_id' not in data:
        return jsonify({"error": "Missing workflow_id"}), 400

    # Verify HMAC signature for authenticity
    signature = request.headers.get('X-Signature')
    if not verify_signature(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401

    # Forward to Astron Agent
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post(
            ASTRON_AGENT_URL,
            data=json.dumps(data),
            headers=headers,
            timeout=30
        )
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({"error": "Astron Agent error", "detail": response.text}), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

def verify_signature(payload, signature):
    if not signature:
        return False
    expected = hmac.new(SECRET_KEY.encode('utf-8'), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, ssl_context='adhoc')  # Use proper cert in production
