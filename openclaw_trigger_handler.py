from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from security import validate_token
from rpa_orchestrator import dispatch_rpa_workflow
import logging

app = FastAPI()

class TriggerRequest(BaseModel):
    workflow_id: str
    parameters: dict
    callback_url: str = None

@app.post("/v1/trigger")
async def handle_trigger(request: Request, payload: TriggerRequest, auth: dict = Depends(validate_token)):
    """
    OpenClaw triggers Astron Agent via this endpoint.
    Validates authentication and dispatches the specified RPA workflow.
    """
    try:
        logging.info(f"Received trigger for workflow {payload.workflow_id} from {auth.get('client_id')}")
        result = await dispatch_rpa_workflow(payload.workflow_id, payload.parameters, payload.callback_url)
        return {"status": "accepted", "execution_id": result.execution_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Trigger handling failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health():
    return {"status": "ok"}
