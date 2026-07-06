import httpx
import json
from config import ASTRON_AGENT_HOST, ASTRON_AGENT_PORT, ASTRON_AGENT_API_KEY

def trigger_astron_agent(flow_name: str, parameters: dict = None):
    url = f'http://{ASTRON_AGENT_HOST}:{ASTRON_AGENT_PORT}/trigger'
    headers = {
        'Authorization': f'Bearer {ASTRON_AGENT_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'flow_name': flow_name,
        'parameters': parameters or {},
        'trigger_source': 'openclaw'
    }
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        print(f'Trigger failed: {e.response.status_code} - {e.response.text}')
        return None
    except Exception as e:
        print(f'Trigger error: {str(e)}')
        return None

if __name__ == '__main__':
    # 示例：触发财务报销流程
    result = trigger_astron_agent('finance_reimbursement', {'amount': 1500, 'employee': 'Alice'})
    print(result)
