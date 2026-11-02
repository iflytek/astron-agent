"""Regression tests for node-debug trace credential redaction."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.nodes.entities.node_run_result import WorkflowNodeExecutionStatus
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
    payload = {
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
