"""Regression tests for node-debug trace credential redaction."""

import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.nodes.agent.agent_node import AgentNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.engine.nodes.llm.spark_llm_node import SparkLLMNode
from workflow.extensions.otlp.trace.span import Span
from workflow.service import flow_service
from workflow.utils.trace_sanitization import serialize_trace_payload


def test_node_debug_trace_payload_recursively_removes_legacy_artifact_tokens() -> None:
    camel_case_token = "CAMEL-CASE-ARTIFACT-TOKEN-MUST-NOT-LEAK"
    snake_case_token = "SNAKE-CASE-ARTIFACT-TOKEN-MUST-NOT-LEAK"
    payload = {
        "nodes": [
            {
                "data": {
                    "nodeParam": {
                        "sandbox": {
                            "artifactUploadUrl": "http://hub/internal-upload",
                            "artifactUploadToken": camel_case_token,
                            "uid": "user-1",
                            "nested": [
                                {"artifact_upload_token": snake_case_token},
                            ],
                        }
                    }
                }
            }
        ]
    }

    serialized = serialize_trace_payload(payload)

    assert camel_case_token not in serialized
    assert snake_case_token not in serialized
    sanitized = json.loads(serialized)
    sandbox = sanitized["nodes"][0]["data"]["nodeParam"]["sandbox"]
    assert sandbox == {
        "artifactUploadUrl": "http://hub/internal-upload",
        "uid": "user-1",
        "nested": [{}],
    }


def test_trace_payload_redacts_presigned_urls_inside_serialized_json() -> None:
    signature = "PRESIGNED-SIGNATURE-MUST-NOT-LEAK"
    token = "SERIALIZED-TOKEN-MUST-NOT-LEAK"
    payload = {
        "serialized": json.dumps(
            {
                "downloadUrl": (
                    "https://objects.example/console/skill-files/a.md?"
                    f"X-Amz-Signature={signature}&X-Amz-Expires=300"
                ),
                "sandbox": {"artifactUploadToken": token, "uid": "user-1"},
            }
        )
    }

    serialized = serialize_trace_payload(payload)

    assert signature not in serialized
    assert token not in serialized
    nested = json.loads(json.loads(serialized)["serialized"])
    assert nested == {
        "downloadUrl": "[REDACTED_PRESIGNED_URL]",
        "sandbox": {"uid": "user-1"},
    }


