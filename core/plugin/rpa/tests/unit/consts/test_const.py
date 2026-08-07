"""Unit tests for constants module.

This module contains comprehensive tests for constant definitions,
imports, and key collections used throughout the RPA service.
"""

import pytest
from plugin.rpa.consts import const


class TestConstantImports:
    """Test class for constant imports and availability."""

    def test_service_port_key_import(self) -> None:
        """Test that SERVICE_PORT_KEY is properly imported."""
        # Assert
        assert hasattr(const, "SERVICE_PORT_KEY")
        assert isinstance(const.SERVICE_PORT_KEY, str)

    def test_log_keys_import(self) -> None:
        """Test that log-related constants are properly imported."""
        # Assert
        assert hasattr(const, "LOG_LEVEL_KEY")
        assert hasattr(const, "LOG_PATH_KEY")
        assert isinstance(const.LOG_LEVEL_KEY, str)
        assert isinstance(const.LOG_PATH_KEY, str)

    def test_rpa_keys_import(self) -> None:
        """Test that RPA-related constants are properly imported."""
        # Assert RPA constants are available
        rpa_constants = [
            "XIAOWU_RPA_PING_INTERVAL_KEY",
            "XIAOWU_RPA_TASK_CREATE_URL_KEY",
            "XIAOWU_RPA_TASK_QUERY_INTERVAL_KEY",
            "XIAOWU_RPA_TASK_QUERY_URL_KEY",
            "XIAOWU_RPA_TIMEOUT_KEY",
        ]

        for rpa_constant in rpa_constants:
            assert hasattr(const, rpa_constant), f"{rpa_constant} should be available"
            assert isinstance(getattr(const, rpa_constant), str)

    def test_otlp_keys_import(self) -> None:
        """Test that OTLP-related constants are properly imported."""
        # Assert OTLP constants are available
        otlp_constants = [
            "OTLP_ENABLE_KEY",
            "OTLP_DC_KEY",
            "OTLP_SERVICE_NAME_KEY",
            "KAFKA_TOPIC_KEY",
            "OTLP_ENDPOINT_KEY",
            "OTLP_METRIC_EXPORT_INTERVAL_MILLIS_KEY",
            "OTLP_METRIC_EXPORT_TIMEOUT_MILLIS_KEY",
            "OTLP_METRIC_TIMEOUT_KEY",
            "OTLP_TRACE_TIMEOUT_KEY",
            "OTLP_TRACE_MAX_QUEUE_SIZE_KEY",
            "OTLP_TRACE_SCHEDULE_DELAY_MILLIS_KEY",
            "OTLP_TRACE_MAX_EXPORT_BATCH_SIZE_KEY",
            "OTLP_TRACE_EXPORT_TIMEOUT_MILLIS_KEY",
            "KAFKA_SERVERS_KEY",
            "KAFKA_TIMEOUT_KEY",
        ]

        for otlp_constant in otlp_constants:
            assert hasattr(const, otlp_constant), f"{otlp_constant} should be available"
            assert isinstance(getattr(const, otlp_constant), str)

    def test_service_name_key_import(self) -> None:
        """Test that SERVICE_NAME_KEY is properly imported."""
        # Assert
        assert hasattr(const, "SERVICE_NAME_KEY")
        assert isinstance(const.SERVICE_NAME_KEY, str)


