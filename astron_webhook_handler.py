from flask import Flask, request, jsonify
import hmac
import hashlib
import os
import logging

app = Flask(__name__)

# Configuration
WEBHOOK_SECRET = os.environ.get('ASTRON_WEBHOOK_SECRET', 'default-secret')
RPA_API_ENDPOINT = os.environ.get('RPA_API_ENDPOINT', 'http://rpa-bot.internal/execute')
RPA_API_KEY = os.environ.get('RPA_API_KEY', 'rpa-api-key')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_signature(payload, signature):
    """Verify HMAC-SHA256 signature from OpenClaw."""
    expected = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def trigger_rpa_workflow(workflow_name, context):
    """Call Astron Agent's internal RPA API to execute the workflow."""
    import requests
    headers = {
        'Authorization': f'Bearer {RPA_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'workflow': workflow_name,
        'context': context,
        'source': 'openclaw'
    }
    try:
        response = requests.post(RPA_API_ENDPOINT, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f'Failed to trigger RPA workflow: {e}')
        raise

@app.route('/webhook/openclaw', methods=['POST'])
def handle_openclaw_webhook():
    """Webhook endpoint for OpenClaw triggers."""
    # Verify signature
    signature = request.headers.get('X-OpenClaw-Signature')
    if not signature or not verify_signature(request.data, signature):
        logger.warning('Invalid signature from OpenClaw')
        return jsonify({'error': 'Invalid signature'}), 401

    data = request.get_json()
    if not data or 'workflow' not in data:
        return jsonify({'error': 'Missing workflow field'}), 400

    workflow_name = data['workflow']
    context = data.get('context', {})

    # Audit log start
    logger.info(f'Received OpenClaw trigger for workflow: {workflow_name}')

    # Start human-in-the-loop approval if needed
    approval_required = context.get('approval_required', False)
    if approval_required:
        approval_result = request_human_approval(workflow_name, context)
        if not approval_result:
            logger.info(f'Workflow {workflow_name} rejected by human approval')
            return jsonify({'status': 'rejected'}), 200

    # Trigger RPA
    try:
        result = trigger_rpa_workflow(workflow_name, context)
        # Audit log end
        logger.info(f'Workflow {workflow_name} executed successfully')
        return jsonify({'status': 'success', 'result': result}), 200
    except Exception as e:
        logger.error(f'Workflow execution failed: {e}')
        return jsonify({'error': str(e)}), 500

def request_human_approval(workflow_name, context):
    """Placeholder for human-in-the-loop approval integration."""
    # In production, integrate with approval system (e.g., email, Slack)
    # For now, simulate auto-approve
    logger.info(f'Human approval requested for workflow {workflow_name}')
    return True

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
