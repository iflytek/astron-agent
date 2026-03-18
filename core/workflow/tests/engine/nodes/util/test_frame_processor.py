"""Tests for workflow frame processors."""

import pytest

from workflow.consts.engine.chat_status import ChatStatus, SparkLLMStatus
from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.nodes.util.frame_processor import (
    AnthropicFrameProcessor,
    FrameProcessorFactory,
    GoogleFrameProcessor,
    OpenAIFrameProcessor,
)


def test_anthropic_frame_processor_handles_delta_frame() -> None:
    processor = AnthropicFrameProcessor()

    frame = processor.process_frame(
        {
            "choices": [
                {
                    "delta": {
                        "content": "Hello",
                        "reasoning_content": "",
                    },
                    "finish_reason": None,
                }
            ],
            "usage": {"input_tokens": 1, "output_tokens": 1},
        }
    )

    assert frame.code == 0
    assert frame.status == SparkLLMStatus.RUNNING.value
    assert frame.text["content"] == "Hello"


def test_anthropic_frame_processor_handles_end_frame() -> None:
    processor = AnthropicFrameProcessor()

    frame = processor.process_frame(
        {
            "choices": [
                {
                    "delta": {"content": "", "reasoning_content": ""},
                    "finish_reason": ChatStatus.FINISH_REASON.value,
                }
            ]
        }
    )

    assert frame.status == SparkLLMStatus.END.value


def test_frame_processor_factory_supports_anthropic() -> None:
    processor = FrameProcessorFactory.get_processor(ModelProviderEnum.ANTHROPIC.value)

    assert isinstance(processor, AnthropicFrameProcessor)


def test_google_frame_processor_handles_finish_reason() -> None:
    processor = GoogleFrameProcessor()

    frame = processor.process_frame(
        {
            "choices": [
                {
                    "delta": {"content": "Hi", "reasoning_content": ""},
                    "finish_reason": "stop",
                }
            ]
        }
    )

    assert frame.status == SparkLLMStatus.END.value
    assert frame.text["content"] == "Hi"


def test_frame_processor_factory_supports_google() -> None:
    processor = FrameProcessorFactory.get_processor(ModelProviderEnum.GOOGLE.value)

    assert isinstance(processor, GoogleFrameProcessor)


def test_frame_processor_factory_supports_deepseek() -> None:
    processor = FrameProcessorFactory.get_processor(ModelProviderEnum.DEEPSEEK.value)

    assert isinstance(processor, OpenAIFrameProcessor)


def test_frame_processor_factory_rejects_unknown_protocol() -> None:
    with pytest.raises(ValueError, match="Unsupported protocol"):
        FrameProcessorFactory.get_processor("unknown-provider")
