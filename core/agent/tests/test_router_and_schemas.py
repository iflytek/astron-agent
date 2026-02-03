"""Test API router and schema data models"""

import time

import pytest
from fastapi import APIRouter

from agent.api import router as api_router
from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.api.schemas.completion_chunk import (
    ReasonChatCompletionChunk,
    ReasonChoice,
    ReasonChoiceDelta,
    ReasonChoiceDeltaToolCall,
    ReasonChoiceDeltaToolCallFunction,
)
from agent.api.schemas.llm_message import LLMMessage, LLMMessages
from agent.api.schemas.node_trace_patch import NodeTracePatch


class TestRouterModule:
    """Test api/router module"""

    def test_router_v1_basic(self) -> None:
        """router_v1 should be an APIRouter with the correct prefix"""
        assert isinstance(api_router.router_v1, APIRouter)
        assert api_router.router_v1.prefix == "/agent/v1"
        # Should include at least one sub-route (workflow_agent route)
        assert api_router.router_v1.routes


class TestAgentResponseAndCotStep:
    """Test AgentResponse and CotStep data structures"""

    def test_cot_step_defaults(self) -> None:
        step = CotStep()
        assert step.thought == ""
        assert step.action == ""
        assert step.action_input == {}
        assert step.action_output == {}
        assert step.finished_cot is False
        assert step.empty is False
        assert step.plugin is None

    def test_agent_response_created_timestamp(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        fixed_ts = 1700000000000
        monkeypatch.setattr(
            "agent.api.schemas.agent_response.time.time", lambda: fixed_ts / 1000
        )

        resp = AgentResponse(typ="content", content="hello", model="m")
        assert resp.created == fixed_ts

    def test_agent_response_with_usage_none(self) -> None:
        resp = AgentResponse(typ="log", content="log", model="m")
        assert resp.usage is None


class TestLLMMessages:
    """Test LLMMessage / LLMMessages"""

    def test_llm_message_basic(self) -> None:
        msg = LLMMessage(role="user", content="hi")
        assert msg.role == "user"
        assert msg.content == "hi"

    def test_llm_messages_list(self) -> None:
        msgs = LLMMessages(
            messages=[
                LLMMessage(role="user", content="q"),
                LLMMessage(role="assistant", content="a"),
            ]
        )

        as_list = msgs.list()
        assert as_list == [
            {"role": "user", "content": "q"},
            {"role": "assistant", "content": "a"},
        ]


class TestCompletionChunkModels:
    """Test ReasonChatCompletionChunk and related types"""

    def test_reason_choice_delta_tool_call_function(self) -> None:
        fn = ReasonChoiceDeltaToolCallFunction(
            name="tool", arguments="{}", response="ok"
        )
        assert fn.response == "ok"

    def test_reason_choice_delta_tool_call(self) -> None:
        fn = ReasonChoiceDeltaToolCallFunction(name="tool", arguments="{}")
        call = ReasonChoiceDeltaToolCall(
            index=0, reason="why", function=fn, type="tool"
        )
        assert call.reason == "why"
        assert call.function is fn
        assert call.type == "tool"

    def test_reason_chat_completion_chunk_basic(self) -> None:
        delta = ReasonChoiceDelta(reasoning_content="think", content="answer")
        choice = ReasonChoice(index=0, delta=delta)
        chunk = ReasonChatCompletionChunk(
            id="cid",
            choices=[choice],
            created=int(time.time()),
            model="m",
            object="chat.completion.chunk",
        )
        assert chunk.code == 0
        assert chunk.message == "success"
        assert chunk.logs == []
        assert chunk.object == "chat.completion.chunk"


class TestNodeTracePatch:
    """Test NodeTracePatch extension behavior"""

    def test_record_start_and_end(self) -> None:
        trace = NodeTracePatch(
            service_id="s",
            sid="sid",
            app_id="app",
            uid="u",
            chat_id="c",
            sub="Agent",
            caller="caller",
            log_caller="caller",
            question="q",
        )
        assert trace.start_time == 0
        trace.record_start()
        assert trace.start_time > 0

        # record_end should only call parent set_end without raising
        trace.record_end()

    def test_upload_sets_status_and_returns_dump(self) -> None:
        class DummyStatus:
            def __init__(self, code: int, message: str) -> None:
                self.code = code
                self.message = message

        trace = NodeTracePatch(
            service_id="s",
            sid="sid",
            app_id="app",
            uid="u",
            chat_id="c",
            sub="Agent",
            caller="caller",
            log_caller="caller",
            question="q",
        )
        status = DummyStatus(1, "error")
        data = trace.upload(status=status, log_caller="x", span=None)
        # The return value is the dictionary from model_dump
        assert isinstance(data, dict)
        assert data.get("status", {}).get("code") == 1
