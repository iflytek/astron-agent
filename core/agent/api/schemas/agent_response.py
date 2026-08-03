import time
from typing import Any, Literal, Optional, Union

from openai.types.completion_usage import CompletionUsage
from pydantic import BaseModel, ConfigDict, Field

from agent.service.plugin.base import BasePlugin


def cur_timestamp() -> int:
    return int(time.time() * 1000)


class CotStep(BaseModel):
    thought: str = Field(default="")
    action: str = Field(default="")
    action_input: dict[str, Any] = Field(default_factory=dict)
    action_output: dict[str, Any] = Field(default_factory=dict)
    finished_cot: bool = Field(default=False)
    tool_type: Optional[Literal["workflow", "tool"]] = Field(default=None)

    empty: bool = Field(default=False)
    plugin: Optional[BasePlugin] = Field(default=None)


class AgentStreamEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: Literal[1] = 1
    runId: str
    seq: int
    type: Literal[
        "segment_start",
        "segment_delta",
        "segment_end",
        "turn_commit",
        "tool_start",
        "tool_progress",
        "tool_finish",
    ]
    turnId: Optional[str] = None
    segmentId: Optional[str] = None
    source: Optional[Literal["text", "thinking"]] = None
    channel: Optional[Literal["pending", "reasoning", "content"]] = None
    delta: Optional[str] = None
    partial: Optional[bool] = None
    reason: Optional[Literal["tool_call", "message_end", "cancelled", "error"]] = None
    callId: Optional[str] = None
    name: Optional[str] = None
    arguments: Any = None
    summary: Optional[str] = None
    response: Any = None
    status: Optional[Literal["running", "success", "error", "cancelled"]] = None
    startedAt: Optional[int] = None
    finishedAt: Optional[int] = None
    durationMs: Optional[int] = None


class AgentResponse(BaseModel):
    typ: Literal[
        "reasoning_content",
        "content",
        "cot_step",
        "log",
        "knowledge_metadata",
        "agent_event",
    ]
    content: Union[str, CotStep, AgentStreamEvent, list]
    model: str
    created: int = Field(default_factory=cur_timestamp)
    usage: Optional[CompletionUsage] = Field(default=None)
