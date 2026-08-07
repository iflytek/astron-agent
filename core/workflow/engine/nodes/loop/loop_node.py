import asyncio
import copy
import re
from typing import Any, Literal

from pydantic import BaseModel, Field

from workflow.consts.engine.value_type import ValueType
from workflow.domain.entities.chat import HistoryItem
from workflow.engine.callbacks.callback_handler import ChatCallBacks
from workflow.engine.entities.chains import Chains
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.entities.node_running_status import NodeRunningStatus
from workflow.engine.entities.variable_pool import (
    VariablePool,
    schema_type_default_value,
)
from workflow.engine.entities.workflow_dsl import NodeRef
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.log_trace.workflow_log import WorkflowLog
from workflow.extensions.otlp.trace.span import Span


class LoopVariable(BaseModel):
    """
    Loop runtime variable declaration.
    """

    id: str = ""
    name: str
    # Workflow DSL uses "schema"; BaseModel also exposes a schema() method.
    schema: dict[str, Any] = Field(default_factory=dict)  # type: ignore[assignment]
    value: Any = None
    initialValue: Any = None
    defaultValue: Any = None


class LoopCondition(BaseModel):
    """
    Loop termination condition. The shape mirrors if-else conditions.
    """

    leftVarIndex: str | None = None
    rightVarIndex: str | None = None
    rightValue: Any = None
    compareOperator: Literal[
        "contains",
        "not_contains",
        "empty",
        "not_empty",
        "is",
        "is_not",
        "start_with",
        "end_with",
        "eq",
        "ne",
        "gt",
        "ge",
        "lt",
        "le",
        "null",
        "not_null",
        "length_ge",
        "length_le",
        "length_eq",
        "length_gt",
        "length_lt",
        "regex_contains",
        "regex_not_contains",
    ]


class LoopTermination(BaseModel):
    """
    Termination condition group.
    """

    logicalOperator: Literal["and", "or"] = "and"
    conditions: list[LoopCondition] = Field(default_factory=list)


