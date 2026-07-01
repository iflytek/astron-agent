"""Tests for the A2A adapter surface."""

from dataclasses import dataclass
from typing import AsyncIterator
from unittest.mock import MagicMock, patch

import pytest
from common.otlp import sid as sid_module
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from agent.api.schemas.a2a import A2ASendMessageRequest
from agent.api.v1 import a2a


@dataclass
class _DummySidGen:
    """Simple sid generator for tests that construct Span."""

    value: str = "test-sid"

    def gen(self) -> str:
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    """Ensure Span can be created in the isolated test environment."""
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


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
        "location": "header",
        "name": "x-consumer-username",
    }
    assert dumped["securityRequirements"][0]["schemes"] == {
        "astronConsumer": {"list": []}
    }
    assert dumped["skills"][0]["id"] == "astron-agent-chat"
    assert dumped["skills"][0]["inputModes"] == ["text/plain"]


def test_extract_message_text_rejects_empty_text() -> None:
    """A2A send needs a non-empty text part for the current core-agent adapter."""
    request = A2ASendMessageRequest.model_validate(
        {
            "message": {
                "messageId": "msg-1",
                "role": "ROLE_USER",
                "parts": [{"text": "   "}],
            }
        }
    )

    with pytest.raises(HTTPException) as exc:
        a2a.extract_message_text(request.message)

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_send_message_maps_text_to_custom_completion() -> None:
    """message:send should route A2A text into the existing completion runner."""
    request = A2ASendMessageRequest.model_validate(
        {
            "message": {
                "messageId": "msg-1",
                "role": "ROLE_USER",
                "parts": [{"text": "Say hello."}],
            },
            "metadata": {
                "uid": "user-1",
                "model_config": {
                    "domain": "model",
                    "api": "https://llm.example.com",
                    "provider": "openai",
                    "api_key": "test-key",
                },
                "max_loop_count": 3,
            },
        }
    )

    mock_completion = MagicMock()

    async def fake_complete() -> AsyncIterator[str]:
        yield (
            'data: {"choices":[{"delta":{"content":"Hello"}}],'
            '"code":0,"message":"success","object":"chat.completion.chunk"}\n\n'
        )
        yield (
            'data: {"choices":[{"delta":{"content":"!"}}],'
            '"code":0,"message":"success","object":"chat.completion.chunk"}\n\n'
        )
        yield "data: [DONE]\n\n"

    mock_completion.do_complete = fake_complete

    with patch("agent.api.v1.a2a.CustomChatCompletion", return_value=mock_completion):
        response = await a2a.send_message(
            x_consumer_username="tenant-1",
            request=request,
        )

    assert response.task is not None
    assert response.task.status.state == "TASK_STATE_COMPLETED"
    assert response.task.history[0].parts[0].text == "Say hello."
    assert response.task.artifacts[0].parts[0].text == "Hello!"


@pytest.mark.asyncio
async def test_collect_completion_text_ignores_malformed_sse_payload() -> None:
    """Malformed upstream SSE data should not fail the A2A request."""
    mock_completion = MagicMock()

    async def fake_complete() -> AsyncIterator[str]:
        yield "data: {not-json}\n\n"
        yield (
            'data: {"choices":[{"delta":{"content":"Recovered"}}],'
            '"code":0,"message":"success","object":"chat.completion.chunk"}\n\n'
        )

    mock_completion.do_complete = fake_complete

    text, error = await a2a._collect_completion_text(mock_completion)

    assert text == "Recovered"
    assert error == ""


