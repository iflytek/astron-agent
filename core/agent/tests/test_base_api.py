"""Test CompletionBase class and its methods in base_api module"""

import asyncio
import time
from contextlib import aclosing
from dataclasses import dataclass
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.otlp import sid as sid_module
from common.otlp.metrics.meter import Meter
from common.otlp.trace.span import Span
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from agent.api.schemas.base_inputs import BaseInputs, MetaDataInputs
from agent.api.schemas.completion_chunk import ReasonChatCompletionChunk
from agent.api.schemas.llm_message import LLMMessage
from agent.api.schemas.node_trace_patch import NodeTracePatch as NodeTrace
from agent.api.v1.base_api import CompletionBase, RunContext, json_serializer
from agent.exceptions.agent_exc import AgentInternalExc, AgentNormalExc


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    """
    # Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


class ConcreteCompletion(CompletionBase):
    """Concrete implementation class for testing"""

    async def build_runner(self, span: Span) -> AsyncMock:
        """Build a mock runner"""
        runner = AsyncMock()
        runner.run = AsyncMock(return_value=AsyncMock())
        return runner


class TestJsonSerializer:
    """Test JSON serializer"""

    def test_json_serializer_with_set(self) -> None:
        """Test set type serialization"""
        result = json_serializer({1, 2, 3})
        assert isinstance(result, list)
        assert set(result) == {1, 2, 3}

    def test_json_serializer_with_unsupported_type(self) -> None:
        """Test unsupported type"""
        with pytest.raises(TypeError):
            json_serializer(object())


class TestCompletionBase:
    """Test CompletionBase base class"""

    @pytest.fixture
    def completion(self) -> ConcreteCompletion:
        """Create Completion instance for testing"""
        inputs = BaseInputs(
            uid="test_uid",
            messages=[LLMMessage(role="user", content="test question")],
            meta_data=MetaDataInputs(caller="test_caller"),
        )
        return ConcreteCompletion(
            app_id="test_app",
            inputs=inputs,
            log_caller="test_caller",
        )

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.fixture
    def node_trace(self) -> NodeTrace:
        """Create NodeTrace instance for testing"""
        return NodeTrace(
            service_id="test_service",
            sid="test_sid",
            app_id="test_app",
            uid="test_uid",
            chat_id="test_chat",
            sub="Agent",
            caller="test_caller",
            log_caller="test_caller",
            question="test question",
        )

    @pytest.mark.asyncio
    async def test_build_node_trace(
        self, completion: ConcreteCompletion, span: Span
    ) -> None:
        """Test building node trace"""
        node_trace = await completion.build_node_trace(bot_id="test_bot", span=span)
        assert node_trace.service_id == "test_bot"
        assert node_trace.app_id == completion.app_id
        assert node_trace.uid == completion.inputs.uid
        assert node_trace.question == "test question"

    @pytest.mark.asyncio
    async def test_build_meter(
        self, completion: ConcreteCompletion, span: Span
    ) -> None:
        """Test building Meter"""
        meter = await completion.build_meter(span)
        assert meter.app_id == completion.app_id
        assert meter.func == completion.log_caller

    @pytest.mark.asyncio
    async def test_process_chunk_completion_log(
        self, completion: ConcreteCompletion
    ) -> None:
        """Test processing log type chunk"""
        chunk = MagicMock()
        chunk.object = "chat.completion.log"
        chunk_logs: list[str] = []

        async for _ in completion._process_chunk(chunk, chunk_logs):
            pytest.fail("Should not produce any output")

        assert len(chunk_logs) == 0

    @pytest.mark.asyncio
    async def test_process_chunk_completion_chunk(
        self, completion: ConcreteCompletion
    ) -> None:
        """Test processing normal chunk"""
        chunk = MagicMock()
        chunk.object = "chat.completion.chunk"
        chunk.model_dump_json.return_value = '{"test": "data"}'
        chunk_logs: list[str] = []

        results = []
        async for result in completion._process_chunk(chunk, chunk_logs):
            results.append(result)

        assert len(results) == 1
        assert len(chunk_logs) == 1
        assert chunk_logs[0] == '{"test": "data"}'

    @pytest.mark.asyncio
    async def test_process_chunk_knowledge_metadata_chat_open_api(
        self, completion: ConcreteCompletion
    ) -> None:
        """Test processing knowledge metadata (chat_open_api mode)"""
        completion.log_caller = "chat_open_api"
        chunk = MagicMock()
        chunk.object = "chat.completion.knowledge_metadata"
        chunk.model_dump_json.return_value = '{"metadata": "data"}'
        chunk_logs: list[str] = []

        results = []
        async for _ in completion._process_chunk(chunk, chunk_logs):
            results.append(_)

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_process_chunk_knowledge_metadata_other_caller(
        self, completion: ConcreteCompletion
    ) -> None:
        """Test processing knowledge metadata (other callers)"""
        completion.log_caller = "other_caller"
        chunk = MagicMock()
        chunk.object = "chat.completion.knowledge_metadata"
        chunk.model_dump_json.return_value = '{"metadata": "data"}'
        chunk_logs: list[str] = []

        results = []
        async for result in completion._process_chunk(chunk, chunk_logs):
            results.append(result)

        assert len(results) == 1
        assert len(chunk_logs) == 1

    @pytest.mark.asyncio
    async def test_run_runner_success(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test successful runner execution"""
        mock_chunk = MagicMock()
        mock_chunk.object = "chat.completion.chunk"
        mock_chunk.model_dump_json.return_value = '{"test": "chunk"}'
        mock_chunk.id = None

        mock_runner = AsyncMock()

        async def mock_run_generator() -> AsyncIterator[MagicMock]:
            yield mock_chunk

        mock_runner.run = AsyncMock(return_value=mock_run_generator())

        # Patching instance triggers Pydantic restrictions, here patch class method instead
        with patch.object(ConcreteCompletion, "build_runner", return_value=mock_runner):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter("app", "func"), span
            ):
                results.append(result)

            assert len(results) > 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("close_mode", ["aclose", "cancel"])
    @pytest.mark.parametrize("langfuse", ["false", "true"])
    async def test_cancelled_runner_closes_upstream_and_records_cancellation(
        self,
        completion: ConcreteCompletion,
        span: Span,
        node_trace: NodeTrace,
        monkeypatch: pytest.MonkeyPatch,
        request: pytest.FixtureRequest,
        close_mode: str,
        langfuse: str,
    ) -> None:
        """Close a real async source, preserving task cancellation and partial output."""
        monkeypatch.setenv("UPLOAD_NODE_TRACE", "true")
        monkeypatch.setenv("UPLOAD_METRICS", "true")
        monkeypatch.setenv("LANGFUSE_ENABLED", langfuse)
        monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
        monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
        completion.inputs.meta_data.caller_sid = "console-caller-1"
        completion.inputs.meta_data.run_id = "console-run-1"
        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        request.addfinalizer(provider.shutdown)
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        span.tracer = provider.get_tracer("cancel-test")
        source_closed = asyncio.Event()
        source_waiting = asyncio.Event()
        received: list[str] = []

        async def source() -> AsyncIterator[ReasonChatCompletionChunk]:
            try:
                yield ReasonChatCompletionChunk(
                    id="partial",
                    created=0,
                    model="test",
                    choices=[],
                    object="chat.completion.chunk",
                )
                source_waiting.set()
                await asyncio.Event().wait()
            finally:
                source_closed.set()

        runner = MagicMock()
        runner.run.return_value = source()
        meter = MagicMock(spec=Meter)

        async def consume() -> None:
            async with aclosing(
                completion.run_runner(node_trace, meter, span)
            ) as stream:
                async for frame in stream:
                    received.append(frame)
                    if close_mode == "aclose":
                        break

        with (
            patch.object(ConcreteCompletion, "build_runner", return_value=runner),
            patch.object(NodeTrace, "upload", return_value={}) as upload,
            patch("agent.api.v1.base_api.logger.info") as info_log,
        ):
            task = asyncio.create_task(consume())
            if close_mode == "cancel":
                await asyncio.wait_for(source_waiting.wait(), timeout=2)
                task.cancel("sensitive cancellation reason must not be logged")
                with pytest.raises(asyncio.CancelledError):
                    await task
            else:
                await task

        assert source_closed.is_set()
        assert len(received) == 1
        assert "[DONE]" not in received[0]
        assert '"code":0' in received[0]
        assert node_trace.end_time is not None
        status = upload.call_args.kwargs["status"]
        assert status.code == AgentInternalExc.c
        assert status.message == "Agent execution cancelled"
        meter.in_error_count.assert_called_once_with(AgentInternalExc.c)
        info_log.assert_called_once_with(
            "Agent execution cancelled caller_sid={} run_id={} sid={} reason={}",
            "console-caller-1",
            "console-run-1",
            span.sid,
            "CancelledError" if close_mode == "cancel" else "GeneratorExit",
        )
        run_span = next(
            item for item in exporter.get_finished_spans() if item.name == "RunRunner"
        )
        assert run_span.status.status_code == StatusCode.ERROR
        assert run_span.attributes is not None
        assert run_span.attributes["code"] == AgentInternalExc.c
        assert run_span.attributes["astron.agent.run.status"] == "cancelled"
        if langfuse == "true":
            assert (
                run_span.attributes["langfuse.observation.status_message"]
                == "Agent execution cancelled"
            )

    @pytest.mark.asyncio
    async def test_close_after_done_does_not_report_cancellation(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Consumers may close immediately after receiving the terminal marker."""

        async def source() -> AsyncIterator[ReasonChatCompletionChunk]:
            return
            yield  # pragma: no cover

        runner = MagicMock()
        runner.run.return_value = source()
        with (
            patch.object(ConcreteCompletion, "build_runner", return_value=runner),
            patch("agent.api.v1.base_api.logger.info") as info_log,
        ):
            async with aclosing(
                completion.run_runner(node_trace, Meter("app", "func"), span)
            ) as stream:
                async for frame in stream:
                    if frame == "data: [DONE]\n\n":
                        break
        info_log.assert_not_called()

    @pytest.mark.asyncio
    async def test_run_runner_build_failed(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test runner build failure"""
        with patch.object(ConcreteCompletion, "build_runner", return_value=None):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter("app", "func"), span
            ):
                results.append(result)

            # 应该产生错误响应
            assert len(results) > 0

    @pytest.mark.asyncio
    async def test_run_runner_exception_handling(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test exception handling during runner execution"""
        mock_runner = AsyncMock()
        mock_runner.run = AsyncMock(side_effect=Exception("test exception"))

        with patch.object(ConcreteCompletion, "build_runner", return_value=mock_runner):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter("app", "func"), span
            ):
                results.append(result)

            # Should produce error response
            assert len(results) > 0

    def test_disabled_langfuse_keeps_error_span_status_and_attributes_unchanged(
        self,
        completion: ConcreteCompletion,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Langfuse errors must not alter the existing disabled OTel span shape."""
        monkeypatch.setenv("LANGFUSE_ENABLED", "false")
        error = AgentInternalExc("synthetic failure")
        span = MagicMock()
        node_trace = MagicMock()
        context = RunContext(
            error=error,
            error_log="synthetic traceback",
            chunk_logs=[],
            span=span,
            node_trace_log=node_trace,
            meter=MagicMock(),
        )

        completion._finalize_run(context)

        span.set_status.assert_not_called()
        span.set_attributes.assert_called_once_with(attributes={"code": error.c})
        node_trace.record_end.assert_called_once_with()

    @pytest.mark.asyncio
    async def test_run_runner_with_base_exc_error(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test BaseExc exception handling in run_runner"""
        mock_runner = AsyncMock()
        mock_runner.run = AsyncMock(side_effect=AgentInternalExc("test base error"))

        with patch.object(ConcreteCompletion, "build_runner", return_value=mock_runner):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter("app", "func"), span
            ):
                results.append(result)

            # Should produce error response with stop chunk and done
            assert len(results) >= 2
            assert any("data: [DONE]" in r for r in results)

    @pytest.mark.asyncio
    async def test_run_runner_with_usage_statistics(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test usage statistics aggregation from node_trace"""
        from common.otlp.log_trace.base import Usage
        from common.otlp.log_trace.node_log import Data, NodeLog

        # Add node with usage
        node = NodeLog(
            id="node1",
            sid=span.sid,
            node_id="node1",
            node_name="test",
            node_type="LLM",
            start_time=1000,
            end_time=2000,
            duration=1000,
            running_status=True,
            data=Data(
                usage=Usage(
                    completion_tokens=10,
                    prompt_tokens=20,
                    total_tokens=30,
                    question_tokens=0,
                )
            ),
        )
        node_trace.trace = [node]

        # Mock runner that completes successfully
        mock_runner = AsyncMock()

        async def mock_run_generator() -> AsyncIterator[MagicMock]:
            # Empty generator - no chunks, just to trigger cleanup
            if False:  # pragma: no cover
                yield

        mock_runner.run = AsyncMock(return_value=mock_run_generator())

        with patch.object(ConcreteCompletion, "build_runner", return_value=mock_runner):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter(app_id="test", func="test"), span
            ):
                results.append(result)

            # Should produce stop chunk + done with usage statistics
            assert len(results) >= 2
            assert any("data: [DONE]" in r for r in results)

    @pytest.mark.asyncio
    async def test_run_runner_error_handling_with_sid(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test error handling adds sid to error message when error code is not zero"""
        mock_runner = AsyncMock()
        mock_runner.run = AsyncMock(side_effect=AgentInternalExc("test error"))

        with patch.object(ConcreteCompletion, "build_runner", return_value=mock_runner):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter("app", "func"), span
            ):
                results.append(result)

            # Should produce error response
            assert len(results) >= 2
            # Error message should contain sid
            results_str = "".join(results)
            assert span.sid in results_str or "test error" in results_str

    @pytest.mark.asyncio
    async def test_run_runner_always_produces_stop_and_done(
        self, completion: ConcreteCompletion, span: Span, node_trace: NodeTrace
    ) -> None:
        """Test that run_runner always produces stop chunk and done marker"""
        mock_runner = AsyncMock()

        async def mock_run_generator() -> AsyncIterator[MagicMock]:
            # Empty generator
            if False:  # pragma: no cover
                yield

        mock_runner.run = AsyncMock(return_value=mock_run_generator())

        with patch.object(ConcreteCompletion, "build_runner", return_value=mock_runner):
            results = []
            async for result in completion.run_runner(
                node_trace, Meter("app", "func"), span
            ):
                results.append(result)

            # Should always produce at least stop chunk and done
            assert len(results) >= 2
            assert any("data: [DONE]" in r for r in results)
            # Should have stop chunk (contains code and message)
            results_str = "".join(results)
            assert (
                "chat.completion.chunk" in results_str or "code" in results_str.lower()
            )

    @pytest.mark.asyncio
    async def test_create_chunk(self) -> None:
        """Test creating chunk string"""
        chunk = ReasonChatCompletionChunk(
            id="test_id",
            code=0,
            message="success",
            choices=[],
            created=int(time.time()),
            model="test_model",
            object="chat.completion.chunk",
        )
        result = await CompletionBase.create_chunk(chunk)
        assert result.startswith("data: ")
        assert "\n\n" in result

    @pytest.mark.asyncio
    async def test_create_stop(self, span: Span) -> None:
        """Test creating stop chunk"""
        error = AgentNormalExc()
        chunk = await CompletionBase.create_stop(span, error)
        assert chunk.code == error.c
        assert chunk.message == error.m
        assert chunk.id == span.sid

    @pytest.mark.asyncio
    async def test_create_done(self) -> None:
        """Test creating done marker"""
        result = await CompletionBase.create_done()
        assert result == "data: [DONE]\n\n"
