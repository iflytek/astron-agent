from typing import Any

import pytest
from pydantic import ValidationError

from workflow.engine.entities.node_entities import (
    CONTINUE_ON_ERROR_NOT_STREAM_NODE_TYPE,
    NodeType,
)
from workflow.engine.nodes.cache_node import tool_classes
from workflow.engine.nodes.openclaw.openclaw_node import OpenClawNode


class DummySpan:
    def __init__(self) -> None:
        self.events: list[Any] = []

    async def add_info_events_async(self, event: Any) -> None:
        self.events.append(event)


class OpenClawInputPool:
    def get_variable(self, node_id: str, key_name: str, span: DummySpan) -> Any:
        if key_name == "context":
            raise Exception("empty reference")
        return "build a customer support app"


def build_openclaw_node(**overrides) -> OpenClawNode:  # type: ignore[no-untyped-def]
    payload = {
        "node_id": "openclaw::node-1",
        "alias_name": "OpenClaw",
        "node_type": NodeType.OPENCLAW.value,
        "input_identifier": ["instruction", "context"],
        "output_identifier": ["result"],
        "mcpServerUrl": "https://example.test/mcp/sse",
        "toolName": "run_skill",
        "skillName": "chatclaw-builder",
        "executionMode": "chatclaw",
        "preCondition": "collect user intent",
        "postCondition": "return application draft",
        "tuningParams": {"temperature": 0.2},
    }
    payload.update(overrides)
    return OpenClawNode(**payload)


def test_openclaw_node_is_registered() -> None:
    assert tool_classes[NodeType.OPENCLAW.value] is OpenClawNode
    assert NodeType.OPENCLAW.value in CONTINUE_ON_ERROR_NOT_STREAM_NODE_TYPE


def test_openclaw_builds_skill_tool_args() -> None:
    node = build_openclaw_node()

    tool_args = node.build_tool_args(
        {
            "instruction": "build a customer support app",
            "context": {"industry": "retail"},
        }
    )

    assert tool_args == {
        "instruction": "build a customer support app",
        "context": {"industry": "retail"},
        "skill_name": "chatclaw-builder",
        "execution_mode": "chatclaw",
        "pre_condition": "collect user intent",
        "post_condition": "return application draft",
        "tuning_params": {"temperature": 0.2},
    }


def test_openclaw_uses_mcp_gateway_request_shape() -> None:
    node = build_openclaw_node(mcpServerId="mcp-server-1", mcpServerUrl="")

    req_body = node.build_request_body({"instruction": "build"})

    assert req_body == {
        "mcp_server_id": "mcp-server-1",
        "mcp_server_url": "",
        "tool_name": "run_skill",
        "tool_args": {"instruction": "build"},
    }


@pytest.mark.asyncio
async def test_openclaw_skips_unresolved_optional_input() -> None:
    node = build_openclaw_node()
    span = DummySpan()

    inputs = await node.collect_inputs(OpenClawInputPool(), span)

    assert inputs == {"instruction": "build a customer support app"}
    assert span.events == [
        {
            "openclaw_optional_input_skipped": {
                "input": "context",
                "reason": "empty reference",
            }
        }
    ]


def test_openclaw_requires_skill_name() -> None:
    with pytest.raises(ValidationError):
        build_openclaw_node(skillName="")
