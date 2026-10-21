import time
from typing import Any, Literal, Optional, Union

from openai.types.completion_usage import CompletionUsage
from pydantic import BaseModel, Field

from agent.service.plugin.base import BasePlugin


def cur_timestamp() -> int:
    return int(time.time() * 1000)


class ToolExecution(BaseModel):
    thought: str = Field(default="")
    action: str = Field(default="")
    action_input: dict[str, Any] = Field(default_factory=dict)
    action_output: dict[str, Any] = Field(default_factory=dict)
    tool_type: Optional[Literal["workflow", "tool"]] = Field(default=None)

    plugin: Optional[BasePlugin] = Field(default=None)


class AgentResponse(BaseModel):
    typ: Literal[
        "reasoning_content", "content", "tool_result", "log", "knowledge_metadata"
    ]
    content: Union[str, ToolExecution, list]
    model: str
    created: int = Field(default_factory=cur_timestamp)
    usage: Optional[CompletionUsage] = Field(default=None)
