"""Unit tests for configuration exception classes.

This module contains comprehensive tests for all custom exception classes
including message formatting, inheritance, and string representations.
"""

from typing import Union

import pytest
from plugin.rpa.exceptions.config_exceptions import (
    ConfigNotFoundException,
    CreatTaskException,
    EnvNotFoundException,
    InvalidConfigException,
    QueryTaskException,
)


class TestConfigNotFoundException:
    """Test class for ConfigNotFoundException exception."""

    def test_config_not_found_exception_creation(self) -> None:
        """Test ConfigNotFoundException creation with path parameter."""
        # Arrange
        test_path = "/path/to/config.env"

        # Act
        exception: ConfigNotFoundException = ConfigNotFoundException(test_path)

        # Assert
        assert exception.message == f"Configuration file not found at path: {test_path}"

    def test_config_not_found_exception_str_representation(self) -> None:
        """Test ConfigNotFoundException string representation."""
        # Arrange
        test_path = "/nonexistent/config.yaml"
        exception: ConfigNotFoundException = ConfigNotFoundException(test_path)

        # Act
        str_repr = str(exception)

        # Assert
        expected = f"[Exception] Configuration file not found at path: {test_path}"
        assert str_repr == expected

    def test_config_not_found_exception_with_empty_path(self) -> None:
        """Test ConfigNotFoundException with empty path."""
        # Arrange & Act
        exception: ConfigNotFoundException = ConfigNotFoundException("")

        # Assert
        assert exception.message == "Configuration file not found at path: "
        assert str(exception) == "[Exception] Configuration file not found at path: "

    def test_config_not_found_exception_with_special_characters(self) -> None:
        """Test ConfigNotFoundException with special characters in path."""
        # Arrange
        test_path = "/path/with spaces/config-file_v2.env"
        exception: ConfigNotFoundException = ConfigNotFoundException(test_path)

        # Act
        str_repr = str(exception)

        # Assert
        assert test_path in str_repr
        assert "[Exception]" in str_repr

    def test_config_not_found_exception_inheritance(self) -> None:
        """Test that ConfigNotFoundException inherits from Exception."""
        # Arrange & Act
        exception: ConfigNotFoundException = ConfigNotFoundException("/test/path")

        # Assert
        assert issubclass(ConfigNotFoundException, Exception)


class TestEnvNotFoundException:
    """Test class for EnvNotFoundException exception."""

    def test_env_not_found_exception_creation(self) -> None:
        """Test EnvNotFoundException creation with environment key."""
        # Arrange
        test_env_key = "MISSING_ENV_VAR"

        # Act
        exception: EnvNotFoundException = EnvNotFoundException(test_env_key)

        # Assert
        assert exception.message == f"Environment not found at key: {test_env_key}"

    def test_env_not_found_exception_str_representation(self) -> None:
        """Test EnvNotFoundException string representation."""
        # Arrange
        test_env_key = "DATABASE_URL"
        exception: EnvNotFoundException = EnvNotFoundException(test_env_key)

        # Act
        str_repr = str(exception)

        # Assert
        expected = f"[Exception] Environment not found at key: {test_env_key}"
        assert str_repr == expected

    def test_env_not_found_exception_with_empty_key(self) -> None:
        """Test EnvNotFoundException with empty environment key."""
        # Arrange & Act
        exception: EnvNotFoundException = EnvNotFoundException("")

        # Assert
        assert exception.message == "Environment not found at key: "
        assert str(exception) == "[Exception] Environment not found at key: "

    def test_env_not_found_exception_with_complex_key(self) -> None:
        """Test EnvNotFoundException with complex environment key."""
        # Arrange
        test_env_key = "COMPLEX_ENV_VAR_WITH_UNDERSCORES_AND_NUMBERS_123"
        exception: EnvNotFoundException = EnvNotFoundException(test_env_key)

        # Act
        str_repr = str(exception)

        # Assert
        assert test_env_key in str_repr
        assert "[Exception]" in str_repr

    def test_env_not_found_exception_inheritance(self) -> None:
        """Test that EnvNotFoundException inherits from Exception."""
        # Arrange & Act
        exception: EnvNotFoundException = EnvNotFoundException("TEST_VAR")

        # Assert
        assert issubclass(EnvNotFoundException, Exception)


