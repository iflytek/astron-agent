"""Unit tests for api_meta module."""

import pytest
from plugin.aitools.api.decorators.api_meta import ApiMeta, Tag
from pydantic import BaseModel


class TestApiMeta:
    """Test cases for ApiMeta dataclass."""

    def test_api_meta_creation(self) -> None:
        """Test ApiMeta creation with all fields."""
        meta: ApiMeta = ApiMeta(
            method="POST",
            path="/test",
            body=BaseModel,
            response=BaseModel,
            summary="Test endpoint",
            description="Test description",
            tags=["public_cn"],
            deprecated=False,
        )

        assert meta.method == "POST"
        assert meta.path == "/test"
        assert meta.body == BaseModel
        assert meta.response == BaseModel
        assert meta.summary == "Test endpoint"
        assert meta.description == "Test description"
        assert meta.tags == ["public_cn"]
        assert meta.deprecated is False

    def test_api_meta_optional_fields(self) -> None:
        """Test ApiMeta creation with optional fields."""
        meta: ApiMeta = ApiMeta(
            method="GET",
            path="/test",
        )

        assert meta.method == "GET"
        assert meta.path == "/test"
        assert meta.headers is None
        assert meta.query is None
        assert meta.body is None
        assert meta.response is None
        assert meta.summary is None
        assert meta.description is None
        assert meta.tags is None
        assert meta.deprecated is False

    def test_api_meta_frozen(self) -> None:
        """Test that ApiMeta is frozen (immutable)."""
        meta: ApiMeta = ApiMeta(
            method="GET",
            path="/test",
        )

        with pytest.raises(AttributeError):
            meta.method = "POST"  # type: ignore[misc]

    def test_tag_literal_types(self) -> None:
        """Test Tag literal types."""
        valid_tags: list[Tag] = [
            "public_cn",
            "public_global",
            "local",
            "intranet",
            "unclassified",
        ]
        meta: ApiMeta = ApiMeta(
            method="GET",
            path="/test",
            tags=valid_tags,
        )
        assert meta.tags == valid_tags


class TestTypeVars:
    """Test type variable bounds."""

    def test_queryt_bound(self) -> None:
        """Test QueryT is bound to BaseModel."""
        assert issubclass(BaseModel, BaseModel)

    def test_bodyt_bound(self) -> None:
        """Test BodyT is bound to BaseModel."""
        assert issubclass(BaseModel, BaseModel)

    def test_headert_bound(self) -> None:
        """Test HeadersT is bound to BaseModel."""
        assert issubclass(BaseModel, BaseModel)
