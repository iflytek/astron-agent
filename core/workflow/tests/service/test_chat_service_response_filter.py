from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.callbacks.openai_types_sse import (
    Choice,
    Delta,
    LLMGenerate,
    NodeInfo,
    WorkflowStep,
)
from workflow.service.chat_service import _filter_response_frame


def test_release_filter_keeps_end_node_variable_content() -> None:
    response = LLMGenerate(
        id="sid",
        workflow_step=WorkflowStep(
            node=NodeInfo(
                id="node-end::1",
                finish_reason=ChatStatus.FINISH_REASON.value,
                ext={"answer_mode": 0},
            ),
            progress=1,
        ),
        choices=[Choice(delta=Delta(content='{"output":[{"name":"test"}]}'), index=0)],
    )
    last_workflow_step = WorkflowStep(seq=3)

    filtered = _filter_response_frame(
        response_frame=response,
        is_stream=True,
        last_workflow_step=last_workflow_step,
        message_cache=[],
        reasoning_content_cache=[],
        is_release=True,
    )

    assert filtered is not None
    assert filtered.workflow_step.node is None
    assert filtered.choices[0].delta.content == '{"output":[{"name":"test"}]}'


def test_release_filter_keeps_workflow_end_content() -> None:
    response = LLMGenerate(
        id="sid",
        workflow_step=WorkflowStep(node=NodeInfo(id="flow_obj"), progress=1),
        choices=[
            Choice(
                delta=Delta(content='{"output":[{"name":"test"}]}'),
                index=0,
                finish_reason=ChatStatus.FINISH_REASON.value,
            )
        ],
    )
    last_workflow_step = WorkflowStep(seq=3)

    filtered = _filter_response_frame(
        response_frame=response,
        is_stream=True,
        last_workflow_step=last_workflow_step,
        message_cache=[],
        reasoning_content_cache=[],
        is_release=True,
    )

    assert filtered is not None
    assert filtered.workflow_step.node is None
    assert filtered.workflow_step.seq == 4
    assert filtered.choices[0].delta.content == '{"output":[{"name":"test"}]}'
