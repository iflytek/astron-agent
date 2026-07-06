import httpx
import json
from config import RPA_ROBOT_ENDPOINT, RPA_ROBOT_API_KEY
from audit_logger import audit_logger

class RPAExecutor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def execute_flow(self, flow_name: str, parameters: dict) -> bool:
        audit_logger.log_event('RPA_EXECUTION_START', {'flow': flow_name, 'params': parameters})
        headers = {
            'Authorization': f'Bearer {RPA_ROBOT_API_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'flow_name': flow_name,
            'parameters': parameters
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(RPA_ROBOT_ENDPOINT, json=payload, headers=headers, timeout=300)
                response.raise_for_status()
                result = response.json()
                success = result.get('success', False)
                if success:
                    audit_logger.log_event('RPA_EXECUTION_SUCCESS', {'flow': flow_name, 'result': result})
                else:
                    audit_logger.log_error('RPA_EXECUTION_FAILED', {'flow': flow_name, 'result': result})
                return success
        except Exception as e:
            audit_logger.log_error('RPA_EXECUTION_ERROR', {'flow': flow_name, 'error': str(e)})
            return False

rpa_executor = RPAExecutor()
