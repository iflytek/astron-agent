"""Check OpenAPI arguments against the Link HTTP protocol, including private values."""

import json
import threading
from base64 import b64decode
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Iterator

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span
from jsonschema import Draft202012Validator, ValidationError

from agent.engine.plugin_tools import plugin_schema
from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.link import LinkPluginFactory


def param(name: str, location: str, **schema: Any) -> dict[str, Any]:
    return {
        "name": name,
        "in": location,
        "required": True,
        "schema": {"type": "string", **schema},
    }


def specification() -> dict[str, Any]:
    return {
        "openapi": "3.0.3",
        "paths": {
            "/repos/iflytek/{repo}": {
                "parameters": [
                    param("repo", "path", enum=["astron-agent"]),
                    param("q", "query"),
                ],
                "post": {
                    "operationId": "repository",
                    "parameters": [
                        param("q", "query", minLength=3),
                        param("X-Request-ID", "header", pattern="^request-[0-9]+$"),
                        param("Authorization", "header", default="header-secret"),
                        param("locale", "query", **{"x-from": 1, "default": "zh"}),
                        {
                            "name": "optional",
                            "in": "query",
                            "schema": {"type": "string"},
                        },
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["input"],
                                    "properties": {
                                        "input": {
                                            "type": "object",
                                            "required": ["mode", "tags", "secret"],
                                            "additionalProperties": False,
                                            "properties": {
                                                "mode": {
                                                    "type": "string",
                                                    "enum": ["brief", "full"],
                                                },
                                                "tags": {
                                                    "type": "array",
                                                    "minItems": 1,
                                                    "items": {
                                                        "type": "string",
                                                        "enum": ["safe"],
                                                    },
                                                },
                                                "secret": {
                                                    "type": "string",
                                                    "x-value": "body-secret",
                                                },
                                            },
                                        },
                                        "count": {
                                            "type": "integer",
                                            "minimum": 1,
                                            "maximum": 10,
                                            "exclusiveMaximum": True,
                                            "default": 2,
                                        },
                                    },
                                }
                            }
                        },
                    },
                },
            }
        },
        "components": {
            "securitySchemes": {
                "key": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-Key",
                    "x-value": "link-owned-secret",
                }
            }
        },
    }


@pytest.fixture
def link_server(monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, Any]]:
    class Sid:
        def gen(self) -> str:
            return "test-link-sid"

    if sid_module.sid_generator2 is None:
        monkeypatch.setattr(sid_module, "sid_generator2", Sid())
    state: dict[str, Any] = {
        "schema": specification(),
        "requests": [],
        "code": 0,
        "http_status": 200,
    }

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: Any) -> None:
            pass

        def respond(self, payload: dict[str, Any], status: int = 200) -> None:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        def do_GET(self) -> None:
            self.respond(
                {
                    "code": 0,
                    "data": {
                        "tools": [
                            {
                                "id": "tool22",
                                "version": "V1.0",
                                "schema": json.dumps(state["schema"]),
                            }
                        ]
                    },
                }
            )

        def do_POST(self) -> None:
            state["requests"].append(
                json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            )
            self.respond(
                {
                    "header": {"code": state["code"], "sid": "link-sid"},
                    "payload": {"text": {"text": "tool result"}},
                },
                state["http_status"],
            )

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    endpoint = f"http://127.0.0.1:{server.server_port}"
    monkeypatch.setenv("VERSIONS_LINK_URL", endpoint + "/versions")
    monkeypatch.setenv("RUN_LINK_URL", endpoint + "/run")
    try:
        yield state
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def arguments() -> dict[str, Any]:
    return {
        "repo": "astron-agent",
        "q": "agent",
        "X-Request-ID": "request-1",
        "input": {"mode": "brief", "tags": ["safe"]},
    }


def factory() -> LinkPluginFactory:
    return LinkPluginFactory(
        app_id="app", uid="user", tool_ids=[{"tool_id": "tool22", "version": "V1.0"}]
    )


def operation(state: dict[str, Any]) -> dict[str, Any]:
    return state["schema"]["paths"]["/repos/iflytek/{repo}"]["post"]  # type: ignore[no-any-return]


def decoded_request(state: dict[str, Any]) -> dict[str, Any]:
    return {
        key: json.loads(b64decode(value))
        for key, value in state["requests"][-1]["payload"]["message"].items()
    }


