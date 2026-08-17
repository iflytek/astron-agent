"""Workflow Agent API endpoints."""

import asyncio
import json
from contextlib import aclosing
from typing import Annotated, Any, AsyncGenerator, Dict, Optional, cast

from common.otlp.trace.langfuse import (
    AGENT_TRACE_AUDIENCE,
    LangfuseConfig,
    extract_trusted_langfuse_context,
    langfuse_observation_attributes,
    langfuse_trace_attributes,
    langfuse_trace_context,
)
from common.otlp.trace.span import Span
from common.otlp.trace.trace import Trace
from fastapi import APIRouter, Header
from opentelemetry.trace import Status, StatusCode
from pydantic import ConfigDict
from starlette.responses import StreamingResponse
from starlette.types import Receive, Scope, Send

from agent.api.schemas.workflow_agent_inputs import CustomCompletionInputs
from agent.api.v1.base_api import CompletionBase
from agent.service.builder.workflow_agent_builder import WorkflowAgentRunnerBuilder
from agent.service.runner.workflow_agent_runner import WorkflowAgentRunner

workflow_agent_router = APIRouter()

headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
_STREAM_END = object()


def _chunk_content(response: str) -> str:
    """Extract assistant text from an OpenAI-compatible SSE chunk."""
    if not response.startswith("data: ") or response.startswith("data: [DONE]"):
        return ""
    try:
        payload = json.loads(response.removeprefix("data: ").strip())
        choices = payload.get("choices") or []
        return str(choices[0].get("delta", {}).get("content") or "") if choices else ""
    except (TypeError, ValueError, AttributeError):
        return ""


def _chunk_error_code(response: str) -> int:
    """Extract a non-zero application error code from an SSE frame."""
    if not response.startswith("data: ") or response.startswith("data: [DONE]"):
        return 0
    try:
        payload = json.loads(response.removeprefix("data: ").strip())
        value = payload.get("code", 0)
        return value if isinstance(value, int) and not isinstance(value, bool) else 0
    except (TypeError, ValueError, AttributeError):
        return 0


