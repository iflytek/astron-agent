import pytest

from agent.engine.nodes.pi.event_adapter import PiEventAdapter, PiEventAdapterError


def test_adapter_assigns_one_public_identity_and_sequence() -> None:
    adapter = PiEventAdapter(run_id="public-run", started_at=100)
    started = adapter.execution_started()
    runtime = adapter.adapt_runtime_event(
        {
            "type": "agent_event",
            "event": {
                "version": 1,
                "runId": "runtime-run",
                "seq": 900,
                "type": "segment_start",
                "turnId": "turn-1",
                "segmentId": "segment-1",
                "source": "text",
                "channel": "pending",
            },
        }
    )[0]
    tool = adapter.tool_started(
        turn_id="turn-1",
        call_id="call-1",
        name="lookup",
        arguments={"id": "7"},
        started_at=110,
    )
    usage = adapter.usage_updated(input_tokens=4, output_tokens=6, total_tokens=10)
    finished = adapter.execution_finished(status="success", finished_at=120)

    events = [started, runtime, tool, usage, finished]
    assert [event.runId for event in events] == ["public-run"] * 5
    assert [event.seq for event in events] == [1, 2, 3, 4, 5]
    assert runtime.visibility == "user"
    assert finished.durationMs == 20


def test_adapter_builds_bounded_tool_progress_and_terminal_tool() -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    progress = adapter.tool_progressed(
        turn_id="turn-1", call_id="call-1", value={"body": "x" * 500}
    )
    finished = adapter.tool_finished(
        turn_id="turn-1",
        call_id="call-1",
        name="lookup",
        response={"ready": True},
        status="success",
        finished_at=130,
        duration_ms=20,
    )

    assert len(progress.summary) == 200
    assert progress.summary.endswith("…")
    assert finished.response == {"ready": True}
    assert finished.status == "success"


def test_adapter_uses_allowlisted_public_error_text() -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    event = adapter.execution_failed(
        code="PI_RUNTIME_ERROR",
        message="Traceback: Authorization: Bearer secret-token",
        occurred_at=120,
    )
    assert event.code == "PI_RUNTIME_ERROR"
    assert event.message == "Pi agent runtime failed"


def test_adapter_replaces_unknown_error_code_and_sensitive_text() -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    event = adapter.execution_failed(
        code="Authorization: Bearer secret-token",
        message="headers={'api-key': 'secret'} raw_request={'prompt': 'private'}",
        occurred_at=120,
    )
    assert event.code == "PI_RUNTIME_ERROR"
    assert event.message == "Pi agent runtime failed"
    assert "secret" not in str(event.model_dump())


@pytest.mark.parametrize(
    "payload",
    [
        {"type": "agent_event", "event": None},
        {"type": "agent_event", "event": {"type": "tool_start"}},
        {"type": "agent_event", "event": {"type": "unknown"}},
    ],
)
def test_adapter_rejects_invalid_pi_runtime_events(payload: dict[str, object]) -> None:
    adapter = PiEventAdapter(run_id="run-1", started_at=100)
    with pytest.raises(PiEventAdapterError):
        adapter.adapt_runtime_event(payload)
