"""Tests for workflow protocol persistence and runtime sanitization."""

import json
from typing import Any

from workflow.utils.protocol_sanitization import (
    sanitize_protocol,
    sanitize_protocol_document_for_use,
)


def test_sanitizer_rebuilds_nested_sandboxes_and_removes_legacy_fields() -> None:
    protocol: dict[str, Any] = {
        "apiKey": "valid-model-key",
        "api_key": "valid-provider-key",
        "artifact_upload_token": "global-legacy-token",
        "data": {
            "nodes": [
                {
                    "sandbox": {
                        "enabled": True,
                        "uid": "user-1",
                        "spaceId": "space-1",
                        "workflow_id": "flow-1",
                        "runId": "run-1",
                        "node_id": "node-1",
                        "provider": "e2b",
                        "apiKey": "sandbox-secret",
                        "api_key": "sandbox-secret-2",
                        "artifactUploadUrl": "http://hub/internal-upload",
                        "artifactUploadToken": "artifact-secret",
                        "runtimeConfigUrl": "http://hub/runtime-config",
                        "runtimeCredentialToken": "runtime-secret",
                        "timeoutSeconds": 600,
                        "allowInternetAccess": True,
                    }
                },
                {
                    "nested": {
                        "sandbox": {
                            "enabled": False,
                            "workflowId": "flow-2",
                            "unknown": "discard-me",
                        }
                    }
                },
            ]
        },
    }

    sanitized = sanitize_protocol(protocol)

    assert sanitized["apiKey"] == "valid-model-key"
    assert sanitized["api_key"] == "valid-provider-key"
    assert "artifact_upload_token" not in sanitized
    assert sanitized["data"]["nodes"][0]["sandbox"] == {
        "enabled": True,
        "uid": "user-1",
        "spaceId": "space-1",
        "workflow_id": "flow-1",
        "runId": "run-1",
        "node_id": "node-1",
    }
    assert sanitized["data"]["nodes"][1]["nested"]["sandbox"] == {
        "enabled": False,
        "workflowId": "flow-2",
    }

    # Sanitization must not mutate request/model objects owned by the caller.
    assert protocol["data"]["nodes"][0]["sandbox"]["apiKey"] == "sandbox-secret"


def test_sanitizer_handles_embedded_json_and_preserves_invalid_storage_text() -> None:
    embedded = json.dumps(
        {
            "sandbox": {
                "enabled": True,
                "artifactUploadToken": "secret",
            },
            "api_key": "valid-model-key",
        }
    )
    invalid = '{"sandbox":'

    sanitized = sanitize_protocol({"embedded": embedded, "invalid": invalid})

    assert json.loads(sanitized["embedded"]) == {
        "sandbox": {"enabled": True},
        "api_key": "valid-model-key",
    }
    assert sanitized["invalid"] == invalid
    assert sanitize_protocol(invalid) == invalid


def test_sanitizer_removes_only_the_exact_disclosed_bootstrap_values() -> None:
    legacy_key = "7b709739e8da44536127a333c7603a83"
    legacy_secret = "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy"
    protocol = {
        "apiKey": legacy_key,
        "apiSecret": legacy_secret,
        "customApiKey": "customer-key",
        "embedded": json.dumps(
            {"api_key": legacy_key, "api_secret": "customer-secret"}
        ),
    }

    sanitized = sanitize_protocol(protocol)

    assert sanitized["apiKey"] == ""
    assert sanitized["apiSecret"] == ""
    assert sanitized["customApiKey"] == "customer-key"
    assert json.loads(sanitized["embedded"]) == {
        "api_key": "",
        "api_secret": "customer-secret",
    }


def test_runtime_document_sanitizer_fails_closed_for_invalid_json() -> None:
    assert sanitize_protocol_document_for_use('{"sandbox":') == {}
    assert sanitize_protocol_document_for_use('"not-a-protocol"') == {}
    assert sanitize_protocol_document_for_use([]) == {}
    assert sanitize_protocol_document_for_use('[{"nodes": []}]') == {}


def test_runtime_document_sanitizer_accepts_only_double_encoded_object_root() -> None:
    protocol = {
        "nodes": [],
        "sandbox": {
            "enabled": True,
            "artifactUploadToken": "secret-must-not-survive",
        },
    }
    double_encoded = json.dumps(json.dumps(protocol))

    assert sanitize_protocol_document_for_use(double_encoded) == {
        "nodes": [],
        "sandbox": {"enabled": True},
    }
    assert sanitize_protocol_document_for_use(json.dumps(json.dumps([protocol]))) == {}


def test_model_node_secrets_removed_without_affecting_database_or_plugin_auth() -> None:
    nodes: list[dict[str, Any]] = [
        {
            "id": f"{kind}::1",
            "data": {
                "nodeParam": {
                    "modelId": "42",
                    "apiKey": "model-secret",
                    "api_secret": "old-secret",
                    "modelConfig": {"apiKey": "nested-secret", "domain": "chat"},
                }
            },
        }
        for kind in (
            "spark-llm",
            "decision-making",
            "extractor-parameter",
            "agent",
            "question-answer",
            "knowledge-base",
            "database",
            "plugin",
        )
    ]
    original = {"data": {"nodes": nodes}}
    sanitized = sanitize_protocol_document_for_use(original)
    for node in sanitized["data"]["nodes"][:6]:
        assert node["data"]["nodeParam"] == {
            "modelId": "42",
            "modelConfig": {"domain": "chat"},
        }
    for node in sanitized["data"]["nodes"][6:]:
        assert node["data"]["nodeParam"]["apiKey"] == "model-secret"
    assert original["data"]["nodes"][0]["data"]["nodeParam"]["apiKey"] == "model-secret"
    agent_plugin = {
        "id": "agent::1",
        "data": {
            "nodeParam": {"apiKey": "model-key", "plugin": {"apiKey": "tool-key"}}
        },
    }
    assert sanitize_protocol(agent_plugin)["data"]["nodeParam"] == {
        "plugin": {"apiKey": "tool-key"}
    }
    embedded = sanitize_protocol({"snapshot": json.dumps(original)})
    assert json.loads(embedded["snapshot"]) == sanitized
