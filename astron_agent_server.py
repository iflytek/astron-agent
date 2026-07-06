from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import uvicorn
from config import ASTRON_AGENT_HOST, ASTRON_AGENT_PORT, ASTRON_AGENT_API_KEY
from audit_logger import audit_logger
from approval_manager import approval_manager
from rpa_executor import rpa_executor

app = FastAPI(title='Astron Agent API')
security = HTTPBearer()

class TriggerRequest(BaseModel):
    flow_name: str
    parameters: Optional[dict] = {}
    trigger_source: Optional[str] = 'openclaw'

class ApprovalAction(BaseModel):
    approval_id: str
    action: str  # 'approve' or 'reject'

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != ASTRON_AGENT_API_KEY:
        raise HTTPException(status_code=401, detail='Invalid API Key')
    return credentials.credentials

@app.post('/trigger')
async def trigger_flow(request: TriggerRequest, api_key: str = Depends(verify_api_key)):
    audit_logger.log_event('TRIGGER_RECEIVED', request.dict())
    # 权限校验（示例：仅允许特定source）
    if request.trigger_source not in ['openclaw', 'internal']:
        raise HTTPException(status_code=403, detail='Invalid trigger source')
    # 申请人工审批
    approved = await approval_manager.request_approval(request.flow_name, request.dict())
    if not approved:
        audit_logger.log_event('FLOW_REJECTED', {'flow': request.flow_name})
        raise HTTPException(status_code=403, detail='Flow execution not approved')
    # 调度RPA执行
    success = await rpa_executor.execute_flow(request.flow_name, request.parameters)
    if success:
        return {'status': 'success', 'message': 'Flow executed successfully'}
    else:
        raise HTTPException(status_code=500, detail='RPA execution failed')

@app.post('/approval')
async def handle_approval(action: ApprovalAction, api_key: str = Depends(verify_api_key)):
    if action.action == 'approve':
        approval_manager.approve(action.approval_id)
    elif action.action == 'reject':
        approval_manager.reject(action.approval_id)
    else:
        raise HTTPException(status_code=400, detail='Invalid action')
    return {'status': 'ok'}

@app.get('/health')
async def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    uvicorn.run(app, host=ASTRON_AGENT_HOST, port=ASTRON_AGENT_PORT)
