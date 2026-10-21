from typing import Literal

from pydantic import BaseModel


class LLMMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
