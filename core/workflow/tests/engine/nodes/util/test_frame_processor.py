"""Tests for workflow frame processors."""

import json
from typing import Any

import pytest

from workflow.consts.engine.chat_status import ChatStatus, SparkLLMStatus
from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.nodes.util.frame_processor import (
    AgentFrameProcessor,
    AnthropicFrameProcessor,
    FrameProcessorFactory,
    GoogleFrameProcessor,
    extract_tool_calls_content,
)
from workflow.exception.e import CustomException


def tool_call(name: str, response: Any, kind: str = "tool") -> dict[str, Any]:
    return {
        "type": kind,
        "function": {
            "name": name,
            "arguments": json.dumps({"command": "python scripts/heart.py"}),
            "response": json.dumps(response),
        },
    }


def rendered_results(content: str) -> list[dict[str, Any]]:
    return [
        json.loads(part.split("```", 1)[0]) for part in content.split("```json\n")[1:]
    ]


@pytest.mark.parametrize(
    ("name", "response", "kind"),
    [
        (
            "read_skill_71",
            {"skill_id": "71", "content": "Run python scripts/heart.py"},
            "tool",
        ),
        (
            "run_skill_71",
            {"exit_code": 0, "stdout": "*** heart ***", "sandbox_provider": "e2b"},
            "tool",
        ),
        ("workflow_echo", {"content": "echo result"}, "workflow"),
        ("future_tool", {"result": "future result"}, "future"),
        ("list_tool", [{"result": "list result"}], "tool"),
        ("failed_skill", {"code": 12, "error": "sandbox unavailable"}, "tool"),
    ],
)
def test_agent_preserves_native_tool_results(
    name: str, response: Any, kind: str
) -> None:
    frame = AgentFrameProcessor().process_frame(
        {"choices": [{"delta": {"tool_calls": [tool_call(name, response, kind)]}}]}
    )

    result = rendered_results(frame.text["reasoning_content"])[0]
    assert result["name"] == name
    assert json.loads(result["arguments"]) == {"command": "python scripts/heart.py"}
    assert result["response"] == response


def test_agent_unwraps_legacy_results_without_losing_native_batch_results() -> None:
    link_result = {"answer": "link result"}
    mcp_content = [{"type": "text", "text": "mcp result"}]
    metadata = [{"doc_id": "doc-1", "content": "knowledge result"}]
    skill_result = {"exit_code": 0, "stdout": "heart"}
    calls = [
        tool_call(
            "link",
            {
                "header": {"code": 0},
                "payload": {"text": {"text": json.dumps(link_result)}},
            },
        ),
        tool_call("mcp", {"data": {"content": mcp_content}}),
        tool_call("knowledge", {"metadata_list": metadata}, "knowledge"),
        tool_call("skill", skill_result),
        tool_call("workflow", {"content": "workflow result"}, "workflow"),
        tool_call("empty_mcp", {"data": {"content": []}}),
    ]

    results = rendered_results(extract_tool_calls_content(calls))

    assert [item["response"] for item in results] == [
        link_result,
        mcp_content,
        metadata,
        skill_result,
        {"content": "workflow result"},
        [],
    ]


def test_agent_keeps_legacy_link_failure_behavior() -> None:
    with pytest.raises(CustomException):
        extract_tool_calls_content(
            [tool_call("link", {"header": {"code": 12, "message": "link failed"}})]
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


def test_frame_processor_factory_rejects_unknown_protocol() -> None:
    with pytest.raises(ValueError, match="Unsupported protocol"):
        FrameProcessorFactory.get_processor("unknown-provider")
