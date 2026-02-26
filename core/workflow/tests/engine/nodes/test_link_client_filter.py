import json
import sys
import types
from typing import Any, Literal

import pytest

_kafka_stub = types.ModuleType("confluent_kafka")
setattr(_kafka_stub, "Producer", object)
setattr(_kafka_stub, "Consumer", object)

Tool: Any = None


@pytest.fixture(autouse=True)
def _kafka_module_stub(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub confluent_kafka per test and restore automatically."""
    monkeypatch.setitem(sys.modules, "confluent_kafka", _kafka_stub)
    sys.modules.pop("workflow.engine.nodes.plugin_tool.link_client", None)
    from workflow.engine.nodes.plugin_tool.link_client import Tool as _Tool

    globals()["Tool"] = _Tool


class _FakeSpan:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def start(self, _name: str) -> "_FakeSpan":
        return self

    def __enter__(self) -> "_FakeSpan":
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> Literal[False]:
        return False

    async def add_info_events_async(self, attributes: dict[str, Any]) -> None:
        self.events.append(attributes)


class _FakeResponse:
    async def __aenter__(self) -> "_FakeResponse":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> Literal[False]:
        return False

    async def json(self) -> dict[str, Any]:
        payload = {
            "id": 1,
            "name": "Leanne Graham",
            "email": "Sincere@april.biz",
            "address": {
                "street": "Kulas Light",
                "suite": "Apt. 556",
                "city": "Gwenborough",
            },
        }
        return {
            "header": {"code": 0, "message": "ok"},
            "payload": {"text": {"text": json.dumps(payload, ensure_ascii=False)}},
        }


class _FakeSession:
    async def __aenter__(self) -> "_FakeSession":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> Literal[False]:
        return False

    def post(self, *args: Any, **kwargs: Any) -> _FakeResponse:
        return _FakeResponse()


@pytest.mark.asyncio
async def test_tool_run_filters_hidden_fields_for_nested_object(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import aiohttp

    monkeypatch.setattr(aiohttp, "ClientSession", _FakeSession)

    method_schema = {
        "responses": {
            "200": {
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "number", "x-display": True},
                                "name": {"type": "string", "x-display": True},
                                "email": {"type": "string", "x-display": False},
                                "address": {
                                    "type": "object",
                                    "properties": {
                                        "street": {
                                            "type": "string",
                                            "x-display": False,
                                        },
                                        "suite": {
                                            "type": "string",
                                            "x-display": True,
                                        },
                                        "city": {
                                            "type": "string",
                                            "x-display": True,
                                        },
                                    },
                                },
                            },
                        }
                    }
                }
            }
        }
    }

    tool = Tool(
        app_id="app",
        tool_id="tool",
        operation_id="op",
        method_schema=method_schema,
        parameters={},
        get_url="http://unused",
        run_url="http://unused",
        version="V1.0",
    )

    result = await tool.run({}, {}, _FakeSpan())

    assert "email" not in result
    assert "street" not in result["address"]
    assert result["address"]["suite"] == "Apt. 556"
    assert result["address"]["city"] == "Gwenborough"


@pytest.mark.asyncio
async def test_tool_run_keeps_empty_object_when_all_nested_fields_hidden(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import aiohttp

    monkeypatch.setattr(aiohttp, "ClientSession", _FakeSession)

    method_schema = {
        "responses": {
            "200": {
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "number", "x-display": True},
                                "address": {
                                    "type": "object",
                                    "properties": {
                                        "street": {
                                            "type": "string",
                                            "x-display": False,
                                        },
                                        "suite": {
                                            "type": "string",
                                            "x-display": False,
                                        },
                                        "city": {
                                            "type": "string",
                                            "x-display": False,
                                        },
                                    },
                                },
                            },
                        }
                    }
                }
            }
        }
    }

    tool = Tool(
        app_id="app",
        tool_id="tool",
        operation_id="op",
        method_schema=method_schema,
        parameters={},
        get_url="http://unused",
        run_url="http://unused",
        version="V1.0",
    )

    result = await tool.run({}, {}, _FakeSpan())

    assert result["address"] == {}


@pytest.mark.asyncio
async def test_filter_response_logs_warning_on_validation_failure() -> None:
    tool = Tool(
        app_id="app",
        tool_id="tool",
        operation_id="op",
        method_schema={},
        parameters={},
        get_url="http://unused",
        run_url="http://unused",
        version="V1.0",
    )

    span = _FakeSpan()
    response_schema = {
        "type": "object",
        "properties": {
            "must": {"type": "string", "x-display": True},
            "secret": {"type": "string", "x-display": False},
        },
        "required": ["must"],
        "additionalProperties": True,
    }
    payload = {"secret": "hidden", "legacy": "keep"}

    filtered = await tool.filter_response_by_schema(payload, response_schema, span)

    assert filtered == {"legacy": "keep"}
    assert any("link-plugin-run-filter-warning" in event for event in span.events)


@pytest.mark.asyncio
async def test_filter_response_parent_hidden_takes_precedence_over_children() -> None:
    tool = Tool(
        app_id="app",
        tool_id="tool",
        operation_id="op",
        method_schema={},
        parameters={},
        get_url="http://unused",
        run_url="http://unused",
        version="V1.0",
    )

    span = _FakeSpan()
    response_schema = {
        "type": "object",
        "properties": {
            "address": {
                "type": "object",
                "properties": {
                    "geo": {
                        "type": "object",
                        "x-display": False,
                        "properties": {
                            "lat": {"type": "string", "x-display": True},
                            "lng": {"type": "string", "x-display": False},
                        },
                    }
                },
            }
        },
        "additionalProperties": True,
    }
    payload = {
        "address": {
            "geo": {"lat": "-37.3159", "lng": "81.1496"},
        }
    }

    filtered = await tool.filter_response_by_schema(payload, response_schema, span)

    assert filtered == {"address": {}}


@pytest.mark.asyncio
async def test_filter_response_hidden_array_field_removed_completely() -> None:
    tool = Tool(
        app_id="app",
        tool_id="tool",
        operation_id="op",
        method_schema={},
        parameters={},
        get_url="http://unused",
        run_url="http://unused",
        version="V1.0",
    )

    span = _FakeSpan()
    response_schema = {
        "type": "object",
        "properties": {
            "address": {
                "type": "object",
                "properties": {
                    "tags": {
                        "type": "array",
                        "x-display": False,
                        "items": {"type": "string", "x-display": True},
                    }
                },
            }
        },
        "additionalProperties": True,
    }
    payload = {
        "address": {
            "tags": ["a", "b"],
        }
    }

    filtered = await tool.filter_response_by_schema(payload, response_schema, span)

    assert filtered == {"address": {}}


@pytest.mark.asyncio
async def test_filter_response_can_restore_field_after_toggle_to_visible() -> None:
    tool = Tool(
        app_id="app",
        tool_id="tool",
        operation_id="op",
        method_schema={},
        parameters={},
        get_url="http://unused",
        run_url="http://unused",
        version="V1.0",
    )

    payload = {
        "address": {
            "geo": {"lat": "-37.3159", "lng": "81.1496"},
        }
    }

    hidden_schema = {
        "type": "object",
        "properties": {
            "address": {
                "type": "object",
                "properties": {"geo": {"type": "object", "x-display": False}},
            }
        },
        "additionalProperties": True,
    }
    visible_schema = {
        "type": "object",
        "properties": {
            "address": {
                "type": "object",
                "properties": {
                    "geo": {
                        "type": "object",
                        "x-display": True,
                        "properties": {
                            "lat": {"type": "string", "x-display": True},
                            "lng": {"type": "string", "x-display": True},
                        },
                    }
                },
            }
        },
        "additionalProperties": True,
    }

    first = await tool.filter_response_by_schema(payload, hidden_schema, _FakeSpan())
    second = await tool.filter_response_by_schema(payload, visible_schema, _FakeSpan())

    assert first == {"address": {}}
    assert second["address"]["geo"] == {"lat": "-37.3159", "lng": "81.1496"}