def test_completion_inputs_uses_fallback_for_invalid_max_loop_count(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Invalid metadata/env loop counts should fall back instead of raising."""
    monkeypatch.setenv("A2A_MAX_LOOP_COUNT", "also-invalid")
    request = A2ASendMessageRequest.model_validate(
        {
            "message": {
                "messageId": "msg-1",
                "role": "ROLE_USER",
                "parts": [{"text": "Say hello."}],
            },
            "metadata": {"max_loop_count": "not-an-int"},
        }
    )

    inputs = a2a._completion_inputs_from_a2a(request, "Say hello.")

    assert inputs.max_loop_count == 5


def test_completion_inputs_generates_uid_when_request_ids_are_missing() -> None:
    """A2A inputs should still have a non-empty uid when IDs are blank."""
    request = A2ASendMessageRequest.model_validate(
        {
            "message": {
                "messageId": "",
                "role": "ROLE_USER",
                "parts": [{"text": "Say hello."}],
            }
        }
    )

    inputs = a2a._completion_inputs_from_a2a(request, "Say hello.")

    assert inputs.uid
    assert len(inputs.uid) <= 64


@pytest.mark.asyncio
async def test_collect_completion_text_stops_after_error_code() -> None:
    """Error chunks should stop stream processing before later content chunks."""
    consumed_chunks = []
    mock_completion = MagicMock()

    async def fake_complete() -> AsyncIterator[str]:
        for chunk in [
            'data: {"code":500,"message":"boom","choices":[]}\n\n',
            (
                'data: {"choices":[{"delta":{"content":"ignored"}}],'
                '"code":0,"message":"success","object":"chat.completion.chunk"}\n\n'
            ),
        ]:
            consumed_chunks.append(chunk)
            yield chunk

    mock_completion.do_complete = fake_complete

    text, error = await a2a._collect_completion_text(mock_completion)

    assert text == ""
    assert error == "boom"
    assert len(consumed_chunks) == 1


@pytest.mark.asyncio
async def test_send_message_can_return_immediately_without_running_agent() -> None:
    """returnImmediately should create a submitted task without invoking the runner."""
    request = A2ASendMessageRequest.model_validate(
        {
            "message": {
                "messageId": "msg-1",
                "role": "ROLE_USER",
                "parts": [{"text": "Start work."}],
            },
            "configuration": {"returnImmediately": True},
            "metadata": {
                "model_config": {
                    "domain": "model",
                    "api": "https://llm.example.com",
                },
                "max_loop_count": 1,
            },
        }
    )

    with patch("agent.api.v1.a2a.CustomChatCompletion") as completion:
        response = await a2a.send_message(
            x_consumer_username="tenant-1",
            request=request,
        )

    completion.assert_not_called()
    assert response.task is not None
    assert response.task.status.state == "TASK_STATE_SUBMITTED"
    assert response.task.artifacts == []


def test_tasks_send_get_and_events_e2e() -> None:
    """The HTTP adapter should expose task runtime state and task events."""
    if hasattr(a2a, "_TASKS"):
        a2a._TASKS.clear()
    if hasattr(a2a, "_TASK_EVENTS"):
        a2a._TASK_EVENTS.clear()

    app = FastAPI()
    app.include_router(a2a.a2a_router, prefix="/agent/v1")
    client = TestClient(app)
    mock_completion = MagicMock()

    async def fake_complete() -> AsyncIterator[str]:
        yield (
            'data: {"choices":[{"delta":{"content":"Task"}}],'
            '"code":0,"message":"success","object":"chat.completion.chunk"}\n\n'
        )
        yield (
            'data: {"choices":[{"delta":{"content":" done"}}],'
            '"code":0,"message":"success","object":"chat.completion.chunk"}\n\n'
        )

    mock_completion.do_complete = fake_complete
    payload = {
        "id": "task-1",
        "message": {
            "messageId": "msg-1",
            "contextId": "ctx-1",
            "role": "ROLE_USER",
            "parts": [{"text": "Run this task."}],
        },
        "metadata": {
            "uid": "user-1",
            "model_config": {
                "domain": "model",
                "api": "https://llm.example.com",
            },
        },
    }

    with patch("agent.api.v1.a2a.CustomChatCompletion", return_value=mock_completion):
        send_response = client.post(
            "/agent/v1/a2a/tasks:send",
            headers={"x-consumer-username": "tenant-1"},
            json=payload,
        )

    assert send_response.status_code == 200
    task = send_response.json()
    assert task["id"] == "task-1"
    assert task["contextId"] == "ctx-1"
    assert task["status"]["state"] == "TASK_STATE_COMPLETED"
    assert task["artifacts"][0]["parts"][0]["text"] == "Task done"

    get_response = client.get(
        "/agent/v1/a2a/tasks/task-1",
        headers={"x-consumer-username": "tenant-1"},
    )

    assert get_response.status_code == 200
    assert get_response.json() == task

    events_response = client.get(
        "/agent/v1/a2a/tasks/task-1/events",
        headers={"x-consumer-username": "tenant-1"},
    )

    assert events_response.status_code == 200
    events = events_response.json()["events"]
    assert [event["kind"] for event in events] == [
        "status-update",
        "artifact-update",
    ]
    assert events[0]["status"]["state"] == "TASK_STATE_COMPLETED"
    assert events[0]["final"] is True
    assert events[1]["artifact"]["parts"][0]["text"] == "Task done"
