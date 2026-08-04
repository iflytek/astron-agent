import json
from dataclasses import dataclass, field
from typing import Any

from agent.api.schemas.agent_event import (
    AgentEventV1,
    AgentExecutionStatus,
    AgentToolStatus,
    validate_agent_event_v1,
)


_RUNTIME_SEGMENT_TYPES = frozenset(
    {"segment_start", "segment_delta", "segment_end", "turn_commit"}
)


class PiEventAdapterError(ValueError):
    pass


@dataclass
class PiEventAdapter:
    run_id: str
    started_at: int
    _seq: int = field(default=0, init=False)

    def _next(self, payload: dict[str, Any]) -> AgentEventV1:
        self._seq += 1
        return validate_agent_event_v1(
            {
                **payload,
                "version": 1,
                "runId": self.run_id,
                "seq": self._seq,
            }
        )

    @staticmethod
    def _summary(value: Any) -> str:
        try:
            text = (
                value
                if isinstance(value, str)
                else json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            )
        except (TypeError, ValueError):
            text = str(value)
        return text if len(text) <= 200 else f"{text[:199]}…"

    def execution_started(self) -> AgentEventV1:
        return self._next({"type": "execution_start", "startedAt": self.started_at})

    def adapt_runtime_event(self, payload: dict[str, Any]) -> list[AgentEventV1]:
        event = payload.get("event")
        if not isinstance(event, dict):
            raise PiEventAdapterError("Pi runtime returned an invalid agent event")
        event_type = event.get("type")
        if event_type not in _RUNTIME_SEGMENT_TYPES:
            raise PiEventAdapterError(
                f"Pi runtime returned unsupported agent event: {event_type}"
            )
        normalized = {
            key: value
            for key, value in event.items()
            if key not in {"version", "runId", "seq"}
        }
        if event_type == "segment_start":
            normalized["visibility"] = "user"
        try:
            return [self._next(normalized)]
        except ValueError as error:
            raise PiEventAdapterError(
                "Pi runtime returned an invalid agent event"
            ) from error

    def tool_started(
        self,
        *,
        turn_id: str,
        call_id: str,
        name: str,
        arguments: Any,
        started_at: int,
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "tool_start",
                "turnId": turn_id,
                "callId": call_id,
                "name": name,
                "arguments": arguments,
                "status": "running",
                "startedAt": started_at,
            }
        )

    def tool_progressed(
        self, *, turn_id: str, call_id: str, value: Any
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "tool_progress",
                "turnId": turn_id,
                "callId": call_id,
                "summary": self._summary(value),
            }
        )

    def tool_finished(
        self,
        *,
        turn_id: str,
        call_id: str,
        name: str,
        response: Any,
        status: AgentToolStatus,
        finished_at: int,
        duration_ms: int,
    ) -> AgentEventV1:
        if status == "running":
            raise PiEventAdapterError("A finished tool cannot have running status")
        return self._next(
            {
                "type": "tool_finish",
                "turnId": turn_id,
                "callId": call_id,
                "name": name,
                "response": response,
                "status": status,
                "finishedAt": finished_at,
                "durationMs": max(0, duration_ms),
            }
        )

    def usage_updated(
        self, *, input_tokens: int, output_tokens: int, total_tokens: int
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "usage_update",
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "totalTokens": total_tokens,
            }
        )

    def execution_failed(
        self, *, code: str, message: str, occurred_at: int
    ) -> AgentEventV1:
        public_message = " ".join(message.split())[:500]
        return self._next(
            {
                "type": "execution_error",
                "code": code,
                "message": public_message,
                "occurredAt": occurred_at,
            }
        )

    def execution_finished(
        self, *, status: AgentExecutionStatus, finished_at: int
    ) -> AgentEventV1:
        return self._next(
            {
                "type": "execution_end",
                "status": status,
                "finishedAt": finished_at,
                "durationMs": max(0, finished_at - self.started_at),
            }
        )
