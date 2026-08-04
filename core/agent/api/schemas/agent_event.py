from typing import Annotated, Any, Literal, TypeAlias, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


AgentExecutionStatus: TypeAlias = Literal["success", "error", "cancelled"]
AgentToolStatus: TypeAlias = Literal["running", "success", "error", "cancelled"]
AgentToolTerminalStatus: TypeAlias = Literal["success", "error", "cancelled"]
AgentVisibility: TypeAlias = Literal["user", "debug", "runtime"]


class AgentEventBase(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: Literal[1]
    runId: str = Field(min_length=1)
    seq: int = Field(gt=0)


class AgentExecutionStartEvent(AgentEventBase):
    type: Literal["execution_start"]
    startedAt: int = Field(ge=0)


class AgentSegmentStartEvent(AgentEventBase):
    type: Literal["segment_start"]
    turnId: str = Field(min_length=1)
    segmentId: str = Field(min_length=1)
    source: Literal["text", "thinking"]
    channel: Literal["pending", "reasoning", "content"]
    visibility: AgentVisibility = "user"


class AgentSegmentDeltaEvent(AgentEventBase):
    type: Literal["segment_delta"]
    turnId: str = Field(min_length=1)
    segmentId: str = Field(min_length=1)
    delta: str


class AgentSegmentEndEvent(AgentEventBase):
    type: Literal["segment_end"]
    turnId: str = Field(min_length=1)
    segmentId: str = Field(min_length=1)


class AgentTurnCommitEvent(AgentEventBase):
    type: Literal["turn_commit"]
    turnId: str = Field(min_length=1)
    channel: Literal["reasoning", "content"]
    partial: bool
    reason: Literal["tool_call", "message_end", "cancelled", "error"]


class AgentToolStartEvent(AgentEventBase):
    type: Literal["tool_start"]
    turnId: str = Field(min_length=1)
    callId: str = Field(min_length=1)
    name: str = Field(min_length=1)
    arguments: Any
    status: Literal["running"] = "running"
    startedAt: int = Field(ge=0)


class AgentToolProgressEvent(AgentEventBase):
    type: Literal["tool_progress"]
    turnId: str = Field(min_length=1)
    callId: str = Field(min_length=1)
    summary: str = Field(max_length=200)


class AgentToolFinishEvent(AgentEventBase):
    type: Literal["tool_finish"]
    turnId: str = Field(min_length=1)
    callId: str = Field(min_length=1)
    name: str | None = Field(default=None, min_length=1)
    response: Any = None
    summary: str | None = Field(default=None, max_length=200)
    status: AgentToolTerminalStatus
    finishedAt: int = Field(ge=0)
    durationMs: int = Field(ge=0)


class AgentUsageUpdateEvent(AgentEventBase):
    type: Literal["usage_update"]
    inputTokens: int = Field(ge=0)
    outputTokens: int = Field(ge=0)
    totalTokens: int = Field(ge=0)


class AgentExecutionErrorEvent(AgentEventBase):
    type: Literal["execution_error"]
    code: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=500)
    occurredAt: int = Field(ge=0)


class AgentExecutionEndEvent(AgentEventBase):
    type: Literal["execution_end"]
    status: AgentExecutionStatus
    finishedAt: int = Field(ge=0)
    durationMs: int = Field(ge=0)


AgentEventV1: TypeAlias = Annotated[
    Union[
        AgentExecutionStartEvent,
        AgentSegmentStartEvent,
        AgentSegmentDeltaEvent,
        AgentSegmentEndEvent,
        AgentTurnCommitEvent,
        AgentToolStartEvent,
        AgentToolProgressEvent,
        AgentToolFinishEvent,
        AgentUsageUpdateEvent,
        AgentExecutionErrorEvent,
        AgentExecutionEndEvent,
    ],
    Field(discriminator="type"),
]

_AGENT_EVENT_V1_ADAPTER = TypeAdapter(AgentEventV1)


def validate_agent_event_v1(value: Any) -> AgentEventV1:
    return _AGENT_EVENT_V1_ADAPTER.validate_python(value)


def agent_event_v1_json_schema() -> dict[str, Any]:
    return _AGENT_EVENT_V1_ADAPTER.json_schema()
