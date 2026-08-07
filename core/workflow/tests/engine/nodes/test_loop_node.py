import asyncio
from types import SimpleNamespace
from typing import Any

from workflow.engine.entities.chains import Chains, SimplePath
from workflow.engine.entities.node_running_status import NodeRunningStatus
from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.engine.nodes.loop.loop_node import LoopNode
from workflow.extensions.otlp.trace.span import Span

LOOP_NODE_ID = "loop::11111111-1111-1111-1111-111111111111"
UPSTREAM_NODE_ID = "ifly-code::00000000-0000-0000-0000-000000000000"
LOOP_START_NODE_ID = "loop-node-start::22222222-2222-2222-2222-222222222222"
LOOP_END_NODE_ID = "loop-node-end::33333333-3333-3333-3333-333333333333"
LOOP_EXIT_NODE_ID = "loop-exit::44444444-4444-4444-4444-444444444444"


class FakeLoopEngine:
    def __init__(
        self,
        *,
        loop_chain: Chains,
        results: list[NodeRunResult] | None = None,
        fail: bool = False,
    ) -> None:
        self.results = results or []
        self.fail = fail
        self.calls: list[dict[str, Any]] = []
        self.engine_ctx = SimpleNamespace(
            chains=SimpleNamespace(loop_chains={LOOP_NODE_ID: loop_chain}),
            variable_pool=None,
            node_run_status={
                LOOP_START_NODE_ID: NodeRunningStatus(),
                LOOP_END_NODE_ID: NodeRunningStatus(),
                LOOP_EXIT_NODE_ID: NodeRunningStatus(),
            },
            dfs_tasks=[],
            responses=[],
            end_complete=asyncio.Event(),
            event_log_trace=None,
        )

    async def async_run(self, inputs: dict[str, Any], **kwargs: Any) -> NodeRunResult:
        self.calls.append(inputs.copy())
        if self.fail:
            raise RuntimeError("child failed")
        if self.results:
            return self.results.pop(0)
        return NodeRunResult(
            status=WorkflowNodeExecutionStatus.SUCCEEDED,
            inputs=inputs,
            outputs={"count": inputs.get("count", 0) + 1},
            node_id=LOOP_END_NODE_ID,
            alias_name="Loop End",
            node_type="loop-node-end",
        )


def build_variable_pool() -> VariablePool:
    dsl = WorkflowDSL.model_validate(
        {
            "nodes": [
                {
                    "id": UPSTREAM_NODE_ID,
                    "data": {
                        "inputs": [],
                        "nodeMeta": {
                            "aliasName": "Code",
                            "nodeType": "Code",
                        },
                        "nodeParam": {},
                        "outputs": [
                            {
                                "id": "limit-output",
                                "name": "limit",
                                "schema": {"type": "integer", "default": 2},
                            }
                        ],
                    },
                },
                {
                    "id": LOOP_NODE_ID,
                    "data": {
                        "inputs": [],
                        "nodeMeta": {"aliasName": "Loop", "nodeType": "Loop"},
                        "nodeParam": {},
                        "outputs": [
                            {
                                "id": "count-output",
                                "name": "count",
                                "schema": {"type": "integer"},
                            }
                        ],
                    },
                },
                {
                    "id": LOOP_START_NODE_ID,
                    "data": {
                        "inputs": [],
                        "nodeMeta": {
                            "aliasName": "Loop Start",
                            "nodeType": "Loop Start",
                        },
                        "nodeParam": {},
                        "outputs": [
                            {
                                "id": "count-start-output",
                                "name": "count",
                                "schema": {"type": "integer"},
                            }
                        ],
                    },
                },
                {
                    "id": LOOP_END_NODE_ID,
                    "data": {
                        "inputs": [],
                        "nodeMeta": {
                            "aliasName": "Loop End",
                            "nodeType": "Loop End",
                        },
                        "nodeParam": {},
                        "outputs": [
                            {
                                "id": "count-end-output",
                                "name": "count",
                                "schema": {"type": "integer"},
                            }
                        ],
                    },
                },
                {
                    "id": LOOP_EXIT_NODE_ID,
                    "data": {
                        "inputs": [],
                        "nodeMeta": {
                            "aliasName": "Exit Loop",
                            "nodeType": "Exit Loop",
                        },
                        "nodeParam": {},
                        "outputs": [
                            {
                                "id": "count-exit-output",
                                "name": "count",
                                "schema": {"type": "integer"},
                            }
                        ],
                    },
                },
            ],
            "edges": [],
        }
    )
    return VariablePool(dsl.nodes)


def build_loop_chain(*, exit_node: bool = False) -> Chains:
    end_node = LOOP_EXIT_NODE_ID if exit_node else LOOP_END_NODE_ID
    chains = Chains(
        workflow_schema=WorkflowDSL.model_validate({"nodes": [], "edges": []})
    )
    chains.master_chains = [
        SimplePath(
            node_id_list=[LOOP_START_NODE_ID, end_node],
            every_node_index={LOOP_START_NODE_ID: 0, end_node: 1},
        )
    ]
    return chains


