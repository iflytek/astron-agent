"""A2A protocol adapter for the core agent service."""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from common.otlp.trace.span import Span
from fastapi import APIRouter, Header, HTTPException

from agent.api.schemas.a2a import (
    A2AAgentCapabilities,
    A2AAgentCard,
    A2AAgentInterface,
    A2AAgentProvider,
    A2AAgentSkill,
    A2AAPIKeySecurityScheme,
    A2AArtifact,
    A2AMessage,
    A2APart,
    A2ASecurityRequirement,
    A2ASecurityScheme,
    A2ASendMessageRequest,
    A2ASendMessageResponse,
    A2AStringList,
    A2ATask,
    A2ATaskStatus,
)
from agent.api.schemas.llm_message import LLMMessage
from agent.api.schemas.workflow_agent_inputs import CustomCompletionInputs
from agent.api.v1.workflow_agent import CustomChatCompletion

A2A_PROTOCOL_VERSION = "0.3"

a2a_discovery_router = APIRouter()
a2a_router = APIRouter(prefix="/a2a")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _public_base_url() -> str:
    configured_url = (
        os.getenv("A2A_PUBLIC_BASE_URL")
        or os.getenv("AGENT_BASE_URL")
        or f"http://localhost:{os.getenv('SERVICE_PORT', '8700')}"
    )
    return configured_url.rstrip("/")


def build_agent_card() -> A2AAgentCard:
    """Build public A2A discovery metadata for the core agent service."""

    interface_url = f"{_public_base_url()}/agent/v1/a2a"
    return A2AAgentCard(
        name="Astron Agent",
        description="Astron Agent core runtime exposed through an A2A text adapter.",
        supportedInterfaces=[
            A2AAgentInterface(
                url=interface_url,
                protocolBinding="HTTP+JSON",
                protocolVersion=A2A_PROTOCOL_VERSION,
            )
        ],
        provider=A2AAgentProvider(
            organization="iFLYTEK",
            url="https://github.com/iflytek/astron-agent",
        ),
        version="0.1.0",
        capabilities=A2AAgentCapabilities(
            streaming=False,
            pushNotifications=False,
            extendedAgentCard=False,
        ),
        securitySchemes={
            "astronConsumer": A2ASecurityScheme(
                apiKeySecurityScheme=A2AAPIKeySecurityScheme(
                    description="Astron gateway consumer header.",
                    location="header",
                    name="x-consumer-username",
                )
            )
        },
        securityRequirements=[
            A2ASecurityRequirement(schemes={"astronConsumer": A2AStringList(list=[])})
        ],
        defaultInputModes=["text/plain"],
        defaultOutputModes=["text/plain"],
        skills=[
            A2AAgentSkill(
                id="astron-agent-chat",
                name="Astron Agent Chat",
                description="Send text to the configured Astron Agent runtime.",
                tags=["agent", "chat", "astron"],
                examples=["Summarize this workflow result."],
                inputModes=["text/plain"],
                outputModes=["text/plain"],
            )
        ],
    )


@a2a_discovery_router.get(  # type: ignore[misc]
    "/.well-known/agent-card.json",
    response_model=A2AAgentCard,
)
async def get_well_known_agent_card() -> A2AAgentCard:
    """Return the public A2A discovery card."""

    return build_agent_card()


@a2a_router.get(  # type: ignore[misc]
    "/agent-card.json",
    response_model=A2AAgentCard,
)
async def get_agent_card() -> A2AAgentCard:
    """Return the public A2A discovery card from the versioned API path."""

    return build_agent_card()


def extract_message_text(message: A2AMessage) -> str:
    """Return the text content from a client A2A message."""

    if message.role not in {"ROLE_USER", "user"}:
        raise HTTPException(status_code=400, detail="A2A message role must be user")

    text_parts = [part.text.strip() for part in message.parts if part.text]
    text = "\n".join(part for part in text_parts if part)
    if not text:
        raise HTTPException(
            status_code=400,
            detail="A2A message must include at least one non-empty text part",
        )
    return text


def _metadata_string(metadata: dict[str, Any], key: str, default: str = "") -> str:
    value = metadata.get(key, default)
    return value if isinstance(value, str) else default


def _metadata_mapping(metadata: dict[str, Any], key: str) -> dict[str, Any]:
    value = metadata.get(key, {})
    return value if isinstance(value, dict) else {}


