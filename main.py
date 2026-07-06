import logging
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional
from config import Settings, get_settings
from rpa_executor import dispatch_rpa_task

app = FastAPI(title="Astron Agent OpenClaw Trigger")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TriggerRequest(BaseModel):
    workflow_id: str = Field(..., description="Identifier of the fixed workflow to execute")
    trigger_source: str = "openclaw"
    correlation_id: Optional[str] = None
    payload: Optional[dict] = {}

class TriggerResponse(BaseModel):
    status: str
    execution_id: str
    message: str

@app.post("/v1/trigger", response_model=TriggerResponse)
async def handle_trigger(request: TriggerRequest, settings: Settings = Depends(get_settings)):
    # Validate authentication (e.g., API key in header)
    # For production, implement proper auth (JWT, OAuth2, etc.)
    # Here we assume a shared secret in header 'X-API-Key'
    # (Not shown for simplicity, but should be added)

    logger.info(f"Received trigger event: workflow_id={request.workflow_id}, correlation_id={request.correlation_id}")

    # Validate workflow_id against allowed workflows
    if request.workflow_id not in settings.allowed_workflows:
        logger.error(f"Unauthorized workflow_id: {request.workflow_id}")
        raise HTTPException(status_code=403, detail="Workflow not authorized")

    # Generate unique execution ID
    execution_id = str(uuid.uuid4())

    # Log the trigger for audit trail
    audit_log = {
        "timestamp": datetime.utcnow().isoformat(),
        "execution_id": execution_id,
        "workflow_id": request.workflow_id,
        "trigger_source": request.trigger_source,
        "correlation_id": request.correlation_id,
        "payload": request.payload
    }
    # Persist audit log (e.g., to database or file)
    # For now, just log
    logger.info(f"Audit log: {audit_log}")

    # Dispatch RPA task asynchronously
    # In production, use background tasks or message queue
    try:
        # This is a synchronous call; consider using background tasks for real async
        result = dispatch_rpa_task(execution_id, request.workflow_id, request.payload, settings)
        logger.info(f"RPA task dispatched: {result}")
    except Exception as e:
        logger.error(f"Failed to dispatch RPA task: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal dispatch error")

    return TriggerResponse(
        status="accepted",
        execution_id=execution_id,
        message="Trigger accepted, RPA task dispatched."
    )

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
