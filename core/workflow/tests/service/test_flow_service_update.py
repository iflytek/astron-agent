"""Regression tests for persistence failures during protocol writes."""

import traceback
from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import StatementError

from workflow.domain.entities.flow import FlowUpdate
from workflow.service import flow_service


def _hidden_statement_error(sensitive_value: str) -> StatementError:
    return StatementError(
        "write failed",
        "UPDATE flow SET data = :data",
        {"data": sensitive_value},
        RuntimeError("database rejected value"),
        hide_parameters=True,
    )


def test_update_rolls_back_and_preserves_redacted_database_exception() -> None:
    sensitive_value = "SENTINEL_API_KEY_AND_PROMPT"
    session = MagicMock()
    database_error = _hidden_statement_error(sensitive_value)
    session.commit.side_effect = database_error
    db_flow = MagicMock()

    with pytest.raises(StatementError) as exc_info:
        flow_service.update(
            session,
            db_flow,
            FlowUpdate(data={"secret": sensitive_value}),
        )

    error = exc_info.value
    assert error is database_error
    rendered_traceback = "".join(
        traceback.format_exception(type(error), error, error.__traceback__)
    )
    assert sensitive_value not in rendered_traceback
    assert "SQL parameters hidden" in rendered_traceback
    session.rollback.assert_called_once_with()


def test_save_rolls_back_and_preserves_redacted_database_exception() -> None:
    sensitive_value = "SENTINEL_NEW_PROTOCOL"
    session = MagicMock()
    database_error = _hidden_statement_error(sensitive_value)
    session.commit.side_effect = database_error
    flow = MagicMock()
    flow.name = "workflow"
    flow.data = {"secret": sensitive_value}
    flow.description = ""
    flow.app_id = "app-1"
    app_info = MagicMock(actual_source=0)

    with pytest.raises(StatementError) as exc_info:
        flow_service.save(flow, app_info, session, MagicMock())

    assert exc_info.value is database_error
    assert sensitive_value not in str(exc_info.value)
    session.rollback.assert_called_once_with()
