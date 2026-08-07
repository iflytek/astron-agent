import json
import os
from typing import Any, AsyncGenerator, Dict, List, Tuple

from loguru import logger
from openai import AsyncOpenAI

from knowledge.exceptions import ThirdPartyException
from knowledge.llm.base import BaseLLM, ChatResponse


class OpenAI(BaseLLM):

    def __init__(self, model: str = "spark-x", **kwargs: Any) -> None:

        self.model = model
        self.max_token = None
        self.temperature = None
        self.top_k = None
        self.base_url = None
        self.extra_body = {}
        if "api_key" in kwargs:
            self.api_key = kwargs.pop("api_key")
        else:
            self.api_key = os.getenv("OPENAI_API_KEY")
        if "base_url" in kwargs:
            self.base_url = kwargs.pop("base_url")
        else:
            self.base_url = os.getenv("OPENAI_BASE_URL")
        if "max_token" in kwargs:
            self.max_token = kwargs.pop("max_token")
        if "temperature" in kwargs:
            self.temperature = kwargs.pop("temperature")
        if "top_k" in kwargs:
            self.top_k = kwargs.pop("top_k")
            self.extra_body = {"top_k": self.top_k}

        self.client = AsyncOpenAI(
            api_key=self.api_key, base_url=self.base_url, **kwargs
        )

    def dict(self) -> Dict[str, Any]:
        return {
            "api_key": self.client.api_key,
            "model": self.model,
            "max_token": self.max_token,
            "temperature": self.temperature,
            "top_k": self.top_k,
            "extra_body": self.extra_body,
            "base_url": self.base_url,
        }

    def chat(self, messages: List[Dict[str, Any]]) -> ChatResponse:
        raise NotImplementedError("Use stream_chat for async chat completion")

    async def stream_chat(  # type: ignore[override]
        self, messages: List[Dict[str, Any]], **kwargs: Any
    ) -> AsyncGenerator[Tuple[ChatResponse, bool], None]:
        try:
            span_one = kwargs.get("span")
            if span_one is None:
                raise ValueError("span is required in kwargs")
            with span_one.start(add_source_function_name=True) as span_context:
                span_context.add_info_events(
                    {"LLM_KWARGS": json.dumps(self.dict(), ensure_ascii=False)}
                )
                span_context.add_info_events(
                    {"LLM_INPUT": json.dumps(messages, ensure_ascii=False)}
                )

                completion = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,  # type: ignore[arg-type]
                    max_tokens=self.max_token,
                    temperature=self.temperature,
                    stream=True,
                    extra_body=self.extra_body,
                )

                async for chunk in completion:  # type: ignore[union-attr]
                    content = chunk.choices[0].delta.content or ""
                    res = ChatResponse(
                        content=content,
                        total_tokens=(
                            chunk.usage.total_tokens if chunk.usage is not None else 0
                        ),
                    )
                    finished = (
                        True if chunk.choices[0].finish_reason == "stop" else False
                    )
                    span_context.add_info_events(
                        {"LLM_OUTPUT": json.dumps(chunk.dict(), ensure_ascii=False)}
                    )

                    if finished:
                        if len(res.content) > 0:
                            yield res, False
                            res.content = ""
                            yield res, True
                        else:
                            res.content = ""
                            yield res, True
                    else:
                        yield res, False
        except Exception as e:
            logger.error(f"The request for a large model failed：{e}")
            raise ThirdPartyException(str(e))