class ClosingStreamingResponse(StreamingResponse):
    """Close the traced body iterator when any ASGI disconnect path exits."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        try:
            await super().__call__(scope, receive, send)
        finally:
            close = getattr(self.body_iterator, "aclose", None)
            if callable(close):
                await cast(Any, close)()


class CustomChatCompletion(CompletionBase):
    """Custom chat completion for workflow agents."""

    bot_id: str
    uid: str
    question: str
    model_config = ConfigDict(arbitrary_types_allowed=True)
    span: Span

    def __init__(self, inputs: CustomCompletionInputs, **data: Any) -> None:
        super().__init__(inputs=inputs, **data)

    async def build_runner(self, span: Span) -> WorkflowAgentRunner:
        """Build WorkflowAgentRunner"""
        builder = WorkflowAgentRunnerBuilder(
            app_id=self.app_id,
            uid=self.uid,
            span=span,
            inputs=cast(CustomCompletionInputs, self.inputs),
        )
        return await builder.build()

    async def _produce_complete(
        self,
        queue: "asyncio.Queue[object]",
        trace_context: Optional[Dict[str, str]],
    ) -> None:
        """Consume the full traced run in one task and forward SSE frames."""
        parent_context = Trace.extract_context(trace_context) if trace_context else None
        config = LangfuseConfig.from_env()
        workflow_id = self.inputs.meta_data.workflow_id
        is_workflow_child = bool(
            trace_context
            and workflow_id
            and self.inputs.meta_data.caller == "workflow-agent-node"
        )
        trace_attributes = (
            {}
            if is_workflow_child
            else langfuse_trace_attributes(
                f"agent:{self.app_id}",
                user_id=self.uid,
                session_id=self.span.sid,
                tags=["astron-agent", "agent", "agent-root"],
                metadata={
                    "app_id": self.app_id,
                    "bot_id": self.bot_id,
                    "workflow_id": workflow_id,
                },
            )
        )
        root_attributes = langfuse_observation_attributes(
            "agent",
            input_value=self.question,
            metadata={"app_id": self.app_id, "bot_id": self.bot_id},
        )
        root_attributes.update(trace_attributes)
        output_parts: list[str] = []
        captured_length = 0
        error_code = 0

        with langfuse_trace_context(
            trace_attributes,
            parent_context=parent_context,
            trust_parent=is_workflow_child,
        ), self.span.start(
            "agent.run" if config.is_effectively_enabled else "WorkflowAgentNode",
            attributes=root_attributes,
        ) as sp:
            root_span = sp.get_otlp_span()
            sp.set_attributes(
                attributes={
                    "app_id": self.app_id,
                    "bot_id": self.bot_id,
                    "uid": self.uid,
                }
            )
            sp.add_info_events(
                {"workflow-agent-inputs": self.inputs.model_dump_json(by_alias=True)}
            )
            node_trace = await self.build_node_trace(bot_id=self.bot_id, span=sp)
            meter = await self.build_meter(sp)

            # Use parent class run_runner method which includes _finalize_run logic
            response_stream = self.run_runner(node_trace, meter, span=sp)
            try:
                async with aclosing(response_stream):
                    async for response in response_stream:
                        error_code = _chunk_error_code(response) or error_code
                        if (
                            config.is_effectively_enabled
                            and config.capture_input_output
                        ):
                            content = _chunk_content(response)
                            remaining = config.max_attribute_length - captured_length
                            if content and remaining > 0:
                                captured = content[:remaining]
                                output_parts.append(captured)
                                captured_length += len(captured)
                        await queue.put(response)
            finally:
                # Keep a direct SDK span handle: a nested generator may still
                # have another span current while cancellation unwinds.
                final_attributes = langfuse_observation_attributes(
                    "agent", output_value="".join(output_parts)
                )
                if error_code and config.is_effectively_enabled:
                    root_span.set_status(Status(StatusCode.ERROR))
                    final_attributes.update(
                        {
                            "astron.agent.error_code": error_code,
                            "langfuse.observation.level": "ERROR",
                            "langfuse.observation.status_message": (
                                "Agent execution failed"
                            ),
                        }
                    )
                root_span.set_attributes(final_attributes)

    async def do_complete(
        self, trace_context: Optional[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """Run agent without leaking an OTel Context across SSE yields."""
        queue: asyncio.Queue[object] = asyncio.Queue(maxsize=1)

        async def produce() -> None:
            try:
                await self._produce_complete(queue, trace_context)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # pylint: disable=broad-exception-caught
                await queue.put(exc)
            else:
                await queue.put(_STREAM_END)

        producer = asyncio.create_task(
            produce(), name=f"astron-agent-stream-{self.span.sid}"
        )
        try:
            while True:
                item = await queue.get()
                if item is _STREAM_END:
                    break
                if isinstance(item, Exception):
                    raise item
                yield cast(str, item)
        finally:
            if not producer.done():
                producer.cancel()
            try:
                await producer
            except asyncio.CancelledError:
                pass


@workflow_agent_router.post(  # type: ignore[misc]
    "/custom/chat/completions",
    description="Agent execution - user mode",
    response_model=None,
)
async def custom_chat_completions(
    x_consumer_username: Annotated[str, Header()],
    completion_inputs: CustomCompletionInputs,
    traceparent: Annotated[Optional[str], Header()] = None,
    tracestate: Annotated[Optional[str], Header()] = None,
    baggage: Annotated[Optional[str], Header()] = None,
    x_astron_langfuse_trace_timestamp: Annotated[Optional[str], Header()] = None,
    x_astron_langfuse_trace_signature: Annotated[Optional[str], Header()] = None,
) -> StreamingResponse:
    """Agent execution - user mode

    Args:
        completion_inputs: Request body
        app_id: Application ID
        bot_id: Bot ID
        uid: User ID
        span: Trace object

    Returns:
        Streaming response
    """

    span = Span(app_id=x_consumer_username, uid=completion_inputs.uid)
    completion = CustomChatCompletion(
        app_id=x_consumer_username,
        inputs=completion_inputs,
        log_caller=completion_inputs.meta_data.caller,
        span=span,
        bot_id="",
        uid=completion_inputs.uid,
        question=completion_inputs.get_last_message_content(),
    )

    async def generate() -> AsyncGenerator[str, None]:
        """Generator for streaming response."""
        inbound_headers = {
            key: value
            for key, value in {
                "traceparent": traceparent,
                "tracestate": tracestate,
                "baggage": baggage,
                "x-astron-langfuse-trace-timestamp": (
                    x_astron_langfuse_trace_timestamp
                ),
                "x-astron-langfuse-trace-signature": (
                    x_astron_langfuse_trace_signature
                ),
            }.items()
            if value
        }
        carrier = extract_trusted_langfuse_context(
            inbound_headers,
            method="POST",
            audience=AGENT_TRACE_AUDIENCE,
            tenant_id=x_consumer_username,
        )
        response_stream = (
            completion.do_complete(trace_context=carrier)
            if carrier
            else completion.do_complete()
        )
        async with aclosing(response_stream):
            async for response in response_stream:
                # Convert chunk to JSON string for streaming response
                yield response

    return ClosingStreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers=headers,
    )
