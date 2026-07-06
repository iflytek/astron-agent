from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional
import os
import logging
from rpa_scheduler import schedule_rpa
from audit_logger import log_event

app = FastAPI()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
EXPECTED_API_KEY = os.getenv("ASTRON_API_KEY", "default-secret")

class TriggerPayload(BaseModel):
    workflow: str
    parameters: dict

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != EXPECTED_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

@app.post("/api/v1/trigger")
async def handle_trigger(payload: TriggerPayload, api_key: str = Depends(verify_api_key)):
    workflow = payload.workflow
    params = payload.parameters
    
    # Validate workflow exists
    allowed_workflows = ["high_risk_workflow", "financial_reimbursement"]
    if workflow not in allowed_workflows:
        raise HTTPException(status_code=400, detail="Unknown workflow")
    
    # Schedule RPA execution
    try:
        execution_id = await schedule_rpa(workflow, params)
    except Exception as e:
        log_event("trigger_failure", {"workflow": workflow, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to schedule RPA")
    
    log_event("trigger_success", {"workflow": workflow, "execution_id": execution_id})
    return {"status": "accepted", "execution_id": execution_id}