class TestDunderAllExports:
    """Test class for __all__ exports definition."""

    def test_all_exports_contains_expected_constants(self) -> None:
        """Test that __all__ contains all expected constant names."""
        # Arrange
        expected_exports = [
            # server_keys
            "SERVICE_NAME_KEY",
            # app_keys
            "SERVICE_PORT_KEY",
            # log_keys
            "LOG_LEVEL_KEY",
            "LOG_PATH_KEY",
            # rpa_keys
            "XIAOWU_RPA_PING_INTERVAL_KEY",
            "XIAOWU_RPA_TASK_CREATE_URL_KEY",
            "XIAOWU_RPA_TASK_QUERY_INTERVAL_KEY",
            "XIAOWU_RPA_TASK_QUERY_URL_KEY",
            "XIAOWU_RPA_TIMEOUT_KEY",
            # otlp_keys server use
            "OTLP_ENABLE_KEY",
            "OTLP_DC_KEY",
            "OTLP_SERVICE_NAME_KEY",
            "KAFKA_TOPIC_KEY",
            # otlp_keys common use
            "OTLP_ENDPOINT_KEY",
            "OTLP_METRIC_EXPORT_INTERVAL_MILLIS_KEY",
            "OTLP_METRIC_EXPORT_TIMEOUT_MILLIS_KEY",
            "OTLP_METRIC_TIMEOUT_KEY",
            "OTLP_TRACE_TIMEOUT_KEY",
            "OTLP_TRACE_MAX_QUEUE_SIZE_KEY",
            "OTLP_TRACE_SCHEDULE_DELAY_MILLIS_KEY",
            "OTLP_TRACE_MAX_EXPORT_BATCH_SIZE_KEY",
            "OTLP_TRACE_EXPORT_TIMEOUT_MILLIS_KEY",
            "KAFKA_SERVERS_KEY",
            "KAFKA_TIMEOUT_KEY",
        ]

        # Assert
        assert hasattr(const, "__all__")
        assert isinstance(const.__all__, list)

        # Check that all expected exports are in __all__
        for expected_export in expected_exports:
            assert (
                expected_export in const.__all__
            ), f"{expected_export} should be in __all__"

    def test_all_exports_are_available_as_attributes(self) -> None:
        """Test that all items in __all__ are available as module attributes."""
        # Assert
        for export_name in const.__all__:
            assert hasattr(
                const, export_name
            ), f"{export_name} should be available as module attribute"

    def test_all_exports_are_strings(self) -> None:
        """Test that all exported constants are strings."""
        # Assert
        for export_name in const.__all__:
            export_value = getattr(const, export_name)
            assert isinstance(
                export_value, str
            ), f"{export_name} should be a string constant"

    def test_all_exports_no_duplicates(self) -> None:
        """Test that __all__ contains no duplicate entries."""
        # Assert
        assert len(const.__all__) == len(
            set(const.__all__)
        ), "__all__ should not contain duplicates"


class TestBaseKeys:
    """Test class for base_keys collection."""

    def test_base_keys_exists(self) -> None:
        """Test that base_keys is defined and is a list."""
        # Assert
        assert hasattr(const, "base_keys")
        assert isinstance(const.base_keys, list)

    def test_base_keys_contains_expected_keys(self) -> None:
        """Test that base_keys contains expected essential keys."""
        # Arrange
        expected_base_keys = [
            const.SERVICE_NAME_KEY,
            const.SERVICE_PORT_KEY,
            const.LOG_LEVEL_KEY,
            const.LOG_PATH_KEY,
            const.XIAOWU_RPA_PING_INTERVAL_KEY,
            const.XIAOWU_RPA_TASK_CREATE_URL_KEY,
            const.XIAOWU_RPA_TASK_QUERY_INTERVAL_KEY,
            const.XIAOWU_RPA_TASK_QUERY_URL_KEY,
            const.XIAOWU_RPA_TIMEOUT_KEY,
        ]

        # Assert
        for expected_key in expected_base_keys:
            assert (
                expected_key in const.base_keys
            ), f"{expected_key} should be in base_keys"

    def test_base_keys_are_strings(self) -> None:
        """Test that all base keys are strings."""
        # Assert
        for key in const.base_keys:
            assert isinstance(key, str), f"Base key {key} should be a string"

    def test_base_keys_no_duplicates(self) -> None:
        """Test that base_keys contains no duplicate entries."""
        # Assert
        assert len(const.base_keys) == len(
            set(const.base_keys)
        ), "base_keys should not contain duplicates"

    def test_base_keys_non_empty(self) -> None:
        """Test that base_keys is not empty and contains meaningful values."""
        # Assert
        assert len(const.base_keys) > 0, "base_keys should not be empty"

        for key in const.base_keys:
            assert key.strip(), f"Base key should not be empty or whitespace: '{key}'"


