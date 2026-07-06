from flask import Flask, request, jsonify
import os
import json
import hmac
import hashlib
from datetime import datetime

app = Flask(__name__)

# Security: API key for authentication
API_KEY = os.getenv('ASTRON_API_KEY', 'your-api-key-here')

# Audit log file path
AUDIT_LOG_PATH = 'audit.log'

# Simulated RPA executor (in real system, would call actual orchestrator)
from rpa_orchestrator import execute_rpa_workflow

def verify_hmac_signature(request):
    """Optional HMAC verification for added security."""
    # Placeholder - implement if needed
    return True

def authenticate_request():
    """Authenticate using Bearer token."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False
    token = auth_header.split(' ', 1)[1]
    return hmac.compare_digest(token, API_KEY)

def log_audit(workflow_id: str, status: str, details: dict):
    """Append audit log entry."""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'workflow_id': workflow_id,
        'status': status,
        'details': details
    }
    with open(AUDIT_LOG_PATH, 'a') as f:
        f.write(json.dumps(entry) + '\n')

@app.route('/trigger', methods=['POST'])
def handle_trigger():
    """Endpoint for OpenClaw to trigger RPA execution."""
    # Authentication
    if not authenticate_request():
        log_audit('unknown', 'rejected', {'reason': 'authentication failed'})
        return jsonify({'error': 'Unauthorized'}), 401

    # Optionally verify HMAC signature
    if not verify_hmac_signature(request):
        log_audit('unknown', 'rejected', {'reason': 'signature mismatch'})
        return jsonify({'error': 'Invalid signature'}), 400

    # Parse request
    data = request.get_json(silent=True)
    if not data or 'workflow_id' not in data:
        log_audit('unknown', 'rejected', {'reason': 'missing workflow_id'})
        return jsonify({'error': 'workflow_id required'}), 400

    workflow_id = data['workflow_id']
    payload = data.get('payload', {})

    # Log incoming request
    log_audit(workflow_id, 'received', {'payload_keys': list(payload.keys())})

    # Simulate human-in-the-loop approval (placeholder)
    # In production, would integrate with approval system
    # For demo, auto-approve
    approval_status = 'approved'
    log_audit(workflow_id, 'human_approval', {'status': approval_status})

    if approval_status != 'approved':
        log_audit(workflow_id, 'cancelled', {'reason': 'approval denied'})
        return jsonify({'status': 'cancelled'}), 200

    # Execute RPA workflow
    try:
        result = execute_rpa_workflow(workflow_id, payload)
        log_audit(workflow_id, 'completed', {'result': result})
        return jsonify({'status': 'completed', 'result': result}), 200
    except Exception as e:
        log_audit(workflow_id, 'failed', {'error': str(e)})
        return jsonify({'status': 'failed', 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, ssl_context='adhoc')  # HTTPS for production
