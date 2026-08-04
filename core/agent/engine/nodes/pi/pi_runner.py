import asyncio
import inspect
import json
import os
import time
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from typing import Any

import aiohttp
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span
from openai.types.completion_usage import CompletionUsage
from pydantic import BaseModel

from agent.api.schemas.agent_event import AgentEventBase, AgentEventV1
from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.api.schemas.llm_message import LLMMessage
from agent.engine.nodes.pi.event_adapter import PiEventAdapter, PiEventAdapterError
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
    progress: Any | None = None
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
    _event_adapter: PiEventAdapter = field(init=False)

    def __post_init__(self) -> None:
        self._event_adapter = PiEventAdapter(
            run_id=self.run_id,
            started_at=self._now_ms(),
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

    @staticmethod
    def _required_text(payload: dict[str, Any], field_name: str) -> str:
        value = payload.get(field_name)
        if not isinstance(value, str) or not value:
            raise AgentInternalExc(f"Pi runtime returned invalid {field_name}")
        return value

    @staticmethod
    def _usage_tokens(payload: dict[str, Any]) -> tuple[int, int, int]:
        values: list[int] = []
        for field_name in ("inputTokens", "outputTokens", "totalTokens"):
            raw_value = payload.get(field_name, 0)
            if isinstance(raw_value, bool):
                raise AgentInternalExc("Pi runtime returned invalid usage")
            try:
                value = int(raw_value or 0)
            except (TypeError, ValueError) as error:
                raise AgentInternalExc("Pi runtime returned invalid usage") from error
            if value < 0:
                raise AgentInternalExc("Pi runtime returned invalid usage")
            values.append(value)
        return values[0], values[1], values[2]

    def _tool_call_fields(
        self, payload: dict[str, Any]
    ) -> tuple[str, str, str, dict[str, Any]]:
        call_id = self._required_text(payload, "callId")
        turn_id = self._required_text(payload, "turnId")
        runtime_name = self._required_text(payload, "name")
        arguments = payload.get("arguments")
        if not isinstance(arguments, dict):
            raise AgentInternalExc("Pi runtime returned invalid tool arguments")
        return call_id, turn_id, runtime_name, arguments

    @staticmethod
    def _now_ms() -> int:
        return int(time.time() * 1000)

    def _event_response(self, event: AgentEventV1) -> AgentResponse:
        return AgentResponse(
            typ="agent_event", content=event, model=self.model_config.id
        )

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
            if content:
                content_parts.append(str(content))
            yield _ExecutionEvent(progress=result)
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
        call_id, turn_id, runtime_name, arguments = self._tool_call_fields(payload)

        plugin = plugin_by_runtime_name.get(runtime_name)
        started_at = self._now_ms()
        yield self._event_response(
            self._event_adapter.tool_started(
                turn_id=turn_id,
                call_id=call_id,
                name=plugin.name if plugin is not None else runtime_name,
                arguments=arguments,
                started_at=started_at,
            )
        )
        if plugin is None:
            error_result = {"message": f"Unknown tool: {runtime_name}"}
            finished_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.tool_finished(
                    turn_id=turn_id,
                    call_id=call_id,
                    name=runtime_name,
                    response=error_result,
                    status="error",
                    finished_at=finished_at,
                    duration_ms=finished_at - started_at,
                )
            )
            await websocket.send_json(
                {
                    "type": "tool_result",
                    "callId": call_id,
                    "result": error_result,
                    "isError": True,
                }
            )
            return

        result: PluginResponse | None = None
        try:
            with span.start(f"RunPiTool-{runtime_name}") as tool_span:
                async for event in self._execute_plugin(plugin, arguments, tool_span):
                    if event.progress is not None:
                        yield self._event_response(
                            self._event_adapter.tool_progressed(
                                turn_id=turn_id,
                                call_id=call_id,
                                value=event.progress,
                            )
                        )
                    if event.result is not None:
                        result = event.result
        except asyncio.CancelledError:
            finished_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.tool_finished(
                    turn_id=turn_id,
                    call_id=call_id,
                    name=plugin.name,
                    response={"message": "Tool execution cancelled"},
                    status="cancelled",
                    finished_at=finished_at,
                    duration_ms=finished_at - started_at,
                )
            )
            raise
        except Exception as error:  # Plugin failures are model-visible tool errors.
            span.record_exception(
                error,
                attributes={"pi.tool_name": runtime_name},
            )
            result = PluginResponse(
                code=500,
                result={"message": "Tool execution failed"},
            )
            plugin.run_result = result

        if result is None:
            result = PluginResponse(
                code=500,
                result={"message": f"Plugin {plugin.name} returned no result"},
            )
            plugin.run_result = result

        action_output = self._dict_result(result.result)
        finished_at = self._now_ms()
        yield self._event_response(
            self._event_adapter.tool_finished(
                turn_id=turn_id,
                call_id=call_id,
                name=plugin.name,
                response=action_output,
                status="error" if result.code != 0 else "success",
                finished_at=finished_at,
                duration_ms=finished_at - started_at,
            )
        )
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

    def _finish_pending_wait_calls(
        self,
        wait_calls: dict[str, Any],
        *,
        status: str,
        message: str,
        span: Span,
    ) -> list[AgentResponse]:
        responses: list[AgentResponse] = []
        try:
            for call_id, wait_call in wait_calls.items():
                try:
                    if not isinstance(call_id, str) or not call_id:
                        raise ValueError("invalid pending wait call id")
                    if not isinstance(wait_call, dict):
                        raise ValueError("invalid pending wait record")
                    turn_id = wait_call.get("turnId")
                    name = wait_call.get("name") or "wait"
                    started_at = wait_call.get("startedAt")
                    if not isinstance(turn_id, str) or not turn_id:
                        raise ValueError("invalid pending wait turn id")
                    if not isinstance(name, str) or not name:
                        raise ValueError("invalid pending wait name")
                    if not isinstance(started_at, int):
                        raise ValueError("invalid pending wait start time")
                    finished_at = self._now_ms()
                    responses.append(
                        self._event_response(
                            self._event_adapter.tool_finished(
                                turn_id=turn_id,
                                call_id=call_id,
                                name=name,
                                response={"message": message},
                                status=status,
                                finished_at=finished_at,
                                duration_ms=finished_at - started_at,
                            )
                        )
                    )
                except Exception as cleanup_error:  # noqa: PERF203
                    span.record_exception(
                        cleanup_error,
                        attributes={"pi.cleanup": "pending_wait"},
                    )
        finally:
            wait_calls.clear()
        return responses

    async def run(
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncIterator[AgentResponse]:
        del node_trace_log  # Public trace conversion consumes the emitted CotStep.
        if not self.internal_secret:
            raise AgentInternalExc("PI_AGENT_INTERNAL_SECRET is required")

        start_message, plugin_by_runtime_name = self._start_message()
        self._event_adapter = PiEventAdapter(
            run_id=self.run_id,
            started_at=self._now_ms(),
        )
        yield self._event_response(self._event_adapter.execution_started())
        timeout = aiohttp.ClientTimeout(total=None, connect=10, sock_read=None)
        completed = False
        handled_calls: set[str] = set()
        wait_calls: dict[str, dict[str, Any]] = {}
        cumulative_input_tokens = 0
        cumulative_output_tokens = 0
        cumulative_total_tokens = 0
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
                            raise AgentInternalExc(
                                "Pi runtime returned invalid JSON"
                            ) from error
                        if not isinstance(payload, dict):
                            raise AgentInternalExc(
                                "Pi runtime returned an invalid event"
                            )

                        event_type = payload.get("type")
                        if event_type == "agent_event":
                            try:
                                events = self._event_adapter.adapt_runtime_event(
                                    payload
                                )
                            except PiEventAdapterError as error:
                                raise AgentInternalExc(str(error)) from error
                            for event in events:
                                yield self._event_response(event)
                        elif event_type == "reasoning_delta":
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
                            (
                                input_tokens,
                                output_tokens,
                                total_tokens,
                            ) = self._usage_tokens(payload)
                            next_input_tokens = cumulative_input_tokens + input_tokens
                            next_output_tokens = (
                                cumulative_output_tokens + output_tokens
                            )
                            next_total_tokens = cumulative_total_tokens + total_tokens
                            usage_event = self._event_adapter.usage_updated(
                                input_tokens=next_input_tokens,
                                output_tokens=next_output_tokens,
                                total_tokens=next_total_tokens,
                            )
                            cumulative_input_tokens = next_input_tokens
                            cumulative_output_tokens = next_output_tokens
                            cumulative_total_tokens = next_total_tokens
                            yield self._event_response(usage_event)
                            yield AgentResponse(
                                typ="content",
                                content="",
                                model=self.model_config.id,
                                usage=CompletionUsage(
                                    prompt_tokens=input_tokens,
                                    completion_tokens=output_tokens,
                                    total_tokens=total_tokens,
                                ),
                            )
                        elif event_type == "tool_call":
                            (
                                call_id,
                                turn_id,
                                runtime_name,
                                arguments,
                            ) = self._tool_call_fields(payload)
                            if runtime_name == "wait":
                                started_at = self._now_ms()
                                wait_calls[call_id] = {
                                    "turnId": turn_id,
                                    "name": "wait",
                                    "arguments": arguments,
                                    "startedAt": started_at,
                                }
                                yield self._event_response(
                                    self._event_adapter.tool_started(
                                        turn_id=wait_calls[call_id]["turnId"],
                                        call_id=call_id,
                                        name="wait",
                                        arguments=wait_calls[call_id]["arguments"],
                                        started_at=started_at,
                                    )
                                )
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
                            call_id = self._required_text(payload, "callId")
                            if call_id not in handled_calls:
                                wait_call = wait_calls.get(call_id)
                                if not isinstance(wait_call, dict):
                                    raise AgentInternalExc(
                                        "Pi runtime returned an invalid tool completion"
                                    )
                                finished_at = self._now_ms()
                                finish_event = self._event_adapter.tool_finished(
                                    turn_id=self._required_text(wait_call, "turnId"),
                                    call_id=call_id,
                                    name=str(payload.get("name") or "wait"),
                                    response=self._dict_result(payload.get("result")),
                                    status=(
                                        "error" if payload.get("isError") else "success"
                                    ),
                                    finished_at=finished_at,
                                    duration_ms=finished_at
                                    - int(wait_call["startedAt"]),
                                )
                                wait_calls.pop(call_id)
                                yield self._event_response(finish_event)
                                yield self._wait_completion(payload)
                        elif event_type == "tool_progress":
                            call_id = self._required_text(payload, "callId")
                            wait_call = wait_calls.get(call_id)
                            if not isinstance(wait_call, dict):
                                raise AgentInternalExc(
                                    "Pi runtime returned invalid tool progress"
                                )
                            yield self._event_response(
                                self._event_adapter.tool_progressed(
                                    turn_id=self._required_text(wait_call, "turnId"),
                                    call_id=call_id,
                                    value=payload.get("result"),
                                )
                            )
                        elif event_type == "error":
                            runtime_error = RuntimeError(
                                f"Pi runtime error: {payload.get('message') or 'unknown'}"
                            )
                            raise AgentInternalExc(
                                "Pi agent runtime failed"
                            ) from runtime_error
                        elif event_type == "done":
                            finished_at = self._now_ms()
                            yield self._event_response(
                                self._event_adapter.execution_finished(
                                    status="success", finished_at=finished_at
                                )
                            )
                            completed = True
                            return
                        else:
                            runtime_error = ValueError(
                                f"Pi runtime returned unknown event: {event_type}"
                            )
                            raise AgentInternalExc(
                                "Pi agent runtime failed"
                            ) from runtime_error
        except asyncio.CancelledError:
            for response in self._finish_pending_wait_calls(
                wait_calls,
                status="cancelled",
                message="Tool execution cancelled",
                span=span,
            ):
                yield response
            cancelled_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.execution_finished(
                    status="cancelled", finished_at=cancelled_at
                )
            )
            raise
        except AgentExc as error:
            for response in self._finish_pending_wait_calls(
                wait_calls,
                status="error",
                message="Pi runtime stopped before the wait completed",
                span=span,
            ):
                yield response
            failed_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.execution_failed(
                    code="PI_RUNTIME_ERROR",
                    message="Pi agent runtime failed",
                    occurred_at=failed_at,
                )
            )
            yield self._event_response(
                self._event_adapter.execution_finished(
                    status="error", finished_at=failed_at
                )
            )
            raise AgentInternalExc("Pi agent runtime failed") from error
        except (aiohttp.ClientError, OSError) as error:
            for response in self._finish_pending_wait_calls(
                wait_calls,
                status="error",
                message="Pi runtime disconnected before the wait completed",
                span=span,
            ):
                yield response
            failed_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.execution_failed(
                    code="PI_RUNTIME_UNAVAILABLE",
                    message="Pi agent runtime unavailable",
                    occurred_at=failed_at,
                )
            )
            yield self._event_response(
                self._event_adapter.execution_finished(
                    status="error", finished_at=failed_at
                )
            )
            raise AgentInternalExc("Pi agent runtime unavailable") from error
        except Exception as error:
            for response in self._finish_pending_wait_calls(
                wait_calls,
                status="error",
                message="Pi runtime stopped before the wait completed",
                span=span,
            ):
                yield response
            failed_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.execution_failed(
                    code="PI_RUNTIME_ERROR",
                    message="Pi agent runtime failed",
                    occurred_at=failed_at,
                )
            )
            yield self._event_response(
                self._event_adapter.execution_finished(
                    status="error", finished_at=failed_at
                )
            )
            raise AgentInternalExc("Pi agent runtime failed") from error

        if not completed:
            for response in self._finish_pending_wait_calls(
                wait_calls,
                status="error",
                message="Pi runtime disconnected before the wait completed",
                span=span,
            ):
                yield response
            failed_at = self._now_ms()
            yield self._event_response(
                self._event_adapter.execution_failed(
                    code="PI_RUNTIME_DISCONNECTED",
                    message="Pi agent runtime disconnected",
                    occurred_at=failed_at,
                )
            )
            yield self._event_response(
                self._event_adapter.execution_finished(
                    status="error", finished_at=failed_at
                )
            )
            raise AgentInternalExc("Pi agent runtime disconnected")