class LoopNode(BaseNode):
    """
    Stateful loop container node.

    Unlike iteration, loop executes one child subgraph repeatedly and uses the
    previous round's loop variables as the next round's inputs.
    """

    LoopStartNodeId: str
    maxLoopCount: int = 10
    loopVariables: list[LoopVariable] = Field(default_factory=list)
    termination: LoopTermination = Field(default_factory=LoopTermination)

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        inputs: dict[str, Any] = {}
        return_result: dict[str, Any] = {}
        with span.start(
            func_name="async_execute", add_source_function_name=True
        ) as span_context:
            node_run_status: dict[str, NodeRunningStatus] = kwargs.get(
                "node_run_status", {}
            )
            callbacks: ChatCallBacks = kwargs.get("callbacks")
            event_log_trace: WorkflowLog = kwargs.get("event_log_trace")
            try:
                loop_one_engine = kwargs.get("loop_engine", {})[self.LoopStartNodeId]
                source_loop_chains = loop_one_engine.engine_ctx.chains.loop_chains[
                    self.node_id
                ]
                loop_values = self._resolve_initial_loop_values(
                    variable_pool=variable_pool,
                    span=span_context,
                )
                inputs = copy.deepcopy(loop_values)
                max_loop_count = self._normalize_max_loop_count(self.maxLoopCount)

                for loop_index in range(max_loop_count):
                    if self._should_terminate(
                        loop_values=loop_values,
                        variable_pool=variable_pool,
                        span=span_context,
                    ):
                        break

                    result = await self._execute_one_round(
                        loop_values=loop_values,
                        loop_index=loop_index,
                        loop_one_engine=loop_one_engine,
                        source_loop_chains=source_loop_chains,
                        variable_pool=variable_pool,
                        callbacks=callbacks,
                        event_log_trace=event_log_trace,
                        span=span_context,
                    )
                    if result.status != WorkflowNodeExecutionStatus.SUCCEEDED:
                        raise result.error or CustomException(
                            CodeEnum.ITERATION_EXECUTION_ERROR,
                            err_msg="Loop child graph execution failed",
                        )
                    loop_values = self._merge_loop_outputs(loop_values, result.outputs)

                    if result.node_id.startswith(NodeType.LOOP_EXIT.value):
                        break

                return_result = self._build_return_result(loop_values)
                await span_context.add_info_events_async(
                    {
                        "loop_inputs": f"{inputs}",
                        "loop_outputs": f"{return_result}",
                    }
                )
            except CustomException as err:
                span_context.record_exception(err)
                return self.fail(err, span_context, inputs=inputs)
            except Exception as err:
                span_context.record_exception(err)
                return self.fail(
                    CustomException(
                        CodeEnum.ITERATION_EXECUTION_ERROR,
                        err_msg="Loop node execution failed",
                        cause_error=err,
                    ),
                    span_context,
                    inputs=inputs,
                )
            finally:
                if self.node_id in node_run_status:
                    node_run_status[self.node_id].complete.set()

            return self.success(inputs=inputs, outputs=return_result)

    def _resolve_initial_loop_values(
        self, variable_pool: VariablePool, span: Span
    ) -> dict[str, Any]:
        loop_values: dict[str, Any] = {}
        for variable in self.loopVariables:
            value = self._resolve_loop_variable_value(variable, variable_pool, span)
            loop_values[variable.name] = value
        return loop_values

    def _resolve_loop_variable_value(
        self, variable: LoopVariable, variable_pool: VariablePool, span: Span
    ) -> Any:
        configured_value = self._first_present(
            variable.value,
            variable.initialValue,
            variable.defaultValue,
        )
        if configured_value is not None:
            return self._resolve_configured_value(configured_value, variable_pool, span)

        if variable.name in self.input_identifier:
            try:
                return variable_pool.get_variable(
                    node_id=self.node_id,
                    key_name=variable.name,
                    span=span,
                )
            except Exception:
                pass

        return schema_type_default_value.get(variable.schema.get("type"))

    def _resolve_configured_value(
        self, configured_value: Any, variable_pool: VariablePool, span: Span
    ) -> Any:
        if not isinstance(configured_value, dict):
            return configured_value

        value_type = configured_value.get("type")
        content = configured_value.get("content")
        if value_type == ValueType.LITERAL.value:
            return content
        if value_type == ValueType.REF.value:
            if isinstance(content, NodeRef):
                return variable_pool.get_output_variable(
                    node_id=content.nodeId,
                    key_name=content.name,
                    span=span,
                    first_only=True,
                )
            if isinstance(content, dict):
                return variable_pool.get_output_variable(
                    node_id=str(content.get("nodeId", "")),
                    key_name=str(content.get("name", "")),
                    span=span,
                    first_only=True,
                )

        return content if "content" in configured_value else configured_value

    def _first_present(self, *values: Any) -> Any:
        for value in values:
            if value is not None:
                return value
        return None

    def _normalize_max_loop_count(self, max_loop_count: int | str | None) -> int:
        try:
            normalized = int(max_loop_count if max_loop_count is not None else 10)
        except (TypeError, ValueError):
            normalized = 10
        return max(1, min(normalized, 100))

    def _should_terminate(
        self,
        loop_values: dict[str, Any],
        variable_pool: VariablePool,
        span: Span,
    ) -> bool:
        conditions = self.termination.conditions
        if not conditions:
            return False

        results = [
            self._evaluate_condition(condition, loop_values, variable_pool, span)
            for condition in conditions
            if condition.leftVarIndex
        ]
        if not results:
            return False

        if self.termination.logicalOperator == "or":
            return any(results)
        return all(results)

    def _evaluate_condition(
        self,
        condition: LoopCondition,
        loop_values: dict[str, Any],
        variable_pool: VariablePool,
        span: Span,
    ) -> bool:
        actual_value = self._resolve_condition_operand(
            condition.leftVarIndex, loop_values
        )
        if condition.rightValue is not None:
            expected_value = self._resolve_configured_value(
                condition.rightValue, variable_pool, span
            )
        else:
            expected_value = self._resolve_condition_operand(
                condition.rightVarIndex, loop_values
            )
        return self._compare(
            actual_value=actual_value,
            expected_value=expected_value,
            operator=condition.compareOperator,
        )

    def _resolve_condition_operand(
        self, operand: str | None, loop_values: dict[str, Any]
    ) -> Any:
        if operand is None:
            return None

        variable_by_id = {
            variable.id: variable.name for variable in self.loopVariables if variable.id
        }
        variable_name = variable_by_id.get(operand, operand)
        return loop_values.get(variable_name, operand)

    def _compare(self, actual_value: Any, expected_value: Any, operator: str) -> bool:
        match operator:
            case "contains":
                return self._contains(actual_value, expected_value)
            case "not_contains":
                return not self._contains(actual_value, expected_value)
            case "empty":
                return self._empty(actual_value)
            case "not_empty":
                return not self._empty(actual_value)
            case "is" | "eq":
                return self._equal(actual_value, expected_value)
            case "is_not" | "ne":
                return not self._equal(actual_value, expected_value)
            case "start_with":
                return isinstance(actual_value, str) and actual_value.startswith(
                    str(expected_value)
                )
            case "end_with":
                return isinstance(actual_value, str) and actual_value.endswith(
                    str(expected_value)
                )
            case "gt":
                return self._number(actual_value) > self._number(expected_value)
            case "ge":
                return self._number(actual_value) >= self._number(expected_value)
            case "lt":
                return self._number(actual_value) < self._number(expected_value)
            case "le":
                return self._number(actual_value) <= self._number(expected_value)
            case "null":
                return actual_value is None
            case "not_null":
                return actual_value is not None
            case "length_ge":
                return self._length(actual_value) >= int(expected_value)
            case "length_le":
                return self._length(actual_value) <= int(expected_value)
            case "length_eq":
                return self._length(actual_value) == int(expected_value)
            case "length_gt":
                return self._length(actual_value) > int(expected_value)
            case "length_lt":
                return self._length(actual_value) < int(expected_value)
            case "regex_contains":
                return re.search(str(expected_value), str(actual_value)) is not None
            case "regex_not_contains":
                return re.search(str(expected_value), str(actual_value)) is None
            case _:
                return False

    def _contains(self, actual_value: Any, expected_value: Any) -> bool:
        if actual_value is None:
            return False
        if isinstance(actual_value, dict):
            return expected_value in actual_value or str(expected_value) in str(
                actual_value
            )
        if isinstance(actual_value, str):
            return str(expected_value) in actual_value
        if isinstance(actual_value, list):
            return expected_value in actual_value
        return False

    def _empty(self, actual_value: Any) -> bool:
        if actual_value is None:
            return True
        if isinstance(actual_value, bool):
            return actual_value is False
        if isinstance(actual_value, (int, float)):
            return actual_value == 0
        if isinstance(actual_value, (str, list, dict)):
            return len(actual_value) == 0
        return False

    def _equal(self, actual_value: Any, expected_value: Any) -> bool:
        if isinstance(actual_value, bool) and isinstance(expected_value, str):
            return actual_value is (expected_value.strip().lower() in ("true", "1"))
        if isinstance(actual_value, (int, float)) and not isinstance(
            actual_value, bool
        ):
            return self._number(actual_value) == self._number(expected_value)
        return actual_value == expected_value

    def _number(self, value: Any) -> float:
        return float(value)

    def _length(self, value: Any) -> int:
        if not isinstance(value, (str, list, dict)):
            return 0
        return len(value)

    async def _execute_one_round(
        self,
        loop_values: dict[str, Any],
        loop_index: int,
        loop_one_engine: Any,
        source_loop_chains: Chains,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks | None,
        event_log_trace: WorkflowLog | None,
        span: Span,
    ) -> NodeRunResult:
        new_variable_pool = copy.deepcopy(variable_pool)
        loop_chains = copy.deepcopy(source_loop_chains)

        loop_one_engine.engine_ctx.variable_pool = new_variable_pool
        loop_one_engine.engine_ctx.chains = loop_chains
        try:
            history, history_v2 = self._build_loop_history(variable_pool)
            result = await loop_one_engine.async_run(
                inputs=loop_values,
                span=span,
                callback=callbacks,
                history=history,
                history_v2=history_v2,
                event_log_trace=event_log_trace,
            )
            return result
        finally:
            await self._reset_loop_engine_state(
                loop_one_engine=loop_one_engine,
                loop_chains=loop_chains,
                variable_pool=new_variable_pool,
                loop_index=loop_index,
            )

    def _build_loop_history(
        self, variable_pool: VariablePool
    ) -> tuple[list[Any], list[HistoryItem]]:
        history = [
            history_item.dict()
            for history_item in variable_pool.get_history(self.node_id)
        ]
        history_v2: list[HistoryItem] = []
        if variable_pool.history_v2:
            history_v2 = copy.deepcopy(variable_pool.history_v2.origin_history)
        return history, history_v2

    async def _reset_loop_engine_state(
        self,
        loop_one_engine: Any,
        loop_chains: Chains,
        variable_pool: VariablePool,
        loop_index: int,
    ) -> None:
        pending_tasks: list[asyncio.Task[Any]] = []
        for task in loop_one_engine.engine_ctx.dfs_tasks:
            if not isinstance(task, asyncio.Task) or task.done():
                continue
            task.cancel()
            pending_tasks.append(task)

        if pending_tasks:
            await asyncio.gather(*pending_tasks, return_exceptions=True)

        for master_chain in loop_chains.master_chains:
            for node_id in master_chain.node_id_list:
                status = loop_one_engine.engine_ctx.node_run_status[node_id]
                status.processing.clear()
                status.complete.clear()
                status.start_with_thread.clear()
                status.pre_processing.clear()
                status.not_run.clear()
                if node_id.split(":")[0] in [
                    NodeType.MESSAGE.value,
                    NodeType.LOOP_END.value,
                    NodeType.LOOP_EXIT.value,
                ]:
                    if node_id not in variable_pool.stream_data:
                        continue
                    for key in variable_pool.stream_data[node_id]:
                        variable_pool.stream_data[node_id][key] = asyncio.Queue()

        loop_one_engine.engine_ctx.responses.clear()
        loop_one_engine.engine_ctx.dfs_tasks.clear()
        loop_one_engine.engine_ctx.end_complete = asyncio.Event()

    def _merge_loop_outputs(
        self, loop_values: dict[str, Any], outputs: dict[str, Any]
    ) -> dict[str, Any]:
        next_values = copy.deepcopy(loop_values)
        for key, value in outputs.items():
            if key in next_values:
                next_values[key] = value
        return next_values

    def _build_return_result(self, loop_values: dict[str, Any]) -> dict[str, Any]:
        if self.output_identifier:
            default_by_output = {
                variable.name: schema_type_default_value.get(
                    variable.schema.get("type")
                )
                for variable in self.loopVariables
            }
            return {
                key: loop_values.get(
                    key,
                    default_by_output.get(key, schema_type_default_value.get("string")),
                )
                for key in self.output_identifier
            }
        return copy.deepcopy(loop_values)


