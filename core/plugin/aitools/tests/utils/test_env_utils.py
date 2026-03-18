"""Unit tests for env_utils helpers."""

import pytest
from plugin.aitools.utils.env_utils import (
    safe_get_bool_env,
    safe_get_float_env,
    safe_get_int_env,
    safe_get_list_env,
)


class TestSafeGetFloatEnv:
    """Test cases for `safe_get_float_env`."""

    def test_returns_env_value_when_valid_float(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("FLOAT_KEY", "3.14")
            assert safe_get_float_env("FLOAT_KEY", 1.0) == 3.14

    def test_returns_default_when_missing(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.delenv("FLOAT_KEY", raising=False)
            assert safe_get_float_env("FLOAT_KEY", 1.25) == 1.25

    def test_returns_default_when_invalid(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("FLOAT_KEY", "abc")
            assert safe_get_float_env("FLOAT_KEY", 2.5) == 2.5


class TestSafeGetIntEnv:
    """Test cases for `safe_get_int_env`."""

    def test_returns_env_value_when_valid_int(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("INT_KEY", "42")
            assert safe_get_int_env("INT_KEY", 1) == 42

    def test_returns_default_when_missing(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.delenv("INT_KEY", raising=False)
            assert safe_get_int_env("INT_KEY", 7) == 7

    def test_returns_default_when_invalid(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("INT_KEY", "4.2")
            assert safe_get_int_env("INT_KEY", 9) == 9


class TestSafeGetBoolEnv:
    """Test cases for `safe_get_bool_env`."""

    @pytest.mark.parametrize("value", ["true", "1", "yes", "TRUE", "Yes"])
    def test_returns_true_for_truthy_values(self, value: str) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("BOOL_KEY", value)
            assert safe_get_bool_env("BOOL_KEY", False) is True

    @pytest.mark.parametrize("value", ["false", "0", "no", "FALSE", "No"])
    def test_returns_false_for_falsy_values(self, value: str) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("BOOL_KEY", value)
            assert safe_get_bool_env("BOOL_KEY", True) is False

    def test_returns_default_for_invalid_value(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("BOOL_KEY", "not-bool")
            assert safe_get_bool_env("BOOL_KEY", True) is True


class TestSafeGetListEnv:
    """Test cases for `safe_get_list_env`."""

    def test_returns_default_when_missing(self) -> None:
        default_list = ["a", "b"]
        with pytest.MonkeyPatch.context() as mp:
            mp.delenv("LIST_KEY", raising=False)
            assert safe_get_list_env("LIST_KEY", default_list) == default_list

    def test_splits_and_strips_by_default_separator(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("LIST_KEY", " x, y ,, z ")
            assert safe_get_list_env("LIST_KEY", []) == ["x", "y", "z"]

    def test_supports_custom_separator(self) -> None:
        with pytest.MonkeyPatch.context() as mp:
            mp.setenv("LIST_KEY", "a| b| |c")
            assert safe_get_list_env("LIST_KEY", [], separator="|") == ["a", "b", "c"]
