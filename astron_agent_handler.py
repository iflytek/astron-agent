import os
import json
import logging
import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# RPA robot configuration
RPA_ROBOT_SCRIPT = "/opt/rpa/execute_workflow.py"  # Example RPA script

@app.route('/api/v1/trigger', methods=['POST'])
def handle_trigger():
    """
    Astron Agent endpoint called by OpenClaw trigger.
    Validates permissions, enforces human-in-the-loop, and dispatches RPA.
    """
    data = request.get_json()
    if not data or 'workflow_id' not in data:
        return jsonify({"error": "Missing workflow_id"}), 400

    workflow_id = data['workflow_id']
    parameters = data.get('parameters', {})

    # Permission check - only allow whitelisted workflows
    allowed_workflows = ["finance_reimbursement", "contract_entry", "core_data_update"]
    if workflow_id not in allowed_workflows:
        logger.warning(f"Unauthorized workflow attempt: {workflow_id}")
        return jsonify({"error": "Workflow not allowed"}), 403

    # Human-in-the-loop: require approval (simulated)
    if not get_approval(workflow_id, parameters):
        return jsonify({"error": "Approval denied"}), 403

    # Dispatch RPA robot
    try:
        result = dispatch_rpa(workflow_id, parameters)
        return jsonify({"status": "success", "execution_id": result}), 200
    except Exception as e:
        logger.error(f"RPA execution failed: {e}")
        return jsonify({"error": str(e)}), 500

def get_approval(workflow_id, parameters):
    """
    Simulate human approval. In production, integrate with actual approval system.
    """
    # For demonstration, we approve automatically
    return True

def dispatch_rpa(workflow_id, parameters):
    """
    Execute RPA robot via subprocess (or API call).
    """
    env = os.environ.copy()
    env['WORKFLOW_ID'] = workflow_id
    env['PARAMETERS'] = json.dumps(parameters)
    # Placeholder: actual RPA execution command
    cmd = ["python3", RPA_ROBOT_SCRIPT, "--workflow", workflow_id]
    process = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=300)
    if process.returncode != 0:
        raise Exception(f"RPA failed: {process.stderr}")
    # Return execution ID from RPA output
    return process.stdout.strip()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, ssl_context='adhoc')