@pytest.mark.asyncio
async def test_standard_openapi_schema_and_http_payload(
    link_server: dict[str, Any]
) -> None:
    original = deepcopy(link_server["schema"])
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    schema = plugin_schema(plugin)
    assert set(schema["required"]) == {"repo", "q", "X-Request-ID", "input"}
    assert schema["properties"]["q"]["minLength"] == 3
    assert schema["properties"]["count"]["exclusiveMaximum"] == 10
    nested = schema["properties"]["input"]
    assert nested["required"] == ["mode", "tags"]
    assert nested["properties"]["tags"]["items"]["enum"] == ["safe"]
    for secret in ("header-secret", "body-secret", "link-owned-secret"):
        assert secret not in plugin.schema_template
    Draft202012Validator(schema).validate(arguments())
    result = await plugin.run(action_input=arguments(), span=span)
    request = link_server["requests"][0]
    assert request["header"] == {"app_id": "app", "uid": "user"}
    assert request["parameter"] == {
        "tool_id": "tool22",
        "operation_id": "repository",
        "version": "V1.0",
    }
    assert decoded_request(link_server) == {
        "path": {"repo": "astron-agent"},
        "query": {"q": "agent", "locale": "zh"},
        "header": {"X-Request-ID": "request-1", "Authorization": "header-secret"},
        "body": {
            "input": {"mode": "brief", "tags": ["safe"], "secret": "body-secret"},
            "count": 2,
        },
    }
    assert result.code == 0
    assert result.result["payload"]["text"]["text"] == "tool result"
    assert "header-secret" not in json.dumps(result.log)
    assert "body-secret" not in json.dumps(result.log)
    assert link_server["schema"] == original


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "change",
    [
        {"repo": "other"},
        {"q": "x"},
        {"X-Request-ID": "bad"},
        {"count": 10},
        {"input": {"mode": "unknown", "tags": ["safe"]}},
        {"input": {"mode": "brief", "tags": []}},
    ],
)
async def test_constraints_reject_before_http(
    link_server: dict[str, Any], change: dict[str, Any]
) -> None:
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    invalid = {**arguments(), **change}
    with pytest.raises(ValidationError):
        Draft202012Validator(plugin_schema(plugin)).validate(invalid)
    with pytest.raises(PluginExc) as exc:
        await plugin.run(action_input=invalid, span=span)
    assert exc.value.c == 40024
    assert not link_server["requests"]


@pytest.mark.asyncio
async def test_missing_path_and_upstream_failure_propagation(
    link_server: dict[str, Any]
) -> None:
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    missing = arguments()
    del missing["repo"]
    with pytest.raises(PluginExc) as exc:
        await plugin.run(action_input=missing, span=span)
    assert exc.value.c == 40024
    assert not link_server["requests"]
    link_server["code"] = 30203
    result = await plugin.run(action_input=arguments(), span=span)
    assert result.code == result.result["header"]["code"] == 30203
    link_server["http_status"] = 503
    with pytest.raises(PluginExc) as exc:
        await plugin.run(action_input=arguments(), span=span)
    assert exc.value.c == 40024
    assert "127.0.0.1" not in str(exc.value)


