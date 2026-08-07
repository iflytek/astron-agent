"""Unit tests for error code definitions.

This module contains comprehensive tests for the ErrorCode enum including
code values, messages, and string representations.
"""

import pytest
from plugin.rpa.errors.error_code import ErrorCode


class TestErrorCode:
    """Test class for ErrorCode enum."""

    def test_error_code_values_are_tuples(self) -> None:
        """Test that all ErrorCode values are tuples with code and message."""
        # Act & Assert
        for error_code in ErrorCode:
            assert isinstance(
                error_code.value, tuple
            ), f"{error_code.name} should have tuple value"
            assert (
                len(error_code.value) == 2
            ), f"{error_code.name} should have exactly 2 elements"
            assert isinstance(
                error_code.value[0], int
            ), f"{error_code.name} code should be integer"
            assert isinstance(
                error_code.value[1], str
            ), f"{error_code.name} message should be string"

    def test_success_error_code(self) -> None:
        """Test SUCCESS error code properties."""
        # Act & Assert
        assert ErrorCode.SUCCESS.code == 0
        assert ErrorCode.SUCCESS.message == "Success"
        assert ErrorCode.SUCCESS.value == (0, "Success")

    def test_failure_error_code(self) -> None:
        """Test FAILURE error code properties."""
        # Act & Assert
        assert ErrorCode.FAILURE.code == 55000
        assert ErrorCode.FAILURE.message == "Failure"
        assert ErrorCode.FAILURE.value == (55000, "Failure")

    def test_create_task_error_code(self) -> None:
        """Test CREATE_TASK_ERROR error code properties."""
        # Act & Assert
        assert ErrorCode.CREATE_TASK_ERROR.code == 55001
        assert ErrorCode.CREATE_TASK_ERROR.message == "Create task error"
        assert ErrorCode.CREATE_TASK_ERROR.value == (55001, "Create task error")

    def test_query_task_error_code(self) -> None:
        """Test QUERY_TASK_ERROR error code properties."""
        # Act & Assert
        assert ErrorCode.QUERY_TASK_ERROR.code == 55002
        assert ErrorCode.QUERY_TASK_ERROR.message == "Query task error"
        assert ErrorCode.QUERY_TASK_ERROR.value == (55002, "Query task error")

    def test_timeout_error_code(self) -> None:
        """Test TIMEOUT_ERROR error code properties."""
        # Act & Assert
        assert ErrorCode.TIMEOUT_ERROR.code == 55003
        assert ErrorCode.TIMEOUT_ERROR.message == "Timeout error"
        assert ErrorCode.TIMEOUT_ERROR.value == (55003, "Timeout error")

    def test_unknown_error_code(self) -> None:
        """Test UNKNOWN_ERROR error code properties."""
        # Act & Assert
        assert ErrorCode.UNKNOWN_ERROR.code == 55999
        assert ErrorCode.UNKNOWN_ERROR.message == "Unknown error"
        assert ErrorCode.UNKNOWN_ERROR.value == (55999, "Unknown error")

    def test_error_code_property_consistency(self) -> None:
        """Test that code property returns the same value as value[0]."""
        # Act & Assert
        for error_code in ErrorCode:
            assert (
                error_code.code == error_code.value[0]
            ), f"{error_code.name} code property mismatch"

    def test_error_message_property_consistency(self) -> None:
        """Test that message property returns the same value as value[1]."""
        # Act & Assert
        for error_code in ErrorCode:
            assert (
                error_code.message == error_code.value[1]
            ), f"{error_code.name} message property mismatch"

    def test_error_code_string_representation(self) -> None:
        """Test ErrorCode string representation format."""
        # Test SUCCESS error code
        success_str = str(ErrorCode.SUCCESS)
        assert success_str == "code: 0, msg: Success"

        # Test CREATE_TASK_ERROR error code
        create_task_str = str(ErrorCode.CREATE_TASK_ERROR)
        assert create_task_str == "code: 55001, msg: Create task error"

        # Test UNKNOWN_ERROR error code
        unknown_str = str(ErrorCode.UNKNOWN_ERROR)
        assert unknown_str == "code: 55999, msg: Unknown error"

    def test_error_code_range_validation(self) -> None:
        """Test that error codes are within expected ranges."""
        # SUCCESS should be 0
        assert ErrorCode.SUCCESS.code == 0

        # Error codes should be in range 55000-59999 as per comment
        error_codes = [
            ErrorCode.FAILURE,
            ErrorCode.CREATE_TASK_ERROR,
            ErrorCode.QUERY_TASK_ERROR,
            ErrorCode.TIMEOUT_ERROR,
            ErrorCode.UNKNOWN_ERROR,
        ]

        for error_code in error_codes:
            assert (
                55000 <= error_code.code <= 59999
            ), f"{error_code.name} code {error_code.code} not in range 55000-59999"

    def test_error_code_uniqueness(self) -> None:
        """Test that all error codes have unique values."""
        # Collect all codes
        codes = [error_code.code for error_code in ErrorCode]

        # Assert no duplicates
        assert len(codes) == len(set(codes)), "Error codes should be unique"

    def test_error_message_non_empty(self) -> None:
        """Test that all error messages are non-empty strings."""
        # Act & Assert
        for error_code in ErrorCode:
            assert (
                error_code.message
            ), f"{error_code.name} should have non-empty message"
            assert (
                error_code.message.strip()
            ), f"{error_code.name} message should not be whitespace only"

    def test_error_code_enum_membership(self) -> None:
        """Test ErrorCode enum membership and iteration."""
        # Test that we can iterate over all error codes
        error_code_names = [error_code.name for error_code in ErrorCode]

        expected_names = [
            "SUCCESS",
            "FAILURE",
            "CREATE_TASK_ERROR",
            "QUERY_TASK_ERROR",
            "TIMEOUT_ERROR",
            "TASK_EXEC_FAILED",
            "CREATE_URL_INVALID",
            "QUERY_URL_INVALID",
            "UNKNOWN_ERROR",
        ]

        assert set(error_code_names) == set(
            expected_names
        ), "ErrorCode enum should contain expected error codes"

    def test_error_code_access_by_name(self) -> None:
        """Test accessing ErrorCode values by name."""
        # Act & Assert
        assert ErrorCode["SUCCESS"] == ErrorCode.SUCCESS
        assert ErrorCode["CREATE_TASK_ERROR"] == ErrorCode.CREATE_TASK_ERROR
        assert ErrorCode["TIMEOUT_ERROR"] == ErrorCode.TIMEOUT_ERROR

    def test_error_code_comparison(self) -> None:
        """Test ErrorCode comparison operations."""
        # Test equality
        assert ErrorCode.SUCCESS == ErrorCode.SUCCESS
        assert ErrorCode.CREATE_TASK_ERROR != ErrorCode.QUERY_TASK_ERROR  # type: ignore[comparison-overlap]

        # Test that error codes can be compared by their codes
        assert ErrorCode.SUCCESS.code < ErrorCode.FAILURE.code
        assert ErrorCode.CREATE_TASK_ERROR.code < ErrorCode.QUERY_TASK_ERROR.code

    def test_error_code_immutability(self) -> None:
        """Test that ErrorCode enum values are immutable."""
        # Attempting to modify should raise AttributeError
        with pytest.raises(AttributeError):
            ErrorCode.SUCCESS.code = 999  # type: ignore[misc]

        with pytest.raises(AttributeError):
            ErrorCode.SUCCESS.message = "Modified message"  # type: ignore[misc]

    def test_error_code_type_checking(self) -> None:
        """Test ErrorCode type properties."""
        # Assert ErrorCode is an enum
        from enum import Enum

        assert issubclass(ErrorCode, Enum)

        # Assert each error code is an instance of ErrorCode
        for error_code in ErrorCode:
            assert isinstance(error_code, ErrorCode)

    def test_error_code_sequential_values(self) -> None:
        """Test that some error codes follow expected sequential pattern."""
        # CREATE_TASK_ERROR, QUERY_TASK_ERROR, TIMEOUT_ERROR should be sequential
        assert ErrorCode.QUERY_TASK_ERROR.code == ErrorCode.CREATE_TASK_ERROR.code + 1
        assert ErrorCode.TIMEOUT_ERROR.code == ErrorCode.QUERY_TASK_ERROR.code + 1

    def test_error_code_boundary_values(self) -> None:
        """Test error codes at boundary values."""
        # Test minimum error code (SUCCESS)
        assert ErrorCode.SUCCESS.code == 0

        # Test that FAILURE starts the error range
        assert ErrorCode.FAILURE.code == 55000

        # Test that UNKNOWN_ERROR is at the end of the range
        assert ErrorCode.UNKNOWN_ERROR.code == 55999
