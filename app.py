import os
import json
import hmac
import hashlib
import logging
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Configuration from environment variables
OPENCLAW_SECRET = os.environ.get('OPENCLAW_SECRET', 'default-secret')
ASTRON_AGENT_API_URL = os.environ.get('ASTRON_AGENT_API_URL', 'http://astron-agent:8080/api/trigger')
ASTRON_API_KEY = os.environ.get('ASTRON_API_KEY', 'astron-api-key')
RPA_SCENARIO_ID = os.environ.get('RPA_SCENARIO_ID', 'financial-reimbursement')

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def verify_signature(payload, signature):
    """Verify HMAC-SHA256 signature from OpenClaw."""
    expected_signature = hmac.new(
        OPENCLAW_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)

def send_to_astron_agent(event_data):
    """Send trigger to Astron Agent with authentication."""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ASTRON_API_KEY}'
    }
    payload = {
        'scenario_id': RPA_SCENARIO_ID,
        'event_data': event_data,
        'request_id': event_data.get('request_id', ''),
        'source': 'openclaw'
    }
    try:
        response = requests.post(
            ASTRON_AGENT_API_URL,
            headers=headers,
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        logger.info(f"Successfully triggered Astron Agent. Response: {response.json()}")
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to trigger Astron Agent: {e}")
        raise

@app.route('/webhook/openclaw', methods=['POST'])
def openclaw_webhook():
    """Webhook endpoint for OpenClaw triggers."""
    # Verify signature
    signature = request.headers.get('X-OpenClaw-Signature')
    if not signature:
        logger.warning("Missing signature header")
        return jsonify({'error': 'Missing signature'}), 401

    raw_data = request.get_data()
    if not verify_signature(raw_data, signature):
        logger.warning("Invalid signature")
        return jsonify({'error': 'Invalid signature'}), 403

    # Parse event
    try:
        event = request.get_json()
        logger.info(f"Received event from OpenClaw: {event}")
    except Exception as e:
        logger.error(f"Invalid JSON payload: {e}")
        return jsonify({'error': 'Invalid JSON'}), 400

    # Validate required fields
    if not event or 'action' not in event:
        logger.error("Missing 'action' in event")
        return jsonify({'error': 'Missing action'}), 400

    # Execute trigger
    try:
        result = send_to_astron_agent(event)
        return jsonify({'status': 'triggered', 'result': result}), 200
    except Exception as e:
        logger.exception("Failed to process trigger")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
