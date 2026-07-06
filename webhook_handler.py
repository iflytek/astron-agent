import os
import hmac
import hashlib
from flask import Flask, request, jsonify
from rpa_orchestrator import RPAOrchestrator
from config import Config

app = Flask(__name__)
config = Config()

def verify_signature(payload, signature):
    expected = hmac.new(config.webhook_secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/webhook/trigger', methods=['POST'])
def handle_trigger():
    signature = request.headers.get('X-OpenClaw-Signature')
    if not signature:
        return jsonify({'error': 'Missing signature'}), 401
    payload = request.get_data()
    if not verify_signature(payload, signature):
        return jsonify({'error': 'Invalid signature'}), 401
    data = request.get_json()
    if not data or 'workflow_id' not in data:
        return jsonify({'error': 'Missing workflow_id'}), 400
    workflow_id = data['workflow_id']
    params = data.get('params', {})
    orchestrator = RPAOrchestrator()
    result = orchestrator.execute_workflow(workflow_id, params)
    return jsonify({'status': 'ok', 'result': result}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)