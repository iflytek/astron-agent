from typing import List, Literal

from pydantic import BaseModel


class LLMMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class LLMMessages(BaseModel):
    messages: List[LLMMessage]

    def list(self) -> list[dict]:
        msgs = [message.dict() for message in self.messages]
        return msgs
