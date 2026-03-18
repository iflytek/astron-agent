"""
Unit tests for service modules
Tests management server functions and utilities
"""

import json
from typing import Any
from unittest.mock import Mock, patch

import pytest
from plugin.link.consts import const
from plugin.link.service.community.tools.http.management_server import (
    extract_management_params,
    handle_success_response_mgmt,
    handle_validation_error_mgmt,
    send_telemetry_mgmt,
    setup_logging_and_metrics_mgmt,
    setup_span_and_trace_mgmt,
)
from plugin.link.utils.errors.code import ErrCode


@pytest.mark.unit
class TestManagementServerUtils:
    """Test class for management server utility functions"""

    def test_extract_management_params_with_header_values(self) -> None:
        """Test extract_management_params with header values provided"""
        run_params = {
            "header": {
                "app_id": "test_app_123",
                "uid": "test_uid_456",
                "caller": "test_caller",
                "tool_type": "http_tool",
            }
        }

        app_id, uid, caller, tool_type = extract_management_params(run_params)

        assert app_id == "test_app_123"
        assert uid == "test_uid_456"
        assert caller == "test_caller"
        assert tool_type == "http_tool"

    @patch("plugin.link.service.community.tools.http.management_server.new_uid")
    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_extract_management_params_with_defaults(
        self, mock_getenv: Any, mock_new_uid: Any
    ) -> None:
        """Test extract_management_params uses defaults when header values missing"""
        mock_getenv.return_value = "default_app_id"
        mock_new_uid.return_value = "generated_uid"

        run_params: dict[str, Any] = {"header": {}}

        app_id, uid, caller, tool_type = extract_management_params(run_params)

        assert app_id == "default_app_id"
        assert uid == "generated_uid"
        assert caller == ""
        assert tool_type == ""

    @patch("plugin.link.service.community.tools.http.management_server.new_uid")
    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_extract_management_params_no_header(
        self, mock_getenv: Any, mock_new_uid: Any
    ) -> None:
        """Test extract_management_params when no header is provided"""
        mock_getenv.return_value = "default_app_id"
        mock_new_uid.return_value = "generated_uid"

        run_params: dict[str, Any] = {}

        app_id, uid, caller, tool_type = extract_management_params(run_params)

        assert app_id == "default_app_id"
        assert uid == "generated_uid"
        assert caller == ""
        assert tool_type == ""

    def test_extract_management_params_partial_header(self) -> None:
        """Test extract_management_params with partial header values"""
        run_params = {
            "header": {
                "app_id": "test_app",
                "caller": "test_caller",
                # uid and tool_type missing
            }
        }

        with patch(
            "plugin.link.service.community.tools.http.management_server.new_uid"
        ) as mock_new_uid:
            mock_new_uid.return_value = "generated_uid"

            app_id, uid, caller, tool_type = extract_management_params(run_params)

            assert app_id == "test_app"
            assert uid == "generated_uid"
            assert caller == "test_caller"
            assert tool_type == ""

    @patch("plugin.link.service.community.tools.http.management_server.Span")
    @patch("plugin.link.service.community.tools.http.management_server.NodeTraceLog")
    def test_setup_span_and_trace_mgmt(
        self, mock_node_trace_log: Any, mock_span: Any
    ) -> None:
        """Test setup_span_and_trace_mgmt creates span and trace objects"""
        mock_span_instance = Mock()
        mock_node_trace_instance = Mock()
        mock_span.return_value = mock_span_instance
        mock_node_trace_log.return_value = mock_node_trace_instance

        run_params = {"header": {"sid": "test_session_id"}, "data": "test_data"}
        app_id = "test_app"
        uid = "test_uid"
        caller = "test_caller"
        tool_type = "http_tool"
        service_id = "test_service"

        span, node_trace = setup_span_and_trace_mgmt(
            run_params, app_id, uid, caller, tool_type, service_id
        )

        # Verify span creation
        mock_span.assert_called_once_with(app_id=app_id, uid=uid)
        assert span == mock_span_instance
        assert span.sid == "test_session_id"

        # Verify node trace creation
        mock_node_trace_log.assert_called_once_with(
            service_id=service_id,
            sid="test_session_id",
            app_id=app_id,
            uid=uid,
            chat_id="test_session_id",
            sub="spark-link",
            caller=caller,
            log_caller=tool_type,
            question=json.dumps(run_params, ensure_ascii=False),
        )
        assert node_trace == mock_node_trace_instance

    @patch("plugin.link.service.community.tools.http.management_server.Span")
    @patch("plugin.link.service.community.tools.http.management_server.NodeTraceLog")
    def test_setup_span_and_trace_mgmt_no_sid(
        self, mock_node_trace_log: Any, mock_span: Any
    ) -> None:
        """Test setup_span_and_trace_mgmt without session ID"""
        mock_span_instance = Mock()
        mock_node_trace_instance = Mock()
        mock_span.return_value = mock_span_instance
        mock_node_trace_log.return_value = mock_node_trace_instance

        run_params = {"header": {}, "data": "test_data"}
        app_id = "test_app"
        uid = "test_uid"
        caller = "test_caller"
        tool_type = "http_tool"

        span, node_trace = setup_span_and_trace_mgmt(
            run_params, app_id, uid, caller, tool_type
        )

        # Verify node trace creation with empty sid
        mock_node_trace_log.assert_called_once_with(
            service_id="",
            sid="",
            app_id=app_id,
            uid=uid,
            chat_id="",
            sub="spark-link",
            caller=caller,
            log_caller=tool_type,
            question=json.dumps(run_params, ensure_ascii=False),
        )

    @patch(
        "plugin.link.service.community.tools.http.management_server.send_telemetry_sync"
    )
    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_send_telemetry_mgmt_enabled(
        self, mock_getenv: Any, mock_send_telemetry_sync: Any
    ) -> None:
        """Test send_telemetry_mgmt when OTLP is enabled"""
        mock_getenv.side_effect = lambda key, default=None: {
            const.OTLP_ENABLE_KEY: "1",
            const.KAFKA_TOPIC_KEY: "test_topic",
        }.get(key, default)

        mock_node_trace = Mock()
        mock_node_trace.to_json.return_value = '{"test": "data"}'

        send_telemetry_mgmt(mock_node_trace)

        # Verify send_telemetry_sync was called with the node_trace
        mock_send_telemetry_sync.assert_called_once_with(mock_node_trace)

    @patch(
        "plugin.link.service.community.tools.http.management_server.send_telemetry_sync"
    )
    def test_send_telemetry_mgmt_disabled(self, mock_send_telemetry_sync: Any) -> None:
        """Test send_telemetry_mgmt always delegates to send_telemetry_sync"""

        mock_node_trace = Mock()

        send_telemetry_mgmt(mock_node_trace)

        # Verify send_telemetry_sync was called (OTLP check is inside send_telemetry_sync)
        mock_send_telemetry_sync.assert_called_once_with(mock_node_trace)

    @patch("plugin.link.service.community.tools.http.management_server.logger")
    @patch("plugin.link.service.community.tools.http.management_server.Meter")
    def test_setup_logging_and_metrics_mgmt(
        self, mock_meter: Any, mock_logger: Any
    ) -> None:
        """Test setup_logging_and_metrics_mgmt"""
        mock_meter_instance = Mock()
        mock_meter.return_value = mock_meter_instance

        mock_span_context = Mock()
        mock_span_context.app_id = "test_app"
        mock_span_context.add_info_events = Mock()

        run_params = {"test": "data"}
        func_name = "test_function"

        result = setup_logging_and_metrics_mgmt(
            mock_span_context, run_params, func_name
        )

        # Verify logging
        mock_logger.info.assert_called_once()
        call_args = mock_logger.info.call_args[0][0]
        assert f"manager api, {func_name} router usr_input" in call_args

        # Verify span events
        mock_span_context.add_info_events.assert_called_once()
        events_args = mock_span_context.add_info_events.call_args[0][0]
        assert "usr_input" in events_args

        # Verify meter creation
        mock_meter.assert_called_once_with(app_id="test_app", func=func_name)
        assert result == mock_meter_instance

    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_handle_validation_error_mgmt_with_otlp_enabled(
        self, mock_getenv: Any
    ) -> None:
        """Test handle_validation_error_mgmt with OTLP enabled"""
        mock_getenv.return_value = "1"

        mock_span_context = Mock()
        mock_span_context.sid = "test_session_id"

        mock_node_trace = Mock()
        mock_m = Mock()

        validate_err = "Validation failed: invalid schema"

        with patch(
            "plugin.link.service.community.tools.http.management_server.send_telemetry_mgmt"
        ) as mock_send_telemetry:
            with patch(
                "plugin.link.service.community.tools.http.management_server.Status"
            ) as mock_status:
                mock_status_instance = Mock()
                mock_status.return_value = mock_status_instance

                result = handle_validation_error_mgmt(
                    validate_err, mock_span_context, mock_node_trace, mock_m
                )

                # Verify metrics
                mock_m.in_error_count.assert_called_once_with(
                    ErrCode.JSON_SCHEMA_VALIDATE_ERR.code
                )

                # Verify node trace updates
                assert mock_node_trace.answer == validate_err
                assert mock_node_trace.status == mock_status_instance

                # Verify status creation
                mock_status.assert_called_once_with(
                    code=ErrCode.JSON_SCHEMA_VALIDATE_ERR.code, message=validate_err
                )

                # Verify telemetry sent
                mock_send_telemetry.assert_called_once_with(mock_node_trace)

                # Verify response
                assert result.code == ErrCode.JSON_SCHEMA_VALIDATE_ERR.code
                assert result.message == validate_err
                assert result.sid == "test_session_id"
                assert result.data == {}

    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_handle_validation_error_mgmt_with_custom_error_code(
        self, mock_getenv: Any
    ) -> None:
        """Test handle_validation_error_mgmt with custom error code"""
        mock_getenv.return_value = "1"

        mock_span_context = Mock()
        mock_span_context.sid = "test_session_id"

        mock_node_trace = Mock()
        mock_m = Mock()

        validate_err = "Custom validation error"
        custom_error_code = ErrCode.OPENAPI_SCHEMA_VALIDATE_ERR

        with patch(
            "plugin.link.service.community.tools.http.management_server.send_telemetry_mgmt"
        ):
            with patch(
                "plugin.link.service.community.tools.http.management_server.Status"
            ):
                result = handle_validation_error_mgmt(
                    validate_err,
                    mock_span_context,
                    mock_node_trace,
                    mock_m,
                    custom_error_code,
                )

                # Verify custom error code is used
                mock_m.in_error_count.assert_called_once_with(custom_error_code.code)
                assert result.code == custom_error_code.code

    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_handle_validation_error_mgmt_with_otlp_disabled(
        self, mock_getenv: Any
    ) -> None:
        """Test handle_validation_error_mgmt with OTLP disabled"""
        mock_getenv.return_value = "false"

        mock_span_context = Mock()
        mock_span_context.sid = "test_session_id"

        mock_node_trace = Mock()
        mock_m = Mock()

        validate_err = "Validation error"

        result = handle_validation_error_mgmt(
            validate_err, mock_span_context, mock_node_trace, mock_m
        )

        # Verify metrics are not called when OTLP is disabled
        mock_m.in_error_count.assert_not_called()

        # Verify response is still correct
        assert result.code == ErrCode.JSON_SCHEMA_VALIDATE_ERR.code
        assert result.message == validate_err
        assert result.sid == "test_session_id"

    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_handle_success_response_mgmt_with_otlp_enabled(
        self, mock_getenv: Any
    ) -> None:
        """Test handle_success_response_mgmt with OTLP enabled"""
        mock_getenv.return_value = "1"

        mock_span_context = Mock()
        mock_span_context.sid = "test_session_id"

        mock_node_trace = Mock()
        mock_m = Mock()

        test_data = {"result": "success", "tools": ["tool1", "tool2"]}
        tool_ids = ["tool1", "tool2"]

        with patch(
            "plugin.link.service.community.tools.http.management_server.send_telemetry_mgmt"
        ) as mock_send_telemetry:
            with patch(
                "plugin.link.service.community.tools.http.management_server.Status"
            ) as mock_status:
                mock_status_instance = Mock()
                mock_status.return_value = mock_status_instance

                result = handle_success_response_mgmt(
                    mock_span_context, mock_node_trace, mock_m, test_data, tool_ids
                )

                # Verify metrics
                mock_m.in_success_count.assert_called_once()

                # Verify node trace updates
                expected_answer = json.dumps(test_data, ensure_ascii=False)
                assert mock_node_trace.answer == expected_answer
                assert mock_node_trace.status == mock_status_instance

                # Verify status creation with success code
                mock_status.assert_called_once_with(
                    code=ErrCode.SUCCESSES.code, message=ErrCode.SUCCESSES.msg
                )

                # Verify telemetry sent
                mock_send_telemetry.assert_called_once_with(mock_node_trace)

                # Verify response
                assert result.code == ErrCode.SUCCESSES.code
                assert result.message == ErrCode.SUCCESSES.msg
                assert result.sid == "test_session_id"
                assert result.data == test_data

    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_handle_success_response_mgmt_without_tool_ids(
        self, mock_getenv: Any
    ) -> None:
        """Test handle_success_response_mgmt without tool_ids parameter"""
        mock_getenv.return_value = "1"

        mock_span_context = Mock()
        mock_span_context.sid = "test_session_id"

        mock_node_trace = Mock()
        mock_m = Mock()

        test_data = {"result": "success"}

        with patch(
            "plugin.link.service.community.tools.http.management_server.send_telemetry_mgmt"
        ):
            with patch(
                "plugin.link.service.community.tools.http.management_server.Status"
            ):
                result = handle_success_response_mgmt(
                    mock_span_context, mock_node_trace, mock_m, test_data
                )

                # Verify node trace answer uses data instead of tool_ids
                expected_answer = json.dumps(test_data, ensure_ascii=False)
                assert mock_node_trace.answer == expected_answer

                # Verify response
                assert result.code == ErrCode.SUCCESSES.code
                assert result.data == test_data

    @patch("plugin.link.service.community.tools.http.management_server.os.getenv")
    def test_handle_success_response_mgmt_with_otlp_disabled(
        self, mock_getenv: Any
    ) -> None:
        """Test handle_success_response_mgmt with OTLP disabled"""
        mock_getenv.return_value = "false"

        mock_span_context = Mock()
        mock_span_context.sid = "test_session_id"

        mock_node_trace = Mock()
        mock_m = Mock()

        test_data = {"result": "success"}

        result = handle_success_response_mgmt(
            mock_span_context, mock_node_trace, mock_m, test_data
        )

        # Verify metrics are not called when OTLP is disabled
        mock_m.in_success_count.assert_not_called()

        # Verify response is still correct
        assert result.code == ErrCode.SUCCESSES.code
        assert result.message == ErrCode.SUCCESSES.msg
        assert result.sid == "test_session_id"
        assert result.data == test_data
