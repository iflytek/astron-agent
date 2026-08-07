"""Unit tests for api_service decorator."""

import pytest
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException
from pydantic import BaseModel


class TestApiServiceDecorator:
    """Test cases for api_service decorator."""

    def test_valid_post_method(self) -> None:
        """Test api_service with valid POST method."""

        @api_service(
            method="POST",
            path="/test",
            body=BaseModel,
            response=BaseModel,
            summary="Test endpoint",
            tags=["public_cn"],
        )
        def test_func(body: BaseModel) -> dict:
            return {"ok": True}

        assert hasattr(test_func, "__api_meta__")
        meta = test_func.__api_meta__
        assert meta.method == "POST"
        assert meta.path == "/test"
        assert meta.body == BaseModel

    def test_valid_get_method(self) -> None:
        """Test api_service with valid GET method."""

        @api_service(
            method="GET",
            path="/test",
            query=BaseModel,
            response=BaseModel,
            summary="Test endpoint",
            tags=["public_cn"],
        )
        def test_func(query: BaseModel) -> dict:
            return {"ok": True}

        assert hasattr(test_func, "__api_meta__")
        meta = test_func.__api_meta__
        assert meta.method == "GET"
        assert meta.path == "/test"

    def test_method_case_insensitive(self) -> None:
        """Test that method is converted to uppercase."""

        @api_service(
            method="post",
            path="/test",
            response=BaseModel,
        )
        def test_func() -> dict:
            return {"ok": True}

        meta = test_func.__api_meta__
        assert meta.method == "POST"

    def test_invalid_method_raises(self) -> None:
        """Test that invalid method raises ServiceException."""
        with pytest.raises(ServiceException) as exc_info:

            @api_service(
                method="INVALID",
                path="/test",
                response=BaseModel,
            )
            def test_func() -> dict:
                return {"ok": True}

        assert exc_info.value.code == CodeEnums.ServiceParamsError.code

    def test_invalid_path_raises(self) -> None:
        """Test that path without leading slash raises ServiceException."""
        with pytest.raises(ServiceException) as exc_info:

            @api_service(
                method="POST",
                path="test",
                response=BaseModel,
            )
            def test_func() -> dict:
                return {"ok": True}

        assert exc_info.value.code == CodeEnums.ServiceParamsError.code

    def test_get_with_body_raises(self) -> None:
        """Test that GET method with body raises ServiceException."""
        with pytest.raises(ServiceException) as exc_info:

            @api_service(
                method="GET",
                path="/test",
                body=BaseModel,
                response=BaseModel,
            )
            def test_func(body: BaseModel) -> dict:
                return {"ok": True}

        assert exc_info.value.code == CodeEnums.RouteGetMethodParamsError.code

    def test_all_http_methods(self) -> None:
        """Test all valid HTTP methods."""
        for method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:

            @api_service(
                method=method,
                path=f"/test-{method.lower()}",
                response=BaseModel,
            )
            def test_func() -> dict:
                return {"ok": True}

            assert test_func.__api_meta__.method == method

    def test_deprecated_flag(self) -> None:
        """Test deprecated flag."""

        @api_service(
            method="POST",
            path="/test",
            response=BaseModel,
            deprecated=True,
        )
        def test_func() -> dict:
            return {"ok": True}

        assert test_func.__api_meta__.deprecated is True

    def test_tags(self) -> None:
        """Test tags."""

        @api_service(
            method="POST",
            path="/test",
            response=BaseModel,
            tags=["public_cn", "public_global"],
        )
        def test_func() -> dict:
            return {"ok": True}

        assert test_func.__api_meta__.tags == ["public_cn", "public_global"]
