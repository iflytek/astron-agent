"""A2A discovery adapter for the core agent service."""

import os

from fastapi import APIRouter

from agent.api.schemas.a2a import (
    A2AAgentCapabilities,
    A2AAgentCard,
    A2AAgentInterface,
    A2AAgentProvider,
    A2AAgentSkill,
    A2AAPIKeySecurityScheme,
    A2AAuthentication,
    A2ASecurityRequirement,
    A2ASecurityScheme,
    A2AStringList,
)

A2A_PROTOCOL_VERSION = "0.3.0"
ASTRON_AGENT_VERSION = "1.0.9"

a2a_discovery_router = APIRouter()
a2a_router = APIRouter(prefix="/a2a")


def _public_base_url() -> str:
    configured_url = (
        os.getenv("A2A_PUBLIC_BASE_URL")
        or os.getenv("AGENT_BASE_URL")
        or f"http://localhost:{os.getenv('SERVICE_PORT', '8700')}"
    )
    return configured_url.rstrip("/")


def _agent_version() -> str:
    return os.getenv("ASTRON_AGENT_VERSION", ASTRON_AGENT_VERSION).removeprefix("v")


def build_agent_card() -> A2AAgentCard:
    """Build public A2A discovery metadata for the core agent service."""

    interface_url = f"{_public_base_url()}/agent/v1/a2a"
    return A2AAgentCard(
        protocolVersion=A2A_PROTOCOL_VERSION,
        name="Astron Agent",
        description="Astron Agent core runtime exposed through an A2A text adapter.",
        url=interface_url,
        preferredTransport="HTTP+JSON",
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
        version=_agent_version(),
        capabilities=A2AAgentCapabilities(
            streaming=False,
            pushNotifications=False,
            extendedAgentCard=False,
        ),
        authentication=A2AAuthentication(
            schemes=["ApiKey"],
            credentials="x-consumer-username header",
        ),
        securitySchemes={
            "astronConsumer": A2ASecurityScheme(
                apiKeySecurityScheme=A2AAPIKeySecurityScheme(
                    description="Astron gateway consumer header.",
                    in_="header",
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
