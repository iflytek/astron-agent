"""Wire-level coverage of the Console-owned workflow tool boundary."""

import asyncio
import json
from contextlib import nullcontext
from types import SimpleNamespace
from typing import Any, AsyncIterator, Callable

import httpx
import pytest

from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin import workflow

CONTEXT = {
    "run_id": "run-1",
    "root_id": "root-1",
    "node_id": "agent::1",
    "invocation_id": "attempt-1",
}
SPAN = SimpleNamespace(
    start=lambda *a: nullcontext(SimpleNamespace(add_info_events=lambda *a: None))
)


@pytest.fixture
def transport(monkeypatch: pytest.MonkeyPatch) -> Callable:
    monkeypatch.setenv("CONSOLE_INTERNAL_BASE_URL", "http://console")
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "k" * 40)
    real_client = httpx.AsyncClient

    def install(handler: Callable) -> None:
        monkeypatch.setattr(
            workflow.httpx,
            "AsyncClient",
            lambda **kwargs: real_client(
                transport=httpx.MockTransport(handler), **kwargs
            ),
        )

    return install


def runner() -> workflow.WorkflowPluginRunner:
    return workflow.WorkflowPluginRunner(
        app_id="app", uid="user", flow_id="flow-2", context=CONTEXT
    )


@pytest.mark.asyncio
async def test_authorized_schema_is_required_and_no_identity_can_be_supplied_by_model(
    transport: Callable,
) -> None:
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.headers["X-Workflow-Internal-Key"] == "k" * 40
        body = json.loads(request.content)
        assert body == {"context": CONTEXT, "flowId": "flow-2"}
        return httpx.Response(
            200,
            json={
                "code": 0,
                "data": {
                    "flowId": "flow-2",
                    "name": "report",
                    "description": "Report",
                    "parameters": {
                        "type": "object",
                        "properties": {"city": {"type": "string"}},
                    },
                },
            },
        )

    transport(handler)
    plugins = await workflow.WorkflowPluginFactory(
        app_id="app", uid="user", workflow_ids=["flow-2"], context=CONTEXT
    ).gen(SPAN)
    assert len(requests) == len(plugins) == 1
    assert '"city"' in plugins[0].schema_template
    assert "root-1" not in plugins[0].schema_template


@pytest.mark.asyncio
@pytest.mark.parametrize("terminal", [True, False])
async def test_stream_requires_terminal_and_preserves_context_and_closes_client(
    transport: Callable, terminal: bool
) -> None:
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("cancel"):
            return httpx.Response(200, json={"code": 0, "data": {"cancelled": True}})
        body = json.loads(request.content)
        assert body["context"] == CONTEXT
        assert body["parameters"] == {"uid": "spoof"}
        assert body["invocationId"]
        data = {
            "code": 0,
            "id": "sid",
            "choices": [
                {
                    "delta": {"content": "actual"},
                    "finish_reason": "stop" if terminal else None,
                }
            ],
        }
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            text=": keepalive\n\ndata: " + json.dumps(data) + "\n\n",
        )

    transport(handler)
    if terminal:
        results = [item async for item in runner().run({"uid": "spoof"}, SPAN)]
        assert results[0].result["content"] == "actual"
        assert len(requests) == 1
    else:
        with pytest.raises(PluginExc):
            _ = [item async for item in runner().run({"uid": "spoof"}, SPAN)]
        assert [r.url.path for r in requests] == [
            "/workflow/internal/tool-run",
            "/workflow/internal/cancel",
        ]


@pytest.mark.asyncio
async def test_disconnect_closes_response_and_cancels_root_without_retry(
    transport: Callable,
) -> None:
    started = asyncio.Event()
    closed = asyncio.Event()
    requests = []

    class BlockingStream(httpx.AsyncByteStream):
        async def __aiter__(self) -> AsyncIterator[bytes]:
            started.set()
            await asyncio.Event().wait()
            yield b""

        async def aclose(self) -> None:
            closed.set()

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request.url.path)
        if request.url.path.endswith("cancel"):
            assert json.loads(request.content) == {"runId": "run-1", "rootId": "root-1"}
            return httpx.Response(200, json={"code": 0, "data": {"cancelled": True}})
        return httpx.Response(
            200, headers={"content-type": "text/event-stream"}, stream=BlockingStream()
        )

    transport(handler)

    async def consume() -> list[Any]:
        return [item async for item in runner().run({}, SPAN)]

    task = asyncio.create_task(consume())
    await asyncio.wait_for(started.wait(), 1)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert closed.is_set()
    assert requests == ["/workflow/internal/tool-run", "/workflow/internal/cancel"]


@pytest.mark.asyncio
async def test_missing_context_fails_closed_before_network() -> None:
    with pytest.raises(PluginExc):
        _ = [
            item
            async for item in workflow.WorkflowPluginRunner(
                app_id="app", uid="user", flow_id="flow"
            ).run({}, SPAN)
        ]
