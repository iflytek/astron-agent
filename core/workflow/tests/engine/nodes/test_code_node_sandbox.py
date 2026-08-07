import json
from typing import Any

import pytest

from workflow.engine.nodes.code.code_node import CodeNode
from workflow.engine.nodes.code.executor.base_executor import CodeExecutorFactory


class DummySpan:
    async def add_info_event_async(self, _event: Any) -> None:
        return None

    async def add_info_events_async(self, _events: Any) -> None:
        return None

    def record_exception(self, _error: Any) -> None:
        return None


class RecordingExecutor:
    def __init__(self) -> None:
        self.kwargs: dict[str, Any] = {}

    async def execute(
        self, language: str, code: str, timeout: Any, span: Any, **kwargs: Any
    ) -> str:
        self.kwargs = kwargs
        return json.dumps({"result": "ok"}, ensure_ascii=False)


@pytest.mark.asyncio
async def test_code_node_uses_e2b_when_runtime_sandbox_is_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executor = RecordingExecutor()
    requested_types: list[str] = []

    def fake_create_executor(executor_type: str) -> RecordingExecutor:
        requested_types.append(executor_type)
        return executor

    monkeypatch.setenv("CODE_EXEC_TYPE", "local")
    monkeypatch.setattr(CodeExecutorFactory, "create_executor", fake_create_executor)

    node = CodeNode(
        codeLanguage="python",
        input_identifier=[],
        output_identifier=["result"],
        code="def main():\n    return {'result': 'ok'}",
        appId="app-1",
        uid="user-1",
        node_id="ifly-code::node-1",
        sandbox={
            "provider": "e2b",
            "enabled": True,
            "apiKey": "secret",
            "timeoutSeconds": 90,
            "allowInternetAccess": True,
            "artifactUploadUrl": "http://hub/workflow/artifacts/internal-upload",
            "artifactUploadToken": "token",
            "workflowId": "flow-1",
            "runId": "run-1",
            "nodeId": "ifly-code::node-1",
            "uid": "user-1",
            "spaceId": "100",
        },
    )

    result = await node.execute_code({}, DummySpan())

    assert result == {"result": "ok"}
    assert requested_types == ["e2b"]
    sandbox = executor.kwargs["sandbox"]
    assert sandbox is not None
    assert sandbox["api_key"] == "secret"
    assert sandbox["workflow_id"] == "flow-1"
    assert sandbox["run_id"] == "run-1"
    assert sandbox["node_id"] == "ifly-code::node-1"
    assert sandbox["space_id"] == "100"


@pytest.mark.asyncio
async def test_code_node_falls_back_to_configured_executor_without_sandbox(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executor = RecordingExecutor()
    requested_types: list[str] = []

    def fake_create_executor(executor_type: str) -> RecordingExecutor:
        requested_types.append(executor_type)
        return executor

    monkeypatch.setenv("CODE_EXEC_TYPE", "langchain")
    monkeypatch.setattr(CodeExecutorFactory, "create_executor", fake_create_executor)

    node = CodeNode(
        codeLanguage="python",
        input_identifier=[],
        output_identifier=["result"],
        code="def main():\n    return {'result': 'ok'}",
        appId="app-1",
        uid="user-1",
        node_id="ifly-code::node-1",
    )

    await node.execute_code({}, DummySpan())

    assert requested_types == ["langchain"]
    assert executor.kwargs.get("sandbox") is None