@pytest.mark.asyncio
async def test_flow_service_records_sanitized_node_debug_dsl(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    camel_case_token = "CAMEL-CASE-ARTIFACT-TOKEN-MUST-NOT-REACH-TRACE"
    snake_case_token = "SNAKE-CASE-ARTIFACT-TOKEN-MUST-NOT-REACH-TRACE"
    payload: dict[str, Any] = {
        "nodes": [
            {
                "data": {
                    "nodeParam": {
                        "sandbox": {
                            "artifactUploadToken": camel_case_token,
                            "nested": {"artifact_upload_token": snake_case_token},
                            "workflowId": "flow-1",
                        }
                    }
                }
            }
        ]
    }
    payload["nodes"][0]["id"] = "code::node1"
    payload["nodes"][0]["data"]["nodeMeta"] = {"nodeType": "code", "aliasName": "Code"}
    workflow_dsl = WorkflowDSL.model_validate({**payload, "edges": []})
    recorded_events: list[str] = []

    class FakeSpan:
        async def add_info_event_async(self, event: str) -> None:
            recorded_events.append(event)

    class FakeSystemParams:
        def set(self, key: object, value: object) -> "FakeSystemParams":
            return self

    class FakeVariablePool:
        def __init__(self, protocol: object) -> None:
            self.system_params = FakeSystemParams()

    class FakeNode:
        node_id = "code-node-1"
        retry_config = SimpleNamespace(should_retry=True)

        async def async_execute(self, variable_pool: object, span: object) -> object:
            return SimpleNamespace(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                error=None,
                alias_name="Code",
                node_type="code",
                inputs={},
                raw_output="ok",
                outputs={"result": "ok"},
                token_cost=GenerateUsage(),
            )

    monkeypatch.setattr(flow_service, "VariablePool", FakeVariablePool)
    monkeypatch.setattr(
        flow_service.WorkflowEngineFactory,
        "create_debug_node",
        lambda workflow_dsl, span: FakeNode(),
    )
    monkeypatch.setattr(
        flow_service.audit_service,
        "node_debug_input_audit",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        flow_service.audit_service,
        "output_audit",
        AsyncMock(return_value=None),
    )

    await flow_service.node_debug(workflow_dsl, "flow-1", "user-1", FakeSpan())

    assert len(recorded_events) == 1
    event = recorded_events[0]
    assert event.startswith("node debug dsl: ")
    assert camel_case_token not in event
    assert snake_case_token not in event
    sanitized = json.loads(event.removeprefix("node debug dsl: "))
    sandbox = sanitized["nodes"][0]["data"]["nodeParam"]["sandbox"]
    assert sandbox == {"workflowId": "flow-1"}


@pytest.mark.asyncio
@pytest.mark.parametrize("node_type", ["agent", "spark-llm"])
@pytest.mark.parametrize("with_input", [False, True])
async def test_node_debug_preserves_schemas_and_removes_model_credentials(
    monkeypatch: pytest.MonkeyPatch, node_type: str, with_input: bool
) -> None:
    """Exercise the real debug builder before replacing only model execution."""
    node_id = f"{node_type}::schema-test"
    parameters: dict[str, Any] = {
        "appId": "app-test",
        "modelId": "1",
        "source": "openai",
        "apiKey": "model-key-must-not-reach-execution",
        "apiSecret": "model-secret-must-not-reach-execution",
    }
    if node_type == "agent":
        parameters.update(
            modelConfig={
                "domain": "test-model",
                "api": "https://model.example/v1/chat/completions",
                "agentStrategy": 1,
                "apiKey": "nested-key-must-not-reach-execution",
            },
            instruction={"reasoning": "Reason", "answer": "Answer", "query": "Hi"},
            plugin={
                "mcpServerIds": [],
                "mcpServerUrls": [],
                "tools": [],
                "workflowIds": [],
            },
            maxLoopCount=1,
        )
    else:
        parameters.update(
            domain="test-model",
            url="https://model.example/v1/chat/completions",
            template="Hi",
        )
    workflow_dsl = WorkflowDSL.model_validate(
        {
            "nodes": [
                {
                    "id": node_id,
                    "data": {
                        "nodeMeta": {"nodeType": node_type, "aliasName": "Model"},
                        "nodeParam": parameters,
                        "inputs": (
                            [
                                {
                                    "name": "query",
                                    "schema": {
                                        "type": "string",
                                        "value": {"type": "literal", "content": "Hi"},
                                    },
                                }
                            ]
                            if with_input
                            else []
                        ),
                        "outputs": [
                            {
                                "name": name,
                                "schema": {"type": "string"},
                                "required": True,
                            }
                            for name in ("REASONING_CONTENT", "output")
                        ],
                    },
                }
            ],
            "edges": [],
        }
    )
    observed: list[WorkflowDSL] = []
    executed: list[str] = []
    create_node = flow_service.WorkflowEngineFactory.create_debug_node

    def inspect_and_build(dsl: WorkflowDSL, span: Span) -> Any:
        observed.append(dsl)
        return create_node(dsl, span)

    async def execute(
        self: AgentNode | SparkLLMNode, variable_pool: VariablePool, span: Span
    ) -> NodeRunResult:
        executed.append(self.node_id)
        assert self.apiKey == "" and self.apiSecret == ""
        assert self.retry_config.should_retry is False
        assert self.retry_config.custom_output == {
            "REASONING_CONTENT": "",
            "output": "",
        }
        assert variable_pool.system_params.get(ParamKey.ModelFlowId) == "flow-1"
        if with_input:
            assert variable_pool.get_variable(node_id, "query", span) == "Hi"
        return NodeRunResult(
            node_id=self.node_id,
            alias_name="Model",
            node_type=node_type,
            status=WorkflowNodeExecutionStatus.SUCCEEDED,
            inputs={"query": "Hi"} if with_input else {},
            outputs={"REASONING_CONTENT": "reason", "output": "answer"},
            raw_output="answer",
        )

    monkeypatch.setattr(
        flow_service.WorkflowEngineFactory, "create_debug_node", inspect_and_build
    )
    monkeypatch.setattr(
        AgentNode if node_type == "agent" else SparkLLMNode, "async_execute", execute
    )
    monkeypatch.setattr(
        flow_service.audit_service, "node_debug_input_audit", AsyncMock()
    )
    monkeypatch.setattr(flow_service.audit_service, "output_audit", AsyncMock())

    result = await flow_service.node_debug(workflow_dsl, "flow-1", "user-1", Span())

    assert executed == [node_id]
    assert json.loads(result.output) == {
        "REASONING_CONTENT": "reason",
        "output": "answer",
    }
    assert len(observed) == 1
    actual = observed[0].nodes[0].data
    original = workflow_dsl.nodes[0].data
    assert actual.inputs == original.inputs
    assert actual.outputs == original.outputs
    assert "apiKey" not in actual.nodeParam and "apiSecret" not in actual.nodeParam
    if node_type == "agent":
        assert "apiKey" not in actual.nodeParam["modelConfig"]
    assert original.nodeParam["apiKey"] == parameters["apiKey"]
