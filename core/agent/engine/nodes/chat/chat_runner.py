"""Chat runner for direct conversational interactions."""

from typing import AsyncIterator

from agent.api.schemas.agent_response import AgentResponse
from agent.engine.nodes.base import RunnerBase
from agent.engine.nodes.chat.chat_prompt import CHAT_SYSTEM_TEMPLATE, CHAT_USER_TEMPLATE
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span
from pydantic import Field


class ChatRunner(RunnerBase):
    """Runner for direct chat-based LLM interactions."""

    chat_history: list
    instruct: str = Field(default="")
    knowledge: str = Field(default="")
    question: str = Field(default="")

    async def run(
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncIterator[AgentResponse]:
        """Run the chat agent and stream responses."""
        with span.start("RunChatAgent") as sp:

            system_prompt = (
                CHAT_SYSTEM_TEMPLATE.replace("{now}", self.cur_time())
                .replace("{instruct}", self.instruct)
                .replace("{knowledge}", self.knowledge)
            )
            user_prompt = CHAT_USER_TEMPLATE.replace(
                "{chat_history}", await self.create_history_prompt()
            ).replace("{question}", self.question)

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            async for chunk in self.model_general_stream(messages, sp, node_trace_log):
                yield chunk
