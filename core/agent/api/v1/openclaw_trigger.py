"""OpenClaw controlled trigger API."""

import json
from typing import Annotated

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from agent.api.schemas.openclaw_trigger import OpenClawTriggerInputs
from agent.service.openclaw_trigger import (
    OpenClawSignatureError,
    create_openclaw_trigger_response,
    verify_openclaw_signature,
)

openclaw_trigger_router = APIRouter(prefix="/openclaw", tags=["openclaw"])


@openclaw_trigger_router.post(  # type: ignore[misc]
    "/triggers/workflows",
    description="Accept a controlled OpenClaw trigger for an Astron workflow.",
)
async def trigger_workflow_from_openclaw(
    request: Request,
    x_openclaw_signature: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    """Validate, audit, and stage an OpenClaw-triggered Astron workflow."""

    raw_body = await request.body()
    try:
        auth_mode = verify_openclaw_signature(raw_body, x_openclaw_signature)
        inputs = OpenClawTriggerInputs.model_validate(json.loads(raw_body or b"{}"))
    except OpenClawSignatureError as exc:
        return JSONResponse(status_code=401, content={"code": 401, "message": str(exc)})
    except (json.JSONDecodeError, UnicodeDecodeError, ValidationError) as exc:
        return JSONResponse(status_code=422, content={"code": 422, "message": str(exc)})

    response = create_openclaw_trigger_response(inputs, auth_mode)
    return JSONResponse(content=response.model_dump())
