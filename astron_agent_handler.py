from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import os
from rpa_orchestrator import RPAOrchestrator  # hypothetical RPA orchestrator

app = Flask(__name__)

# Configuration
API_KEY = os.environ.get("API_KEY", "your_api_key")
HMAC_SECRET = os.environ.get("HMAC_SECRET", "your_hmac_secret")

# Initialize RPA orchestrator (orchestrates RPA bots)
rpa = RPAOrchestrator()

def verify_signature(payload, timestamp, signature):
    message = f"{timestamp}:{json.dumps(payload, sort_keys=True)}"
    expected = hmac.new(HMAC_SECRET.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/api/v1/trigger', methods=['POST'])
def trigger_workflow():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    timestamp = request.headers.get('X-Timestamp')
    signature = request.headers.get('X-Signature')
    if not timestamp or not signature:
        return jsonify({"error": "Missing timestamp or signature"}), 401

    # Verify API key
    if data.get('api_key') != API_KEY:
        return jsonify({"error": "Invalid API key"}), 403

    # Verify HMAC signature
    if not verify_signature(data, timestamp, signature):
        return jsonify({"error": "Invalid signature"}), 403

    workflow_id = data.get('workflow_id')
    context = data.get('context', {})

    # Check permissions and initiate human-in-the-loop approval
    if not rpa.check_permissions(workflow_id, context):
        return jsonify({"error": "Insufficient permissions"}), 403

    # Submit approval request (async)
    approval_id = rpa.request_approval(workflow_id, context)

    # Log the trigger event
    rpa.log_event({"type": "trigger", "workflow_id": workflow_id, "context": context, "approval_id": approval_id})

    return jsonify({"status": "accepted", "approval_id": approval_id}), 202

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, ssl_context='adhoc')  # Use proper TLS in production