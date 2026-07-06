import requests
import json
import os

# Configuration
WEBHOOK_URL = os.getenv('ASTRON_WEBHOOK_URL', 'http://localhost:5000/trigger')
API_KEY = os.getenv('ASTRON_API_KEY', 'your-api-key-here')
WORKFLOW_ID = 'financial_reimbursement'

def send_trigger(workflow_id: str, payload: dict = None):
    """Send trigger to Astron Agent via secure webhook."""
    if payload is None:
        payload = {}
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    }
    data = {
        'workflow_id': workflow_id,
        'payload': payload
    }
    try:
        response = requests.post(WEBHOOK_URL, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        print(f"Trigger sent successfully. Response: {response.json()}")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Failed to send trigger: {e}")
        return None

if __name__ == '__main__':
    # Example: trigger financial reimbursement workflow
    sample_payload = {
        'amount': 1500.00,
        'department': 'Engineering',
        'employee_id': 'E12345'
    }
    send_trigger(WORKFLOW_ID, sample_payload)