class TestInvalidConfigException:
    """Test class for InvalidConfigException exception."""

    def test_invalid_config_exception_creation(self) -> None:
        """Test InvalidConfigException creation with details parameter."""
        # Arrange
        test_details = "Invalid timeout value: must be positive integer"

        # Act
        exception: InvalidConfigException = InvalidConfigException(test_details)

        # Assert
        assert exception.message == f"Invalid configuration: {test_details}"

    def test_invalid_config_exception_str_representation(self) -> None:
        """Test InvalidConfigException string representation."""
        # Arrange
        test_details = "Port number out of range"
        exception: InvalidConfigException = InvalidConfigException(test_details)

        # Act
        str_repr = str(exception)

        # Assert
        expected = f"[Exception] Invalid configuration: {test_details}"
        assert str_repr == expected

    def test_invalid_config_exception_with_empty_details(self) -> None:
        """Test InvalidConfigException with empty details."""
        # Arrange & Act
        exception: InvalidConfigException = InvalidConfigException("")

        # Assert
        assert exception.message == "Invalid configuration: "
        assert str(exception) == "[Exception] Invalid configuration: "

    def test_invalid_config_exception_with_multiline_details(self) -> None:
        """Test InvalidConfigException with multiline details."""
        # Arrange
        test_details = (
            "Multiple errors found:\n- Missing required field\n- Invalid format"
        )
        exception: InvalidConfigException = InvalidConfigException(test_details)

        # Act
        str_repr = str(exception)

        # Assert
        assert "Multiple errors found:" in str_repr
        assert "[Exception]" in str_repr

    def test_invalid_config_exception_inheritance(self) -> None:
        """Test that InvalidConfigException inherits from Exception."""
        # Arrange & Act
        exception: InvalidConfigException = InvalidConfigException("Test details")

        # Assert
        assert issubclass(InvalidConfigException, Exception)


class TestCreatTaskException:
    """Test class for CreatTaskException exception."""

    def test_creat_task_exception_creation(self) -> None:
        """Test CreatTaskException creation with details parameter."""
        # Arrange
        test_details = "API endpoint returned 500 error"

        # Act
        exception: CreatTaskException = CreatTaskException(test_details)

        # Assert
        assert exception.message == f"Task creation failed: {test_details}"

    def test_creat_task_exception_str_representation(self) -> None:
        """Test CreatTaskException string representation."""
        # Arrange
        test_details = "Network timeout occurred"
        exception: CreatTaskException = CreatTaskException(test_details)

        # Act
        str_repr = str(exception)

        # Assert
        expected = f"[Exception] Task creation failed: {test_details}"
        assert str_repr == expected

    def test_creat_task_exception_with_empty_details(self) -> None:
        """Test CreatTaskException with empty details."""
        # Arrange & Act
        exception: CreatTaskException = CreatTaskException("")

        # Assert
        assert exception.message == "Task creation failed: "
        assert str(exception) == "[Exception] Task creation failed: "

    def test_creat_task_exception_with_json_error_details(self) -> None:
        """Test CreatTaskException with JSON error details."""
        # Arrange
        test_details = '{"error": "invalid_request", "message": "Missing project_id"}'
        exception: CreatTaskException = CreatTaskException(test_details)

        # Act
        str_repr = str(exception)

        # Assert
        assert "invalid_request" in str_repr
        assert "[Exception]" in str_repr

    def test_creat_task_exception_inheritance(self) -> None:
        """Test that CreatTaskException inherits from Exception."""
        # Arrange & Act
        exception: CreatTaskException = CreatTaskException("Test details")

        # Assert
        assert issubclass(CreatTaskException, Exception)


