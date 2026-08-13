"""Flow layout API regression tests."""

import json
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from sqlalchemy.exc import StatementError

from workflow.api.v1.flow.layout import get_comparison, update
from workflow.domain.entities.compare_flow import ReadComparisonVo
from workflow.domain.entities.flow import FlowUpdate
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum

pytestmark = pytest.mark.asyncio


async def test_get_comparison_returns_only_exact_snapshot_data() -> None:
    snapshot = MagicMock(data={"data": {"nodes": [], "edges": []}})
    span_context = MagicMock()
    span_context.__enter__.return_value = span_context
    mock_span = Mock(sid="test-sid")
    mock_span.start.return_value = span_context
    mock_meter = Mock()
    session = Mock()

    with (
        patch("workflow.api.v1.flow.layout.Span", return_value=mock_span),
        patch("workflow.api.v1.flow.layout.Meter", return_value=mock_meter),
        patch(
            "workflow.api.v1.flow.layout.flow_service.get_comparison",
            return_value=snapshot,
        ) as lookup,
    ):
        response = get_comparison(
            ReadComparisonVo(flow_id="101", version="cmp-1"), session
        )

    payload = json.loads(response.body)
    assert payload["code"] == 0
    assert payload["data"] == snapshot.data
    lookup.assert_called_once_with("101", "cmp-1", session, span_context)


async def test_update_returns_redacted_parameter_error_for_invalid_protocol() -> None:
    """Invalid protocol data must not become an opaque or sensitive error."""
    sensitive_value = "SENTINEL_API_KEY_AND_PROMPT"
    lone_surrogate = chr(0xD800)
    flow = FlowUpdate(
        data={
            "data": {
                "nodes": [
                    {
                        "id": "llm::test-node",
                        "data": {
                            "nodeMeta": sensitive_value,
                            "nodeParam": {
                                "systemTemplate": f"bad{lone_surrogate}prompt"
                            },
                        },
                    }
                ],
                "edges": [],
            }
        }
    )

    span_context = MagicMock()
    span_context.__enter__.return_value = span_context
    span_context.add_info_event_async = AsyncMock(
        side_effect=lambda value: value.encode("utf-8")
    )
    mock_span = Mock(sid="test-sid")
    mock_span.start.return_value = span_context
    mock_meter = Mock()

    with (
        patch("workflow.api.v1.flow.layout.Span", return_value=mock_span),
        patch("workflow.api.v1.flow.layout.Meter", return_value=mock_meter),
        patch("workflow.api.v1.flow.layout.del_flow_by_id") as mock_del_flow,
        patch(
            "workflow.api.v1.flow.layout.WorkflowEngineFactory.create_engine"
        ) as mock_create_engine,
        patch("workflow.api.v1.flow.layout.flow_service.update") as mock_update,
    ):
        response = await update("123", flow, Mock())

    payload = json.loads(response.body)
    assert payload["code"] == CodeEnum.PARAM_ERROR.code
    assert payload["code"] != CodeEnum.PROTOCOL_UPDATE_ERROR.code
    assert "nodes->0->data->nodeMeta" in payload["message"]
    assert sensitive_value not in json.dumps(payload, ensure_ascii=False)

    span_context.record_exception.assert_called_once()
    recorded_error = span_context.record_exception.call_args.args[0]
    assert isinstance(recorded_error, CustomException)
    assert recorded_error.code == CodeEnum.PARAM_ERROR.code
    assert sensitive_value not in str(recorded_error)
    assert sensitive_value not in repr(span_context.mock_calls)

    span_context.add_info_event_async.assert_awaited_once_with("update start: 123")
    assert lone_surrogate not in span_context.add_info_event_async.await_args.args[0]

    mock_del_flow.assert_called_once_with("123")
    mock_create_engine.assert_not_called()
    mock_update.assert_not_called()
    mock_meter.in_error_count.assert_called_once_with(
        CodeEnum.PARAM_ERROR.code,
        span=span_context,
    )


async def test_update_records_only_safe_error_when_database_update_fails() -> None:
    sensitive_value = "SENTINEL_DATABASE_BOUND_PROTOCOL"
    flow = FlowUpdate(data={"data": {"nodes": [], "edges": []}})

    span_context = MagicMock()
    span_context.__enter__.return_value = span_context
    span_context.add_info_event_async = AsyncMock()
    mock_span = Mock(sid="test-sid")
    mock_span.start.return_value = span_context
    mock_meter = Mock()
    query = MagicMock()
    query.filter_by.return_value.first.return_value = MagicMock()
    session = MagicMock()
    session.query.return_value = query

    database_error = StatementError(
        "write failed",
        "UPDATE flow SET data = :data",
        {"data": sensitive_value},
        RuntimeError("database rejected value"),
        hide_parameters=True,
    )
    with (
        patch("workflow.api.v1.flow.layout.Span", return_value=mock_span),
        patch("workflow.api.v1.flow.layout.Meter", return_value=mock_meter),
        patch("workflow.api.v1.flow.layout.del_flow_by_id"),
        patch("workflow.api.v1.flow.layout.WorkflowEngineFactory.create_engine"),
        patch(
            "workflow.api.v1.flow.layout.flow_service.update",
            side_effect=database_error,
        ),
    ):
        response = await update("123", flow, session)

    payload = json.loads(response.body)
    assert payload["code"] == CodeEnum.PROTOCOL_UPDATE_ERROR.code
    assert sensitive_value not in json.dumps(payload, ensure_ascii=False)
    span_context.record_exception.assert_called_once_with(database_error)
    assert sensitive_value not in str(database_error)
    assert "SQL parameters hidden" in str(database_error)
    assert sensitive_value not in repr(span_context.mock_calls)
    mock_meter.in_error_count.assert_called_once_with(
        CodeEnum.PROTOCOL_UPDATE_ERROR.code,
        span=span_context,
    )
