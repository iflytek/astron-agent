"""
Minimal Agent2Agent endpoints for published workflows.

The adapter exposes public discovery metadata and reuses the authenticated
workflow chat endpoint for synchronous text messages.
"""

import os
from typing import Annotated, Union

from fastapi import APIRouter, Header, HTTPException
from starlette.responses import JSONResponse, StreamingResponse

from workflow.api.v1.chat.open import chat_open
from workflow.domain.entities.a2a import (
    A2AAgentCard,
    A2ACapability,
    A2ASendMessageRequest,
)
from workflow.domain.entities.chat import ChatVo

discovery_router = APIRouter(tags=["A2A"])
router = APIRouter(prefix="/a2a", tags=["A2A"])


def build_agent_card() -> A2AAgentCard:
    """Build public A2A discovery metadata for Astron Agent workflows."""
    base_url = os.getenv("A2A_PUBLIC_BASE_URL", "").rstrip("/")
    return A2AAgentCard(
        name=os.getenv("A2A_AGENT_NAME", "Astron Agent"),
        description=(
            "Astron Agent workflow runtime with A2A discovery and text message "
            "forwarding to published workflows."
        ),
        version=os.getenv("A2A_AGENT_VERSION", "0.1.0"),
        url=f"{base_url}/workflow/v1/a2a/message:send" if base_url else "",
        capabilities=[
            A2ACapability(
                name="text-message",
                description="Send a text message to a published workflow.",
            )
        ],
    )


@discovery_router.get("/.well-known/agent-card.json", response_model=A2AAgentCard)
async def root_agent_card() -> A2AAgentCard:
    """
    Return public A2A discovery metadata at the root well-known path.
    """
    return build_agent_card()


@router.get("/agent-card.json", response_model=A2AAgentCard)
async def versioned_agent_card() -> A2AAgentCard:
    """
    Return public A2A discovery metadata for Astron Agent workflows.
    """
    return build_agent_card()


@router.get("/.well-known/agent-card.json", response_model=A2AAgentCard)
async def versioned_well_known_agent_card() -> A2AAgentCard:
    """
    Return public A2A discovery metadata under the workflow API prefix.
    """
    return build_agent_card()


@router.post("/message:send", response_model=None)
async def send_message(
    x_consumer_username: Annotated[str, Header()],
    request: A2ASendMessageRequest,
) -> Union[StreamingResponse, JSONResponse]:
    """
    Map an A2A text message to the existing workflow chat completion API.
    """
    message_text = request.text().strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    parameters = dict(request.parameters)
    parameters["input"] = message_text

    chat_vo = ChatVo(
        flow_id=request.flow_id,
        uid=request.uid,
        stream=request.stream,
        ext=request.ext,
        parameters=parameters,
        chat_id=request.chat_id or request.message.message_id or "",
        history=[],
        version=request.version,
    )
    return await chat_open(x_consumer_username=x_consumer_username, chat_vo=chat_vo)
