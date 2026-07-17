import asyncio
import copy
from enum import Enum
from typing import Any, Dict, Literal

from pydantic import BaseModel, Field, PrivateAttr

from workflow.engine.callbacks.callback_handler import ChatCallBacks
from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.entities.chains import Chains
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.entities.node_running_status import NodeRunningStatus
from workflow.engine.entities.private_config import PrivateConfig
from workflow.engine.entities.variable_pool import VariablePool
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


class ErrorStrategy(Enum):
    FAIL_FAST = "fail_fast"
    CONTINUE = "continue"
    IGNORE_ERROR_OUTPUT = "ignore_error_output"


class IterationBatchOutcome(BaseModel):
    """
    Execution outcome for a single iteration batch item.
    """

    index: int
    result: NodeRunResult | None = None
    error: Exception | None = None
    cancelled: bool = False
    usage: GenerateUsage | None = None

    class Config:
        arbitrary_types_allowed = True


class IterationChildQueues(BaseModel):
    """
    Per-batch queues used to isolate and relay child engine events.
    """

    stream_queue: asyncio.Queue
    order_queue: asyncio.Queue
    relay_queue: asyncio.Queue

    class Config:
        arbitrary_types_allowed = True


class IterationNode(BaseNode):
    """
    Iteration node that executes a workflow subgraph for each item in a batch.

    This node processes batch data by running a complete workflow iteration
    for each item in the input batch, collecting and aggregating results.
    """

    # Node ID of the first node in the workflow subgraph within this iteration
    IterationStartNodeId: str
    isParallel: bool = False
    maxConcurrency: int = Field(default=5, ge=1)
    errorStrategy: Literal["fail_fast", "continue", "ignore_error_output"] = "fail_fast"
    timeout: int = Field(default=300, ge=1)
    _private_config: PrivateConfig = PrivateAttr(
        default_factory=lambda: PrivateConfig(timeout=None)
    )
    _contains_question_answer: bool = PrivateAttr(default=False)

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        Asynchronously execute the iteration node by processing batch data.

        This method processes each item in the input batch by running a complete
        workflow iteration, then aggregates the results from all iterations.

        :param variable_pool: Pool of variables for the workflow execution
        :param span: Tracing span for monitoring and debugging
        :param event_log_node_trace: Optional node-level event logging
        :param kwargs: Additional keyword arguments including:
            - callbacks: ChatCallBacks for handling callbacks
            - event_log_trace: WorkflowLog for event logging
            - node_run_status: Dict tracking node running status
            - iteration_engine: Dictionary of workflow engines for iteration
        :return: NodeRunResult containing execution status and aggregated outputs
        """

        with span.start(
            func_name="async_execute", add_source_function_name=True
        ) as span_context:
            callbacks: ChatCallBacks = kwargs.get("callbacks", {})
            event_log_trace: WorkflowLog = kwargs.get("event_log_trace", {})
            node_run_status: Dict[str, NodeRunningStatus] = kwargs.get(
                "node_run_status", {}
            )
            node_run_status[self.node_id].processing.set()
            try:
                iteration_one_engine = kwargs.get("iteration_engine", {})[
                    self.IterationStartNodeId
                ]
                source_iteration_chains = (
                    iteration_one_engine.engine_ctx.chains.iteration_chains[
                        self.node_id
                    ]
                )
                self._contains_question_answer = (
                    self._iteration_chain_has_question_answer(source_iteration_chains)
                )
                # built_nodes = copy.deepcopy(iteration_one_engine.engine_ctx.built_nodes)

                batch_datas = variable_pool.get_variable(
                    node_id=self.node_id,
                    key_name=self.input_identifier[0],
                    span=span_context,
                )
                inputs = {self.input_identifier[0]: batch_datas}
                await span_context.add_info_events_async({"inputs": f"{inputs}"})

                batch_result_dict = await self._execute_batches(
                    batch_datas=batch_datas,
                    span=span_context,
                    iteration_one_engine=iteration_one_engine,
                    source_iteration_chains=source_iteration_chains,
                    variable_pool=variable_pool,
                    callbacks=callbacks,
                    event_log_trace=event_log_trace,
                )

                return_result = {}
                for out_put_key_name in self.output_identifier:
                    return_result[out_put_key_name] = batch_result_dict.get(
                        out_put_key_name, []
                    )
                await span_context.add_info_events_async({"ret": f"{return_result}"})
            except CustomException as err:
                span_context.record_exception(err)
                return NodeRunResult(
                    status=WorkflowNodeExecutionStatus.FAILED,
                    inputs=inputs,
                    error=err,
                    node_id=self.node_id,
                    alias_name=self.alias_name,
                    node_type=self.node_type,
                )
            except Exception as err:
                span_context.record_exception(err)
                return NodeRunResult(
                    status=WorkflowNodeExecutionStatus.FAILED,
                    inputs=inputs,
                    error=CustomException(
                        CodeEnum.ITERATION_EXECUTION_ERROR,
                        cause_error=err,
                    ),
                    node_id=self.node_id,
                    alias_name=self.alias_name,
                    node_type=self.node_type,
                )
            finally:
                node_run_status[self.node_id].complete.set()

            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs=inputs,
                outputs=return_result,
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
            )

    async def _execute_batches(
        self,
        batch_datas: list[Any],
        span: Span,
        iteration_one_engine: Any,
        source_iteration_chains: Chains,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks,
        event_log_trace: WorkflowLog,
    ) -> dict[str, list[Any]]:
        """
        Execute iteration batches in serial or parallel mode.
        """
        if self._should_run_parallel(batch_datas):
            return await self._execute_batches_in_parallel(
                batch_datas=batch_datas,
                span=span,
                iteration_one_engine=iteration_one_engine,
                variable_pool=variable_pool,
                callbacks=callbacks,
                event_log_trace=event_log_trace,
            )

        return await self._execute_batches_serially(
            batch_datas=batch_datas,
            span=span,
            iteration_one_engine=iteration_one_engine,
            source_iteration_chains=source_iteration_chains,
            variable_pool=variable_pool,
            callbacks=callbacks,
            event_log_trace=event_log_trace,
        )

    async def _execute_batches_serially(
        self,
        batch_datas: list[Any],
        span: Span,
        iteration_one_engine: Any,
        source_iteration_chains: Chains,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks,
        event_log_trace: WorkflowLog,
    ) -> dict[str, list[Any]]:
        """
        Execute iteration batches sequentially with error strategy support.
        """
        error_strategy = self._get_error_strategy()
        batch_result_dict: dict[str, list[Any]] = {}
        temp_variable_pool = copy.deepcopy(variable_pool)
        canonical_keys = set(self.output_identifier)

        for batch_data in batch_datas:
            try:
                res = await self._process_single_batch(
                    batch_data,
                    temp_variable_pool,
                    source_iteration_chains,
                    span,
                    iteration_one_engine,
                    variable_pool,
                    callbacks,
                    event_log_trace,
                )
                canonical_keys.update(res.outputs.keys())
                self._append_batch_outputs(batch_result_dict, res.outputs)
            except Exception as err:
                self._handle_serial_batch_error(
                    err, error_strategy, batch_result_dict, canonical_keys
                )

        return batch_result_dict

    def _handle_serial_batch_error(
        self,
        err: Exception,
        error_strategy: ErrorStrategy,
        batch_result_dict: dict[str, list[Any]],
        canonical_keys: set[str],
    ) -> None:
        """
        Handle a single batch error in serial execution mode.
        """
        if error_strategy == ErrorStrategy.FAIL_FAST:
            raise err
        elif error_strategy == ErrorStrategy.CONTINUE:
            for key in canonical_keys:
                if key not in batch_result_dict:
                    batch_result_dict[key] = []
                batch_result_dict[key].append(None)
        # IGNORE_ERROR_OUTPUT: skip this batch entirely (no action needed)

    def _should_run_parallel(self, batch_datas: list[Any]) -> bool:
        """
        Determine whether the current iteration should run in parallel.
        """
        return (
            self.isParallel
            and len(batch_datas) > 1
            and not self._contains_question_answer
        )

    def _iteration_chain_has_question_answer(
        self, iteration_chains: Chains | None = None
    ) -> bool:
        """
        Determine whether the iteration subgraph contains question-answer nodes.
        """
        if iteration_chains is None:
            return False

        for simple_path in iteration_chains.master_chains:
            if any(
                node_id.split("::")[0] == NodeType.QUESTION_ANSWER.value
                for node_id in simple_path.node_id_list
            ):
                return True

        return False

    async def _execute_batches_in_parallel(
        self,
        batch_datas: list[Any],
        span: Span,
        iteration_one_engine: Any,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks,
        event_log_trace: WorkflowLog,
    ) -> dict[str, list[Any]]:
        """
        Execute iteration batches with independent engines and ordered event relay.
        """
        error_strategy = self._get_error_strategy()
        queue_end = object()
        fail_fast_queue: asyncio.Queue[Exception] = asyncio.Queue()
        sub_dsl = iteration_one_engine.workflow_dsl.extract_iteration_sub_dsl(
            self.node_id
        )
        semaphore = asyncio.Semaphore(max(1, self.maxConcurrency))
        history, history_v2 = self._build_iteration_history(variable_pool)

        child_queues, collector_tasks, runner_tasks = self._create_parallel_tasks(
            batch_datas=batch_datas,
            queue_end=queue_end,
            semaphore=semaphore,
            span=span,
            iteration_one_engine=iteration_one_engine,
            variable_pool=variable_pool,
            callbacks=callbacks,
            event_log_trace=event_log_trace,
            fail_fast_queue=fail_fast_queue,
            error_strategy=error_strategy,
            sub_dsl=sub_dsl,
            history=history,
            history_v2=history_v2,
        )
        fail_fast_monitor = self._create_fail_fast_monitor(
            error_strategy, fail_fast_queue, runner_tasks
        )
        outcomes = await self._gather_parallel_outcomes(
            child_queues=child_queues,
            runner_tasks=runner_tasks,
            collector_tasks=collector_tasks,
            fail_fast_monitor=fail_fast_monitor,
            callbacks=callbacks,
            queue_end=queue_end,
        )

        ordered_outcomes = sorted(outcomes, key=lambda outcome: outcome.index)
        self._aggregate_parallel_usage(callbacks, ordered_outcomes)
        first_error = self._get_first_parallel_error(ordered_outcomes)

        if error_strategy == ErrorStrategy.FAIL_FAST and first_error is not None:
            raise first_error

        return self._build_parallel_batch_result(ordered_outcomes, error_strategy)

    def _create_parallel_tasks(
        self,
        batch_datas: list[Any],
        queue_end: object,
        semaphore: asyncio.Semaphore,
        span: Span,
        iteration_one_engine: Any,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks,
        event_log_trace: WorkflowLog,
        fail_fast_queue: asyncio.Queue[Exception],
        error_strategy: ErrorStrategy,
        sub_dsl: Any,
        history: list[Any],
        history_v2: list[Any],
    ) -> tuple[
        list[IterationChildQueues],
        list[asyncio.Task[None]],
        list[asyncio.Task[IterationBatchOutcome]],
    ]:
        """
        Create per-batch queues, collector tasks, and runner tasks.
        """
        child_queues: list[IterationChildQueues] = []
        collector_tasks: list[asyncio.Task[None]] = []
        runner_tasks: list[asyncio.Task[IterationBatchOutcome]] = []

        for index, batch_data in enumerate(batch_datas):
            queues = self._create_iteration_child_queues()
            child_queues.append(queues)
            collector_tasks.append(
                asyncio.create_task(
                    self._collect_child_events(
                        child_stream_queue=queues.stream_queue,
                        child_order_queue=queues.order_queue,
                        relay_queue=queues.relay_queue,
                        queue_end=queue_end,
                    )
                )
            )
            runner_tasks.append(
                asyncio.create_task(
                    self._run_parallel_batch(
                        index=index,
                        batch_data=batch_data,
                        queues=queues,
                        queue_end=queue_end,
                        semaphore=semaphore,
                        span=span,
                        iteration_one_engine=iteration_one_engine,
                        variable_pool=variable_pool,
                        callbacks=callbacks,
                        event_log_trace=event_log_trace,
                        fail_fast_queue=fail_fast_queue,
                        error_strategy=error_strategy,
                        sub_dsl=sub_dsl,
                        history=history,
                        history_v2=history_v2,
                    )
                )
            )

        return child_queues, collector_tasks, runner_tasks

    def _create_iteration_child_queues(self) -> IterationChildQueues:
        """
        Create the queue bundle used by one parallel iteration.
        """
        return IterationChildQueues(
            stream_queue=asyncio.Queue(),
            order_queue=asyncio.Queue(),
            relay_queue=asyncio.Queue(),
        )

    async def _run_parallel_batch(
        self,
        index: int,
        batch_data: Any,
        queues: IterationChildQueues,
        queue_end: object,
        semaphore: asyncio.Semaphore,
        span: Span,
        iteration_one_engine: Any,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks,
        event_log_trace: WorkflowLog,
        fail_fast_queue: asyncio.Queue[Exception],
        error_strategy: ErrorStrategy,
        sub_dsl: Any,
        history: list[Any],
        history_v2: list[Any],
    ) -> IterationBatchOutcome:
        """
        Run one batch item in its own child engine.
        """
        child_engine = None
        try:
            async with semaphore:
                child_engine, child_span = self._create_iteration_child_engine(
                    parent_span=span,
                    iteration_one_engine=iteration_one_engine,
                    variable_pool=variable_pool,
                    iteration_index=index,
                    callbacks=callbacks,
                    sub_dsl=sub_dsl,
                )
                child_callbacks = self._create_child_callbacks(
                    parent_callbacks=callbacks,
                    child_engine=child_engine,
                    stream_queue=queues.stream_queue,
                    order_queue=queues.order_queue,
                    iteration_index=index,
                )
                run_coro = child_engine.async_run(
                    inputs=self._build_iteration_start_inputs(child_engine, batch_data),
                    span=child_span,
                    callback=child_callbacks,
                    history=history,
                    history_v2=history_v2,
                    event_log_trace=event_log_trace,
                )
                result = await asyncio.wait_for(run_coro, timeout=self.timeout)
                return IterationBatchOutcome(
                    index=index,
                    result=result,
                    usage=child_callbacks.generate_usage.model_copy(deep=True),
                )
        except asyncio.CancelledError:
            return IterationBatchOutcome(index=index, cancelled=True)
        except Exception as err:
            if error_strategy == ErrorStrategy.FAIL_FAST:
                await fail_fast_queue.put(err)
            return IterationBatchOutcome(index=index, error=err)
        finally:
            await self._cleanup_child_engine(child_engine)
            await queues.stream_queue.put(queue_end)
            await queues.order_queue.put(queue_end)

    def _create_iteration_child_engine(
        self,
        parent_span: Span,
        iteration_one_engine: Any,
        variable_pool: VariablePool,
        iteration_index: int,
        callbacks: ChatCallBacks,
        sub_dsl: Any,
    ) -> tuple[Any, Span]:
        """
        Create and configure the child engine for one parallel batch.
        """
        from workflow.engine.dsl_engine import WorkflowEngineFactory
        from workflow.extensions.otlp.trace.span import Span

        child_span = Span(
            app_id=parent_span.app_id,
            uid=parent_span.uid,
            chat_id=parent_span.chat_id,
        )
        child_engine = WorkflowEngineFactory.create_iteration_engine(
            iteration_one_engine.workflow_dsl,
            self.node_id,
            child_span,
            sub_dsl=sub_dsl,
        )
        child_engine.engine_ctx.qa_node_lock = (
            iteration_one_engine.engine_ctx.qa_node_lock or asyncio.Lock()
        )
        child_engine.engine_ctx.variable_pool = copy.deepcopy(variable_pool)
        self._annotate_iteration_child_logs(
            child_engine=child_engine,
            iteration_index=iteration_index,
            parent_event_id=getattr(callbacks, "event_id", ""),
            parent_flow_id=getattr(callbacks, "flow_id", ""),
        )
        return child_engine, child_span

    def _create_fail_fast_monitor(
        self,
        error_strategy: ErrorStrategy,
        fail_fast_queue: asyncio.Queue[Exception],
        runner_tasks: list[asyncio.Task[IterationBatchOutcome]],
    ) -> asyncio.Task[None] | None:
        """
        Create the fail-fast monitor when that mode is enabled.
        """
        if error_strategy != ErrorStrategy.FAIL_FAST:
            return None
        return asyncio.create_task(
            self._monitor_fail_fast(fail_fast_queue, runner_tasks)
        )

    async def _gather_parallel_outcomes(
        self,
        child_queues: list[IterationChildQueues],
        runner_tasks: list[asyncio.Task[IterationBatchOutcome]],
        collector_tasks: list[asyncio.Task[None]],
        fail_fast_monitor: asyncio.Task[None] | None,
        callbacks: ChatCallBacks,
        queue_end: object,
    ) -> list[IterationBatchOutcome]:
        """
        Relay child events, wait for outcomes, and ensure background tasks are cleaned up.
        """
        try:
            for queues in child_queues:
                await self._emit_child_events(
                    relay_queue=queues.relay_queue,
                    callbacks=callbacks,
                    queue_end=queue_end,
                )
            return list(await asyncio.gather(*runner_tasks))
        except BaseException:
            await self._cancel_parallel_background_tasks(
                runner_tasks=runner_tasks,
                collector_tasks=collector_tasks,
                fail_fast_monitor=fail_fast_monitor,
            )
            raise
        finally:
            await self._finalize_parallel_background_tasks(
                collector_tasks=collector_tasks,
                fail_fast_monitor=fail_fast_monitor,
            )

    async def _cancel_parallel_background_tasks(
        self,
        runner_tasks: list[asyncio.Task[IterationBatchOutcome]],
        collector_tasks: list[asyncio.Task[None]],
        fail_fast_monitor: asyncio.Task[None] | None,
    ) -> None:
        """
        Cancel all unfinished background tasks used by parallel iteration.
        """
        for task in [*runner_tasks, *collector_tasks]:
            if not task.done():
                task.cancel()
        if fail_fast_monitor and not fail_fast_monitor.done():
            fail_fast_monitor.cancel()

        remaining = [
            task
            for task in [*runner_tasks, *collector_tasks, fail_fast_monitor]
            if task is not None and not task.done()
        ]
        if remaining:
            await asyncio.gather(*remaining, return_exceptions=True)

    async def _finalize_parallel_background_tasks(
        self,
        collector_tasks: list[asyncio.Task[None]],
        fail_fast_monitor: asyncio.Task[None] | None,
    ) -> None:
        """
        Await background tasks so no orphaned tasks remain after parallel execution.
        """
        if fail_fast_monitor:
            fail_fast_monitor.cancel()
            await asyncio.gather(fail_fast_monitor, return_exceptions=True)
        await asyncio.gather(*collector_tasks, return_exceptions=True)

    def _get_first_parallel_error(
        self, ordered_outcomes: list[IterationBatchOutcome]
    ) -> Exception | None:
        """
        Return the first non-cancelled error from parallel outcomes.
        """
        return next(
            (
                outcome.error
                for outcome in ordered_outcomes
                if outcome.error is not None and not outcome.cancelled
            ),
            None,
        )

    def _build_parallel_batch_result(
        self,
        ordered_outcomes: list[IterationBatchOutcome],
        error_strategy: ErrorStrategy,
    ) -> dict[str, list[Any]]:
        """
        Build aligned batch outputs from ordered parallel outcomes.
        """
        canonical_keys = set(self.output_identifier)
        batch_result_dict: dict[str, list[Any]] = {}

        for outcome in ordered_outcomes:
            if outcome.result is not None:
                self._append_parallel_outcome_values(
                    batch_result_dict=batch_result_dict,
                    canonical_keys=canonical_keys,
                    outputs=outcome.result.outputs,
                )
            elif error_strategy == ErrorStrategy.CONTINUE:
                # Append None placeholders for failed batch
                self._append_parallel_outcome_values(
                    batch_result_dict=batch_result_dict,
                    canonical_keys=canonical_keys,
                    outputs=None,
                )
            elif error_strategy == ErrorStrategy.IGNORE_ERROR_OUTPUT:
                # Skip failed batch entirely (no placeholder)
                pass

        return batch_result_dict

    def _append_parallel_outcome_values(
        self,
        batch_result_dict: dict[str, list[Any]],
        canonical_keys: set[str],
        outputs: dict[str, Any] | None,
    ) -> None:
        """
        Append one outcome's values, preserving output alignment across batches.
        """
        for key in canonical_keys:
            if key not in batch_result_dict:
                batch_result_dict[key] = []
            batch_result_dict[key].append(None if outputs is None else outputs.get(key))

    async def _monitor_fail_fast(
        self,
        fail_fast_queue: asyncio.Queue[Exception],
        runner_tasks: list[asyncio.Task[IterationBatchOutcome]],
    ) -> None:
        """
        Cancel remaining iteration tasks as soon as the first error is observed.
        """
        try:
            await fail_fast_queue.get()
            for task in runner_tasks:
                if not task.done():
                    task.cancel()
        except asyncio.CancelledError:
            return

    async def _collect_child_events(
        self,
        child_stream_queue: asyncio.Queue,
        child_order_queue: asyncio.Queue,
        relay_queue: asyncio.Queue,
        queue_end: object,
    ) -> None:
        """
        Drain child queues concurrently and preserve each child's event order.
        """
        queue_done_state = {"stream": False, "order": False}

        while not all(queue_done_state.values()):
            wait_tasks = self._build_child_queue_wait_tasks(
                child_stream_queue=child_stream_queue,
                child_order_queue=child_order_queue,
                queue_done_state=queue_done_state,
            )

            done, pending = await asyncio.wait(
                wait_tasks.keys(), return_when=asyncio.FIRST_COMPLETED
            )
            await self._cancel_pending_wait_tasks(pending)

            for done_task in done:
                queue_type = wait_tasks[done_task]
                await self._consume_child_event_task_result(
                    done_task=done_task,
                    queue_type=queue_type,
                    relay_queue=relay_queue,
                    queue_end=queue_end,
                    queue_done_state=queue_done_state,
                )

        await relay_queue.put(queue_end)

    def _build_child_queue_wait_tasks(
        self,
        child_stream_queue: asyncio.Queue,
        child_order_queue: asyncio.Queue,
        queue_done_state: dict[str, bool],
    ) -> dict[asyncio.Task, str]:
        """
        Build the set of queue read tasks that are still active.
        """
        wait_tasks: dict[asyncio.Task, str] = {}
        if not queue_done_state["stream"]:
            wait_tasks[asyncio.create_task(child_stream_queue.get())] = "stream"
        if not queue_done_state["order"]:
            wait_tasks[asyncio.create_task(child_order_queue.get())] = "order"
        return wait_tasks

    async def _cancel_pending_wait_tasks(
        self, pending_tasks: set[asyncio.Task]
    ) -> None:
        """
        Cancel and await queue read tasks that lost the race.
        """
        for pending_task in pending_tasks:
            pending_task.cancel()
        await asyncio.gather(*pending_tasks, return_exceptions=True)

    async def _consume_child_event_task_result(
        self,
        done_task: asyncio.Task,
        queue_type: str,
        relay_queue: asyncio.Queue,
        queue_end: object,
        queue_done_state: dict[str, bool],
    ) -> None:
        """
        Consume one completed queue read task and update queue completion state.
        """
        try:
            payload = done_task.result()
        except (asyncio.CancelledError, Exception):
            self._mark_child_queue_done(queue_done_state, queue_type)
            return

        if payload is queue_end:
            self._mark_child_queue_done(queue_done_state, queue_type)
            return

        await relay_queue.put((queue_type, payload))

    def _mark_child_queue_done(
        self, queue_done_state: dict[str, bool], queue_type: str
    ) -> None:
        """
        Mark one child queue as finished.
        """
        queue_done_state[queue_type] = True

    async def _emit_child_events(
        self,
        relay_queue: asyncio.Queue,
        callbacks: ChatCallBacks,
        queue_end: object,
    ) -> None:
        """
        Emit one child's buffered events to the parent queues in strict order.
        """
        while True:
            payload = await relay_queue.get()
            if payload is queue_end:
                return

            queue_type, event_payload = payload
            if queue_type == "stream":
                await callbacks.stream_queue.put(event_payload)
            else:
                await callbacks.order_stream_result_q.put(event_payload)

    def _create_child_callbacks(
        self,
        parent_callbacks: ChatCallBacks,
        child_engine: Any,
        stream_queue: asyncio.Queue,
        order_queue: asyncio.Queue,
        iteration_index: int,
    ) -> ChatCallBacks:
        """
        Create an isolated callback handler for a child iteration engine.
        """
        return ChatCallBacks(
            sid=parent_callbacks.sid,
            stream_queue=stream_queue,
            end_node_output_mode=child_engine.end_node_output_mode,
            support_stream_node_ids=child_engine.support_stream_node_ids,
            need_order_stream_result_q=order_queue,
            chains=child_engine.engine_ctx.chains,
            event_id=parent_callbacks.event_id,
            flow_id=parent_callbacks.flow_id,
            ordered_stream_namespace=f"{self.node_id}::{iteration_index}",
        )

    def _annotate_iteration_child_logs(
        self,
        child_engine: Any,
        iteration_index: int,
        parent_event_id: str,
        parent_flow_id: str,
    ) -> None:
        """
        Annotate child engine node logs with iteration runtime metadata.
        """
        built_nodes = getattr(
            getattr(child_engine, "engine_ctx", None), "built_nodes", {}
        )
        for built_node in built_nodes.values():
            node_log = getattr(built_node, "node_log", None)
            if node_log is None:
                continue
            node_log.append_config_data(
                {
                    "iteration_index": iteration_index,
                    "parent_event_id": parent_event_id,
                    "parent_flow_id": parent_flow_id,
                    "parent_iteration_node_id": self.node_id,
                }
            )
            node_log.add_info_log("iteration child runtime metadata attached")

    def _aggregate_parallel_usage(
        self,
        callbacks: ChatCallBacks,
        ordered_outcomes: list[IterationBatchOutcome],
    ) -> None:
        """
        Aggregate child callback usage into the parent callback usage.
        """
        parent_usage = getattr(callbacks, "generate_usage", None)
        if parent_usage is None:
            return

        for outcome in ordered_outcomes:
            if outcome.usage is not None:
                parent_usage.add(outcome.usage)

    async def _cleanup_child_engine(self, child_engine: Any) -> None:
        """
        Best-effort cleanup for per-batch child engines.
        """
        if child_engine is None:
            return

        for method_name in ("aclose", "close", "cleanup"):
            method = getattr(child_engine, method_name, None)
            if method is None:
                continue
            result = method()
            if asyncio.iscoroutine(result):
                await result
            break

    def _build_iteration_history(
        self, variable_pool: VariablePool
    ) -> tuple[list[Any], list[Any]]:
        """
        Build history payloads shared by iteration executions.
        """
        history = []
        history_ai_msg = variable_pool.get_history(node_id=self.node_id)
        for history_item in history_ai_msg:
            history.append(history_item.dict())

        history_v2 = []
        if variable_pool.history_v2:
            # Keep master-stash semantics by passing origin_history only,
            # but deep copy it so parallel iterations never share mutable items.
            history_v2 = copy.deepcopy(variable_pool.history_v2.origin_history)
        return history, history_v2

    def _append_batch_outputs(
        self, batch_result_dict: dict[str, list[Any]], outputs: dict[str, Any]
    ) -> None:
        """
        Append one successful batch result into the aggregated result dictionary.
        """
        for result_key, result_value in outputs.items():
            if result_key not in batch_result_dict:
                batch_result_dict[result_key] = []
            batch_result_dict[result_key].append(result_value)

    def _get_error_strategy(self) -> ErrorStrategy:
        """
        Normalize the configured error strategy.
        """
        try:
            return ErrorStrategy(self.errorStrategy)
        except ValueError:
            return ErrorStrategy.FAIL_FAST

    def _build_iteration_start_inputs(
        self, iteration_engine: Any, batch_data: Any
    ) -> dict[str, Any]:
        """
        Build iteration start inputs from the child start node declaration.
        """
        start_node_id = iteration_engine.sparkflow_engine_node.node_id
        output_variable_mapping = getattr(
            iteration_engine.engine_ctx.variable_pool,
            "output_variable_mapping",
            {},
        )
        available_start_keys = [
            mapping_key.split(f"{start_node_id}-", 1)[1]
            for mapping_key in output_variable_mapping.keys()
            if mapping_key.startswith(f"{start_node_id}-")
        ]
        start_output_identifier = getattr(
            iteration_engine.sparkflow_engine_node.node_instance,
            "output_identifier",
            [],
        )

        if start_output_identifier and all(
            key in available_start_keys for key in start_output_identifier
        ):
            resolved_start_keys = start_output_identifier
        elif available_start_keys:
            resolved_start_keys = available_start_keys
        else:
            resolved_start_keys = []

        if not resolved_start_keys:
            return {self.input_identifier[0]: batch_data}

        if len(resolved_start_keys) == 1:
            return {resolved_start_keys[0]: batch_data}

        if isinstance(batch_data, dict):
            return {
                key: batch_data.get(key)
                for key in resolved_start_keys
                if key in batch_data
            }

        return {resolved_start_keys[0]: batch_data}

    async def _process_single_batch(
        self,
        batch_data: Any,
        temp_variable_pool: VariablePool,
        source_iteration_chains: Chains,
        span: Span,
        iteration_one_engine: Any,
        variable_pool: VariablePool,
        callbacks: ChatCallBacks,
        event_log_trace: WorkflowLog,
    ) -> NodeRunResult:
        """
        Process a single batch item through the iteration workflow.

        This method sets up a fresh execution environment for each batch item,
        runs the complete iteration workflow, and returns the results.

        :param batch_data: Single item from the batch to be processed
        :param temp_variable_pool: Temporary variable pool for this iteration
        :param source_iteration_chains: Source chains configuration for iteration
        :param span: Tracing span for monitoring and debugging
        :param iteration_one_engine: Workflow engine instance for this iteration
        :param variable_pool: Original variable pool containing history and context
        :param callbacks: Callback handlers for the workflow execution
        :param event_log_trace: Event logging trace for the workflow
        :return: NodeRunResult containing the execution results for this batch item
        """
        cur_batch_data_dict = self._build_iteration_start_inputs(
            iteration_one_engine, batch_data
        )

        # Prepare execution environment for this iteration
        new_variable_pool = copy.deepcopy(temp_variable_pool)
        iteration_chains = copy.deepcopy(source_iteration_chains)

        iteration_one_engine.engine_ctx.variable_pool = new_variable_pool
        iteration_one_engine.engine_ctx.chains = iteration_chains

        try:
            # Convert legacy history format for compatibility
            history, history_v2 = self._build_iteration_history(variable_pool)
            return await iteration_one_engine.async_run(
                inputs=cur_batch_data_dict,
                span=span,
                callback=callbacks,
                history=history,
                history_v2=history_v2,
                event_log_trace=event_log_trace,
            )
        finally:
            await self._reset_iteration_engine_state(
                iteration_one_engine=iteration_one_engine,
                iteration_chains=iteration_chains,
                variable_pool=new_variable_pool,
            )

    async def _reset_iteration_engine_state(
        self,
        iteration_one_engine: Any,
        iteration_chains: Chains,
        variable_pool: VariablePool,
    ) -> None:
        """
        Reset the shared serial iteration engine after each batch attempt.
        """
        pending_tasks: list[asyncio.Task[Any]] = []
        for task in iteration_one_engine.engine_ctx.dfs_tasks:
            if not isinstance(task, asyncio.Task):
                continue
            if task.done():
                continue
            task.cancel()
            pending_tasks.append(task)

        if pending_tasks:
            await asyncio.gather(*pending_tasks, return_exceptions=True)

        self._init_iteration_node(
            iteration_one_engine.engine_ctx.node_run_status,
            iteration_chains,
            variable_pool,
        )
        iteration_one_engine.engine_ctx.responses.clear()
        iteration_one_engine.engine_ctx.dfs_tasks.clear()
        iteration_one_engine.engine_ctx.end_complete = asyncio.Event()

    def _init_iteration_node(
        self,
        node_run_status: Dict[str, NodeRunningStatus],
        chains: Chains,
        variable_pool: VariablePool,
    ) -> None:
        """
        Initialize iteration node running status for the next iteration.

        This method resets all node running status flags and clears stream data
        for message and end nodes to prepare for the next iteration execution.

        :param node_run_status: Dictionary mapping node IDs to their running status
        :param chains: Workflow chains configuration
        :param variable_pool: Variable pool containing stream data to be reset
        """
        try:
            for master_chain in chains.master_chains:
                for node_id in master_chain.node_id_list:
                    node_run_status[node_id].processing.clear()
                    node_run_status[node_id].complete.clear()
                    node_run_status[node_id].start_with_thread.clear()
                    node_run_status[node_id].pre_processing.clear()
                    node_run_status[node_id].not_run.clear()
                    # Reset stream data for message and end nodes within iteration
                    if node_id.split(":")[0] in [
                        NodeType.MESSAGE.value,
                        NodeType.ITERATION_END.value,
                    ]:
                        if node_id not in variable_pool.stream_data:
                            continue
                        for k, _ in variable_pool.stream_data[node_id].items():
                            variable_pool.stream_data[node_id][k] = asyncio.Queue()
        except Exception as e:
            raise e


class IterationStartNode(BaseNode):
    """
    Start node for iteration workflow subgraph.

    This node serves as the entry point for each iteration within an iteration node.
    It retrieves variables from the variable pool and passes them to the next nodes
    in the iteration workflow.
    """

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        Asynchronously execute the iteration start node.

        This method retrieves variables from the variable pool based on the output
        identifiers and returns them as the node's outputs.

        :param variable_pool: Pool of variables for the workflow execution
        :param span: Tracing span for monitoring and debugging
        :param event_log_node_trace: Optional node-level event logging
        :param kwargs: Additional keyword arguments
        :return: NodeRunResult containing execution status and retrieved variables
        """
        outputs: dict = {}  # node outputs
        try:
            for key in self.output_identifier:
                outputs[key] = variable_pool.get_variable(
                    node_id=self.node_id, key_name=key, span=span
                )
            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs=outputs,
                outputs={},
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )
        except Exception as e:
            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.FAILED,
                error=CustomException(
                    CodeEnum.ITERATION_EXECUTION_ERROR,
                    cause_error=e,
                ),
                inputs=outputs,
                outputs={},
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )


class IterationEndNode(BaseNode):
    """
    End node for iteration workflow subgraph.

    This node serves as the exit point for each iteration within an iteration node.
    It processes the final outputs and can apply template transformations based on
    the configured output mode.
    """

    outputMode: int

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        Asynchronously execute the iteration end node.

        This method processes the final outputs of the iteration, retrieves variables
        from the variable pool, and optionally applies template transformations based
        on the output mode configuration.

        :param variable_pool: Pool of variables for the workflow execution
        :param span: Tracing span for monitoring and debugging
        :param event_log_node_trace: Optional node-level event logging
        :param kwargs: Additional keyword arguments
        :return: NodeRunResult containing execution status and processed outputs
        """
        inputs: dict = {}
        outputs: dict = {}
        try:
            for end_input in self.input_identifier:
                outputs.update(
                    {
                        end_input: variable_pool.get_variable(
                            node_id=self.node_id, key_name=end_input, span=span
                        )
                    }
                )

            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs=inputs,
                outputs=outputs,
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )
        except Exception as err:
            span.record_exception(err)
            return NodeRunResult(
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                status=WorkflowNodeExecutionStatus.FAILED,
                error=CustomException(
                    CodeEnum.END_NODE_EXECUTION_ERROR,
                    cause_error=err,
                ),
            )