class LoopStartNode(BaseNode):
    """
    Start node for loop subgraphs.
    """

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        outputs: dict[str, Any] = {}
        try:
            for key in self.output_identifier:
                outputs[key] = variable_pool.get_variable(
                    node_id=self.node_id,
                    key_name=key,
                    span=span,
                )
            return self.success(inputs=outputs, outputs=outputs)
        except Exception as err:
            return self.fail(
                CustomException(
                    CodeEnum.ITERATION_EXECUTION_ERROR,
                    err_msg="Loop start node execution failed",
                    cause_error=err,
                ),
                span,
                inputs=outputs,
            )


class LoopEndNode(BaseNode):
    """
    End node for loop subgraphs.
    """

    outputMode: int = 0

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        return await self._resolve_inputs(variable_pool, span)

    async def _resolve_inputs(
        self, variable_pool: VariablePool, span: Span
    ) -> NodeRunResult:
        outputs: dict[str, Any] = {}
        try:
            for end_input in self.input_identifier:
                outputs[end_input] = variable_pool.get_variable(
                    node_id=self.node_id,
                    key_name=end_input,
                    span=span,
                )
            return self.success(inputs={}, outputs=outputs)
        except Exception as err:
            return self.fail(
                CustomException(
                    CodeEnum.END_NODE_EXECUTION_ERROR,
                    cause_error=err,
                ),
                span,
            )


class LoopExitNode(LoopEndNode):
    """
    Terminal node that exits a loop immediately.
    """
