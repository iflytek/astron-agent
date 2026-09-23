import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.node import NodeFactory
from workflow.engine.nodes.entities.node_run_result import WorkflowNodeExecutionStatus
from workflow.engine.nodes.knowledge.knowledge_node import KnowledgeNode
from workflow.extensions.otlp.trace.span import Span

KNOWLEDGE_NODE_ID = "knowledge-base::11111111-1111-1111-1111-111111111111"


def build_workflow_dsl(*, rerank_id: str | None = None) -> WorkflowDSL:
    node_param: dict[str, object] = {
        "topN": "3",
        "ragType": "Ragflow-RAG",
        "repoId": ["repo-1"],
        "datasetIds": ["dataset-1"],
        "score": 0.2,
    }
    if rerank_id is not None:
        node_param["rerankId"] = rerank_id

    return WorkflowDSL.model_validate(
        {
            "nodes": [
                {
                    "id": KNOWLEDGE_NODE_ID,
                    "data": {
                        "inputs": [
                            {
                                "id": "query-input",
                                "name": "query",
                                "schema": {
                                    "type": "string",
                                    "value": {
                                        "type": "literal",
                                        "content": "hello",
                                    },
                                },
                            }
                        ],
                        "nodeMeta": {
                            "aliasName": "Knowledge",
                            "nodeType": "knowledge-base",
                        },
                        "nodeParam": node_param,
                        "outputs": [
                            {
                                "id": "result-output",
                                "name": "result",
                                "required": False,
                                "schema": {"type": "array"},
                            }
                        ],
                    },
                }
            ],
            "edges": [],
        }
    )


def test_workflow_dsl_passes_rerank_id_to_knowledge_client() -> None:
    dsl = build_workflow_dsl(rerank_id="bge-reranker-v2-m3")
    span = Span()
    engine_node = NodeFactory.create(dsl.nodes[0], span)
    variable_pool = VariablePool(dsl.nodes)
    variable_pool.system_params.set(ParamKey.FlowId, "flow-1")

    with (
        patch.dict("os.environ", {"KNOWLEDGE_BASE_URL": "http://knowledge"}),
        patch.object(KnowledgeNode, "_load_llm_config"),
        patch(
            "workflow.engine.nodes.knowledge.knowledge_node.KnowledgeClient"
        ) as client_class,
    ):
        client_class.return_value.top_k = AsyncMock(
            return_value=json.dumps({"results": []})
        )
        result = asyncio.run(
            engine_node.node_instance.async_execute(variable_pool, span)
        )

    config = client_class.call_args.kwargs["config"]
    assert config.rerank_id == "bge-reranker-v2-m3"
    assert config.rag_type == "Ragflow-RAG"
    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED


def test_legacy_workflow_dsl_defaults_to_no_rerank_model() -> None:
    dsl = build_workflow_dsl()

    engine_node = NodeFactory.create(dsl.nodes[0], Span())

    assert engine_node.node_instance.rerankId == ""


def test_knowledge_node_rejects_overlong_rerank_id() -> None:
    with pytest.raises(ValidationError):
        KnowledgeNode(
            input_identifier=["query"],
            output_identifier=["result"],
            rerankId="x" * 513,
        )