def _completion_inputs_from_a2a(
    request: A2ASendMessageRequest,
    text: str,
) -> CustomCompletionInputs:
    metadata = request.metadata
    model_config = {
        "domain": os.getenv("A2A_MODEL_DOMAIN", ""),
        "api": os.getenv("A2A_MODEL_API", ""),
        "provider": os.getenv("A2A_MODEL_PROVIDER", ""),
        "api_key": os.getenv("A2A_MODEL_API_KEY", ""),
    }
    model_config.update(_metadata_mapping(metadata, "model_config"))

    max_loop_count = metadata.get("max_loop_count", os.getenv("A2A_MAX_LOOP_COUNT", 5))

    return CustomCompletionInputs(
        uid=(
            _metadata_string(metadata, "uid")
            or _metadata_string(request.message.metadata, "uid")
            or request.message.context_id
            or request.message.message_id
        )[:64],
        messages=[LLMMessage(role="user", content=text)],
        stream=False,
        meta_data={
            "caller": "a2a_http_json",
            "caller_sid": request.message.message_id,
            "workflow_id": _metadata_string(metadata, "workflow_id"),
            "run_id": request.message.task_id,
            "node_id": _metadata_string(metadata, "node_id"),
        },
        model_config=model_config,
        instruction=_metadata_mapping(metadata, "instruction"),
        plugin=_metadata_mapping(metadata, "plugin"),
        max_loop_count=int(max_loop_count),
    )


def _history_message(
    request: A2ASendMessageRequest, task_id: str, context_id: str
) -> A2AMessage:
    return request.message.model_copy(
        update={
            "task_id": task_id,
            "context_id": context_id,
            "role": "ROLE_USER",
        }
    )


def _status_message(task_id: str, context_id: str, text: str) -> A2AMessage:
    return A2AMessage(
        messageId=str(uuid.uuid4()),
        contextId=context_id,
        taskId=task_id,
        role="ROLE_AGENT",
        parts=[A2APart(text=text, mediaType="text/plain")],
    )


def _task_response(
    request: A2ASendMessageRequest,
    state: str,
    output_text: str = "",
    error_text: str = "",
) -> A2ASendMessageResponse:
    task_id = request.message.task_id or str(uuid.uuid4())
    context_id = request.message.context_id or str(uuid.uuid4())
    history = [_history_message(request, task_id=task_id, context_id=context_id)]
    artifacts = []
    status_message = None

    if state == "TASK_STATE_COMPLETED":
        artifacts.append(
            A2AArtifact(
                artifactId=str(uuid.uuid4()),
                name="result",
                parts=[A2APart(text=output_text, mediaType="text/plain")],
            )
        )
    elif error_text:
        status_message = _status_message(task_id, context_id, error_text)

    return A2ASendMessageResponse(
        task=A2ATask(
            id=task_id,
            contextId=context_id,
            status=A2ATaskStatus(
                state=state, message=status_message, timestamp=_utc_now()
            ),
            artifacts=artifacts,
            history=history,
            metadata={"source": "astron-agent-core"},
        )
    )


def _parse_sse_payload(chunk: str) -> dict[str, Any] | None:
    for line in chunk.splitlines():
        if not line.startswith("data:"):
            continue
        payload = line.removeprefix("data:").strip()
        if not payload or payload == "[DONE]":
            return None
        return json.loads(payload)
    return None


async def _collect_completion_text(completion: CustomChatCompletion) -> tuple[str, str]:
    text_parts = []
    error_message = ""

    async for chunk in completion.do_complete():
        payload = _parse_sse_payload(chunk)
        if not payload:
            continue

        if payload.get("code", 0) != 0:
            error_message = str(payload.get("message") or "A2A agent execution failed")

        for choice in payload.get("choices", []):
            delta = choice.get("delta") or {}
            content = delta.get("content")
            if content:
                text_parts.append(str(content))

    return "".join(text_parts), error_message


@a2a_router.post(  # type: ignore[misc]
    "/message:send",
    response_model=A2ASendMessageResponse,
)
async def send_message(
    x_consumer_username: Annotated[str, Header()],
    request: A2ASendMessageRequest,
) -> A2ASendMessageResponse:
    """Map an A2A text message onto the existing core agent completion runner."""

    text = extract_message_text(request.message)
    if request.configuration.return_immediately:
        return _task_response(request, "TASK_STATE_SUBMITTED")

    completion_inputs = _completion_inputs_from_a2a(request, text)
    span = Span(app_id=x_consumer_username, uid=completion_inputs.uid)
    completion = CustomChatCompletion(
        app_id=x_consumer_username,
        inputs=completion_inputs,
        log_caller=completion_inputs.meta_data.caller,
        span=span,
        bot_id="",
        uid=completion_inputs.uid,
        question=text,
    )
    output_text, error_message = await _collect_completion_text(completion)

    if error_message:
        return _task_response(
            request,
            "TASK_STATE_FAILED",
            error_text=error_message,
        )

    return _task_response(request, "TASK_STATE_COMPLETED", output_text=output_text)
