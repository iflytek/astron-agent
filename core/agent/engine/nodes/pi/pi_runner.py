import inspect
import json
import os
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from typing import Any

import aiohttp
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span
from openai.types.completion_usage import CompletionUsage
from pydantic import BaseModel

from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.api.schemas.llm_message import LLMMessage
from agent.engine.nodes.pi.protocol import (
    build_system_prompt,
    build_tool_contracts,
    history_payload,
)
from agent.exceptions.agent_exc import AgentExc, AgentInternalExc
from agent.service.plugin.base import BasePlugin, PluginResponse


class PiModelConfig(BaseModel):
    id: str
    provider: str = "openai"
    base_url: str
    api_key: str


@dataclass
class _ExecutionEvent:
    response: AgentResponse | None = None
    result: PluginResponse | None = None


@dataclass
class PiRunner:
    app_id: str
    uid: str
    run_id: str
    model_config: PiModelConfig
    chat_history: list[LLMMessage]
    instruct: str
    knowledge: str
    question: str
    plugins: Sequence[BasePlugin]
    runtime_url: str = field(
        default_factory=lambda: os.getenv(
            "PI_AGENT_RUNTIME_URL",
            "ws://core-pi-agent:8090/internal/v1/runs",
        )
    )
    internal_secret: str = field(
        default_factory=lambda: os.getenv("PI_AGENT_INTERNAL_SECRET", "")
    )

    def _start_message(self) -> tuple[dict[str, Any], dict[str, BasePlugin]]:
        tools, plugin_by_runtime_name = build_tool_contracts(self.plugins)
        return (
            {
                "type": "start",
                "runId": self.run_id,
                "model": {
                    "id": self.model_config.id,
                    "provider": self.model_config.provider or "openai",
                    "baseUrl": self.model_config.base_url,
                    "apiKey": self.model_config.api_key,
                },
                "systemPrompt": build_system_prompt(self.instruct, self.knowledge),
                "messages": history_payload(self.chat_history),
                "question": self.question,
                "tools": tools,
            },
            plugin_by_runtime_name,
        )

    @staticmethod
    def _dict_result(result: Any) -> dict[str, Any]:
        return result if isinstance(result, dict) else {"result": result}

    async def _execute_plugin(
        self,
        plugin: BasePlugin,
        arguments: dict[str, Any],
        span: Span,
    ) -> AsyncIterator[_ExecutionEvent]:
        invocation = plugin.run(arguments, span)
        if inspect.isawaitable(invocation):
            response = await invocation
            if not isinstance(response, PluginResponse):
                raise TypeError(f"Plugin {plugin.name} returned an invalid response")
            plugin.run_result = response
            yield _ExecutionEvent(result=response)
            return

        if not hasattr(invocation, "__aiter__"):
            raise TypeError(f"Plugin {plugin.name} is not async")

        content_parts: list[str] = []
        reasoning_parts: list[str] = []
        last_response: PluginResponse | None = None
        async for response in invocation:
            if not isinstance(response, PluginResponse):
                raise TypeError(f"Plugin {plugin.name} streamed an invalid response")
            last_response = response
            result = self._dict_result(response.result)
            reasoning_content = result.get("reasoning_content") or ""
            content = result.get("content") or ""
            if reasoning_content:
                reasoning_parts.append(str(reasoning_content))
                yield _ExecutionEvent(
                    response=AgentResponse(
                        typ="reasoning_content",
                        content=str(reasoning_content),
                        model=self.model_config.id,
                    )
                )
            if content:
                content_parts.append(str(content))
                yield _ExecutionEvent(
                    response=AgentResponse(
                        typ="content",
                        content=str(content),
                        model=self.model_config.id,
                    )
                )
            if response.code != 0:
                break

        if last_response is None:
            last_response = PluginResponse(
                code=500,
                result={"message": f"Plugin {plugin.name} returned no result"},
            )
        elif content_parts or reasoning_parts:
            last_response = last_response.model_copy(
                update={
                    "result": {
                        "reasoning_content": "".join(reasoning_parts),
                        "content": "".join(content_parts),
                    }
                }
            )
        plugin.run_result = last_response
        yield _ExecutionEvent(result=last_response)

    async def _handle_tool_call(
        self,
        payload: dict[str, Any],
        plugin_by_runtime_name: dict[str, BasePlugin],
        websocket: aiohttp.ClientWebSocketResponse,
        span: Span,
    ) -> AsyncIterator[AgentResponse]:
        call_id = str(payload.get("callId") or "")
        runtime_name = str(payload.get("name") or "")
        arguments = payload.get("arguments")
        if not isinstance(arguments, dict):
            arguments = {}

        plugin = plugin_by_runtime_name.get(runtime_name)
        if plugin is None:
            await websocket.send_json(
                {
                    "type": "tool_result",
                    "callId": call_id,
                    "result": {"message": f"Unknown tool: {runtime_name}"},
                    "isError": True,
                }
            )
            return

        result: PluginResponse | None = None
        try:
            with span.start(f"RunPiTool-{runtime_name}") as tool_span:
                async for event in self._execute_plugin(plugin, arguments, tool_span):
                    if event.response is not None:
                        yield event.response
                    if event.result is not None:
                        result = event.result
        except Exception as error:  # Plugin failures are model-visible tool errors.
            result = PluginResponse(
                code=500,
                result={"message": str(error), "type": type(error).__name__},
            )
            plugin.run_result = result

        if result is None:
            result = PluginResponse(
                code=500,
                result={"message": f"Plugin {plugin.name} returned no result"},
            )
            plugin.run_result = result

        action_output = self._dict_result(result.result)
        yield AgentResponse(
            typ="cot_step",
            content=CotStep(
                action=plugin.name,
                action_input=arguments,
                action_output=action_output,
                tool_type="workflow" if plugin.typ == "workflow" else "tool",
                plugin=plugin,
            ),
            model=self.model_config.id,
        )
        await websocket.send_json(
            {
                "type": "tool_result",
                "callId": call_id,
                "result": result.result,
                "isError": result.code != 0,
            }
        )

    def _wait_completion(self, payload: dict[str, Any]) -> AgentResponse:
        arguments = payload.get("arguments")
        result = payload.get("result")
        return AgentResponse(
            typ="cot_step",
            content=CotStep(
                action=str(payload.get("name") or "wait"),
                action_input=arguments if isinstance(arguments, dict) else {},
                action_output=self._dict_result(result),
                tool_type="tool",
            ),
            model=self.model_config.id,
        )

    async def run(
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncIterator[AgentResponse]:
        del node_trace_log  # Public trace conversion consumes the emitted CotStep.
        if not self.internal_secret:
            raise AgentInternalExc("PI_AGENT_INTERNAL_SECRET is required")

        start_message, plugin_by_runtime_name = self._start_message()
        timeout = aiohttp.ClientTimeout(total=None, connect=10, sock_read=None)
        completed = False
        handled_calls: set[str] = set()
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.ws_connect(
                    self.runtime_url,
                    headers={"Authorization": f"Bearer {self.internal_secret}"},
                    heartbeat=30,
                ) as websocket:
                    await websocket.send_json(start_message)
                    async for message in websocket:
                        if message.type == aiohttp.WSMsgType.ERROR:
                            raise AgentInternalExc("Pi runtime WebSocket failed")
                        if message.type != aiohttp.WSMsgType.TEXT:
                            continue
                        try:
                            payload = json.loads(message.data)
                        except json.JSONDecodeError as error:
                            raise AgentInternalExc("Pi runtime returned invalid JSON") from error
                        if not isinstance(payload, dict):
                            raise AgentInternalExc("Pi runtime returned an invalid event")

                        event_type = payload.get("type")
                        if event_type == "reasoning_delta":
                            yield AgentResponse(
                                typ="reasoning_content",
                                content=str(payload.get("delta") or ""),
                                model=self.model_config.id,
                            )
                        elif event_type == "content_delta":
                            yield AgentResponse(
                                typ="content",
                                content=str(payload.get("delta") or ""),
                                model=self.model_config.id,
                            )
                        elif event_type == "usage":
                            yield AgentResponse(
                                typ="content",
                                content="",
                                model=self.model_config.id,
                                usage=CompletionUsage(
                                    prompt_tokens=int(payload.get("inputTokens") or 0),
                                    completion_tokens=int(
                                        payload.get("outputTokens") or 0
                                    ),
                                    total_tokens=int(payload.get("totalTokens") or 0),
                                ),
                            )
                        elif event_type == "tool_call":
                            call_id = str(payload.get("callId") or "")
                            if payload.get("name") == "wait":
                                continue
                            async for response in self._handle_tool_call(
                                payload,
                                plugin_by_runtime_name,
                                websocket,
                                span,
                            ):
                                yield response
                            handled_calls.add(call_id)
                        elif event_type == "tool_completed":
                            call_id = str(payload.get("callId") or "")
                            if call_id not in handled_calls:
                                yield self._wait_completion(payload)
                        elif event_type == "tool_progress":
                            yield AgentResponse(
                                typ="log",
                                content=json.dumps(
                                    payload.get("result"), ensure_ascii=False
                                ),
                                model=self.model_config.id,
                            )
                        elif event_type == "error":
                            raise AgentInternalExc(
                                f"Pi runtime error: {payload.get('message') or 'unknown'}"
                            )
                        elif event_type == "done":
                            completed = True
                            return
                        else:
                            raise AgentInternalExc(
                                f"Pi runtime returned unknown event: {event_type}"
                            )
        except AgentExc:
            raise
        except (aiohttp.ClientError, OSError) as error:
            raise AgentInternalExc(f"Pi runtime unavailable: {error}") from error

        if not completed:
            raise AgentInternalExc("Pi runtime disconnected before done")