def build_loop_node(
    *,
    initial_count: int = 0,
    max_loop_count: int | None = 10,
    terminate_at: int | None = None,
    terminate_with_ref: bool = False,
) -> LoopNode:
    node_param: dict[str, Any] = {
        "LoopStartNodeId": LOOP_START_NODE_ID,
        "loopVariables": [
            {
                "id": "var-count",
                "name": "count",
                "schema": {"type": "integer"},
                "value": {"type": "literal", "content": initial_count},
            }
        ],
        "termination": {"logicalOperator": "and", "conditions": []},
    }
    if max_loop_count is not None:
        node_param["maxLoopCount"] = max_loop_count
    if terminate_at is not None:
        right_value = {
            "type": "ref",
            "content": {
                "nodeId": UPSTREAM_NODE_ID,
                "name": "limit",
            },
        }
        node_param["termination"] = {
            "logicalOperator": "and",
            "conditions": [
                {
                    "leftVarIndex": "var-count",
                    "rightVarIndex": str(terminate_at),
                    **({"rightValue": right_value} if terminate_with_ref else {}),
                    "compareOperator": "ge",
                }
            ],
        }

    return LoopNode(
        node_id=LOOP_NODE_ID,
        alias_name="Loop",
        node_type="loop",
        input_identifier=[],
        output_identifier=["count"],
        **node_param,
    )


async def execute_loop(
    loop_node: LoopNode,
    fake_engine: FakeLoopEngine,
) -> NodeRunResult:
    return await loop_node.async_execute(
        variable_pool=build_variable_pool(),
        span=Span(),
        loop_engine={LOOP_START_NODE_ID: fake_engine},
        node_run_status={LOOP_NODE_ID: NodeRunningStatus()},
    )


def test_loop_terminates_before_first_round_when_initial_condition_matches() -> None:
    fake_engine = FakeLoopEngine(loop_chain=build_loop_chain())
    result = asyncio.run(
        execute_loop(
            build_loop_node(initial_count=3, terminate_at=3),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert fake_engine.calls == []
    assert result.outputs == {"count": 3}


def test_loop_updates_variables_from_loop_end_and_terminates_next_round() -> None:
    fake_engine = FakeLoopEngine(loop_chain=build_loop_chain())
    result = asyncio.run(
        execute_loop(
            build_loop_node(initial_count=0, max_loop_count=10, terminate_at=2),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert fake_engine.calls == [{"count": 0}, {"count": 1}]
    assert result.outputs == {"count": 2}


def test_loop_termination_can_compare_with_referenced_output() -> None:
    fake_engine = FakeLoopEngine(loop_chain=build_loop_chain())
    result = asyncio.run(
        execute_loop(
            build_loop_node(
                initial_count=0,
                max_loop_count=10,
                terminate_at=999,
                terminate_with_ref=True,
            ),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert fake_engine.calls == [{"count": 0}, {"count": 1}]
    assert result.outputs == {"count": 2}


def test_loop_default_max_loop_count_is_ten() -> None:
    fake_engine = FakeLoopEngine(loop_chain=build_loop_chain())
    result = asyncio.run(
        execute_loop(
            build_loop_node(max_loop_count=None),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert len(fake_engine.calls) == 10
    assert result.outputs == {"count": 10}


def test_loop_max_loop_count_is_clamped_to_one_hundred() -> None:
    fake_engine = FakeLoopEngine(loop_chain=build_loop_chain())
    result = asyncio.run(
        execute_loop(
            build_loop_node(max_loop_count=101),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert len(fake_engine.calls) == 100
    assert result.outputs == {"count": 100}


def test_loop_exit_stops_loop_immediately() -> None:
    fake_engine = FakeLoopEngine(
        loop_chain=build_loop_chain(exit_node=True),
        results=[
            NodeRunResult(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs={"count": 0},
                outputs={"count": 5},
                node_id=LOOP_EXIT_NODE_ID,
                alias_name="Exit Loop",
                node_type="loop-exit",
            )
        ],
    )
    result = asyncio.run(
        execute_loop(
            build_loop_node(initial_count=0, max_loop_count=10),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert fake_engine.calls == [{"count": 0}]
    assert result.outputs == {"count": 5}


def test_loop_child_error_returns_failed_result() -> None:
    fake_engine = FakeLoopEngine(loop_chain=build_loop_chain(), fail=True)
    result = asyncio.run(
        execute_loop(
            build_loop_node(initial_count=0, max_loop_count=10),
            fake_engine,
        )
    )

    assert result.status == WorkflowNodeExecutionStatus.FAILED
    assert result.error is not None
