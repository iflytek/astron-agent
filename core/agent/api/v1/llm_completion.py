"""Authenticated streaming endpoint for a direct model completion."""

from typing import Annotated

from common.otlp.trace.langfuse import (
    AGENT_TRACE_AUDIENCE,
    extract_trusted_langfuse_context,
)
from fastapi import APIRouter, Depends, Header, Request
from starlette.responses import StreamingResponse

from agent.api.schemas.llm_completion_inputs import LLMCompletionInputs
from agent.api.v1.workflow_agent import ClosingStreamingResponse
from agent.infra.workflow_internal_auth import require_workflow_internal_api_key
from agent.service.llm_completion import LLMCompletion

llm_completion_router = APIRouter(
    dependencies=[Depends(require_workflow_internal_api_key)]
)


@llm_completion_router.post("/llm/chat/completions", response_model=None)  # type: ignore[misc]
async def llm_chat_completions(
    request: Request,
    inputs: LLMCompletionInputs,
    x_consumer_username: Annotated[str, Header(min_length=1)],
) -> StreamingResponse:
    carrier = extract_trusted_langfuse_context(
        dict(request.headers),
        method="POST",
        audience=AGENT_TRACE_AUDIENCE,
        tenant_id=x_consumer_username,
    )
    completion = LLMCompletion(inputs, x_consumer_username, carrier or None)
    return ClosingStreamingResponse(
        completion.stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
