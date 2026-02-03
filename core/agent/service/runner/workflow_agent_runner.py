import json
from typing import Any, AsyncGenerator, Sequence

# Use unified common package import module
from common.otlp.log_trace.node_log import Data, NodeLog
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span
from pydantic import BaseModel, ConfigDict, Field

from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.api.schemas.completion_chunk import (
    ReasonChatCompletionChunk,
    ReasonChoice,
    ReasonChoiceDelta,
    ReasonChoiceDeltaToolCall,
    ReasonChoiceDeltaToolCallFunction,
)
from agent.engine.nodes.chat.chat_runner import ChatRunner
from agent.engine.nodes.cot.cot_runner import CotRunner
from agent.service.plugin.base import BasePlugin


class WorkflowAgentRunner(BaseModel):
    """Workflow Agent runner"""

    chat_runner: ChatRunner
    cot_runner: CotRunner

    plugins: Sequence[BasePlugin]

    knowledge_metadata_list: list[Any] = Field(default_factory=list)

    model_config = ConfigDict(arbitrary_types_allowed=True)

    async def run(
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncGenerator[ReasonChatCompletionChunk, None]:
        """Execute workflow agent runners"""

        if self.knowledge_metadata_list:
            yield await self.convert_message(
                AgentResponse(
                    typ="knowledge_metadata",
                    content=self.knowledge_metadata_list,
                    model="",
                ),
                span=span,
                node_trace_log=node_trace_log,
            )

        async for message in self.run_runner(span, node_trace_log):
            yield await self.convert_message(
                message, span=span, node_trace_log=node_trace_log
            )

    async def run_runner(
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncGenerator[AgentResponse, None]:
        if not self.plugins:
            async for message in self.chat_runner.run(span, node_trace_log):
                yield message
        else:
            async for message in self.cot_runner.run(span, node_trace_log):
                yield message

    async def convert_message(
        self, message: AgentResponse, span: Span, node_trace_log: NodeTraceLog
    ) -> ReasonChatCompletionChunk:
        """Convert AgentResponse to a response chunk"""

        chunk = ReasonChatCompletionChunk(
            id="",
            choices=[ReasonChoice(index=0, delta=ReasonChoiceDelta())],
            created=message.created,
            model=message.model,
            object="chat.completion.chunk",
            usage=message.usage,
        )

        if message.typ == "reasoning_content":
            self._handle_reasoning_content(chunk, message)
        elif message.typ == "content":
            self._handle_content(chunk, message)
        elif message.typ == "cot_step":
            self._handle_cot_step(chunk, message, span, node_trace_log)
        elif message.typ == "log":
            self._handle_log(chunk, message)
        elif message.typ == "knowledge_metadata":
            self._handle_knowledge_metadata(chunk, message)

        return chunk

    def _handle_reasoning_content(
        self, chunk: ReasonChatCompletionChunk, message: AgentResponse
    ) -> None:
        """Handle reasoning content"""
        if isinstance(message.content, str):
            chunk.choices[0].delta.reasoning_content = message.content

    def _handle_content(
        self, chunk: ReasonChatCompletionChunk, message: AgentResponse
    ) -> None:
        """Handle regular content"""
        if isinstance(message.content, str):
            chunk.choices[0].delta.content = message.content

    def _handle_cot_step(
        self,
        chunk: ReasonChatCompletionChunk,
        message: AgentResponse,
        span: Span,
        node_trace_log: NodeTraceLog,
    ) -> None:
        """Handle CoT steps"""
        if not isinstance(message.content, CotStep):
            return

        content = message.content
        action_input = content.action_input
        action_output = content.action_output

        chunk.choices[0].delta.tool_calls = [
            ReasonChoiceDeltaToolCall(
                index=0,
                type=content.tool_type or "tool",
                reason=content.thought or "",
                function=ReasonChoiceDeltaToolCallFunction(
                    name=content.action or "",
                    arguments=json.dumps(
                        action_input if action_input else {}, ensure_ascii=False
                    ),
                    response=json.dumps(
                        action_output if action_output else {},
                        ensure_ascii=False,
                    ),
                ),
            )
        ]

        self._handle_plugin_trace(content, span, node_trace_log)

    def _handle_plugin_trace(
        self,
        content: CotStep,
        span: Span,
        node_trace_log: NodeTraceLog,
    ) -> None:
        """Handle plugin trace data"""
        called_plugin = getattr(content, "plugin", None)
        if not (
            called_plugin is not None
            and hasattr(called_plugin, "run_result")
            and called_plugin.run_result is not None
        ):
            return

        run_result = called_plugin.run_result
        start_time = getattr(run_result, "start_time", 0)
        end_time = getattr(run_result, "end_time", 0)
        thought = getattr(content, "thought", "") if hasattr(content, "thought") else ""

        try:
            str_action_input = json.dumps(content.action_input, ensure_ascii=False)
            str_action_output = json.dumps(content.action_output, ensure_ascii=False)
        except Exception:
            str_action_input = str(content.action_input)
            str_action_output = str(content.action_output)

        node_trace_log.trace.append(
            NodeLog(
                id=getattr(run_result, "sid", ""),
                sid=span.sid,
                node_id=self._determine_node_id(called_plugin),
                node_name=getattr(called_plugin, "name", ""),
                node_type=getattr(called_plugin, "typ", ""),
                start_time=start_time,
                end_time=end_time,
                duration=end_time - start_time,
                running_status=not bool(getattr(run_result, "code", 0)),
                logs=[thought] if thought else [],
                data=Data(
                    input={"input": str_action_input},
                    output={"output": str_action_output},
                ),
            )
        )

    def _determine_node_id(self, called_plugin: Any) -> str:
        """Determine node ID"""
        if not hasattr(called_plugin, "typ"):
            return ""

        plugin_type = called_plugin.typ
        node_id = ""

        if plugin_type == "workflow" and hasattr(called_plugin, "flow_id"):
            node_id = called_plugin.flow_id
        elif plugin_type == "mcp":
            if hasattr(called_plugin, "server_id") and called_plugin.server_id:
                node_id = called_plugin.server_id
            elif hasattr(called_plugin, "server_url") and called_plugin.server_url:
                node_id = called_plugin.server_url
        elif hasattr(called_plugin, "tool_id"):
            node_id = called_plugin.tool_id

        return node_id

    def _handle_log(
        self, chunk: ReasonChatCompletionChunk, message: AgentResponse
    ) -> None:
        """Handle log messages"""
        chunk.object = "chat.completion.log"
        if isinstance(message.content, str):
            chunk.logs.append(message.content)

    def _handle_knowledge_metadata(
        self, chunk: ReasonChatCompletionChunk, message: AgentResponse
    ) -> None:
        """Handle knowledge metadata"""
        chunk.choices[0].delta.tool_calls = [
            ReasonChoiceDeltaToolCall(
                index=0,
                type="knowledge",
                reason="",
                function=ReasonChoiceDeltaToolCallFunction(
                    name="knowledge",
                    arguments=json.dumps(
                        {"query": getattr(self.chat_runner, "question", "")},
                        ensure_ascii=False,
                    ),
                    response=json.dumps(
                        {"metadata_list": message.content}, ensure_ascii=False
                    ),
                ),
            )
        ]
