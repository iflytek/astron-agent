"""Test module for MiniMax provider integration.

This module contains tests to verify that the MiniMax provider is properly
integrated into the workflow system, including model provider enumeration,
chat AI factory, and frame processor support.
"""

from unittest.mock import Mock, patch

import pytest

from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.nodes.util.frame_processor import (
    FrameProcessorEnum,
    FrameProcessorFactory,
    OpenAIFrameProcessor,
)
from workflow.infra.providers.llm.chat_ai_factory import ChatAIFactory
from workflow.infra.providers.llm.openai.openai_chat_llm import OpenAIChatAI


class TestMiniMaxModelProvider:
    """Test suite for MiniMax model provider enumeration.

    Validates that the MiniMax provider is correctly defined in the
    ModelProviderEnum and has the expected value.
    """

    def test_minimax_enum_exists(self) -> None:
        """Test that MINIMAX enum member exists in ModelProviderEnum.

        :return: None
        """
        assert hasattr(ModelProviderEnum, "MINIMAX")

    def test_minimax_enum_value(self) -> None:
        """Test that MINIMAX enum has the correct value.

        :return: None
        """
        assert ModelProviderEnum.MINIMAX.value == "minimax"

    def test_minimax_is_distinct_from_other_providers(self) -> None:
        """Test that MINIMAX value is distinct from other provider values.

        :return: None
        """
        assert ModelProviderEnum.MINIMAX.value != ModelProviderEnum.OPENAI.value
        assert ModelProviderEnum.MINIMAX.value != ModelProviderEnum.XINGHUO.value


class TestMiniMaxChatAIFactory:
    """Test suite for MiniMax integration in ChatAIFactory.

    Validates that the ChatAIFactory correctly creates OpenAIChatAI
    instances for MiniMax provider requests, since MiniMax uses
    OpenAI-compatible API format.
    """

    def test_get_chat_ai_minimax_returns_openai_instance(self) -> None:
        """Test that ChatAIFactory returns OpenAIChatAI for MiniMax provider.

        MiniMax uses OpenAI-compatible API, so the factory should return
        an OpenAIChatAI instance when MiniMax is specified.

        :return: None
        """
        kwargs = {
            "model_url": "https://api.minimax.io/v1/chat/completions",
            "model_name": "MiniMax-M2.5",
            "temperature": 0.7,
            "app_id": "test_app_id",
            "api_key": "test_api_key",
            "api_secret": "test_api_secret",
            "max_tokens": 4096,
            "top_k": 1,
            "uid": "test_uid",
        }
        result = ChatAIFactory.get_chat_ai(
            model_source=ModelProviderEnum.MINIMAX.value, **kwargs
        )
        assert isinstance(result, OpenAIChatAI)

    def test_get_chat_ai_minimax_highspeed_model(self) -> None:
        """Test that ChatAIFactory works with MiniMax-M2.5-highspeed model.

        :return: None
        """
        kwargs = {
            "model_url": "https://api.minimax.io/v1/chat/completions",
            "model_name": "MiniMax-M2.5-highspeed",
            "temperature": 0.7,
            "app_id": "test_app_id",
            "api_key": "test_api_key",
            "api_secret": "test_api_secret",
            "max_tokens": 4096,
            "top_k": 1,
            "uid": "test_uid",
        }
        result = ChatAIFactory.get_chat_ai(
            model_source=ModelProviderEnum.MINIMAX.value, **kwargs
        )
        assert isinstance(result, OpenAIChatAI)
        assert result.model_name == "MiniMax-M2.5-highspeed"


class TestMiniMaxFrameProcessor:
    """Test suite for MiniMax frame processor integration.

    Validates that the MiniMax provider is properly registered in the
    frame processor system and reuses the OpenAIFrameProcessor.
    """

    def test_minimax_enum_exists_in_frame_processor(self) -> None:
        """Test that MINIMAX enum member exists in FrameProcessorEnum.

        :return: None
        """
        assert hasattr(FrameProcessorEnum, "MINIMAX")

    def test_minimax_frame_processor_enum_value(self) -> None:
        """Test that MINIMAX FrameProcessorEnum has the correct value.

        :return: None
        """
        assert FrameProcessorEnum.MINIMAX.value == "minimax"

    def test_minimax_uses_openai_frame_processor(self) -> None:
        """Test that MiniMax uses OpenAIFrameProcessor for frame processing.

        Since MiniMax uses OpenAI-compatible API, it should reuse the
        OpenAIFrameProcessor for response frame processing.

        :return: None
        """
        processor = FrameProcessorFactory.get_processor(
            ModelProviderEnum.MINIMAX.value
        )
        assert isinstance(processor, OpenAIFrameProcessor)

    def test_minimax_frame_processor_processes_response(self) -> None:
        """Test that MiniMax frame processor correctly processes a response.

        :return: None
        """
        processor = FrameProcessorFactory.get_processor(
            ModelProviderEnum.MINIMAX.value
        )
        mock_response = {
            "code": 0,
            "choices": [
                {
                    "finish_reason": None,
                    "delta": {"content": "Hello from MiniMax"},
                }
            ],
        }
        frame = processor.process_frame(mock_response)
        assert frame.code == 0
        assert frame.text["content"] == "Hello from MiniMax"