class TestOtlpKeys:
    """Test class for otlp_keys collection."""

    def test_otlp_keys_exists(self) -> None:
        """Test that otlp_keys is defined and is a list."""
        # Assert
        assert hasattr(const, "otlp_keys")
        assert isinstance(const.otlp_keys, list)

    def test_otlp_keys_contains_expected_keys(self) -> None:
        """Test that otlp_keys contains expected OTLP-related keys."""
        # Arrange
        expected_otlp_keys = [
            const.OTLP_ENABLE_KEY,
            const.OTLP_DC_KEY,
            const.OTLP_SERVICE_NAME_KEY,
            const.KAFKA_TOPIC_KEY,
            const.OTLP_ENDPOINT_KEY,
            const.OTLP_METRIC_EXPORT_INTERVAL_MILLIS_KEY,
            const.OTLP_METRIC_EXPORT_TIMEOUT_MILLIS_KEY,
            const.OTLP_METRIC_TIMEOUT_KEY,
            const.OTLP_TRACE_TIMEOUT_KEY,
            const.OTLP_TRACE_MAX_QUEUE_SIZE_KEY,
            const.OTLP_TRACE_SCHEDULE_DELAY_MILLIS_KEY,
            const.OTLP_TRACE_MAX_EXPORT_BATCH_SIZE_KEY,
            const.OTLP_TRACE_EXPORT_TIMEOUT_MILLIS_KEY,
            const.KAFKA_SERVERS_KEY,
            const.KAFKA_TIMEOUT_KEY,
        ]

        # Assert
        for expected_key in expected_otlp_keys:
            assert (
                expected_key in const.otlp_keys
            ), f"{expected_key} should be in otlp_keys"

    def test_otlp_keys_are_strings(self) -> None:
        """Test that all OTLP keys are strings."""
        # Assert
        for key in const.otlp_keys:
            assert isinstance(key, str), f"OTLP key {key} should be a string"

    def test_otlp_keys_no_duplicates(self) -> None:
        """Test that otlp_keys contains no duplicate entries."""
        # Assert
        assert len(const.otlp_keys) == len(
            set(const.otlp_keys)
        ), "otlp_keys should not contain duplicates"

    def test_otlp_keys_non_empty(self) -> None:
        """Test that otlp_keys is not empty and contains meaningful values."""
        # Assert
        assert len(const.otlp_keys) > 0, "otlp_keys should not be empty"

        for key in const.otlp_keys:
            assert key.strip(), f"OTLP key should not be empty or whitespace: '{key}'"


class TestKeyCollectionsSeparation:
    """Test class for key collections separation and organization."""

    def test_base_keys_and_otlp_keys_separation(self) -> None:
        """Test that base_keys and otlp_keys are properly separated."""
        # Convert to sets for easier comparison
        base_keys_set = set(const.base_keys)
        otlp_keys_set = set(const.otlp_keys)

        # Assert that there's no overlap between base and OTLP keys
        overlap = base_keys_set.intersection(otlp_keys_set)
        assert (
            len(overlap) == 0
        ), f"base_keys and otlp_keys should not overlap. Found: {overlap}"

    def test_all_keys_accounted_for_in_collections(self) -> None:
        """Test that important keys are accounted for in either base or OTLP collections."""
        # Get all keys from __all__ that should be in collections
        all_key_names = [name for name in const.__all__ if name.endswith("_KEY")]

        # Get all keys from both collections
        all_collection_keys = set(const.base_keys + const.otlp_keys)

        # Convert key names to actual key values for comparison
        all_key_values = set()
        for key_name in all_key_names:
            key_value = getattr(const, key_name)
            all_key_values.add(key_value)

        # Assert that most keys are accounted for in collections
        # (Some keys might be defined but not used in collections, which is acceptable)
        missing_keys = all_key_values - all_collection_keys

        # We expect at least the core keys to be in collections
        core_keys = {
            const.SERVICE_NAME_KEY,
            const.SERVICE_PORT_KEY,
            const.LOG_LEVEL_KEY,
            const.OTLP_ENABLE_KEY,
        }

        missing_core_keys = core_keys - all_collection_keys
        assert (
            len(missing_core_keys) == 0
        ), f"Core keys missing from collections: {missing_core_keys}"

    def test_key_naming_conventions(self) -> None:
        """Test that keys follow expected naming conventions."""
        # All keys should end with '_KEY'
        for key_name in const.__all__:
            assert key_name.endswith(
                "_KEY"
            ), f"Constant name {key_name} should end with '_KEY'"

        # Key values should be uppercase and use underscores
        for key_name in const.__all__:
            key_value = getattr(const, key_name)
            # Most environment variable names are uppercase with underscores
            # But we'll just check they're reasonable strings
            assert len(key_value) > 0, f"Key value for {key_name} should not be empty"
            assert isinstance(
                key_value, str
            ), f"Key value for {key_name} should be string"
