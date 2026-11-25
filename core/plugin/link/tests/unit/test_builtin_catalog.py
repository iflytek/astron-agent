"""Verify actual service OpenAPI is executable by both consuming runtimes."""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from jsonschema import Draft202012Validator
from plugin.link.service.community.tools.http.builtin_catalog import (
    catalog_from_service,
)


@pytest.fixture(scope="module")
def actual_catalog() -> dict[str, Any]:
    repo = Path(__file__).resolve().parents[5]
    isolated_python = repo / "core/plugin/aitools/.venv/bin/python"
    python = str(isolated_python) if isolated_python.exists() else sys.executable
    script = """
import json
from unittest.mock import patch
from fastapi.testclient import TestClient
from plugin.aitools.app.start_server import aitools_app
with patch('plugin.aitools.api.routes.catalog.get_iflytek_open_platform_credentials'):
    client = TestClient(aitools_app())
    response = client.get('/aitools/v1/catalog')
    assert response.status_code == 200
    payload = response.json()
    failure = client.post('/aitools/v1/smarttts', json={'text': '', 'vcn': 'speaker'})
    assert failure.status_code == 200
    assert failure.json()['code'] == 45001
    payload['execution_failure'] = failure.json()
    print(json.dumps(payload))
"""
    env = {
        **os.environ,
        "PYTHONPATH": os.pathsep.join((str(repo / "core"), str(repo / "core/common"))),
    }
    result = subprocess.run(
        [python, "-c", script],
        env=env,
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode and "ModuleNotFoundError" in result.stderr:
        pytest.skip(
            "Cross-service contract test requires the AI Tools runtime dependencies"
        )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.splitlines()[-1])


def test_actual_openapi_catalog_is_inline_and_supported_by_both_runtimes(
    actual_catalog: dict[str, Any]
) -> None:
    agent_link = pytest.importorskip("agent.service.plugin.link")
    workflow_link = pytest.importorskip("workflow.engine.nodes.plugin_tool.link_client")
    LinkPluginFactory, LinkPluginRunner = (
        agent_link.LinkPluginFactory,
        agent_link.LinkPluginRunner,
    )
    Tool = workflow_link.Tool
    tools = catalog_from_service(actual_catalog, "http://core-aitools:18668")
    assert {tool["id"] for tool in tools} == {
        "aitools.smarttts",
        "aitools.ocr",
        "aitools.image_generate",
        "aitools.image_understanding",
    }
    inputs = {
        "aitools.smarttts": {"text": "hello", "vcn": "speaker"},
        "aitools.ocr": {"file_url": "https://example.com/file.pdf"},
        "aitools.image_generate": {"prompt": "a tree"},
        "aitools.image_understanding": {
            "question": "what?",
            "image_url": "https://example.com/image.png",
        },
    }
    factory = LinkPluginFactory(app_id="app", uid="user", tool_ids=[])
    for tool in tools:
        schema = tool["openapi_schema"]
        assert "$ref" not in json.dumps(schema)
        assert tool["configured"] is True and tool["health"] == "unknown"
        operation = next(iter(schema["paths"].values()))["post"]
        plugin = factory._create_plugin("space-tool", "V1.0", operation)
        arguments = inputs[tool["id"]]
        Draft202012Validator(
            json.loads(plugin.schema_template.rpartition("tool_parameters:")[2])
        ).validate(arguments)
        body = operation["requestBody"]["content"]["application/json"]["schema"]
        agent = LinkPluginRunner(
            app_id="app",
            uid="user",
            tool_id="space-tool",
            version="V1.0",
            operation_id=operation["operationId"],
            method_schema=operation,
        )
        workflow = Tool(
            "app", "space-tool", operation["operationId"], operation, {}, "", "", "V1.0"
        )
        assert agent.assemble_body(body, arguments, {}) == workflow.assemble_body(
            body, arguments, {}
        )
        assert len(tool["description"]) <= 255


def test_catalog_configuration_never_claims_health(
    actual_catalog: dict[str, Any]
) -> None:
    payload = {
        **actual_catalog,
        "configured": False,
        "configurationHint": "Configure platform credentials",
    }
    tools = catalog_from_service(payload, "http://core-aitools:18668")
    assert all(not tool["available"] and tool["health"] == "unknown" for tool in tools)