@pytest.mark.asyncio
async def test_extension_and_fixed_values_are_preserved(
    link_server: dict[str, Any]
) -> None:
    operation(link_server)["parameters"].extend(
        [
            param("legacy", "query", **{"x-from": 0}),
            param("visible", "header", **{"x-display": True, "x-from": 2}),
            param("fixed", "header", **{"x-display": False, "default": "fixed-secret"}),
            param("stored", "query", **{"x-display": True, "x-value": "stored-secret"}),
        ]
    )
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    props = plugin_schema(plugin)["properties"]
    assert {"legacy", "visible"}.issubset(props)
    assert {"fixed", "stored", "Authorization", "locale"}.isdisjoint(props)
    assert "fixed-secret" not in plugin.schema_template
    assert "stored-secret" not in plugin.schema_template
    inputs = {
        **arguments(),
        "legacy": "from-model",
        "visible": "value",
        "fixed": "injected",
        "stored": "injected",
        "Authorization": "injected",
    }
    await plugin.run(action_input=inputs, span=span)
    decoded = decoded_request(link_server)
    assert decoded["header"]["fixed"] == "fixed-secret"
    assert decoded["header"]["Authorization"] == "header-secret"
    assert decoded["query"]["stored"] == "stored-secret"
    assert decoded["query"]["legacy"] == "from-model"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "invalid",
    [
        param("cookie", "cookie"),
        param("q", "query", type="object"),
        param("q", "query", **{"$ref": "https://example.test/secret"}),
        param("missing", "query", **{"x-display": False}),
    ],
)
async def test_unsupported_parameter_fails_configuration(
    link_server: dict[str, Any], invalid: dict[str, Any]
) -> None:
    operation(link_server)["parameters"] = [invalid]
    with pytest.raises(PluginExc) as exc:
        await factory().gen(Span(app_id="app", uid="user"))
    assert exc.value.c == 40023
    assert "https://example.test" not in str(exc.value)
    assert not link_server["requests"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "body",
    [
        {"content": {"multipart/form-data": {"schema": {"type": "object"}}}},
        {
            "content": {
                "application/json": {
                    "schema": {"type": "array", "items": {"type": "string"}}
                }
            }
        },
        {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {"repo": {"type": "string"}},
                    }
                }
            }
        },
    ],
)
async def test_unsupported_body_fails_configuration(
    link_server: dict[str, Any], body: dict[str, Any]
) -> None:
    operation(link_server)["requestBody"] = body
    with pytest.raises(PluginExc) as exc:
        await factory().gen(Span(app_id="app", uid="user"))
    assert exc.value.c == 40023


@pytest.mark.asyncio
async def test_repository_path_regression_without_private_extensions(
    link_server: dict[str, Any]
) -> None:
    link_server["schema"]["paths"] = {
        "/repos/iflytek/{repo}": {
            "get": {
                "operationId": "repository",
                "parameters": [param("repo", "path")],
            }
        }
    }
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    assert plugin_schema(plugin)["required"] == ["repo"]
    assert plugin_schema(plugin)["properties"] == {"repo": {"type": "string"}}
    await plugin.run(action_input={"repo": "astron-agent"}, span=span)
    assert decoded_request(link_server) == {"path": {"repo": "astron-agent"}}


@pytest.mark.asyncio
async def test_optional_json_body_and_array_objects(
    link_server: dict[str, Any]
) -> None:
    op = operation(link_server)
    op["requestBody"] = {
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "required": ["items"],
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["name", "internal"],
                                "properties": {
                                    "name": {"type": "string"},
                                    "internal": {
                                        "type": "string",
                                        "x-display": False,
                                        "default": "private",
                                    },
                                },
                            },
                        },
                    },
                }
            }
        }
    }
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    schema = plugin_schema(plugin)
    inputs = arguments()
    del inputs["input"]
    Draft202012Validator(schema).validate(inputs)
    await plugin.run(action_input=inputs, span=span)
    assert "body" not in decoded_request(link_server)
    inputs["items"] = [{"name": "first"}, {"name": "second"}]
    Draft202012Validator(schema).validate(inputs)
    await plugin.run(action_input=inputs, span=span)
    assert decoded_request(link_server)["body"] == {
        "items": [
            {"name": "first", "internal": "private"},
            {"name": "second", "internal": "private"},
        ]
    }
    assert "private" not in plugin.schema_template


@pytest.mark.asyncio
async def test_required_hidden_body_value_cannot_be_dropped(
    link_server: dict[str, Any]
) -> None:
    body = operation(link_server)["requestBody"]["content"]["application/json"][
        "schema"
    ]
    body["properties"]["input"]["properties"]["secret"] = {
        "type": "string",
        "x-display": False,
    }
    with pytest.raises(PluginExc) as exc:
        await factory().gen(Span(app_id="app", uid="user"))
    assert exc.value.c == 40023
    assert "Required hidden OpenAPI property" in str(exc.value)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "detail",
    [
        {
            "type": "array",
            "enum": [[{"internal": "private-enum"}]],
            "items": {"type": "object"},
        },
        {
            "type": "object",
            "additionalProperties": {"type": "string", "const": "private-constant"},
        },
    ],
)
async def test_unprojectable_private_values_fail_configuration(
    link_server: dict[str, Any], detail: dict[str, Any]
) -> None:
    body = operation(link_server)["requestBody"]["content"]["application/json"][
        "schema"
    ]
    body["properties"]["input"] = detail
    with pytest.raises(PluginExc) as exc:
        await factory().gen(Span(app_id="app", uid="user"))
    assert exc.value.c == 40023
    assert "private-" not in str(exc.value)
    assert not link_server["requests"]


