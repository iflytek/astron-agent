from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Tuple


class ChatResponse(ABC):

    def __init__(self, content: str, total_tokens: int) -> None:
        self.content = content
        self.total_tokens = total_tokens

    def __repr__(self) -> str:
        return f"ChatResponse(content={self.content}, total_tokens={self.total_tokens})"


class BaseLLM(ABC):
    def __init__(self) -> None:
        pass

    @abstractmethod
    def chat(self, messages: List[Dict[str, Any]]) -> ChatResponse:
        pass

    @abstractmethod
    async def stream_chat(
        self, messages: List[Dict[str, Any]], **kwargs: Any
    ) -> AsyncGenerator[Tuple[ChatResponse, bool], None]:
        pass
