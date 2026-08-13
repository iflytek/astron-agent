"""Exact comparison snapshot lookup regression tests."""

from unittest.mock import MagicMock, patch

import pytest

from workflow.consts.comparisons import Tag
from workflow.domain.models.flow import Flow
from workflow.exception.e import CustomException
from workflow.service import flow_service


def test_get_comparison_scopes_query_to_group_version_and_tag() -> None:
    session = MagicMock()
    anchor = Flow(id=101, group_id=101)
    comparison = Flow(
        id=202,
        group_id=101,
        version="cmp-1",
        tag=Tag.COMPARISON.value,
    )
    query = session.query.return_value
    query.filter_by.return_value.first.return_value = comparison

    with patch.object(flow_service, "get", return_value=anchor):
        result = flow_service.get_comparison("101", "cmp-1", session, MagicMock())

    assert result is comparison
    query.filter_by.assert_called_once_with(
        group_id=101,
        version="cmp-1",
        tag=Tag.COMPARISON.value,
    )


def test_get_comparison_rejects_missing_exact_snapshot() -> None:
    session = MagicMock()
    anchor = Flow(id=101, group_id=101)
    session.query.return_value.filter_by.return_value.first.return_value = None

    with (
        patch.object(flow_service, "get", return_value=anchor),
        pytest.raises(CustomException),
    ):
        flow_service.get_comparison("101", "missing", session, MagicMock())