@pytest.mark.asyncio
async def test_optional_body_preserves_fixed_and_implicit_defaults(
    link_server: dict[str, Any]
) -> None:
    op = operation(link_server)
    op["requestBody"] = {
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "token": {
                            "type": "string",
                            "x-display": False,
                            "default": "body-private",
                        },
                        "limit": {"type": "integer", "default": 3},
                        "enabled": {"type": "boolean", "default": False},
                    },
                }
            }
        }
    }
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    inputs = arguments()
    del inputs["input"]
    result = await plugin.run(action_input=inputs, span=span)
    assert decoded_request(link_server)["body"] == {
        "token": "body-private",
        "limit": 3,
        "enabled": False,
    }
    assert "body-private" not in plugin.schema_template
    assert "body-private" not in json.dumps(result.log)


@pytest.mark.asyncio
async def test_required_empty_body_is_encoded_as_present(
    link_server: dict[str, Any]
) -> None:
    operation(link_server)["requestBody"] = {
        "required": True,
        "content": {
            "application/json": {"schema": {"type": "object", "properties": {}}}
        },
    }
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    inputs = arguments()
    del inputs["input"]
    await plugin.run(action_input=inputs, span=span)
    assert decoded_request(link_server)["body"] == {}


@pytest.mark.asyncio
async def test_scalar_headers_are_validated_before_http_serialization(
    link_server: dict[str, Any]
) -> None:
    op = operation(link_server)
    op["parameters"] += [
        param("X-Count", "header", type="integer"),
        param("X-Enabled", "header", type="boolean"),
    ]
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    inputs = {**arguments(), "X-Count": 3, "X-Enabled": False}
    Draft202012Validator(plugin_schema(plugin)).validate(inputs)
    await plugin.run(action_input=inputs, span=span)
    assert decoded_request(link_server)["header"]["X-Count"] == 3
    assert decoded_request(link_server)["header"]["X-Enabled"] is False
    for invalid in ({"X-Count": "3"}, {"X-Enabled": "false"}):
        with pytest.raises(PluginExc) as exc:
            await plugin.run(action_input={**inputs, **invalid}, span=span)
        assert exc.value.c == 40024
    assert len(link_server["requests"]) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("nested", [False, True])
async def test_optional_body_defaults_do_not_select_incomplete_body(
    link_server: dict[str, Any], nested: bool
) -> None:
    body_schema = {
        "type": "object",
        "required": ["query"],
        "properties": {
            "query": {"type": "string"},
            "limit": {"type": "integer", "default": 10},
        },
    }
    if nested:
        body_schema = {
            "type": "object",
            "required": ["payload"],
            "properties": {"payload": {**body_schema, "default": {}}},
        }
    operation(link_server)["requestBody"] = {
        "content": {"application/json": {"schema": body_schema}}
    }
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    inputs = arguments()
    del inputs["input"]
    # No model body input: an optional body may still be omitted despite defaults.
    Draft202012Validator(plugin_schema(plugin)).validate(inputs)
    await plugin.run(action_input=inputs, span=span)
    assert "body" not in decoded_request(link_server)

    partial: dict[str, Any] = {"payload": {"limit": 5}} if nested else {"limit": 5}
    with pytest.raises(PluginExc) as exc:
        await plugin.run(action_input={**inputs, **partial}, span=span)
    assert exc.value.c == 40024
    assert len(link_server["requests"]) == 1

    provided: dict[str, Any] = (
        {"payload": {"query": "agent"}} if nested else {"query": "agent"}
    )
    complete = {"query": "agent", "limit": 10}
    await plugin.run(action_input={**inputs, **provided}, span=span)
    assert decoded_request(link_server)["body"] == (
        {"payload": complete} if nested else complete
    )


@pytest.mark.asyncio
async def test_optional_body_omission_does_not_hide_invalid_default_types(
    link_server: dict[str, Any]
) -> None:
    operation(link_server)["requestBody"] = {
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "required": ["query"],
                    "properties": {
                        "query": {"type": "string"},
                        "limit": {"type": "integer", "default": "invalid"},
                    },
                }
            }
        }
    }
    span = Span(app_id="app", uid="user")
    plugin = (await factory().gen(span))[0]
    inputs = arguments()
    del inputs["input"]
    with pytest.raises(PluginExc) as exc:
        await plugin.run(action_input=inputs, span=span)
    assert exc.value.c == 40024
    assert not link_server["requests"]
