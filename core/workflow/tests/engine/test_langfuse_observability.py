"""Integration tests for workflow Langfuse/OpenTelemetry instrumentation."""

import json
from types import SimpleNamespace
from typing import Any, AsyncIterator, ClassVar, Mapping, cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from common.otlp.trace.langfuse import (
    LangfuseBaggageSpanProcessor,
    langfuse_trace_attributes,
    langfuse_trace_context,
)
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from workflow.consts.engine.chat_status import SparkLLMStatus
from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.node import NodeExecutionTemplate, SparkFlowEngineNode
from workflow.engine.nodes.base_node import BaseLLMNode, BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.extensions.otlp.trace.trace import Trace


@pytest.fixture(autouse=True)
def _enable_langfuse(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")


class _SuccessfulToolNode(BaseNode):
    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **_kwargs: Any,
    ) -> NodeRunResult:
        del variable_pool, span, event_log_node_trace
        return self.success(
            inputs={"query": "synthetic secret"},
            outputs={"answer": "synthetic result"},
            token_cost=GenerateUsage(
                prompt_tokens=3, completion_tokens=2, total_tokens=5
            ),
        )


class _FakeChatAI:
    async def achat(self, **_kwargs: Any) -> AsyncIterator[Any]:
        yield SimpleNamespace(msg={"content": "synthetic answer"})

    @staticmethod
    def decode_message(_message: Any) -> tuple[Any, str, str, dict[str, int]]:
        return (
            SparkLLMStatus.END.value,
            "synthetic answer",
            "",
            {"prompt_tokens": 7, "completion_tokens": 4, "total_tokens": 11},
        )


class _ObservableLLMNode(BaseLLMNode):
    fake_chat_ai: ClassVar[_FakeChatAI] = _FakeChatAI()

    def _get_chat_ai(self, uid: str = "") -> Any:
        del uid
        return self.fake_chat_ai

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **_kwargs: Any,
    ) -> NodeRunResult:
        del variable_pool, span, event_log_node_trace
        raise NotImplementedError


def _span_with_exporter() -> tuple[Span, InMemorySpanExporter, TracerProvider]:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    span = Span(app_id="test-app", uid="test-user", chat_id="test-chat")
    span.tracer = provider.get_tracer("langfuse-workflow-test")
    return span, exporter, provider


def _span_attributes(span: ReadableSpan) -> Mapping[str, Any]:
    assert span.attributes is not None
    return cast(Mapping[str, Any], span.attributes)


@pytest.mark.asyncio
async def test_node_execution_emits_typed_child_without_content_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "false")
    span, exporter, _provider = _span_with_exporter()
    node_instance = _SuccessfulToolNode(
        input_identifier=[],
        output_identifier=[],
        node_id="plugin::weather",
        node_type="plugin",
        alias_name="Local weather tool",
    )
    engine_node = SparkFlowEngineNode(
        node_id="plugin::weather",
        node_type="plugin",
        node_alias_name="Local weather tool",
        node_instance=node_instance,
    )
    template = NodeExecutionTemplate(engine_node)
    template._handle_execution_result = AsyncMock()  # type: ignore[method-assign]

    with span.start("workflow.run"):
        result = await template.execute(span=span)

    assert result.outputs == {"answer": "synthetic result"}
    spans = {item.name: item for item in exporter.get_finished_spans()}
    node_span = spans["workflow.node:Local weather tool"]
    root_span = spans["workflow.run"]
    assert node_span.parent is not None
    assert node_span.parent.span_id == root_span.context.span_id
    assert node_span.context.trace_id == root_span.context.trace_id
    attributes = _span_attributes(node_span)
    assert attributes["langfuse.observation.type"] == "tool"
    assert attributes["astron.workflow.node.type"] == "plugin"
    assert attributes["astron.workflow.node.status"] == "succeeded"
    assert "langfuse.observation.input" not in attributes
    assert "langfuse.observation.output" not in attributes


@pytest.mark.asyncio
async def test_disabled_langfuse_preserves_existing_workflow_span_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "false")
    span, exporter, provider = _span_with_exporter()
    node_instance = _SuccessfulToolNode(
        input_identifier=[],
        output_identifier=[],
        node_id="plugin::weather",
        node_type="plugin",
        alias_name="Local weather tool",
    )
    engine_node = SparkFlowEngineNode(
        node_id="plugin::weather",
        node_type="plugin",
        node_alias_name="Local weather tool",
        node_instance=node_instance,
    )
    template = NodeExecutionTemplate(engine_node)
    template._handle_execution_result = AsyncMock()  # type: ignore[method-assign]

    with span.start("existing-root"):
        await template.execute(span=span)

    spans = {item.name: item for item in exporter.get_finished_spans()}
    assert set(spans) == {"existing-root", "run_node:plugin::weather"}
    child_attributes = spans["run_node:plugin::weather"].attributes or {}
    assert not any(
        key.startswith(("langfuse.", "gen_ai.", "astron.")) for key in child_attributes
    )
    provider.shutdown()


