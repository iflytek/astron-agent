"""Execute Console-owned immutable run graphs with the existing DAG engine."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, ValidationError
from starlette.responses import JSONResponse, Response

from workflow.cache.event_registry import Event, EventRegistry
from workflow.consts.app_audit import AppAuditPolicy
from workflow.domain.entities.chat import ChatVo
from workflow.domain.entities.response import Resp, Streaming
from workflow.engine.dsl_engine import WorkflowEngineFactory
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.exception.e import CustomException
from workflow.extensions.fastapi.middleware.auth import (
    require_workflow_internal_api_key,
)
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.console_runtime import control, validate_context
from workflow.service import chat_service

router = APIRouter(
    prefix="/console", dependencies=[Depends(require_workflow_internal_api_key)]
)


class ConsoleRun(BaseModel):
    protocol: dict
    chat: ChatVo


class ConsoleCancel(BaseModel):
    run_id: str = Field(min_length=1)
    root_id: str = Field(min_length=1)


@router.post("/run")
async def run(
    request: ConsoleRun, x_consumer_username: Annotated[str, Header()]
) -> Response:
    context = validate_context(request.chat.ext.get("console_context"))
    await control(context)
    # Use the durable run ID as event ID, enabling stop before the first SSE frame.
    event = Event(
        event_id=context["run_id"],
        app_id=x_consumer_username,
        uid=request.chat.uid,
        flow_id=request.chat.flow_id,
        chat_id=request.chat.chat_id,
        console_run_id=context["run_id"],
        console_root_id=context["root_id"],
        timeout=1800,
    )
    EventRegistry.init_event(event)
    span = Span(
        app_id=x_consumer_username, uid=request.chat.uid, chat_id=request.chat.chat_id
    )
    stream = await chat_service.event_stream(
        x_consumer_username,
        event.event_id,
        request.protocol,
        datetime.now(timezone.utc),
        request.chat,
        False,
        AppAuditPolicy.DEFAULT,
        span,
        model_flow_id=request.chat.flow_id,
    )
    return await Streaming.send(stream)


@router.post("/events/{event_id}/cancel")
async def cancel(event_id: str, request: ConsoleCancel) -> JSONResponse:
    event = EventRegistry.get_event(event_id)
    if (
        event.console_run_id != request.run_id
        or event.console_root_id != request.root_id
    ):
        raise HTTPException(status_code=403, detail="Execution context mismatch")
    EventRegistry.request_cancel(event_id)
    return Resp.success({"cancelled": True})


class ConsoleProtocol(BaseModel):
    protocol: dict


@router.post("/validate")
async def validate(request: ConsoleProtocol) -> JSONResponse:
    try:
        dsl = WorkflowDSL.model_validate(request.protocol.get("data", {}))
        WorkflowEngineFactory.create_engine(dsl, Span())
    except (ValidationError, CustomException, KeyError, ValueError):
        # Validation detail may contain persisted configuration; do not echo the graph.
        return Resp.error(400, "Invalid workflow protocol", data={"valid": False})
    return Resp.success({"valid": True})


@router.post("/node/{node_id}")
async def node(
    node_id: str, request: ConsoleRun, x_consumer_username: Annotated[str, Header()]
) -> JSONResponse:
    from copy import deepcopy

    from workflow.service import flow_service

    context = validate_context(request.chat.ext.get("console_context"))
    await control(context)
    selected = next(
        (
            deepcopy(item)
            for item in request.protocol.get("data", {}).get("nodes", [])
            if item.get("id") == node_id
        ),
        None,
    )
    if selected is None:
        return Resp.error(404, "Node not found")
    for item in selected.get("data", {}).get("inputs", []):
        if item.get("name") in request.chat.parameters:
            item["schema"]["value"] = {
                "type": "literal",
                "content": request.chat.parameters[item["name"]],
            }
    span = Span(
        app_id=x_consumer_username, uid=request.chat.uid, chat_id=request.chat.chat_id
    )
    try:
        result = await flow_service.node_debug(
            WorkflowDSL.model_validate({"nodes": [selected], "edges": []}),
            request.chat.flow_id,
            request.chat.uid,
            span,
            console_context=context,
        )
    except CustomException as exc:
        return Resp.error(exc.code, exc.message)
    return Resp.success(result.model_dump())
