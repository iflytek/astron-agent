"""Service identity and immutable graph contracts on the Core HTTP surface."""

import json
from typing import Any, cast
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import FastAPI

from workflow.api.v1.chat import console
from workflow.tests.engine.dsl.base import BASE_DSL_SCHEMA


@pytest.mark.asyncio
async def test_console_validation_uses_real_engine_and_requires_internal_identity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "k" * 40)
    app = FastAPI()
    app.include_router(console.router)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(cast(Any, app)), base_url="http://core"
    ) as client:
        denied = await client.post(
            "/console/validate", json={"protocol": json.loads(BASE_DSL_SCHEMA)}
        )
        assert denied.status_code == 401
        accepted = await client.post(
            "/console/validate",
            json={"protocol": json.loads(BASE_DSL_SCHEMA)},
            headers={"X-Workflow-Internal-Key": "k" * 40},
        )
        assert accepted.json()["code"] == 0
        invalid = await client.post(
            "/console/validate",
            json={"protocol": {"data": {"nodes": [], "edges": []}}},
            headers={"X-Workflow-Internal-Key": "k" * 40},
        )
        assert invalid.json()["code"] != 0


@pytest.mark.asyncio
async def test_console_run_passes_frozen_graph_without_reloading_mutable_flow(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "k" * 40)
    app = FastAPI()
    app.include_router(console.router)
    graph = json.loads(BASE_DSL_SCHEMA)
    create_event = Mock()
    monkeypatch.setattr(console.EventRegistry, "init_event", create_event)
    monkeypatch.setattr(
        console, "control", AsyncMock(return_value={"cancelled": False})
    )

    async def stream():  # type: ignore[no-untyped-def]
        yield 'data: {"code":0,"choices":[{"finish_reason":"stop"}]}\n\n'

    execute = AsyncMock(return_value=stream())
    monkeypatch.setattr(console.chat_service, "event_stream", execute)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(cast(Any, app)), base_url="http://core"
    ) as client:
        result = await client.post(
            "/console/run",
            json={
                "protocol": graph,
                "chat": {
                    "flow_id": "flow",
                    "uid": "authorized-user",
                    "parameters": {"AGENT_USER_INPUT": "hello"},
                    "ext": {
                        "console_context": {"run_id": "durable-run", "root_id": "root"}
                    },
                },
            },
            headers={"X-Workflow-Internal-Key": "k" * 40, "X-Consumer-Username": "app"},
        )
    assert result.status_code == 200
    assert execute.call_args.args[2] == graph
    assert execute.call_args.args[4].uid == "authorized-user"
    assert create_event.call_args.args[0].event_id == "durable-run"


@pytest.mark.parametrize("length", [40, 41, 128])
def test_console_run_preserves_legacy_uid_length(length: int) -> None:
    request = console.ConsoleRun.model_validate(
        {
            "protocol": {},
            "chat": {"flow_id": "flow", "uid": "u" * length, "parameters": {}},
        }
    )
    assert request.chat.uid == "u" * length


def test_console_run_rejects_uid_beyond_database_limit() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        console.ConsoleRun.model_validate(
            {
                "protocol": {},
                "chat": {"flow_id": "flow", "uid": "u" * 129, "parameters": {}},
            }
        )


@pytest.mark.asyncio
async def test_cancel_finished_event_is_idempotent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from workflow.exception.e import CustomException
    from workflow.exception.errors.err_code import CodeEnum

    monkeypatch.setattr(
        console.EventRegistry,
        "get_event",
        Mock(side_effect=CustomException(CodeEnum.EVENT_REGISTRY_NOT_FOUND_ERROR)),
    )
    response = await console.cancel(
        "expired", console.ConsoleCancel(run_id="expired", root_id="root")
    )
    assert json.loads(response.body)["code"] == 0
