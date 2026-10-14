import json
from typing import Any

import httpx2
import pytest
from mcp import Client

from astron_agent_mcp.config import Settings
from astron_agent_mcp.server import create_server

SETTINGS = Settings(
    spark_api_password="spark-secret",
    spark_base_url="https://spark.test/v1",
    spark_model="4.0Ultra",
    astron_base_url="https://astron.test",
    astron_api_key="key",
    astron_api_secret="secret",
    astron_flow_id="default-flow",
    workflow_timeout_seconds=30,
)


def _sse(*events: dict[str, Any]) -> bytes:
    return "".join(f"data: {json.dumps(event)}\n\n" for event in events).encode()


def _frame(content: str = "", finish_reason: str | None = None, **extra: Any) -> dict[str, Any]:
    return {
        "code": 0,
        "message": "Success",
        "id": "sid-1",
        "choices": [
            {"delta": {"role": "assistant", "content": content}, "finish_reason": finish_reason}
        ],
        **extra,
    }


class Recorder:
    def __init__(self, response: httpx2.Response) -> None:
        self.response = response
        self.requests: list[httpx2.Request] = []

    def __call__(self, request: httpx2.Request) -> httpx2.Response:
        self.requests.append(request)
        return self.response

    @property
    def body(self) -> dict[str, Any]:
        return json.loads(self.requests[-1].content)


async def _call(recorder: Recorder, tool: str, args: dict[str, Any], settings: Settings = SETTINGS):
    server = create_server(settings, transport=httpx2.MockTransport(recorder))
    async with Client(server) as client:
        return await client.call_tool(tool, args)


def _text(result: Any) -> str:
    return result.content[0].text


async def test_lists_all_tools() -> None:
    async with Client(create_server(SETTINGS)) as client:
        tools = await client.list_tools()
    by_name = {tool.name: tool for tool in tools.tools}
    assert set(by_name) == {"spark_chat", "astron_run_workflow", "astron_resume_workflow"}
    assert by_name["spark_chat"].annotations.read_only_hint is True
    assert by_name["astron_run_workflow"].annotations.read_only_hint is False
    assert by_name["astron_run_workflow"].output_schema is not None


async def test_spark_chat_sends_openai_request() -> None:
    recorder = Recorder(
        httpx2.Response(
            200,
            json={"code": 0, "sid": "s1", "choices": [{"message": {"content": "你好"}}]},
        )
    )
    result = await _call(
        recorder, "spark_chat", {"prompt": "hi", "system": "be brief", "max_tokens": 64}
    )

    assert not result.is_error
    assert _text(result) == "你好"
    request = recorder.requests[0]
    assert str(request.url) == "https://spark.test/v1/chat/completions"
    assert request.headers["Authorization"] == "Bearer spark-secret"
    assert recorder.body == {
        "model": "4.0Ultra",
        "messages": [
            {"role": "system", "content": "be brief"},
            {"role": "user", "content": "hi"},
        ],
        "stream": False,
        "max_tokens": 64,
    }


async def test_spark_business_error_is_reported() -> None:
    recorder = Recorder(httpx2.Response(200, json={"code": 10007, "message": "quota exceeded"}))
    result = await _call(recorder, "spark_chat", {"prompt": "hi"})

    assert result.is_error
    assert "10007" in _text(result) and "quota exceeded" in _text(result)


async def test_spark_http_error_does_not_echo_credentials() -> None:
    recorder = Recorder(httpx2.Response(401, json={"error": {"message": "invalid APIPassword"}}))
    result = await _call(recorder, "spark_chat", {"prompt": "hi"})

    assert result.is_error
    assert "HTTP 401" in _text(result)
    assert "spark-secret" not in _text(result)


