"""Platform identity binding keeps model secrets out of execution protocols."""

import importlib
from datetime import datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from starlette.responses import JSONResponse

from workflow.consts.app_audit import AppAuditPolicy
from workflow.domain.entities.chat import ChatVo
from workflow.service.chat_service import bind_runtime_app_context


def test_runtime_binding_removes_model_keys_and_preserves_database_auth() -> None:
    protocol: dict[str, Any] = {
        "data": {
            "nodes": [
                {
                    "id": f"{kind}::node",
                    "data": {
                        "nodeParam": {
                            "appId": "configured-app",
                            "apiKey": "model-key",
                            "apiSecret": "configured-secret",
                        }
                    },
                }
                for kind in [
                    "spark-llm",
                    "decision-making",
                    "extractor-parameter",
                    "agent",
                    "question-answer",
                    "knowledge-base",
                    "database",
                ]
            ]
        }
    }

    bound = bind_runtime_app_context(
        protocol, "caller-app", "platform-key", "platform-secret"
    )

    for node in bound["data"]["nodes"][:-1]:
        assert node["data"]["nodeParam"] == {
            "appId": "caller-app",
        }
    assert bound["data"]["nodes"][-1]["data"]["nodeParam"] == {
        "appId": "caller-app",
        "apiKey": "platform-key",
        "apiSecret": "platform-secret",
    }
    assert all(
        node["data"]["nodeParam"]["appId"] == "configured-app"
        for node in protocol["data"]["nodes"]
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["open", "debug"])
async def test_chat_entry_uses_database_group_for_broker(
    monkeypatch: pytest.MonkeyPatch, mode: str
) -> None:
    module = importlib.import_module(f"workflow.api.v1.chat.{mode}")
    db_flow = SimpleNamespace(
        group_id=123,
        data={"data": {"nodes": []}},
        release_data={"data": {"nodes": []}},
        update_at=datetime.now(),
    )
    monkeypatch.setenv("RUNTIME_ENV", "dev")
    monkeypatch.setattr(module, "session_getter", lambda **kwargs: MagicMock())
    monkeypatch.setattr(module, "EventRegistry", MagicMock())
    stream = AsyncMock(return_value="stream")
    monkeypatch.setattr(module.chat_service, "event_stream", stream)
    monkeypatch.setattr(
        module.Streaming, "send", AsyncMock(return_value=JSONResponse({}))
    )
    if mode == "open":
        monkeypatch.setattr(
            module.chat_service,
            "get_and_validate_published_flow",
            AsyncMock(return_value=(db_flow, AppAuditPolicy.DEFAULT)),
        )
        endpoint = module.chat_open
    else:
        monkeypatch.setattr(
            module.flow_service, "get_flow_by_version", lambda *args: db_flow
        )
        monkeypatch.setattr(
            module.app_service,
            "get_info",
            AsyncMock(
                return_value=SimpleNamespace(
                    audit_policy=AppAuditPolicy.DEFAULT.value,
                    api_key="platform-key",
                    api_secret="platform-secret",
                )
            ),
        )
        endpoint = module.chat_debug
    await endpoint("authorized-app", ChatVo(flow_id="version-id", parameters={}))
    assert stream.await_count == 1
    assert stream.await_args is not None
    assert stream.await_args.kwargs["model_flow_id"] == "123"
    assert stream.await_args.args[4].flow_id == "version-id"
