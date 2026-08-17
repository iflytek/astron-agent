"""Test workflow_agent API endpoint"""

import asyncio
from dataclasses import dataclass
from typing import Any, AsyncIterator, cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from starlette.responses import StreamingResponse

from agent.api.schemas.llm_message import LLMMessage
from agent.api.schemas.workflow_agent_inputs import (
    CustomCompletionInputs,
    CustomCompletionInstructionInputs,
    CustomCompletionModelConfigInputs,
    CustomCompletionPluginInputs,
)
from agent.api.v1.workflow_agent import CustomChatCompletion, custom_chat_completions


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


class TestCustomChatCompletion:
    """Test CustomChatCompletion class"""

    @pytest.fixture
    def completion_inputs(self) -> CustomCompletionInputs:
        """Create input instance for testing"""
        return CustomCompletionInputs(
            uid="test_uid",
            messages=[LLMMessage(role="user", content="test question")],
            model_config=CustomCompletionModelConfigInputs(
                domain="test_model",
                api="https://api.test.com",
                provider="anthropic",
                api_key="test_key",
            ),
            instruction=CustomCompletionInstructionInputs(
                reasoning="think step by step",
                answer="answer clearly",
            ),
            plugin=CustomCompletionPluginInputs(),
            max_loop_count=5,
        )

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.fixture
    def completion(
        self, completion_inputs: CustomCompletionInputs, span: Span
    ) -> CustomChatCompletion:
        """Create Completion instance for testing"""
        return CustomChatCompletion(
            app_id="test_app",
            inputs=completion_inputs,
            log_caller="test_caller",
            span=span,
            bot_id="test_bot",
            uid="test_uid",
            question="test question",
        )

    @pytest.mark.asyncio
    async def test_build_runner(
        self, completion: CustomChatCompletion, span: Span
    ) -> None:
        """Test building WorkflowAgentRunner"""
        mock_runner = AsyncMock()
        mock_builder = AsyncMock()
        mock_builder.build.return_value = mock_runner

        with patch(
            "agent.api.v1.workflow_agent.WorkflowAgentRunnerBuilder",
            return_value=mock_builder,
        ):
            runner = await completion.build_runner(span)
            assert runner is not None

    @pytest.mark.asyncio
    async def test_do_complete(self, completion: CustomChatCompletion) -> None:
        """Test executing completion flow"""
        mock_runner = AsyncMock()
        mock_chunk = MagicMock()
        mock_chunk.id = "test_id"
        mock_chunk.object = "chat.completion.chunk"
        mock_chunk.model_dump_json.return_value = '{"test": "data"}'

        async def mock_run() -> AsyncIterator[Any]:
            yield mock_chunk

        mock_runner.run = AsyncMock(return_value=mock_run())

        # Avoid patch.object on Pydantic BaseModel instance, change to patch class method
        with patch.object(
            CustomChatCompletion, "build_runner", return_value=mock_runner
        ):
            with patch.object(
                CustomChatCompletion, "build_node_trace", return_value=MagicMock()
            ):
                with patch.object(
                    CustomChatCompletion, "build_meter", return_value=MagicMock()
                ):
                    results = []
                    async for result in completion.do_complete():
                        results.append(result)

                    assert len(results) > 0

    @pytest.mark.asyncio
    async def test_disabled_langfuse_preserves_existing_root_span_shape(
        self,
        completion: CustomChatCompletion,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setenv("LANGFUSE_ENABLED", "false")
        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        completion.span.tracer = provider.get_tracer("disabled-agent-root-test")

        async def mock_run_runner(*_args: Any, **_kwargs: Any) -> AsyncIterator[str]:
            yield 'data: {"code":0,"choices":[]}\n\n'

        with (
            patch.object(
                CustomChatCompletion, "build_node_trace", return_value=object()
            ),
            patch.object(CustomChatCompletion, "build_meter", return_value=object()),
            patch.object(CustomChatCompletion, "run_runner", mock_run_runner),
        ):
            results = [item async for item in completion.do_complete()]

        spans = exporter.get_finished_spans()
        assert results
        assert len(spans) == 1
        assert spans[0].name == "WorkflowAgentNode"
        assert not any(
            key.startswith(("langfuse.", "gen_ai."))
            for key in (spans[0].attributes or {})
        )
        provider.shutdown()


class TestCustomChatCompletionsEndpoint:
    """Test custom_chat_completions endpoint"""

    @pytest.fixture
    def completion_inputs(self) -> CustomCompletionInputs:
        """Create input instance for testing"""
        return CustomCompletionInputs(
            uid="test_uid",
            messages=[LLMMessage(role="user", content="test question")],
            model_config=CustomCompletionModelConfigInputs(
                domain="test_model",
                api="https://api.test.com",
                provider="google",
                api_key="test_key",
            ),
            instruction=CustomCompletionInstructionInputs(),
            plugin=CustomCompletionPluginInputs(),
            max_loop_count=5,
        )

    @pytest.mark.asyncio
    async def test_custom_chat_completions_endpoint(
        self, completion_inputs: CustomCompletionInputs
    ) -> None:
        """Test endpoint function"""
        mock_completion = AsyncMock()

        async def mock_do_complete() -> AsyncIterator[bytes]:
            # StreamingResponse will encode str to bytes, here directly return bytes for simple verification
            yield b"data: {}\n\n"
            yield b"data: [DONE]\n\n"

        mock_completion.do_complete = mock_do_complete

        with patch(
            "agent.api.v1.workflow_agent.CustomChatCompletion",
            return_value=mock_completion,
        ):
            response = await custom_chat_completions(
                x_consumer_username="test_app",
                completion_inputs=completion_inputs,
            )

            assert isinstance(response, StreamingResponse)
            assert response.media_type == "text/event-stream"

            # Verify response content
            content = b""
            async for chunk in response.body_iterator:
                if isinstance(chunk, bytes):
                    content += chunk
                elif isinstance(chunk, str):
                    content += chunk.encode("utf-8")
                else:
                    content += bytes(chunk)

            assert b"[DONE]" in content

    @pytest.mark.asyncio
    async def test_endpoint_closes_inner_stream_on_disconnect(
        self, completion_inputs: CustomCompletionInputs
    ) -> None:
        """Closing the response body must cascade into the traced producer."""
        mock_completion = AsyncMock()
        inner_closed = False

        async def mock_do_complete() -> AsyncIterator[str]:
            nonlocal inner_closed
            try:
                yield "data: first\n\n"
                await asyncio.Event().wait()
            finally:
                inner_closed = True

        mock_completion.do_complete = mock_do_complete
        with patch(
            "agent.api.v1.workflow_agent.CustomChatCompletion",
            return_value=mock_completion,
        ):
            response = await custom_chat_completions(
                x_consumer_username="test_app",
                completion_inputs=completion_inputs,
            )
            body_iterator = cast(Any, response.body_iterator)
            assert await anext(body_iterator) == "data: first\n\n"
            await body_iterator.aclose()

        assert inner_closed is True

    @pytest.mark.asyncio
    async def test_asgi_23_disconnect_closes_suspended_inner_stream(
        self, completion_inputs: CustomCompletionInputs
    ) -> None:
        """A real ASGI disconnect must cancel the traced producer immediately."""
        mock_completion = AsyncMock()
        inner_closed = asyncio.Event()

        async def mock_do_complete() -> AsyncIterator[str]:
            try:
                yield "data: first\n\n"
                await asyncio.Event().wait()
            finally:
                inner_closed.set()

        mock_completion.do_complete = mock_do_complete
        with patch(
            "agent.api.v1.workflow_agent.CustomChatCompletion",
            return_value=mock_completion,
        ):
            response = await custom_chat_completions(
                x_consumer_username="test_app",
                completion_inputs=completion_inputs,
            )

        disconnect = asyncio.Event()

        async def receive() -> dict[str, str]:
            await disconnect.wait()
            return {"type": "http.disconnect"}

        async def send(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.body" and message.get("more_body"):
                disconnect.set()
                # Model a network send that is cancelled by Starlette's ASGI
                # 2.3 disconnect listener after the generator yielded a frame.
                await asyncio.Event().wait()

        scope = cast(
            Any,
            {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/custom/chat/completions",
                "raw_path": b"/custom/chat/completions",
                "query_string": b"",
                "headers": [],
                "client": None,
                "server": None,
                "root_path": "",
            },
        )
        await asyncio.wait_for(response(scope, receive, send), timeout=1)

        assert inner_closed.is_set()
