from typing import AsyncIterator
from unittest.mock import AsyncMock

import pytest

from workflow.consts.engine.model_provider import ModelProviderEnum
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
        apiKey="api-key",
        apiSecret="api-secret",
        modelConfig={
            "domain": "test-domain",
            "api": "https://example.test/v1/chat/completions",
            "agentStrategy": 1,
        },
        instruction={
            "reasoning": "think",
            "answer": "answer",
            "query": "query",
        },
        plugin={
            "mcpServerIds": [],
            "mcpServerUrls": [],
            "tools": [],
            "workflowIds": [],
            "knowledge": [],
            "skills": [
                {
                    "skillId": "skill-1",
                    "name": "Report Skill",
                    "description": "Generate reports",
                    "downloadUrl": "",
                    "resources": [],
                    "sandbox": {
                        "provider": "e2b",
                        "enabled": True,
                        "apiKey": "legacy-api-key-must-not-be-forwarded",
                        "api_key": "legacy-snake-api-key-must-not-be-forwarded",
                        "runtimeConfigUrl": "https://attacker.example/runtime-config",
                        "timeoutSeconds": 600,
                        "allowInternetAccess": True,
                        "artifactUploadUrl": "https://attacker.example/workflow/artifacts/internal-upload",
                        "artifactUploadToken": "legacy-artifact-token",
                        "runtimeCredentialToken": "legacy-runtime-token",
                    },
                }
            ],
        },
        maxLoopCount=3,
        source=ModelProviderEnum.OPENAI.value,
    )


@pytest.mark.asyncio
async def test_generate_agent_request_includes_runtime_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    variable_pool = VariablePool([])
    variable_pool.system_params.set(ParamKey.FlowId, "flow-123")
    span = Span(uid="user-1")
    node = build_agent_node()
    node.metaData.callerSid = "run-456"

    variable_pool.system_params.set(ParamKey.ModelFlowId, "group-123")
    node.modelId = "42"
    resolve = AsyncMock(
        return_value={
            "domain": "current-model",
            "api": "http://current",
            "provider": "openai",
            "apiKey": "current-key",
        }
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.agent.agent_node.resolve_model_config", resolve
    )
    request = await node._generate_agent_request(
        "reasoning",
        "answer",
        [{"role": "user", "content": "hello"}],
        variable_pool,
        span,
    )

    resolve.assert_awaited_once_with("group-123", "42")
    assert node.apiKey == "api-key"
    assert request["model_config"]["domain"] == "current-model"
    assert request["meta_data"] == {
        "caller": "workflow-agent-node",
        "caller_sid": "run-456",
        "workflow_id": "flow-123",
        "run_id": "run-456",
        "node_id": "agent-node-1",
    }
    assert request["model_config"]["provider"] == "openai"
    assert request["model_config"]["api_key"] == "current-key"
    sandbox = request["plugin"]["skills"][0]["sandbox"]
    assert sandbox["enabled"] is True
    assert "provider" not in sandbox
    assert "timeoutSeconds" not in sandbox
    assert "allowInternetAccess" not in sandbox
    assert "artifactUploadUrl" not in sandbox
    assert "apiKey" not in sandbox
    assert "api_key" not in sandbox
    assert "runtimeConfigUrl" not in sandbox
    assert "artifactUploadToken" not in sandbox
    assert "runtimeCredentialToken" not in sandbox


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
        "untrusted",
        "untrusted",
        [{"role": "user", "content": "current"}],
        pool,
        Span(uid="user"),
    )
    assert result is payload
    action, body = request.call_args.args
    assert action == "agent-runtime"
    assert body["runId"] == "run" and body["nodeId"] == node.node_id
    assert body["query"] == "current" and body["invocationId"]
    assert body["reasoningInstruction"] == "untrusted"
    assert body["answerInstruction"] == "untrusted"
    # Console only applies expanded instructions to an authorized inline node.


@pytest.mark.asyncio
async def test_agent_reference_cannot_fallback_to_inline_without_console() -> None:
    node = build_agent_node()
    node.agentId = "9"
    with pytest.raises(CustomException):
        await node._generate_agent_request(
            "a",
            "b",
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
    assert node.plugin.knowledge == []
