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


def test_payload_includes_trimmed_rerank_id_for_ragflow() -> None:
    config = KnowledgeConfig(
        top_n="3",
        rag_type="Ragflow-RAG",
        repo_id=["repo-1"],
        dataset_ids=["dataset-1"],
        url="http://knowledge/knowledge/v1/chunk/query",
        query="hello",
        rerank_id="  bge-reranker-v2-m3  ",
    )

    payload = json.loads(KnowledgeClient(config=config).payload())

    assert payload["ragflow_ext"] == {"rerank_id": "bge-reranker-v2-m3"}


def test_payload_omits_ragflow_ext_when_rerank_id_is_blank() -> None:
    config = KnowledgeConfig(
        top_n="3",
        rag_type="Ragflow-RAG",
        repo_id=["repo-1"],
        dataset_ids=["dataset-1"],
        url="http://knowledge/knowledge/v1/chunk/query",
        query="hello",
        rerank_id="   ",
    )

    payload = json.loads(KnowledgeClient(config=config).payload())

    assert payload == {
        "query": "hello",
        "topN": "3",
        "ragType": "Ragflow-RAG",
        "match": {
            "repoId": ["repo-1"],
            "docIds": [],
            "flowId": "",
            "threshold": 0.1,
            "datasetId": ["dataset-1"],
        },
        "history": [],
    }


def test_payload_ignores_rerank_id_for_non_ragflow_strategy() -> None:
    config = KnowledgeConfig(
        top_n="3",
        rag_type="AIUI-RAG2",
        repo_id=["repo-1"],
        url="http://knowledge/knowledge/v1/chunk/query",
        query="hello",
        rerank_id="bge-reranker-v2-m3",
    )

    payload = json.loads(KnowledgeClient(config=config).payload())

    assert "ragflow_ext" not in payload
    assert "datasetId" not in payload["match"]


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
