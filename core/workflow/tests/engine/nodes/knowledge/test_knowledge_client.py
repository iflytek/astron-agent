import json

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


def test_headers_use_base_json_headers() -> None:
    config = KnowledgeConfig(
        top_n="3",
        rag_type="Ragflow-RAG",
        repo_id=["repo-1"],
        dataset_ids=["dataset-1"],
        url="http://knowledge/knowledge/v1/chunk/query",
        query="hello",
    )

    headers = KnowledgeClient(config=config).headers()

    assert headers == {"Content-Type": "application/json"}
