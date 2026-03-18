"""Unit tests for endpoint_factory module."""

from typing import Any, Dict

import pytest
from fastapi import Request
from plugin.aitools.api.decorators.api_meta import ApiMeta
from plugin.aitools.api.routes.endpoint_factory import (
    EndpointFactory,
    ServiceFunctionAdapter,
)
from pydantic import BaseModel


class TestServiceFunctionAdapter:
    """Test cases for ServiceFunctionAdapter."""

    def test_sync_function_detection(self) -> None:
        """Test detection of synchronous functions."""

        def sync_func(request: Request, body: Dict[str, Any]) -> Dict[str, Any]:
            return {"ok": True}

        adapter = ServiceFunctionAdapter(sync_func)
        assert adapter.is_async is False

    def test_async_function_detection(self) -> None:
        """Test detection of asynchronous functions."""

        async def async_func(request: Request, body: Dict[str, Any]) -> Dict[str, Any]:
            return {"ok": True}

        adapter = ServiceFunctionAdapter(async_func)
        assert adapter.is_async is True

    def test_param_names_extraction(self) -> None:
        """Test parameter names extraction."""

        def test_func(request: Request, query: Dict, body: Dict, headers: Dict) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        assert "request" in adapter.param_names
        assert "query" in adapter.param_names
        assert "body" in adapter.param_names
        assert "headers" in adapter.param_names

    def test_adapt_with_request(self) -> None:
        """Test adapt with request parameter."""

        def test_func(request: Request) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "GET"})
        result = adapter.adapt(mock_request)
        assert "request" in result

    def test_adapt_with_query(self) -> None:
        """Test adapt with query parameter."""

        def test_func(query: Dict[str, Any]) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "GET"})
        result = adapter.adapt(mock_request, query={"key": "value"})
        assert result["query"] == {"key": "value"}

    def test_adapt_with_body(self) -> None:
        """Test adapt with body parameter."""

        def test_func(body: Dict[str, Any]) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "POST"})
        result = adapter.adapt(mock_request, body={"key": "value"})
        assert result["body"] == {"key": "value"}

    def test_adapt_with_headers(self) -> None:
        """Test adapt with headers parameter."""

        def test_func(headers: Dict[str, str]) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(
            scope={"type": "http", "method": "GET", "headers": [(b"key", b"value")]}
        )
        result = adapter.adapt(mock_request, headers={"key": "value"})
        assert result["headers"] == {"key": "value"}

    def test_adapt_with_default_values(self) -> None:
        """Test adapt applies default values."""

        def test_func(request: Request, optional_param: str = "default") -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "GET"})
        result = adapter.adapt(mock_request)
        assert result["optional_param"] == "default"

    def test_adapt_with_span(self) -> None:
        """Test adapt with span parameter gets from request.state."""

        def test_func(span: Any) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "GET"})
        mock_span = object()
        mock_request.state.span = mock_span
        result = adapter.adapt(mock_request)
        assert result["span"] is mock_span

    def test_adapt_with_meter(self) -> None:
        """Test adapt with meter parameter gets from request.state."""

        def test_func(meter: Any) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "GET"})
        mock_meter = object()
        mock_request.state.meter = mock_meter
        result = adapter.adapt(mock_request)
        assert result["meter"] is mock_meter

    def test_adapt_with_node_trace(self) -> None:
        """Test adapt with node_trace parameter gets from request.state."""

        def test_func(node_trace: Any) -> Dict:
            return {}

        adapter = ServiceFunctionAdapter(test_func)
        mock_request = Request(scope={"type": "http", "method": "GET"})
        mock_node_trace = object()
        mock_request.state.node_trace = mock_node_trace
        result = adapter.adapt(mock_request)
        assert result["node_trace"] is mock_node_trace


class TestEndpointFactory:
    """Test cases for EndpointFactory."""

    def test_build_endpoint_requires_api_meta(self) -> None:
        """Test that build_endpoint requires __api_meta__."""
        factory = EndpointFactory()

        def test_func() -> Dict:
            return {}

        with pytest.raises(ValueError) as exc_info:
            factory.build_endpoint(test_func)
        assert "No API meta found" in str(exc_info.value)

    def test_build_sync_endpoint(self) -> None:
        """Test building a synchronous endpoint."""

        def test_func(request: Request, body: Dict[str, Any]) -> Dict[str, Any]:
            return {"ok": True}

        test_func.__api_meta__ = ApiMeta(  # type: ignore[attr-defined]
            method="POST",
            path="/test",
            body=BaseModel,
            response=BaseModel,
            summary="Test",
        )

        factory = EndpointFactory()
        endpoint = factory.build_endpoint(test_func)

        assert callable(endpoint)
        assert endpoint.__name__ == "test_func"

    def test_build_async_endpoint(self) -> None:
        """Test building an asynchronous endpoint."""

        async def test_func(request: Request, body: Dict[str, Any]) -> Dict[str, Any]:
            return {"ok": True}

        test_func.__api_meta__ = ApiMeta(  # type: ignore[attr-defined]
            method="POST",
            path="/test",
            body=BaseModel,
            response=BaseModel,
            summary="Test",
        )

        factory = EndpointFactory()
        endpoint = factory.build_endpoint(test_func)

        assert callable(endpoint)
        assert endpoint.__name__ == "test_func"

    def test_endpoint_signature_with_query(self) -> None:
        """Test endpoint signature includes query parameter."""

        class QueryModel(BaseModel):
            key: str

        def test_func(request: Request, query: QueryModel) -> Dict[str, Any]:
            return {}

        test_func.__api_meta__ = ApiMeta(  # type: ignore[attr-defined]
            method="GET",
            path="/test",
            query=QueryModel,
            response=BaseModel,
            summary="Test",
        )

        factory = EndpointFactory()
        endpoint = factory.build_endpoint(test_func)

        sig = endpoint.__signature__  # type: ignore[attr-defined]
        param_names = [p.name for p in sig.parameters.values()]
        assert "query" in param_names

    def test_endpoint_signature_with_body(self) -> None:
        """Test endpoint signature includes body parameter."""

        class BodyModel(BaseModel):
            key: str

        def test_func(request: Request, body: BodyModel) -> Dict[str, Any]:
            return {}

        test_func.__api_meta__ = ApiMeta(  # type: ignore[attr-defined]
            method="POST",
            path="/test",
            body=BodyModel,
            response=BaseModel,
            summary="Test",
        )

        factory = EndpointFactory()
        endpoint = factory.build_endpoint(test_func)

        sig = endpoint.__signature__  # type: ignore[attr-defined]
        param_names = [p.name for p in sig.parameters.values()]
        assert "body" in param_names

    def test_endpoint_signature_with_headers(self) -> None:
        """Test endpoint signature includes headers parameter."""

        class HeadersModel(BaseModel):
            authorization: str

        def test_func(request: Request, headers: HeadersModel) -> Dict[str, Any]:
            return {}

        test_func.__api_meta__ = ApiMeta(  # type: ignore[attr-defined]
            method="POST",
            path="/test",
            headers=HeadersModel,
            response=BaseModel,
            summary="Test",
        )

        factory = EndpointFactory()
        endpoint = factory.build_endpoint(test_func)

        sig = endpoint.__signature__  # type: ignore[attr-defined]
        param_names = [p.name for p in sig.parameters.values()]
        assert "headers" in param_names