async def test_unconfigured_tool_names_missing_variables() -> None:
    settings = Settings(**{**SETTINGS.__dict__, "astron_api_secret": "", "spark_api_password": ""})
    recorder = Recorder(httpx2.Response(500))

    spark = await _call(recorder, "spark_chat", {"prompt": "hi"}, settings)
    workflow = await _call(recorder, "astron_run_workflow", {"parameters": {}}, settings)

    assert spark.is_error and "SPARK_API_PASSWORD" in _text(spark)
    assert workflow.is_error and "ASTRON_API_SECRET" in _text(workflow)
    assert recorder.requests == []


async def test_run_workflow_collects_stream() -> None:
    recorder = Recorder(
        httpx2.Response(
            200,
            content=_sse(
                _frame("", "ping"),
                _frame("Hello, "),
                _frame("world"),
                _frame("", "stop"),
            ),
            headers={"content-type": "text/event-stream"},
        )
    )
    result = await _call(
        recorder,
        "astron_run_workflow",
        {"parameters": {"query": "hi"}, "chat_id": "c1", "uid": "u1"},
    )

    assert not result.is_error
    assert result.structured_content == {
        "status": "completed",
        "content": "Hello, world",
        "reasoning_content": "",
        "session_id": "sid-1",
        "event_id": None,
        "interrupt": None,
    }
    request = recorder.requests[0]
    assert str(request.url) == "https://astron.test/workflow/v1/chat/completions"
    assert request.headers["Authorization"] == "Bearer key:secret"
    assert recorder.body == {
        "flow_id": "default-flow",
        "parameters": {"query": "hi"},
        "stream": True,
        "uid": "u1",
        "chat_id": "c1",
    }


async def test_run_workflow_reports_interrupt() -> None:
    interrupt = _frame(
        "Which city?",
        "interrupt",
        event_data={"event_id": "ev-1", "value": {"type": "direct", "content": "Which city?"}},
    )
    recorder = Recorder(httpx2.Response(200, content=_sse(interrupt)))
    result = await _call(
        recorder, "astron_run_workflow", {"parameters": {"query": "weather"}, "flow_id": "f2"}
    )

    assert result.structured_content["status"] == "interrupted"
    assert result.structured_content["event_id"] == "ev-1"
    assert result.structured_content["interrupt"] == {"type": "direct", "content": "Which city?"}
    assert recorder.body["flow_id"] == "f2"


async def test_workflow_error_frame_is_reported() -> None:
    error = {"code": 20201, "message": "flow not published", "id": "sid-9", "choices": []}
    recorder = Recorder(httpx2.Response(200, content=_sse(error)))
    result = await _call(recorder, "astron_run_workflow", {"parameters": {}})

    assert result.is_error
    assert "20201" in _text(result) and "sid-9" in _text(result)


async def test_truncated_stream_is_an_error() -> None:
    recorder = Recorder(httpx2.Response(200, content=_sse(_frame("partial"))))
    result = await _call(recorder, "astron_run_workflow", {"parameters": {}})

    assert result.is_error
    assert "ended before completion" in _text(result)


async def test_resume_workflow_posts_reply() -> None:
    recorder = Recorder(httpx2.Response(200, content=_sse(_frame("Sunny"), _frame("", "stop"))))
    result = await _call(
        recorder, "astron_resume_workflow", {"event_id": "ev-1", "content": "Hefei"}
    )

    assert result.structured_content["content"] == "Sunny"
    assert str(recorder.requests[0].url) == "https://astron.test/workflow/v1/resume"
    assert recorder.body == {"event_id": "ev-1", "event_type": "resume", "content": "Hefei"}


def test_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRON_BASE_URL", "https://astron.example.com/")
    monkeypatch.setenv("ASTRON_WORKFLOW_TIMEOUT_SECONDS", "90")
    monkeypatch.delenv("SPARK_MODEL", raising=False)

    settings = Settings.from_env()

    assert settings.astron_base_url == "https://astron.example.com"
    assert settings.workflow_timeout_seconds == 90
    assert settings.spark_model == "4.0Ultra"


def test_invalid_timeout_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRON_WORKFLOW_TIMEOUT_SECONDS", "0")
    with pytest.raises(ValueError, match="greater than 0"):
        Settings.from_env()
