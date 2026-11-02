"""Provider-independent workflow model messages and streaming envelopes."""

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str
    content_type: str = "text"


class StreamOutputMsg(BaseModel):
    domain: str
    llm_response: dict
    exception_occurred: bool = False