class TestQueryTaskException:
    """Test class for QueryTaskException exception."""

    def test_query_task_exception_creation(self) -> None:
        """Test QueryTaskException creation with details parameter."""
        # Arrange
        test_details = "Task ID not found in database"

        # Act
        exception: QueryTaskException = QueryTaskException(test_details)

        # Assert
        assert exception.message == f"Querying task status failed: {test_details}"

    def test_query_task_exception_str_representation(self) -> None:
        """Test QueryTaskException string representation."""
        # Arrange
        test_details = "Database connection lost"
        exception: QueryTaskException = QueryTaskException(test_details)

        # Act
        str_repr = str(exception)

        # Assert
        expected = f"[Exception] Querying task status failed: {test_details}"
        assert str_repr == expected

    def test_query_task_exception_with_empty_details(self) -> None:
        """Test QueryTaskException with empty details."""
        # Arrange & Act
        exception: QueryTaskException = QueryTaskException("")

        # Assert
        assert exception.message == "Querying task status failed: "
        assert str(exception) == "[Exception] Querying task status failed: "

    def test_query_task_exception_with_status_code_details(self) -> None:
        """Test QueryTaskException with HTTP status code details."""
        # Arrange
        test_details = "HTTP 404: Task not found"
        exception: QueryTaskException = QueryTaskException(test_details)

        # Act
        str_repr = str(exception)

        # Assert
        assert "HTTP 404" in str_repr
        assert "[Exception]" in str_repr

    def test_query_task_exception_inheritance(self) -> None:
        """Test that QueryTaskException inherits from Exception."""
        # Arrange & Act
        exception: QueryTaskException = QueryTaskException("Test details")

        # Assert
        assert issubclass(QueryTaskException, Exception)


class TestExceptionInteroperability:
    """Test class for exception interoperability and edge cases."""

    def test_all_exceptions_can_be_raised_and_caught(self) -> None:
        """Test that all custom exceptions can be raised and caught properly."""
        # Test each exception type
        exceptions_to_test = [
            (ConfigNotFoundException, "/test/path"),
            (EnvNotFoundException, "TEST_VAR"),
            (InvalidConfigException, "Invalid setting"),
            (CreatTaskException, "Creation failed"),
            (QueryTaskException, "Query failed"),
        ]

        for exception_class, test_param in exceptions_to_test:
            # Test raising and catching specific exception
            with pytest.raises(exception_class):
                raise exception_class(test_param)

            # Test catching as generic Exception
            with pytest.raises(Exception):
                raise exception_class(test_param)

    def test_exceptions_with_unicode_characters(self) -> None:
        """Test exceptions with Unicode characters in messages."""
        # Test with various Unicode characters
        unicode_test_cases = [
            "路径不存在: /测试/路径",
            "Configuración inválida: número de puerto",
            "Ошибка: недопустимое значение",
            "エラー: 設定ファイルが見つかりません",
        ]

        for unicode_text in unicode_test_cases:
            exception: InvalidConfigException = InvalidConfigException(unicode_text)
            str_repr = str(exception)
            assert unicode_text in str_repr
            assert "[Exception]" in str_repr

    def test_exceptions_message_attribute_consistency(self) -> None:
        """Test that all exceptions consistently implement message attribute."""
        # Test all exception types have message attribute
        test_cases: list[
            Union[
                ConfigNotFoundException,
                EnvNotFoundException,
                InvalidConfigException,
                CreatTaskException,
                QueryTaskException,
            ]
        ] = [
            ConfigNotFoundException("/test"),
            EnvNotFoundException("TEST_VAR"),
            InvalidConfigException("Invalid"),
            CreatTaskException("Failed"),
            QueryTaskException("Error"),
        ]

        for exception in test_cases:
            # Assert message attribute exists and is string
            assert hasattr(exception, "message")
            assert isinstance(exception.message, str)
            assert len(exception.message) > 0

    def test_exceptions_str_method_consistency(self) -> None:
        """Test that all exceptions consistently implement __str__ method."""
        # Test all exception types have consistent __str__ format
        test_cases: list[
            Union[
                ConfigNotFoundException,
                EnvNotFoundException,
                InvalidConfigException,
                CreatTaskException,
                QueryTaskException,
            ]
        ] = [
            ConfigNotFoundException("/test"),
            EnvNotFoundException("TEST_VAR"),
            InvalidConfigException("Invalid"),
            CreatTaskException("Failed"),
            QueryTaskException("Error"),
        ]

        for exception in test_cases:
            str_repr = str(exception)
            # All should start with "[Exception]"
            assert str_repr.startswith("[Exception]")
            # All should contain the original message
            assert exception.message in str_repr
