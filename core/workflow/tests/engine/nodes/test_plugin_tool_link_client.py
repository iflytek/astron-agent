"""Regression tests for Link tool execution failure handling."""

import json
from typing import Any

import aiohttp
import pytest

from workflow.engine.nodes.plugin_tool.link_client import Tool
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span

RUN_URL = "https://link.example.test/v1/run"


def build_tool() -> Tool:
    """Build a Tool that does not need a real Link service."""
    return Tool(
        app_id="app-id",
        tool_id="tool-id",
        operation_id="operation-id",
        method_schema={"parameters": []},
        parameters={},
        get_url="https://link.example.test/v1/tools",
        run_url=RUN_URL,
        version="V1.0",
    )


class _FailingConnection:
    """Async context manager that fails while opening the HTTP connection."""

    async def __aenter__(self) -> Any:
        raise aiohttp.ClientConnectionError("connection reset by peer")

    async def __aexit__(self, *_args: Any) -> bool:
        return False


class _SuccessfulResponse:
    """Async context manager returning a successful Link envelope."""

    status = 200

    async def __aenter__(self) -> "_SuccessfulResponse":
        return self

    async def __aexit__(self, *_args: Any) -> bool:
        return False

    async def json(self) -> dict[str, Any]:
        """Return a Link response envelope with code 0."""
        return {
            "header": {"code": 0, "message": "ok"},
            "payload": {"text": {"text": json.dumps({"answer": 42})}},
        }


@pytest.mark.asyncio
async def test_run_maps_connection_failure_to_link_connection_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A transport failure must surface as SPARK_LINK_CONNECTION_ERROR."""
    tool = build_tool()

    def _post(*_args: Any, **_kwargs: Any) -> _FailingConnection:
        """Return a request handle that fails while connecting."""
        return _FailingConnection()

    monkeypatch.setattr(aiohttp.ClientSession, "post", _post)

    with pytest.raises(CustomException) as exc_info:
        await tool.run({}, {}, Span(uid="user-1"))

    assert exc_info.value.code == CodeEnum.SPARK_LINK_CONNECTION_ERROR.code


@pytest.mark.asyncio
async def test_run_returns_parsed_payload_on_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The success path keeps returning the decoded Link payload."""
    tool = build_tool()

    def _post(*_args: Any, **_kwargs: Any) -> _SuccessfulResponse:
        """Return a request handle with a successful Link envelope."""
        return _SuccessfulResponse()

    monkeypatch.setattr(aiohttp.ClientSession, "post", _post)

    assert await tool.run({}, {}, Span(uid="user-1")) == {"answer": 42}


def test_fixed_values_nested_defaults_and_false_are_preserved() -> None:
    tool = build_tool()
    tool.method_schema = {
        "parameters": [
            {
                "in": "path",
                "name": "id",
                "required": True,
                "schema": {"type": "string", "x-display": True, "x-from": 2},
            },
            {
                "in": "header",
                "name": "Authorization",
                "schema": {"type": "string", "default": "stored", "x-from": 0},
            },
            {
                "in": "query",
                "name": "enabled",
                "schema": {"type": "boolean", "default": False},
            },
        ]
    }
    assert tool.assemble_parameters(
        {"id": "item", "Authorization": "untrusted"}, {}
    ) == ({"Authorization": "stored"}, {"enabled": False}, {"id": "item"})
    schema = {
        "type": "object",
        "properties": {
            "token": {"type": "string", "x-value": "stored", "x-from": 2},
            "nested": {
                "type": "object",
                "default": {},
                "properties": {
                    "limit": {"type": "integer", "default": 3},
                    "enabled": {"type": "boolean", "default": False},
                },
            },
        },
    }
    assert tool.assemble_body(schema, {"token": "untrusted"}, {}) == {
        "token": "stored",
        "nested": {"limit": 3, "enabled": False},
    }


def test_path_level_parameters_are_inherited_and_operation_overrides() -> None:
    from workflow.engine.nodes.plugin_tool.link_client import Link

    link = Link("app", ["tool"], "", "")
    link.open_api_schema_list = [
        {
            "id": "tool",
            "schema": json.dumps(
                {
                    "paths": {
                        "/items/{id}": {
                            "parameters": [
                                {
                                    "in": "path",
                                    "name": "id",
                                    "required": True,
                                    "schema": {"type": "string"},
                                },
                                {
                                    "in": "query",
                                    "name": "limit",
                                    "schema": {"type": "integer", "default": 1},
                                },
                            ],
                            "post": {
                                "operationId": "search",
                                "parameters": [
                                    {
                                        "in": "query",
                                        "name": "limit",
                                        "schema": {"type": "integer", "default": 5},
                                    }
                                ],
                            },
                        }
                    }
                }
            ),
        }
    ]
    link.parse_react_schema_list()
    assert len(link.tools) == 1
    assert link.tools[0].assemble_parameters({"id": "item"}, {}) == (
        {},
        {"limit": 5},
        {"id": "item"},
    )


def test_nullable_and_readonly_body_properties_follow_openapi_contract() -> None:
    tool = build_tool()
    body = {
        "type": "object",
        "required": ["server_id"],
        "properties": {
            "server_id": {"type": "integer", "readOnly": True},
            "optional": {"type": "string", "nullable": True},
            "number": {"type": "integer", "minimum": 0, "exclusiveMinimum": True},
        },
    }
    assert tool.assemble_body(
        body, {"server_id": 7, "optional": None, "number": 1}, {}
    ) == {"optional": None, "number": 1}
