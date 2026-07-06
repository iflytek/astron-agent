import os
import logging
from flask import Flask, request, jsonify, abort
from functools import wraps
import jwt
import yaml
import json
from datetime import datetime

app = Flask(__name__)

# Configuration
CONFIG_PATH = os.environ.get('CONFIG_PATH', 'config.yaml')
with open(CONFIG_PATH, 'r') as f:
    config = yaml.safe_load(f)

SECRET_KEY = config['auth']['secret_key']
LOG_DIR = config['logging']['log_dir']
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            abort(401, description='Missing Authorization header')
        try:
            token = token.split()[1]  # Bearer <token>
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user = data['user']
        except:
            abort(401, description='Invalid or expired token')
        return f(*args, **kwargs)
    return decorated

def log_audit(action, status, details):
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'action': action,
        'status': status,
        'details': details
    }
    log_file = os.path.join(LOG_DIR, 'audit.log')
    with open(log_file, 'a') as f:
        f.write(json.dumps(log_entry) + '\n')
    logger.info(f'Audit: {json.dumps(log_entry)}')

@app.route('/api/v1/trigger', methods=['POST'])
@token_required
def trigger_workflow():
    """
    Endpoint called by OpenClaw to trigger a high-risk workflow.
    Expects JSON body with 'workflow_name' and optional parameters.
    """
    data = request.get_json()
    if not data or 'workflow_name' not in data:
        abort(400, description='Missing workflow_name')
    
    workflow_name = data['workflow_name']
    if workflow_name not in config['workflows']:
        abort(404, description=f'Workflow {workflow_name} not found')
    
    workflow_config = config['workflows'][workflow_name]
    # Permission check: user must have permission for this workflow
    if request.user not in workflow_config.get('allowed_users', []):
        log_audit('TRIGGER', 'DENIED', f'User {request.user} not allowed for workflow {workflow_name}')
        abort(403, description='User not allowed to trigger this workflow')
    
    # Human-in-the-loop: require approval if configured
    if workflow_config.get('require_approval', False):
        approval_id = request_approval(workflow_name, request.user, data.get('params', {}))
        if not approval_id:
            log_audit('TRIGGER', 'FAILED', f'Approval request failed for workflow {workflow_name}')
            abort(500, description='Failed to initiate approval')
        # In production, we would wait asynchronously. Here we simulate approval.
        log_audit('TRIGGER', 'APPROVED', f'Approval granted for workflow {workflow_name}')
    
    # Schedule RPA robot execution
    try:
        result = schedule_rpa(workflow_name, data.get('params', {}), request.user)
        log_audit('EXECUTE', 'SUCCESS', f'Workflow {workflow_name} triggered by {request.user}, result: {result}')
        return jsonify({'status': 'success', 'message': f'Workflow {workflow_name} started', 'result': result}), 200
    except Exception as e:
        log_audit('EXECUTE', 'ERROR', f'Workflow {workflow_name} failed: {str(e)}')
        abort(500, description=f'Internal error: {str(e)}')

def request_approval(workflow_name, user, params):
    # Placeholder: In production, integrate with approval system (e.g., email, message queue)
    logger.info(f'Approval requested for workflow {workflow_name} by {user}')
    return 'approval_id_12345'

def schedule_rpa(workflow_name, params, user):
    # Placeholder: In production, call RPA orchestration API (e.g., UiPath, Automation Anywhere)
    # Here we just log and return success.
    logger.info(f'RPA scheduled: workflow={workflow_name}, params={params}, user={user}')
    return {'execution_id': 'exec_001', 'status': 'submitted'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, ssl_context='adhoc')  # Use proper cert in production