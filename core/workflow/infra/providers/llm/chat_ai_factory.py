"""
Chat AI Factory Module

This module provides a factory class for creating chat AI instances based on different model providers.
It supports multiple AI providers including Xinghuo (Spark) and OpenAI.
"""

from typing import Any

from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.infra.providers.llm.anthropic.anthropic_chat_llm import (
    AnthropicChatAI,
)
from workflow.infra.providers.llm.google.google_chat_llm import GoogleChatAI
from workflow.infra.providers.llm.iflytek_spark.spark_chat_llm import SparkChatAi
from workflow.infra.providers.llm.openai.openai_chat_llm import OpenAIChatAI


class ChatAIFactory:
    """
    Factory class for creating chat AI instances.

    This factory provides a centralized way to instantiate different chat AI providers
    based on the specified model source. It maintains a registry of supported providers
    and their corresponding implementation classes.
    """

    @staticmethod
    def get_chat_ai(
        model_source: str, **kwargs: Any
    ) -> OpenAIChatAI | SparkChatAi | AnthropicChatAI | GoogleChatAI:
        """
        Create and return a chat AI instance based on the specified model source.

        :param model_source: The model provider identifier (e.g., 'xinghuo', 'openai')
        :param kwargs: Additional keyword arguments to pass to the chat AI constructor
        :return: An instance of the appropriate chat AI class
        :raises ValueError: If the specified model source is not supported
        """

        # Retrieve the chat AI class from the registry
        if model_source == ModelProviderEnum.XINGHUO.value:
            return SparkChatAi(**kwargs)
        elif model_source == ModelProviderEnum.OPENAI.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.DEEPSEEK.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.MINIMAX.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.ZHIPU.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.QWEN.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.MOONSHOT.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.CHATGPT.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.DOUBAO.value:
            return OpenAIChatAI(**kwargs)
        elif model_source == ModelProviderEnum.ANTHROPIC.value:
            return AnthropicChatAI(**kwargs)
        elif model_source == ModelProviderEnum.GOOGLE.value:
            return GoogleChatAI(**kwargs)
        else:
            raise ValueError(f"Unsupported model source: {model_source}")
