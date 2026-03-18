"""Tests for chat AI provider factory."""

import sys
import types
import pytest

from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.infra.providers.llm.anthropic.anthropic_chat_llm import (
    AnthropicChatAI,
)
from workflow.infra.providers.llm.google.google_chat_llm import GoogleChatAI

fake_spark_module = types.ModuleType(
    "workflow.infra.providers.llm.iflytek_spark.spark_chat_llm"
)


class FakeSparkChatAi:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


fake_spark_module.SparkChatAi = FakeSparkChatAi
sys.modules.setdefault(
    "workflow.infra.providers.llm.iflytek_spark.spark_chat_llm",
    fake_spark_module,
)

fake_openai_module = types.ModuleType(
    "workflow.infra.providers.llm.openai.openai_chat_llm"
)


class FakeOpenAIChatAI:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


fake_openai_module.OpenAIChatAI = FakeOpenAIChatAI
sys.modules.setdefault(
    "workflow.infra.providers.llm.openai.openai_chat_llm",
    fake_openai_module,
)

from workflow.infra.providers.llm.chat_ai_factory import ChatAIFactory


def build_chat_ai(provider: str):
    return ChatAIFactory.get_chat_ai(
        model_source=provider,
        model_url="https://example.com/v1/messages",
        model_name="claude-3-7-sonnet-20250219",
        temperature=0.1,
        app_id="",
        api_key="key",
        api_secret="",
        max_tokens=256,
        top_k=5,
        uid="u1",
    )


def test_chat_ai_factory_supports_anthropic() -> None:
    chat_ai = build_chat_ai(ModelProviderEnum.ANTHROPIC.value)

    assert isinstance(chat_ai, AnthropicChatAI)


def test_chat_ai_factory_supports_google() -> None:
    chat_ai = build_chat_ai(ModelProviderEnum.GOOGLE.value)

    assert isinstance(chat_ai, GoogleChatAI)


def test_chat_ai_factory_supports_deepseek() -> None:
    chat_ai = build_chat_ai(ModelProviderEnum.DEEPSEEK.value)

    assert isinstance(chat_ai, FakeOpenAIChatAI)


def test_chat_ai_factory_rejects_unknown_provider() -> None:
    with pytest.raises(ValueError, match="Unsupported model source"):
        build_chat_ai("unsupported")
