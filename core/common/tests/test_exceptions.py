"""
Tests for exception handling module
"""

import pytest

from common.exceptions.base import BaseExc
from common.exceptions.codes import c9000, c9001, c9010, c9020, c9021, c9022, c9023
from common.exceptions.errs import (
    AuditServiceException,
    BaseCommonException,
    OssServiceException,
)


class TestBaseExc:
    """Test BaseExc exception class"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        exc = BaseExc(1001, "Test error")
        assert exc.c == 1001
        assert exc.m == "Test error"
        assert exc.oc == 0
        assert exc.om == ""
        assert exc.on == ""
        assert exc.kwargs == {}

    def test_init_with_origin(self) -> None:
        """Test initialization with origin information"""
        exc = BaseExc(
            1001, "Test error", oc=2001, om="Origin error", on="Origin service"
        )
        assert exc.c == 1001
        assert exc.m == "Test error"
        assert exc.oc == 2001
        assert exc.om == "Origin error"
        assert exc.on == "Origin service"

    def test_init_with_kwargs(self) -> None:
        """Test initialization with additional kwargs"""
        exc = BaseExc(1001, "Test error", extra_data="test", debug=True)
        assert exc.kwargs == {"extra_data": "test", "debug": True}

    def test_call_method_basic(self) -> None:
        """Test call method with append message"""
        exc = BaseExc(1001, "Test error")
        new_exc = exc("Additional message")

        assert new_exc.c == 1001
        assert new_exc.m == "Test error,Additional message"
        assert new_exc is not exc  # Should be a copy

    def test_repr(self) -> None:
        """Test string representation"""
        exc = BaseExc(1001, "Test error")
        assert repr(exc) == "1001: Test error"
        assert str(exc) == "1001: Test error"

    def test_inheritance(self) -> None:
        """Test exception inheritance"""

        class CustomExc(BaseExc):
            pass

        exc = CustomExc(1001, "Custom error")
        assert isinstance(exc, BaseExc)
        assert isinstance(exc, CustomExc)
        assert exc.c == 1001
        assert exc.m == "Custom error"


class TestCommonExceptions:
    """Test common exception classes"""

    def test_base_common_exception(self) -> None:
        """Test BaseCommonException"""
        exc = BaseCommonException(1001, "Common error")
        assert isinstance(exc, BaseExc)
        assert isinstance(exc, BaseCommonException)
        assert exc.c == 1001
        assert exc.m == "Common error"

    def test_oss_service_exception(self) -> None:
        """Test OssServiceException"""
        exc = OssServiceException(1001, "OSS error")
        assert isinstance(exc, BaseExc)
        assert isinstance(exc, BaseCommonException)
        assert isinstance(exc, OssServiceException)
        assert exc.c == 1001
        assert exc.m == "OSS error"

    def test_audit_service_exception(self) -> None:
        """Test AuditServiceException"""
        exc = AuditServiceException(1001, "Audit error")
        assert isinstance(exc, BaseExc)
        assert isinstance(exc, BaseCommonException)
        assert isinstance(exc, AuditServiceException)
        assert exc.c == 1001
        assert exc.m == "Audit error"


class TestErrorCodes:
    """Test error code constants"""

    def test_error_codes_structure(self) -> None:
        """Test error codes have correct structure"""
        assert isinstance(c9000, tuple)
        assert len(c9000) == 2
        assert c9000[0] == 9000
        assert c9000[1] == "登录polaris失败"

    def test_all_error_codes(self) -> None:
        """Test all defined error codes"""
        error_codes = [c9000, c9001, c9010, c9020, c9021, c9022, c9023]

        for code in error_codes:
            assert isinstance(code, tuple)
            assert len(code) == 2
            assert isinstance(code[0], int)
            assert isinstance(code[1], str)
            assert code[0] > 0  # Error codes should be positive

    def test_error_code_values(self) -> None:
        """Test specific error code values"""
        assert c9000 == (9000, "登录polaris失败")
        assert c9001 == (9001, "未知异常")
        assert c9010 == (9010, "oss服务失败")
        assert c9020 == (9020, "审核异常")
        assert c9021 == (9021, "审核服务异常")
        assert c9022 == (9022, "输入内容审核不通过，涉嫌违规，请重新调整输入内容")
        assert c9023 == (
            9023,
            "输出内容涉及敏感信息，审核不通过，后续结果无法展示给用户",
        )


class TestExceptionUsage:
    """Test exception usage patterns"""

    def test_raise_exception(self) -> None:
        """Test raising exceptions"""
        with pytest.raises(BaseCommonException) as exc_info:
            raise BaseCommonException(1001, "Test error")

        assert exc_info.value.c == 1001
        assert exc_info.value.m == "Test error"

    def test_exception_chaining(self) -> None:
        """Test exception chaining with origin information"""
        try:
            raise BaseCommonException(
                1001, "Test error", oc=2001, om="Origin error", on="Origin service"
            )
        except BaseCommonException as e:
            assert e.c == 1001
            assert e.m == "Test error"
            assert e.oc == 2001
            assert e.om == "Origin error"
            assert e.on == "Origin service"

    def test_exception_with_code_constants(self) -> None:
        """Test using exception with code constants"""
        code, message = c9001
        exc = BaseCommonException(code, message)
        assert exc.c == code
        assert exc.m == message
