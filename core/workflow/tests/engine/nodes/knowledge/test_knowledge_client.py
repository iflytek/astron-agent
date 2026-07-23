import json
from unittest.mock import patch

from workflow.engine.nodes.knowledge.knowledge_client import (
    KnowledgeClient,
    KnowledgeConfig,
)


def test_payload_includes_dataset_ids_for_ragflow() -> None:
    config = KnowledgeConfig(
        top_n="3",
        rag_type="Ragflow-RAG",
        repo_id=["repo-1"],
        dataset_ids=["dataset-1"],
        url="http://knowledge/knowledge/v1/chunk/query",
        query="hello",
    )

    payload = json.loads(KnowledgeClient(config=config).payload())

    assert payload["match"]["datasetId"] == ["dataset-1"]


def test_headers_include_page_managed_ragflow_config() -> None:
    config = KnowledgeConfig(
        top_n="3",
        rag_type="Ragflow-RAG",
        repo_id=["repo-1"],
        dataset_ids=["dataset-1"],
        url="http://knowledge/knowledge/v1/chunk/query",
        query="hello",
    )

    with patch(
        "workflow.engine.nodes.knowledge.knowledge_client.get_platform_account_headers",
        return_value={
            "x-ragflow-base-url": "http://ragflow",
            "x-ragflow-api-token": "secret",
        },
    ):
        headers = KnowledgeClient(config=config).headers()

    assert headers == {
        "Content-Type": "application/json",
        "x-ragflow-base-url": "http://ragflow",
        "x-ragflow-api-token": "secret",
    }


def test_trace_headers_redact_ragflow_api_token() -> None:
    headers = {
        "Content-Type": "application/json",
        "x-ragflow-base-url": "http://ragflow",
        "x-ragflow-api-token": "secret",
    }

    trace_headers = KnowledgeClient.trace_headers(headers)

    assert trace_headers == {
        "Content-Type": "application/json",
        "x-ragflow-base-url": "http://ragflow",
        "x-ragflow-api-token": "******",
    }
    assert headers["x-ragflow-api-token"] == "secret"
