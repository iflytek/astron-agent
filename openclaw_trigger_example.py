import requests
import jwt
import json

# Configuration
OPENCLAW_ENDPOINT = 'https://astron-agent.example.com/api/v1/trigger'  # Replace with actual URL
API_SECRET = 'your-secret-key'  # This should be securely stored
USER = 'openclaw_service'  # System user for OpenClaw

def generate_token(user):
    payload = {
        'user': user,
        'exp': 3600  # 1 hour expiration
    }
    token = jwt.encode(payload, API_SECRET, algorithm='HS256')
    return token

def trigger_high_risk_workflow(workflow_name, params=None):
    token = generate_token(USER)
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    data = {
        'workflow_name': workflow_name,
        'params': params or {}
    }
    try:
        response = requests.post(OPENCLAW_ENDPOINT, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        print(f'Trigger successful: {json.dumps(result)}')
        return result
    except requests.exceptions.RequestException as e:
        print(f'Trigger failed: {e}')
        if e.response is not None:
            print(f'Status: {e.response.status_code}, Body: {e.response.text}')
        return None

if __name__ == '__main__':
    # Example: Trigger financial reimbursement workflow
    workflow = 'financial_reimbursement'
    params = {
        'employee_id': 'EMP123',
        'amount': 5000.00,
        'attachment_url': 'https://storage.example.com/receipt.pdf'
    }
    trigger_high_risk_workflow(workflow, params)