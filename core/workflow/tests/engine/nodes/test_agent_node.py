from typing import AsyncIterator
from unittest.mock import AsyncMock

import pytest

from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.agent.agent_node import (
    WORKFLOW_INTERNAL_API_KEY_HEADER,
    AgentNode,
    _redact_agent_request_headers,
)
from workflow.exception.e import CustomException
from workflow.extensions.otlp.trace.span import Span


def build_agent_node() -> AgentNode:
    return AgentNode(
        node_id="agent-node-1",
        alias_name="Agent",
        node_type="agent",
        input_identifier=[],
        output_identifier=["output"],
        appId="app-id",
        agentId="9",
    )


def test_agent_request_headers_require_and_forward_internal_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    internal_key = "w" * 48
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", internal_key)
    monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY_FILE", raising=False)

    headers = build_agent_node()._build_agent_request_headers()

    assert headers["x-consumer-username"] == "app-id"
    assert headers[WORKFLOW_INTERNAL_API_KEY_HEADER] == internal_key
    assert internal_key not in str(_redact_agent_request_headers(headers))
    assert WORKFLOW_INTERNAL_API_KEY_HEADER not in _redact_agent_request_headers(
        headers
    )


@pytest.mark.parametrize("configured_key", ["", "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY"])
def test_agent_request_headers_fail_closed_without_internal_key(
    monkeypatch: pytest.MonkeyPatch, configured_key: str
) -> None:
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", configured_key)
    monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY_FILE", raising=False)

    with pytest.raises(CustomException):
        build_agent_node()._build_agent_request_headers()


@pytest.mark.asyncio
async def test_console_node_uses_only_authorized_fixed_runtime(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = build_agent_node()
    node.agentId = "9"
    pool = VariablePool([])
    pool.system_params.set(
        ParamKey.ConsoleContext, {"run_id": "run", "root_id": "root"}
    )
    payload = {
        "meta_data": {"agent_id": "9", "version_id": "fixed"},
        "messages": [{"role": "user", "content": "current"}],
    }
    request = AsyncMock(return_value=payload)
    monkeypatch.setattr(
        "workflow.engine.nodes.agent.agent_node.console_runtime.request", request
    )
    result = await node._generate_agent_request(
        [{"role": "user", "content": "current"}],
        pool,
        Span(uid="user"),
    )
    assert result is payload
    action, body = request.call_args.args
    assert action == "agent-runtime"
    assert body["runId"] == "run" and body["nodeId"] == node.node_id
    assert body["query"] == "current" and body["invocationId"]
    assert "reasoningInstruction" not in body
    assert "answerInstruction" not in body


@pytest.mark.asyncio
async def test_agent_reference_cannot_fallback_to_inline_without_console() -> None:
    node = build_agent_node()
    node.agentId = "9"
    with pytest.raises(CustomException):
        await node._generate_agent_request(
            [{"role": "user", "content": "c"}],
            VariablePool([]),
            Span(uid="user"),
        )


@pytest.mark.asyncio
@pytest.mark.parametrize("terminal", [True, False])
async def test_agent_stream_truncation_is_not_success(
    terminal: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    import json
    from types import SimpleNamespace

    async def lines() -> AsyncIterator[bytes]:
        yield b": keepalive\n"
        message = {
            "code": 0,
            "choices": [
                {
                    "delta": {"content": "partial"},
                    "finish_reason": "stop" if terminal else None,
                }
            ],
        }
        yield ("data: " + json.dumps(message) + "\n").encode()
        yield b"data: [DONE]\n"

    node = build_agent_node()
    monkeypatch.setattr(AgentNode, "put_stream_content", AsyncMock())
    result = node._process_stream_response(
        SimpleNamespace(content=lines()), VariablePool([]), {}, Span(uid="user")
    )
    if terminal:
        assert (await result)[0] == ["partial"]
    else:
        with pytest.raises(CustomException):
            await result


def test_reference_ignores_stale_inline_resource_configuration() -> None:
    node = AgentNode.model_validate(
        {
            "node_id": "agent::1",
            "alias_name": "Agent",
            "node_type": "agent",
            "input_identifier": [],
            "output_identifier": ["output"],
            "appId": "app",
            "agentId": "9",
            "modelConfig": {},
            "plugin": {"knowledge": [{"legacy": True}]},
            "maxLoopCount": None,
        }
    )
    assert node.agentId == "9"
    assert "plugin" not in node.model_dump()
    assert "modelConfig" not in node.model_dump()
    assert "maxLoopCount" not in node.model_dump()


@pytest.mark.asyncio
async def test_old_inline_node_requires_existing_agent_even_with_console_context() -> (
    None
):
    node = build_agent_node()
    node.agentId = None
    pool = VariablePool([])
    pool.system_params.set(
        ParamKey.ConsoleContext, {"run_id": "run", "root_id": "root"}
    )
    with pytest.raises(CustomException, match="请选择已有 Agent"):
        await node._generate_agent_request(
            [{"role": "user", "content": "hello"}], pool, Span(uid="user")
        )
