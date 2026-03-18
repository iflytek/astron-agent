"""LLM message schema definitions."""

from typing import List, Literal

from pydantic import BaseModel


class LLMMessage(BaseModel):
    """Single LLM message with role and content."""

    role: Literal["user", "assistant", "system"]
    content: str


class LLMMessages(BaseModel):
    """Collection of LLM messages."""

    messages: List[LLMMessage]

    def list(self) -> list[dict]:
        """Convert messages to a list of dictionaries."""
        msgs = [message.dict() for message in self.messages]
        return msgs