@pytest.mark.asyncio
async def test_retrieval_node_emits_retriever_observation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A real node execution boundary must classify retrieval explicitly."""
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "false")
    span, exporter, _provider = _span_with_exporter()
    node_type = NodeType.KNOWLEDGE_BASE.value
    node_instance = _SuccessfulToolNode(
        input_identifier=[],
        output_identifier=[],
        node_id=f"{node_type}::synthetic",
        node_type=node_type,
        alias_name="Synthetic retrieval",
    )
    engine_node = SparkFlowEngineNode(
        node_id=f"{node_type}::synthetic",
        node_type=node_type,
        node_alias_name="Synthetic retrieval",
        node_instance=node_instance,
    )
    template = NodeExecutionTemplate(engine_node)
    template._handle_execution_result = AsyncMock()  # type: ignore[method-assign]

    with span.start("workflow.run"):
        await template.execute(span=span)

    retrieval = next(
        item
        for item in exporter.get_finished_spans()
        if item.name == "workflow.node:Synthetic retrieval"
    )
    assert retrieval.attributes is not None
    assert retrieval.attributes["langfuse.observation.type"] == "retriever"
    assert retrieval.attributes["astron.workflow.node.type"] == node_type
    assert "langfuse.observation.input" not in retrieval.attributes
    assert "langfuse.observation.output" not in retrieval.attributes


@pytest.mark.asyncio
async def test_llm_boundary_emits_generation_model_usage_and_content_opt_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true")
    span, exporter, _provider = _span_with_exporter()
    node = _ObservableLLMNode(
        input_identifier=[],
        output_identifier=[],
        node_id="spark-llm::writer",
        node_type="spark-llm",
        alias_name="Writer",
        domain="gpt-test",
        appId="synthetic-app",
        source="openai",
    )
    variable_pool = MagicMock()
    variable_pool.system_params.get.return_value = "synthetic-user"

    with span.start("workflow.node:Writer"):
        usage, answer, _reasoning, _history = await node._chat_with_llm(
            flow_id="flow-test",
            variable_pool=variable_pool,
            span=span,
            prompt_template="synthetic question",
        )

    assert answer == "synthetic answer"
    assert usage["total_tokens"] == 11
    generation = next(
        item
        for item in exporter.get_finished_spans()
        if item.name == "llm.generate:gpt-test"
    )
    attributes = _span_attributes(generation)
    assert attributes["langfuse.observation.type"] == "generation"
    assert attributes["gen_ai.request.model"] == "gpt-test"
    assert attributes["gen_ai.response.model"] == "gpt-test"
    assert attributes["gen_ai.usage.input_tokens"] == 7
    assert attributes["gen_ai.usage.output_tokens"] == 4
    assert "synthetic question" in attributes["langfuse.observation.input"]
    assert attributes["langfuse.observation.output"] == "synthetic answer"
    assert attributes["astron.llm.time_to_first_token_ms"] >= 0


@pytest.mark.asyncio
async def test_disabled_langfuse_does_not_add_generation_child_span(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "false")
    span, exporter, provider = _span_with_exporter()
    node = _ObservableLLMNode(
        input_identifier=[],
        output_identifier=[],
        node_id="spark-llm::writer",
        node_type="spark-llm",
        alias_name="Writer",
        domain="gpt-test",
        appId="synthetic-app",
        source="openai",
    )
    variable_pool = MagicMock()
    variable_pool.system_params.get.return_value = "synthetic-user"

    with span.start("existing-llm-node"):
        await node._chat_with_llm(
            flow_id="flow-test",
            variable_pool=variable_pool,
            span=span,
            prompt_template="synthetic question",
        )

    spans = exporter.get_finished_spans()
    assert [item.name for item in spans] == ["existing-llm-node"]
    assert not any(
        key.startswith(("langfuse.", "gen_ai.", "astron."))
        for key in (spans[0].attributes or {})
    )
    provider.shutdown()


def test_w3c_trace_and_langfuse_baggage_continue_across_services() -> None:
    span, exporter, provider = _span_with_exporter()
    provider.add_span_processor(LangfuseBaggageSpanProcessor(8192))
    child = Span(app_id="agent-app", uid="test-user")
    child.tracer = provider.get_tracer("langfuse-agent-test")
    trace_attributes = langfuse_trace_attributes(
        "workflow:flow-test",
        user_id="test-user",
        session_id="test-session",
    )

    with (
        langfuse_trace_context(trace_attributes),
        span.start("workflow.agent-node"),
    ):
        carrier = Trace.inject_context()
        assert carrier["traceparent"].startswith("00-")
        assert "baggage" in carrier
        parent_context = Trace.extract_context(carrier)
        child_attributes = langfuse_trace_attributes(
            "agent:child", user_id="test-user", session_id="child-session"
        )
        with langfuse_trace_context(child_attributes, parent_context=parent_context):
            with child.start("agent.run"):
                pass

    spans = {item.name: item for item in exporter.get_finished_spans()}
    parent = spans["workflow.agent-node"]
    agent = spans["agent.run"]
    assert agent.context.trace_id == parent.context.trace_id
    assert agent.parent is not None
    assert agent.parent.span_id == parent.context.span_id
    attributes = _span_attributes(agent)
    assert attributes["langfuse.trace.name"] == "agent:child"
    assert attributes["langfuse.user.id"] == "test-user"
    assert attributes["langfuse.session.id"] == "child-session"


def test_node_error_exports_stable_status_without_exception_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "false")
    error = CustomException(
        CodeEnum.OPEN_AI_REQUEST_ERROR,
        cause_error="Authorization: Bearer synthetic-must-not-export",
    )
    result = NodeRunResult(
        status=WorkflowNodeExecutionStatus.FAILED,
        node_id="plugin::weather",
        alias_name="Weather",
        node_type="plugin",
        error=error,
    )

    from workflow.engine.node import _node_result_attributes

    attributes = _node_result_attributes(result)
    serialized = json.dumps(attributes, ensure_ascii=False)
    assert "synthetic-must-not-export" not in serialized
    assert attributes["langfuse.observation.status_message"].startswith(
        "CustomException (code="
    )
