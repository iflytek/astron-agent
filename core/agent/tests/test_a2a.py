"""Tests for the A2A adapter surface."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from agent.api.v1 import a2a


def test_build_agent_card_uses_a2a_shapes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Agent card should expose spec-shaped capabilities and skills."""
    monkeypatch.setenv("A2A_PUBLIC_BASE_URL", "https://agent.example.com/")

    card = a2a.build_agent_card()
    dumped = card.model_dump(by_alias=True)

    assert dumped["supportedInterfaces"][0]["url"] == (
        "https://agent.example.com/agent/v1/a2a"
    )
    assert dumped["supportedInterfaces"][0]["protocolBinding"] == "HTTP+JSON"
    assert dumped["protocolVersion"] == "0.3.0"
    assert dumped["version"] == "1.0.9"
    assert dumped["authentication"] == {
        "schemes": ["ApiKey"],
        "credentials": "x-consumer-username header",
    }
    assert dumped["capabilities"] == {
        "streaming": False,
        "pushNotifications": False,
        "extendedAgentCard": False,
    }
    assert dumped["securitySchemes"]["astronConsumer"]["apiKeySecurityScheme"] == {
        "description": "Astron gateway consumer header.",
        "type": "apiKey",
        "in": "header",
        "name": "x-consumer-username",
    }
    assert dumped["securityRequirements"][0]["schemes"] == {
        "astronConsumer": {"list": []}
    }
    assert dumped["skills"][0]["id"] == "astron-agent-chat"
    assert dumped["skills"][0]["inputModes"] == ["text/plain"]


def test_agent_card_routes_expose_discovery_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Both well-known and versioned routes should return the same agent card."""
    monkeypatch.setenv("A2A_PUBLIC_BASE_URL", "https://agent.example.com")

    app = FastAPI()
    app.include_router(a2a.a2a_discovery_router)
    app.include_router(a2a.a2a_router, prefix="/agent/v1")
    client = TestClient(app)

    well_known = client.get("/.well-known/agent-card.json")
    versioned = client.get("/agent/v1/a2a/agent-card.json")

    assert well_known.status_code == 200
    assert versioned.status_code == 200
    assert well_known.json() == versioned.json()
