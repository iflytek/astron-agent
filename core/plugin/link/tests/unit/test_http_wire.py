"""Exercise decoded Link requests against a real HTTP receiver."""

import json
import threading
from base64 import b64encode
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Iterator
from unittest.mock import MagicMock

import pytest
from agent.service.plugin.link import LinkPluginRunner
from plugin.link.api.schemas.community.tools.http.execution_schema import (
    ToolDebugRequest,
)
from plugin.link.service.community.tools.http import execution_server
from plugin.link.utils.json_schemas.read_json_schemas import load_tool_debug_schema


@pytest.fixture
def http_receiver(monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, Any]]:
    """Explicitly allow the loopback receiver through the real outbound policy."""
    state: dict[str, Any] = {"requests": []}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: Any) -> None:
            pass

        def receive(self) -> None:
            state["requests"].append(
                {
                    "headers": dict(self.headers),
                    "body": self.rfile.read(
                        int(self.headers.get("Content-Length", "0"))
                    ),
                    "method": self.command,
                }
            )
            payload = b'{"ok": true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        do_GET = receive
        do_POST = receive

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    state["endpoint"] = f"http://127.0.0.1:{server.server_port}/receive"
    for setting in (
        "SEGMENT_BLACK_LIST",
        "IP_BLACK_LIST",
        "IP_WHITE_LIST",
        "DOMAIN_BLACK_LIST",
    ):
        monkeypatch.delenv(setting, raising=False)
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", state["endpoint"])
    monkeypatch.setenv("IP_WHITE_LIST", "127.0.0.1/32")
    monkeypatch.setenv("OTLP_ENABLE", "0")
    try:
        yield state
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def encode(value: dict[str, Any]) -> str:
    return b64encode(json.dumps(value).encode()).decode()


def assert_wire_body(request: dict[str, Any], expected: dict[str, Any] | None) -> None:
    if expected is None:
        assert request["body"] == b""
        assert request["headers"].get("Content-Type") != "application/json"
    else:
        assert request["headers"]["Content-Type"] == "application/json"
        assert json.loads(request["body"]) == expected
        if not expected:
            assert request["body"] == b"{}"
            assert request["headers"]["Content-Length"] == "2"


@pytest.mark.asyncio
@pytest.mark.parametrize("method", ["GET", "POST"])
@pytest.mark.parametrize("body", [None, {}, {"value": "unchanged"}])
async def test_decoded_request_preserves_body_and_scalar_headers_on_wire(
    http_receiver: dict[str, Any], method: str, body: dict[str, Any] | None
) -> None:
    headers = {
        "X-Count": 3,
        "X-Enabled": True,
        "X-Disabled": False,
        "X-Ratio": 2.5,
        "X-Original": "003",
    }
    message = {"header": encode(headers)}
    if body is not None:
        message["body"] = encode(body)
    decoded = execution_server.process_message_params(message)
    assert decoded[3] == body
    request = execution_server.setup_http_request(
        {"server_url": http_receiver["endpoint"], "method": method},
        *decoded,
        {},
    )
    result, status = await request._execute_request(
        http_receiver["endpoint"], MagicMock()
    )
    assert status == 200 and json.loads(result) == {"ok": True}
    received = http_receiver["requests"][0]
    assert received["method"] == method
    assert_wire_body(received, body)
    assert {name: received["headers"][name] for name in headers} == {
        "X-Count": "3",
        "X-Enabled": "true",
        "X-Disabled": "false",
        "X-Ratio": "2.5",
        "X-Original": "003",
    }
    assert request.header == headers


@pytest.mark.asyncio
@pytest.mark.parametrize("body", [None, {}, {"value": "unchanged"}])
async def test_debug_entry_preserves_body_presence_on_wire(
    http_receiver: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
    body: dict[str, Any] | None,
) -> None:
    # Isolate telemetry; validation, decoding and the outbound HTTP client are real.
    span = MagicMock()
    span.sid, span.app_id, span.uid = "wire-test", "app", "user"
    span.start.return_value.__enter__.return_value = span
    monkeypatch.setattr(execution_server, "Span", lambda **_kwargs: span)
    monkeypatch.setattr(execution_server, "Meter", lambda **_kwargs: MagicMock())
    load_tool_debug_schema()
    params: dict[str, Any] = {
        "server": http_receiver["endpoint"],
        "method": "POST",
        "path": {},
        "query": {},
        "header": {"X-Count": 3, "X-Enabled": True},
        "openapi_schema": json.dumps({"info": {}, "paths": {}}),
    }
    if body is not None:
        params["body"] = body
    result = await execution_server.tool_debug(ToolDebugRequest(**params))
    assert result.header.code == 0
    received = http_receiver["requests"][0]
    assert_wire_body(received, body)
    assert received["headers"]["X-Count"] == "3"
    assert received["headers"]["X-Enabled"] == "true"


def test_legacy_empty_encoded_body_still_means_absent() -> None:
    assert execution_server.process_message_params({"body": ""})[3] is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("required", "properties", "expected"),
    [
        (True, {}, {}),
        (
            False,
            {"token": {"type": "string", "x-display": False, "default": "private"}},
            {"token": "private"},
        ),
    ],
)
async def test_agent_body_survives_link_decoding_and_real_http(
    http_receiver: dict[str, Any],
    required: bool,
    properties: dict[str, Any],
    expected: dict[str, Any],
) -> None:
    schema = {"type": "object", "properties": properties}
    agent_runner = LinkPluginRunner(
        app_id="app",
        uid="user",
        tool_id="tool",
        version="V1.0",
        operation_id="send",
        method_schema={
            "requestBody": {
                "required": required,
                "content": {"application/json": {"schema": schema}},
            }
        },
    )
    body = agent_runner.assemble_body(schema, {}, {})
    decoded = execution_server.process_message_params(
        {"body": agent_runner.dumps(body)}
    )
    request = execution_server.setup_http_request(
        {"server_url": http_receiver["endpoint"], "method": "POST"},
        *decoded,
        {},
    )
    _, status = await request._execute_request(http_receiver["endpoint"], MagicMock())
    assert status == 200
    assert_wire_body(http_receiver["requests"][0], expected)
