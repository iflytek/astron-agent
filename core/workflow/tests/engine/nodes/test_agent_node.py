import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.agent.agent_node import AgentNode
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
                    "sandbox": {"provider": "e2b", "enabled": True},
                }
            ],
        },
        maxLoopCount=3,
        source=ModelProviderEnum.XINGHUO.value,
    )


def test_generate_agent_request_includes_runtime_metadata() -> None:
    variable_pool = VariablePool([])
    variable_pool.system_params.set(ParamKey.FlowId, "flow-123")
    span = Span(uid="user-1")
    node = build_agent_node()
    node.metaData.callerSid = "run-456"

    request = node._generate_agent_request(
        "reasoning",
        "answer",
        [{"role": "user", "content": "hello"}],
        variable_pool,
        span,
    )

    assert request["meta_data"] == {
        "caller": "workflow-agent-node",
        "caller_sid": "run-456",
        "workflow_id": "flow-123",
        "run_id": "run-456",
        "node_id": "agent-node-1",
    }
    assert request["plugin"]["skills"][0]["sandbox"]["provider"] == "e2b"


@pytest.mark.asyncio
async def test_process_stream_response_keeps_tool_payload_out_of_reasoning() -> None:
    event = {
        "version": 1,
        "type": "tool_finish",
        "runId": "run-1",
        "seq": 8,
        "turnId": "turn-1",
        "callId": "call-1",
        "name": "lookup",
        "status": "success",
        "response": {"items": ["large payload"]},
    }
    legacy_tool_call = {
        "type": "mcp",
        "reason": "query",
        "function": {
            "name": "lookup",
            "arguments": '{"query":"large"}',
            "response": '{"data":{"content":[{"text":"large payload"}]}}',
        },
    }
    frames = [
        {
            "choices": [
                {
                    "delta": {"agent_event": event, "tool_calls": [legacy_tool_call]},
                    "finish_reason": "stop",
                }
            ]
        }
    ]

    class FakeContent:
        def __aiter__(self):
            async def iterate():
                for frame in frames:
                    yield f"data:{json.dumps(frame)}".encode()

            return iterate()

    node = build_agent_node()
    span = AsyncMock()
    response = SimpleNamespace(content=FakeContent())

    with patch.object(AgentNode, "put_stream_content", new_callable=AsyncMock) as put:
        _, reasoning, _ = await node._process_stream_response(
            response, VariablePool([]), {}, span
        )

    assert reasoning == []
    forwarded = put.await_args.args[4]
    assert forwarded["choices"][0]["delta"]["agent_event"] == event
