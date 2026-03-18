import asyncio

import pytest

from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.nodes.variable_aggregation.variable_aggregation_node import (
    VariableAggregationNode,
)
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span


START_NODE_ID = "node-start::11111111-1111-1111-1111-111111111111"
AGGREGATION_NODE_ID = "variable-aggregation::22222222-2222-2222-2222-222222222222"


def build_workflow_dsl(
    *,
    first_type: str = "string",
    second_type: str = "string",
    output_type: str = "string",
    fallback_enabled: bool = False,
    fallback_value="",
) -> WorkflowDSL:
    return WorkflowDSL.model_validate(
        {
            "nodes": [
                {
                    "id": START_NODE_ID,
                    "data": {
                        "inputs": [],
                        "nodeMeta": {"aliasName": "开始", "nodeType": "基础节点"},
                        "nodeParam": {},
                        "outputs": [
                            {
                                "id": "out-first",
                                "name": "first",
                                "required": False,
                                "schema": {"type": first_type},
                            },
                            {
                                "id": "out-second",
                                "name": "second",
                                "required": False,
                                "schema": {"type": second_type},
                            },
                        ],
                    },
                },
                {
                    "id": AGGREGATION_NODE_ID,
                    "data": {
                        "inputs": [
                            {
                                "id": "candidate-1",
                                "name": "candidate1",
                                "schema": {
                                    "type": output_type,
                                    "value": {
                                        "type": "ref",
                                        "content": {
                                            "nodeId": START_NODE_ID,
                                            "name": "first",
                                        },
                                    },
                                },
                            },
                            {
                                "id": "candidate-2",
                                "name": "candidate2",
                                "schema": {
                                    "type": output_type,
                                    "value": {
                                        "type": "ref",
                                        "content": {
                                            "nodeId": START_NODE_ID,
                                            "name": "second",
                                        },
                                    },
                                },
                            },
                        ],
                        "nodeMeta": {
                            "aliasName": "变量聚合",
                            "nodeType": "工具",
                        },
                        "nodeParam": {
                            "fallbackEnabled": fallback_enabled,
                            "fallbackValue": fallback_value,
                        },
                        "outputs": [
                            {
                                "id": "agg-output",
                                "name": "output",
                                "required": False,
                                "schema": {"type": output_type},
                            }
                        ],
                    },
                },
            ],
            "edges": [],
        }
    )


async def execute_node(
    *,
    first_value,
    second_value,
    first_type: str = "string",
    second_type: str = "string",
    output_type: str = "string",
    fallback_enabled: bool = False,
    fallback_value="",
):
    span = Span()
    dsl = build_workflow_dsl(
        first_type=first_type,
        second_type=second_type,
        output_type=output_type,
        fallback_enabled=fallback_enabled,
        fallback_value=fallback_value,
    )
    variable_pool = VariablePool(dsl.nodes)
    await variable_pool.add_variable(
        START_NODE_ID,
        ["first", "second"],
        NodeRunResult(
            status=WorkflowNodeExecutionStatus.SUCCEEDED,
            inputs={},
            outputs={"first": first_value, "second": second_value},
            node_id=START_NODE_ID,
            alias_name="开始",
            node_type="基础节点",
        ),
        span,
    )

    aggregation_node = VariableAggregationNode(
        node_id=AGGREGATION_NODE_ID,
        alias_name="变量聚合",
        node_type="工具",
        input_identifier=["candidate1", "candidate2"],
        output_identifier=["output"],
        fallbackEnabled=fallback_enabled,
        fallbackValue=fallback_value,
    )
    return await aggregation_node.async_execute(variable_pool, span)


def test_variable_aggregation_uses_next_non_empty_candidate() -> None:
    result = asyncio.run(execute_node(first_value="", second_value="branch-b"))

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.outputs == {"output": "branch-b"}


def test_variable_aggregation_preserves_zero_value() -> None:
    result = asyncio.run(
        execute_node(
        first_value=0,
        second_value=5,
        first_type="integer",
        second_type="integer",
        output_type="integer",
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.outputs == {"output": 0}


def test_variable_aggregation_preserves_false_value() -> None:
    result = asyncio.run(
        execute_node(
        first_value=False,
        second_value=True,
        first_type="boolean",
        second_type="boolean",
        output_type="boolean",
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.outputs == {"output": False}


def test_variable_aggregation_uses_fallback_when_all_candidates_empty() -> None:
    result = asyncio.run(
        execute_node(
        first_value="",
        second_value="",
        fallback_enabled=True,
        fallback_value="fallback",
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.outputs == {"output": "fallback"}


def test_variable_aggregation_fails_on_invalid_runtime_payload() -> None:
    result = asyncio.run(
        execute_node(
        first_value="bad-value",
        second_value="",
        first_type="integer",
        second_type="integer",
        output_type="integer",
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.FAILED
    assert result.error is not None
    assert result.error.code == CodeEnum.VARIABLE_NODE_EXECUTION_ERROR.code