@pytest.mark.asyncio
async def test_actual_builtin_failure_reaches_debug_agent_and_workflow(
    actual_catalog: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    agent_link = pytest.importorskip("agent.service.plugin.link")
    workflow_link = pytest.importorskip("workflow.engine.nodes.plugin_tool.link_client")
    from plugin.link.api.schemas.community.tools.http.execution_schema import (
        ToolDebugRequest,
    )
    from plugin.link.service.community.tools.http import execution_server
    from workflow.exception.e import CustomException

    schema = next(
        tool["openapi_schema"]
        for tool in catalog_from_service(actual_catalog, "http://core-aitools:18668")
        if tool["id"] == "aitools.smarttts"
    )
    failure = actual_catalog["execution_failure"]
    span = MagicMock()
    span.sid, span.app_id, span.uid = "builtin-failure", "app", "user"
    span.start.return_value.__enter__.return_value = span
    monkeypatch.setenv("OTLP_ENABLE", "0")
    monkeypatch.setenv("RUN_LINK_URL", "http://link/api/v1/tools/http_run")
    monkeypatch.setattr(execution_server, "Span", lambda **_kwargs: span)
    monkeypatch.setattr(execution_server, "Meter", lambda **_kwargs: MagicMock())
    monkeypatch.setattr(
        execution_server.HttpRun, "do_call", AsyncMock(return_value=json.dumps(failure))
    )
    debug_schema = (
        Path(__file__).resolve().parents[2]
        / "utils/json_schemas/schema_files/tool_debug_schema.json"
    )
    monkeypatch.setattr(
        execution_server, "get_tool_debug_schema", debug_schema.read_text
    )
    debug = await execution_server.tool_debug(
        ToolDebugRequest(
            server="http://core-aitools:18668/aitools/v1/smarttts",
            method="POST",
            header={"app_id": "app"},
            path={},
            query={},
            body={"text": "", "vcn": "speaker"},
            openapi_schema=json.dumps(schema),
        )
    )
    assert debug.header.code == 30400
    assert "45001" in debug.header.message
    assert debug.payload == {}

    envelope = await execution_server.process_http_result(
        json.dumps(failure), schema, span, MagicMock(), MagicMock(), "tool", "official"
    )
    assert envelope.header.code == debug.header.code

    class Response:
        status = 200

        async def __aenter__(self) -> "Response":
            return self

        async def __aexit__(self, *_args: Any) -> bool:
            return False

        def raise_for_status(self) -> None:
            pass

        async def json(self) -> dict[str, Any]:
            return envelope.model_dump()

    monkeypatch.setattr(
        agent_link.aiohttp.ClientSession, "post", lambda *_a, **_k: Response()
    )
    operation = schema["paths"]["/aitools/v1/smarttts"]["post"]
    runner = agent_link.LinkPluginRunner(
        app_id="app",
        uid="user",
        tool_id="tool",
        version="V1.0",
        operation_id=operation["operationId"],
        method_schema=operation,
    )
    response = await runner.run({"text": "", "vcn": "speaker"}, span)
    assert response.code == 30400
    assert "45001" in response.result["header"]["message"]

    tool = workflow_link.Tool(
        "app",
        "tool",
        operation["operationId"],
        operation,
        {},
        "",
        "http://link/run",
        "V1.0",
    )
    span.add_info_events_async = AsyncMock()
    with pytest.raises(CustomException) as exc_info:
        await tool.run({"text": "", "vcn": "speaker"}, {}, span)
    assert "45001" in str(exc_info.value)


@pytest.mark.asyncio
@pytest.mark.parametrize("code", [0, 45001])
async def test_ordinary_http_code_is_payload_not_builtin_status(code: int) -> None:
    from plugin.link.service.community.tools.http import execution_server

    span = MagicMock(sid="ordinary")
    response = await execution_server.process_http_result(
        json.dumps({"code": code}),
        {"paths": {}},
        span,
        MagicMock(),
        MagicMock(),
        "tool",
        "third",
    )
    assert response.header.code == 0
    assert json.loads(response.payload["text"]["text"]) == {"code": code}
