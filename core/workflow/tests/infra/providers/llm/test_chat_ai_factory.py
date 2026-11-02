"""Model protocol dispatch is independent of the configured model name."""

from unittest.mock import Mock

import pytest

from workflow.infra.providers.llm import chat_ai_factory


@pytest.mark.parametrize(
    ("protocol", "adapter"),
    [
        ("openai", "OpenAIChatAI"),
        ("anthropic", "AnthropicChatAI"),
        ("google", "GoogleChatAI"),
    ],
)
@pytest.mark.parametrize("model_name", ["my-model", "a-different-model"])
def test_chat_ai_factory_dispatches_by_protocol(
    monkeypatch: pytest.MonkeyPatch, protocol: str, adapter: str, model_name: str
) -> None:
    constructor = Mock()
    monkeypatch.setattr(chat_ai_factory, adapter, constructor)

    result = chat_ai_factory.ChatAIFactory.get_chat_ai(
        protocol, model_name=model_name, model_url="https://model.example/v1"
    )

    assert result is constructor.return_value
    constructor.assert_called_once_with(
        model_name=model_name, model_url="https://model.example/v1"
    )


def test_chat_ai_factory_rejects_unknown_protocol() -> None:
    with pytest.raises(ValueError, match="Unsupported model source"):
        chat_ai_factory.ChatAIFactory.get_chat_ai("unsupported")
