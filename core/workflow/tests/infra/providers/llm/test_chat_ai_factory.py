"""Tests for chat AI provider factory."""

import importlib
import sys
import types

import pytest

# Register fake modules BEFORE any imports that would trigger real modules
# Use direct assignment (not setdefault) to override any modules already imported
# by other tests in the same test session

# Fake Spark module
fake_spark_module = types.ModuleType(
    "workflow.infra.providers.llm.iflytek_spark.spark_chat_llm"
)


class FakeSparkChatAi:
    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs


fake_spark_module.SparkChatAi = FakeSparkChatAi  # type: ignore[attr-defined]
sys.modules["workflow.infra.providers.llm.iflytek_spark.spark_chat_llm"] = (
    fake_spark_module
)

# Fake OpenAI module
fake_openai_module = types.ModuleType(
    "workflow.infra.providers.llm.openai.openai_chat_llm"
)


class FakeOpenAIChatAI:
    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs


fake_openai_module.OpenAIChatAI = FakeOpenAIChatAI  # type: ignore[attr-defined]
sys.modules["workflow.infra.providers.llm.openai.openai_chat_llm"] = fake_openai_module

# Fake Google GenAI module - must be set before GoogleChatAI imports it
fake_google_genai_module = types.ModuleType("google.genai")
fake_google_genai_types_module = types.ModuleType("google.genai.types")


class FakeGoogleClient:
    def __init__(self, **kwargs: object) -> None:
        pass


class FakeContent:
    pass


class FakeGenerateContentConfig:
    pass


class FakePart:
    pass


fake_google_genai_module.Client = FakeGoogleClient  # type: ignore[attr-defined]
fake_google_genai_types_module.Content = FakeContent  # type: ignore[attr-defined]
fake_google_genai_types_module.GenerateContentConfig = FakeGenerateContentConfig  # type: ignore[attr-defined]
fake_google_genai_types_module.Part = FakePart  # type: ignore[attr-defined]
sys.modules["google.genai"] = fake_google_genai_module
sys.modules["google.genai.types"] = fake_google_genai_types_module

# Force reload chat_ai_factory to ensure it picks up our fake modules
# (it may have been imported by other tests before this file was loaded)
# Note: we only reload chat_ai_factory, NOT the fake modules themselves,
# because fake modules created with types.ModuleType don't have __spec__
# and can't be properly reloaded.
for module_name in [
    "workflow.infra.providers.llm.chat_ai_factory",
]:
    if module_name in sys.modules:
        importlib.reload(sys.modules[module_name])

# Now import the real modules (which will use our fakes)
from workflow.consts.engine.model_provider import ModelProviderEnum  # noqa: E402
from workflow.infra.providers.llm.anthropic.anthropic_chat_llm import (  # noqa: E402
    AnthropicChatAI,
)
from workflow.infra.providers.llm.chat_ai_factory import ChatAIFactory  # noqa: E402
from workflow.infra.providers.llm.google.google_chat_llm import (  # noqa: E402
    GoogleChatAI,
)


def build_chat_ai(provider: str) -> object:
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


def test_chat_ai_factory_supports_openai() -> None:
    chat_ai = build_chat_ai(ModelProviderEnum.OPENAI.value)

    assert isinstance(chat_ai, FakeOpenAIChatAI)


def test_chat_ai_factory_rejects_unknown_provider() -> None:
    with pytest.raises(ValueError, match="Unsupported model source"):
        build_chat_ai("unsupported")
