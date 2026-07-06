import requests
import json
import hmac
import hashlib
import time

class OpenClawTrigger:
    def __init__(self, astron_agent_url, api_key, secret):
        self.astron_agent_url = astron_agent_url
        self.api_key = api_key
        self.secret = secret

    def _generate_signature(self, payload, timestamp):
        message = f"{timestamp}:{json.dumps(payload, sort_keys=True)}"
        return hmac.new(self.secret.encode(), message.encode(), hashlib.sha256).hexdigest()

    def trigger_high_risk_workflow(self, workflow_id, context):
        timestamp = str(int(time.time()))
        payload = {
            "workflow_id": workflow_id,
            "context": context,
            "api_key": self.api_key
        }
        signature = self._generate_signature(payload, timestamp)
        headers = {
            "Content-Type": "application/json",
            "X-Timestamp": timestamp,
            "X-Signature": signature
        }
        try:
            response = requests.post(
                f"{self.astron_agent_url}/api/v1/trigger",
                data=json.dumps(payload),
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Trigger failed: {e}")
            return None

# Example usage
if __name__ == "__main__":
    trigger = OpenClawTrigger(
        astron_agent_url="https://astron-agent.internal.company.com",
        api_key="your_api_key",
        secret="your_hmac_secret"
    )
    result = trigger.trigger_high_risk_workflow(
        workflow_id="finance_reimbursement",
        context={"employee_id": "E12345", "amount": 1500.00}
    )
    print(result)