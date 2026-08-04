import asyncio
from typing import Any

import pytest

from workflow.consts.engine.template import TemplateType
from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.nodes.base_node import BaseOutputNode
from workflow.engine.nodes.util.frame_processor import AgentFrameProcessor
from workflow.infra.providers.llm.iflytek_spark.schemas import StreamOutputMsg


class DummyOutputNode(BaseOutputNode):
    async def async_execute(self, *args: Any, **kwargs: Any) -> Any:
        raise NotImplementedError


@pytest.mark.asyncio
async def test_event_only_frame_is_forwarded_without_ending_reasoning_stream() -> None:
    output_node = DummyOutputNode(
        node_id="end-node",
        alias_name="End",
        node_type="end",
        input_identifier=[],
        output_identifier=[],
    )
    variable_pool = VariablePool([])
    variable_pool.stream_data = {"end-node": {"agent-node": asyncio.Queue()}}
    event = {
        "version": 1,
        "runId": "run-1",
        "seq": 1,
        "type": "execution_start",
        "startedAt": 100,
    }
    await variable_pool.stream_data["end-node"]["agent-node"].put(
        StreamOutputMsg(
            domain="agent",
            llm_response={
                "choices": [{"delta": {"agent_event": event}, "finish_reason": None}]
            },
        )
    )
    span = AsyncMockSpan()
    output_status = {"agent-node": False}
    iterator = output_node._process_queue_output(
        dep_node_id="agent-node",
        variable_pool=variable_pool,
        span=span,
        llm_output_cache={"agent-node": []},
        llm_reasoning_content={"agent-node": []},
        template_type=TemplateType.NORMAL,
        llm_output_status=output_status,
        frame_processor=AgentFrameProcessor(),
    )

    frame = await anext(iterator)
    await iterator.aclose()

    assert frame.agent_event == event
    assert frame.content == ""
    assert frame.reasoning_content == ""
    assert output_status["agent-node"] is False


class AsyncMockSpan:
    async def add_info_events_async(self, *_args: Any, **_kwargs: Any) -> None:
        return None
