"""Completion chunk schema definitions for streaming responses."""

# pyright: reportIncompatibleVariableOverride=false
from typing import Literal, Optional, Sequence

from openai.types.chat.chat_completion_chunk import (
    ChatCompletionChunk,
    Choice,
    ChoiceDelta,
    ChoiceDeltaToolCall,
    ChoiceDeltaToolCallFunction,
)
from pydantic import Field


class ReasonChoiceDeltaToolCallFunction(
    ChoiceDeltaToolCallFunction,
):  # pylint: disable=too-few-public-methods
    """Extended tool call function with response field."""

    response: Optional[str] = None


class ReasonChoiceDeltaToolCall(
    ChoiceDeltaToolCall,
):  # pylint: disable=too-few-public-methods
    """Extended tool call with reason and type fields."""

    reason: str = Field(default="")
    function: Optional[ReasonChoiceDeltaToolCallFunction] = None
    type: Optional[
        Literal["workflow", "tool", "knowledge"]
    ] = None  # type: ignore[assignment]


class ReasonChoiceDelta(ChoiceDelta):  # pylint: disable=too-few-public-methods
    """Extended choice delta with reasoning content."""

    reasoning_content: Optional[str] = None

    tool_calls: Optional[
        Sequence[ReasonChoiceDeltaToolCall]
    ] = None  # type: ignore[assignment]
    role: Optional[Literal["assistant"]] = Field(default="assistant")


class ReasonChoice(Choice):  # pylint: disable=too-few-public-methods
    """Extended choice with ReasonChoiceDelta."""

    delta: ReasonChoiceDelta


class ReasonChatCompletionChunk(
    ChatCompletionChunk,
):  # pylint: disable=too-few-public-methods
    """Extended chat completion chunk with error codes and logs."""

    choices: Sequence[ReasonChoice]  # type: ignore[assignment]
    code: int = Field(default=0)
    message: str = Field(default="success")
    object: Literal[  # type: ignore[assignment]
        "chat.completion.chunk",
        "chat.completion.log",
        "chat.completion.knowledge_metadata",
    ]
    logs: list[str] = Field(default_factory=list)
    knowledge_metadata: list[str] = Field(default_factory=list)
