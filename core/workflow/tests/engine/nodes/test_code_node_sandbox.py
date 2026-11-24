import json
import subprocess
import sys
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from workflow.engine.nodes.code.code_node import (
    ISOLATED_CODE_EXECUTOR_REQUIRED_ERROR,
    CodeNode,
    CodeSandboxConfig,
)
from workflow.engine.nodes.code.executor.base_executor import CodeExecutorFactory
from workflow.engine.nodes.code.executor.e2b.e2b_executor import (
    _ARTIFACT_SCAN_HELPER,
    ARTIFACT_FILE_SIZE_INVALID_ERROR,
    ARTIFACT_FILE_SIZE_LIMIT_ERROR,
    ARTIFACT_TOTAL_SIZE_LIMIT_ERROR,
    ARTIFACT_UPLOAD_FAILED_ERROR,
    ARTIFACT_UPLOAD_TOKEN_ENV,
    ARTIFACT_UPLOAD_TOKEN_FILE_ENV,
    ARTIFACT_UPLOAD_URL_ENV,
    MAX_ARTIFACT_FILE_SIZE_BYTES,
    MAX_ARTIFACT_FILES_PER_RUN,
    MAX_ARTIFACT_SCAN_OUTPUT_BYTES,
    MAX_ARTIFACT_TOTAL_SIZE_BYTES,
    MAX_SANDBOX_COMMAND_OUTPUT_BYTES,
    RUNTIME_CONFIG_URL_ENV,
    RUNTIME_CREDENTIAL_HEADER,
    RUNTIME_CREDENTIAL_TOKEN_ENV,
    RUNTIME_CREDENTIAL_TOKEN_FILE_ENV,
    SANDBOX_OUTPUT_TRUNCATED_MARKER,
    SANDBOX_RUNTIME_CONFIG_ERROR,
    CodeArtifactUploader,
    E2BExecutor,
    _ArtifactReadLimitExceeded,
    _fetch_e2b_runtime_config,
    _load_artifact_upload_token,
    _load_artifact_upload_url,
    _load_runtime_config_url,
    _load_runtime_credential_token,
    _read_bounded_snapshot,
    _run_command_with_bounded_output,
    _runtime_config_query,
)
from workflow.exception.e import CustomException


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
async def test_code_node_uses_e2b_without_retaining_payload_credentials(
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
            "provider": "local",
            "enabled": True,
            "apiKey": "legacy-api-key-must-not-be-used",
            "api_key": "legacy-snake-api-key-must-not-be-used",
            "runtimeConfigUrl": "https://attacker.example/runtime-config",
            "runtime_config_url": "https://attacker.example/snake-runtime-config",
            "timeoutSeconds": 90,
            "allowInternetAccess": True,
            "artifactUploadUrl": "http://hub/workflow/artifacts/internal-upload",
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
    assert sandbox["workflow_id"] == "flow-1"
    assert sandbox["run_id"] == "run-1"
    assert sandbox["node_id"] == "ifly-code::node-1"
    assert sandbox["space_id"] == "100"
    assert "provider" not in sandbox
    assert "timeout_seconds" not in sandbox
    assert "allow_internet_access" not in sandbox
    assert "artifact_upload_url" not in sandbox
    assert "artifact_upload_token" not in sandbox
    assert "api_key" not in sandbox
    assert "runtime_config_url" not in sandbox


def test_code_sandbox_config_ignores_untrusted_payload_credentials() -> None:
    config = CodeSandboxConfig.model_validate(
        {
            "provider": "e2b",
            "enabled": True,
            "artifactUploadToken": "legacy-payload-token-must-not-be-retained",
            "apiKey": "legacy-api-key-must-not-be-retained",
            "api_key": "legacy-snake-api-key-must-not-be-retained",
            "runtimeConfigUrl": "https://attacker.example/runtime-config",
            "runtime_config_url": "https://attacker.example/snake-runtime-config",
            "runtimeCredentialToken": "payload-runtime-token-must-not-be-retained",
            "runtime_credential_token": "snake-runtime-token-must-not-be-retained",
            "workflowId": "flow-1",
            "uid": "user-1",
        }
    )

    dumped = config.model_dump()
    assert "provider" not in dumped
    assert "timeout_seconds" not in dumped
    assert "allow_internet_access" not in dumped
    assert "artifact_upload_url" not in dumped
    assert "artifact_upload_token" not in dumped
    assert "api_key" not in dumped
    assert "runtime_config_url" not in dumped
    assert "runtime_credential_token" not in dumped


@pytest.mark.asyncio
@pytest.mark.parametrize("missing_setting", ["url", "token"])
async def test_enabled_e2b_missing_deployment_config_fails_without_local_fallback(
    monkeypatch: pytest.MonkeyPatch,
    missing_setting: str,
) -> None:
    requested_types: list[str] = []

    def create_executor(executor_type: str) -> E2BExecutor:
        requested_types.append(executor_type)
        return E2BExecutor()

    monkeypatch.setenv("CODE_EXEC_TYPE", "local")
    monkeypatch.setattr(CodeExecutorFactory, "create_executor", create_executor)
    monkeypatch.delenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV, raising=False)
    if missing_setting == "url":
        monkeypatch.delenv(RUNTIME_CONFIG_URL_ENV, raising=False)
        monkeypatch.setenv(
            RUNTIME_CREDENTIAL_TOKEN_ENV,
            "workflow-runtime-credential-token-value-0001",
        )
    else:
        monkeypatch.setenv(
            RUNTIME_CONFIG_URL_ENV,
            "http://console-hub:8080/skill-sandbox/internal-runtime-config",
        )
        monkeypatch.delenv(RUNTIME_CREDENTIAL_TOKEN_ENV, raising=False)
    node = CodeNode(
        codeLanguage="python",
        input_identifier=[],
        output_identifier=["result"],
        code="def main():\n    return {'result': 'ok'}",
        appId="app-1",
        uid="user-1",
        node_id="ifly-code::node-1",
        sandbox={"provider": "e2b", "enabled": True, "uid": "user-1"},
    )

    with pytest.raises(CustomException) as exc_info:
        await node.execute_code({}, DummySpan())

    assert requested_types == ["e2b"]
    assert SANDBOX_RUNTIME_CONFIG_ERROR in str(exc_info.value)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("sandbox_config", "expected_params"),
    [
        (
            {"workflow_id": "flow-1", "uid": "user-1", "space_id": "space-1"},
            {"uid": "user-1", "flowId": "flow-1", "spaceId": "space-1"},
        ),
        (
            {"uid": "user-1", "space_id": "space-1"},
            {"uid": "user-1", "spaceId": "space-1"},
        ),
        ({"uid": "user-1"}, {"uid": "user-1"}),
    ],
    ids=["flow-uid-space", "uid-space", "personal-uid"],
)
async def test_code_runtime_config_fetch_uses_deployment_scope_and_token(
    monkeypatch: pytest.MonkeyPatch,
    sandbox_config: dict[str, Any],
    expected_params: dict[str, str],
) -> None:
    request: dict[str, Any] = {}
    deployment_token = "workflow-runtime-credential-token-value-0001"
    ephemeral_api_key = "ephemeral-e2b-api-key-never-persist"

    class FakeResponse:
        status = 200

        async def __aenter__(self) -> "FakeResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def json(self, content_type: Any = None) -> dict[str, Any]:
            return {
                "code": 0,
                "data": {
                    "provider": "e2b",
                    "apiKey": ephemeral_api_key,
                    "timeoutSeconds": 77,
                    "allowInternetAccess": True,
                },
            }

    class FakeSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def get(self, url: str, **kwargs: Any) -> FakeResponse:
            request.update({"url": url, **kwargs})
            return FakeResponse()

    monkeypatch.setenv(
        RUNTIME_CONFIG_URL_ENV,
        "http://console-hub:8080/skill-sandbox/internal-runtime-config",
    )
    monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_ENV, deployment_token)
    monkeypatch.delenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV, raising=False)
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        FakeSession,
    )

    assert await _fetch_e2b_runtime_config(sandbox_config) == (
        ephemeral_api_key,
        77,
        True,
    )
    assert request == {
        "url": "http://console-hub:8080/skill-sandbox/internal-runtime-config",
        "headers": {RUNTIME_CREDENTIAL_HEADER: deployment_token},
        "params": expected_params,
        "allow_redirects": False,
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "runtime_data",
    [
        {
            "provider": "local",
            "apiKey": "ephemeral-key",
            "timeoutSeconds": 60,
            "allowInternetAccess": False,
        },
        {
            "provider": "e2b",
            "apiKey": "ephemeral-key",
            "timeoutSeconds": 0,
            "allowInternetAccess": False,
        },
        {
            "provider": "e2b",
            "apiKey": "ephemeral-key",
            "timeoutSeconds": 601,
            "allowInternetAccess": False,
        },
        {
            "provider": "e2b",
            "apiKey": "ephemeral-key",
            "timeoutSeconds": 60,
            "allowInternetAccess": "false",
        },
    ],
    ids=["provider", "timeout-low", "timeout-high", "network-type"],
)
async def test_code_runtime_config_rejects_invalid_broker_policy(
    monkeypatch: pytest.MonkeyPatch, runtime_data: dict[str, Any]
) -> None:
    class FakeResponse:
        async def __aenter__(self) -> "FakeResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def json(self, content_type: Any = None) -> dict[str, Any]:
            return {"code": 0, "data": runtime_data}

    class FakeSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def get(self, *args: Any, **kwargs: Any) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setenv(
        RUNTIME_CONFIG_URL_ENV,
        "http://console-hub:8080/skill-sandbox/internal-runtime-config",
    )
    monkeypatch.setenv(
        RUNTIME_CREDENTIAL_TOKEN_ENV,
        "workflow-runtime-credential-token-value-0001",
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        FakeSession,
    )

    with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
        await _fetch_e2b_runtime_config({"workflow_id": "flow-1", "uid": "user-1"})


def test_code_runtime_config_scope_requires_uid_even_with_flow_id() -> None:
    with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
        _runtime_config_query({"workflow_id": "spoofed-flow"})


def test_code_runtime_credential_token_prefers_environment_over_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    token_file = tmp_path / "runtime-token"
    token_file.write_text("file-runtime-credential-token-value-0001\n")
    environment_token = "environment-runtime-credential-token-0001"
    monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_ENV, environment_token)
    monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV, str(token_file))

    assert _load_runtime_credential_token() == environment_token


def test_code_runtime_credential_token_falls_back_to_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    token_file = tmp_path / "runtime-token"
    file_token = "file-runtime-credential-token-value-0001"
    token_file.write_text(f"{file_token}\n", encoding="utf-8")
    monkeypatch.delenv(RUNTIME_CREDENTIAL_TOKEN_ENV, raising=False)
    monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV, str(token_file))

    assert _load_runtime_credential_token() == file_token


@pytest.mark.parametrize(
    "deployment_token",
    [None, "too-short", "x" * 32 + "\r\nInjected: true"],
    ids=["missing", "short", "crlf"],
)
def test_code_runtime_credential_token_rejects_invalid_values(
    monkeypatch: pytest.MonkeyPatch,
    deployment_token: str | None,
) -> None:
    monkeypatch.delenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV, raising=False)
    if deployment_token is None:
        monkeypatch.delenv(RUNTIME_CREDENTIAL_TOKEN_ENV, raising=False)
    else:
        monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_ENV, deployment_token)

    with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
        _load_runtime_credential_token()


@pytest.mark.parametrize(
    "runtime_config_url",
    [
        None,
        "https://console-hub/wrong-path",
        "https://user:password@console-hub/skill-sandbox/internal-runtime-config",
        "https://console-hub/skill-sandbox/internal-runtime-config?redirect=1",
    ],
    ids=["missing", "wrong-path", "userinfo", "query"],
)
def test_code_runtime_config_url_rejects_invalid_deployment_values(
    monkeypatch: pytest.MonkeyPatch,
    runtime_config_url: str | None,
) -> None:
    if runtime_config_url is None:
        monkeypatch.delenv(RUNTIME_CONFIG_URL_ENV, raising=False)
    else:
        monkeypatch.setenv(RUNTIME_CONFIG_URL_ENV, runtime_config_url)

    with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
        _load_runtime_config_url()


@pytest.mark.asyncio
async def test_code_runtime_config_http_failure_is_generic_and_fail_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sensitive_server_error = "upstream accidentally included a secret value"

    class FakeResponse:
        async def __aenter__(self) -> "FakeResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            raise RuntimeError(sensitive_server_error)

    class FakeSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def get(self, *args: Any, **kwargs: Any) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setenv(
        RUNTIME_CONFIG_URL_ENV,
        "http://console-hub:8080/skill-sandbox/internal-runtime-config",
    )
    monkeypatch.setenv(
        RUNTIME_CREDENTIAL_TOKEN_ENV,
        "workflow-runtime-credential-token-value-0001",
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        FakeSession,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await _fetch_e2b_runtime_config({"workflow_id": "flow-1", "uid": "user-1"})

    assert str(exc_info.value) == SANDBOX_RUNTIME_CONFIG_ERROR
    assert sensitive_server_error not in str(exc_info.value)
    assert exc_info.value.__cause__ is None


@pytest.mark.asyncio
async def test_code_runtime_config_rejects_redirect_with_valid_json_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeResponse:
        status = 302

        async def __aenter__(self) -> "FakeResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def json(self, content_type: Any = None) -> dict[str, Any]:
            return {
                "code": 0,
                "data": {
                    "provider": "e2b",
                    "apiKey": "must-not-be-accepted",
                    "timeoutSeconds": 60,
                    "allowInternetAccess": False,
                },
            }

    class FakeSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def get(self, *args: Any, **kwargs: Any) -> FakeResponse:
            assert kwargs["allow_redirects"] is False
            return FakeResponse()

    monkeypatch.setenv(
        RUNTIME_CONFIG_URL_ENV,
        "http://console-hub:8080/skill-sandbox/internal-runtime-config",
    )
    monkeypatch.setenv(
        RUNTIME_CREDENTIAL_TOKEN_ENV,
        "workflow-runtime-credential-token-value-0001",
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        FakeSession,
    )

    with pytest.raises(RuntimeError) as exc_info:
        await _fetch_e2b_runtime_config({"workflow_id": "flow-1", "uid": "user-1"})

    assert str(exc_info.value) == SANDBOX_RUNTIME_CONFIG_ERROR
    assert exc_info.value.__cause__ is None


@pytest.mark.asyncio
async def test_code_executor_creates_e2b_with_only_fetched_ephemeral_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_kwargs: dict[str, Any] = {}
    ephemeral_api_key = "ephemeral-e2b-api-key-never-persist"

    class FakeFiles:
        async def write(self, path: str, content: str) -> None:
            return None

    class FakeCommands:
        async def run(self, *args: Any, **kwargs: Any) -> Any:
            return SimpleNamespace(exit_code=0, stdout="ok\n", stderr="")

    class FakeSandbox:
        files = FakeFiles()
        commands = FakeCommands()

        async def kill(self) -> None:
            return None

    class FakeAsyncSandbox:
        @classmethod
        async def create(cls, **kwargs: Any) -> FakeSandbox:
            create_kwargs.update(kwargs)
            return FakeSandbox()

    monkeypatch.setitem(
        sys.modules, "e2b", SimpleNamespace(AsyncSandbox=FakeAsyncSandbox)
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._fetch_e2b_runtime_config",
        AsyncMock(return_value=(ephemeral_api_key, 12, False)),
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._run_command_with_bounded_output",
        AsyncMock(return_value=(0, "ok\n", "")),
    )
    monkeypatch.setattr(E2BExecutor, "_collect_artifacts", AsyncMock(return_value=[]))
    sandbox_config = {
        "workflow_id": "flow-1",
        "node_id": "node-1",
        "api_key": "legacy-api-key-must-not-be-used",
        "runtime_config_url": "https://attacker.example/runtime-config",
    }

    result = await E2BExecutor().execute(
        language="python",
        code="print('ok')",
        timeout=10,
        span=DummySpan(),
        sandbox=sandbox_config,
    )

    assert result == "ok"
    assert create_kwargs["api_key"] == ephemeral_api_key
    assert create_kwargs["timeout"] == 12
    assert create_kwargs["allow_internet_access"] is False
    assert sandbox_config["api_key"] == "legacy-api-key-must-not-be-used"


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


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "executor_type",
    ["", "disabled", "local", "e2b", "unsupported"],
)
async def test_code_node_without_sandbox_rejects_unsafe_executor(
    monkeypatch: pytest.MonkeyPatch,
    executor_type: str,
) -> None:
    requested_types: list[str] = []

    def fake_create_executor(requested_type: str) -> RecordingExecutor:
        requested_types.append(requested_type)
        return RecordingExecutor()

    monkeypatch.setenv("CODE_EXEC_TYPE", executor_type)
    # These are mounted in the workflow service in production. The local executor
    # would inherit both the environment and the filesystem path.
    monkeypatch.setenv(
        RUNTIME_CREDENTIAL_TOKEN_ENV,
        "workflow-runtime-credential-token-value-0001",
    )
    monkeypatch.setenv(
        ARTIFACT_UPLOAD_TOKEN_FILE_ENV,
        "/app/secrets/artifact/artifact-upload-token",
    )
    monkeypatch.setattr(CodeExecutorFactory, "create_executor", fake_create_executor)

    node = CodeNode(
        codeLanguage="python",
        input_identifier=[],
        output_identifier=["result"],
        code=(
            "def main():\n"
            "    import os\n"
            "    return {'result': os.environ.get("
            "'SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN')}"
        ),
        appId="app-1",
        uid="user-1",
        node_id="ifly-code::node-1",
    )

    with pytest.raises(CustomException) as exc_info:
        await node.execute_code({}, DummySpan())

    assert ISOLATED_CODE_EXECUTOR_REQUIRED_ERROR in str(exc_info.value)
    assert requested_types == []


@pytest.mark.asyncio
async def test_code_node_without_sandbox_uses_builtin_executor_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executor = RecordingExecutor()
    requested_types: list[str] = []

    def fake_create_executor(requested_type: str) -> RecordingExecutor:
        requested_types.append(requested_type)
        return executor

    monkeypatch.delenv("CODE_EXEC_TYPE", raising=False)
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

    assert await node.execute_code({}, DummySpan()) == {"result": "ok"}
    assert requested_types == ["langchain"]
    assert executor.kwargs.get("sandbox") is None


@pytest.mark.asyncio
@pytest.mark.parametrize("executor_type", ["ifly", "ifly-v2", "langchain"])
async def test_code_node_without_e2b_preserves_explicit_isolated_executor(
    monkeypatch: pytest.MonkeyPatch,
    executor_type: str,
) -> None:
    executor = RecordingExecutor()
    requested_types: list[str] = []

    def fake_create_executor(requested_type: str) -> RecordingExecutor:
        requested_types.append(requested_type)
        return executor

    monkeypatch.setenv("CODE_EXEC_TYPE", executor_type)
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

    assert await node.execute_code({}, DummySpan()) == {"result": "ok"}
    assert requested_types == [executor_type]
    assert executor.kwargs.get("sandbox") is None


@pytest.mark.asyncio
async def test_code_collect_artifacts_enforces_read_budget(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    read_paths: list[str] = []
    scan_items = [
        {"path": "invalid-size.txt", "size": "not-a-number"},
        {"path": "negative-size.txt", "size": -1},
        {"path": "too-large.txt", "size": MAX_ARTIFACT_FILE_SIZE_BYTES + 1},
        *[
            {
                "path": f"budget-{index}.txt",
                "size": MAX_ARTIFACT_FILE_SIZE_BYTES,
            }
            for index in range(
                MAX_ARTIFACT_TOTAL_SIZE_BYTES // MAX_ARTIFACT_FILE_SIZE_BYTES
            )
        ],
        *[
            {"path": f"extra-{index}.txt", "size": 1}
            for index in range(MAX_ARTIFACT_FILES_PER_RUN)
        ],
    ]

    class FakeFiles:
        async def exists(self, path: str) -> bool:
            return True

    class FakeSandbox:
        files = FakeFiles()

    class FakeUploader:
        def __init__(self, sandbox_config: dict[str, Any]) -> None:
            return None

        def is_configured(self) -> bool:
            return True

        async def upload(
            self, file_name: str, file_bytes: bytes, content_type: str
        ) -> dict[str, Any]:
            return {"uploaded": file_name}

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.CodeArtifactUploader",
        FakeUploader,
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._scan_artifact_candidates",
        AsyncMock(return_value=scan_items),
    )

    async def snapshot(_sandbox: Any, path: str, _limit: int, _timeout: int) -> bytes:
        read_paths.append(path)
        return b"done"

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._snapshot_artifact_bytes",
        snapshot,
    )

    artifacts = await E2BExecutor()._collect_artifacts(
        FakeSandbox(),
        "/home/user/code",
        {
            "artifact_upload_url": "http://hub/internal-upload",
            "workflow_id": "flow-1",
            "uid": "user-1",
        },
    )

    budget_file_count = MAX_ARTIFACT_TOTAL_SIZE_BYTES // MAX_ARTIFACT_FILE_SIZE_BYTES
    assert len(artifacts) == MAX_ARTIFACT_FILES_PER_RUN
    assert all(
        artifact["upload_error"] == ARTIFACT_FILE_SIZE_INVALID_ERROR
        for artifact in artifacts[:2]
    )
    assert artifacts[2]["upload_error"] == ARTIFACT_FILE_SIZE_LIMIT_ERROR
    assert all(
        artifact.get("uploaded") == f"budget-{index}.txt"
        for index, artifact in enumerate(artifacts[3 : budget_file_count + 3])
    )
    assert all(
        artifact.get("upload_error") == ARTIFACT_TOTAL_SIZE_LIMIT_ERROR
        for artifact in artifacts[budget_file_count + 3 :]
    )
    assert read_paths == [
        f"/home/user/code/budget-{index}.txt" for index in range(budget_file_count)
    ]


@pytest.mark.asyncio
async def test_code_artifact_upload_failure_is_fixed_and_does_not_log_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sentinel = "https://objects.example/private?X-Amz-Signature=" + "b" * 64

    class FakeFiles:
        async def exists(self, _path: str) -> bool:
            return True

    class FakeUploader:
        def __init__(self, _sandbox_config: dict[str, Any]) -> None:
            return None

        def is_configured(self) -> bool:
            return True

        async def upload(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
            raise RuntimeError(sentinel)

    warning = MagicMock()
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.CodeArtifactUploader",
        FakeUploader,
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._scan_artifact_candidates",
        AsyncMock(return_value=[{"path": "result.txt", "size": 4}]),
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._snapshot_artifact_bytes",
        AsyncMock(return_value=b"done"),
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.logger.warning",
        warning,
    )

    artifacts = await E2BExecutor()._collect_artifacts(
        SimpleNamespace(files=FakeFiles()),
        "/home/user/code",
        {"workflow_id": "flow-1", "uid": "user-1"},
    )

    assert artifacts == [
        {
            "file_name": "result.txt",
            "file_size": 4,
            "upload_error": ARTIFACT_UPLOAD_FAILED_ERROR,
        }
    ]
    assert sentinel not in json.dumps(artifacts)
    assert sentinel not in repr(warning.call_args_list)


@pytest.mark.asyncio
async def test_code_collect_artifacts_rejects_growing_bounded_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeFiles:
        async def exists(self, path: str) -> bool:
            return True

        async def read(self, *args: Any, **kwargs: Any) -> Any:
            raise AssertionError("The growing source must not be read through E2B SDK")

    class FakeSandbox:
        files = FakeFiles()

    class FakeUploader:
        def __init__(self, sandbox_config: dict[str, Any]) -> None:
            return None

        def is_configured(self) -> bool:
            return True

        async def upload(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
            raise AssertionError("An over-limit stream must not be uploaded")

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.CodeArtifactUploader",
        FakeUploader,
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._scan_artifact_candidates",
        AsyncMock(return_value=[{"path": "growing.bin", "size": 1}]),
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._snapshot_artifact_bytes",
        AsyncMock(side_effect=_ArtifactReadLimitExceeded),
    )

    artifacts = await E2BExecutor()._collect_artifacts(
        FakeSandbox(),
        "/home/user/code",
        {"workflow_id": "flow-1", "uid": "user-1"},
    )

    assert artifacts == [
        {
            "file_name": "growing.bin",
            "file_size": MAX_ARTIFACT_FILE_SIZE_BYTES + 1,
            "upload_error": ARTIFACT_FILE_SIZE_LIMIT_ERROR,
        }
    ]


@pytest.mark.asyncio
async def test_code_bounded_snapshot_limits_sdk_buffer_and_is_deleted() -> None:
    max_bytes = 16
    removed: list[tuple[str, str | None]] = []
    command_calls: list[tuple[str, dict[str, Any]]] = []

    class FakeCommands:
        async def run(self, command: str, **kwargs: Any) -> Any:
            command_calls.append((command, kwargs))
            return SimpleNamespace(
                exit_code=0,
                stdout=json.dumps({"size": max_bytes + 1}),
                stderr="",
            )

    class FakeFiles:
        async def read(self, path: str, **kwargs: Any) -> bytearray:
            assert path.startswith("/root/.astron-artifact-snapshots/")
            assert kwargs == {"format": "bytes", "user": "root"}
            return bytearray(b"x" * (max_bytes + 1))

        async def remove(self, path: str, user: str | None = None) -> None:
            removed.append((path, user))

    sandbox = SimpleNamespace(commands=FakeCommands(), files=FakeFiles())
    value, truncated = await _read_bounded_snapshot(
        sandbox, "/home/user/code/growing.bin", max_bytes, 10
    )

    assert value == b"x" * max_bytes
    assert truncated is True
    assert len(command_calls) == 1
    assert "/home/user/code/growing.bin" in command_calls[0][0]
    assert command_calls[0][1]["user"] == "root"
    assert len(removed) == 1
    assert removed[0][0].startswith("/root/.astron-artifact-snapshots/")
    assert removed[0][1] == "root"


@pytest.mark.asyncio
async def test_code_user_output_is_redirected_and_marked_when_truncated(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    command_calls: list[str] = []
    removed: list[str] = []

    class FakeCommands:
        async def run(self, command: str, **kwargs: Any) -> Any:
            command_calls.append(command)
            return SimpleNamespace(
                exit_code=7,
                stdout="unbounded stdout must be ignored",
                stderr="unbounded stderr must be ignored",
            )

    class FakeFiles:
        async def remove(self, path: str, **kwargs: Any) -> None:
            removed.append(path)

    bounded_reads = AsyncMock(
        side_effect=[(b"bounded stdout", True), (b"bounded stderr", False)]
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor._read_bounded_snapshot",
        bounded_reads,
    )
    result = await _run_command_with_bounded_output(
        SimpleNamespace(commands=FakeCommands(), files=FakeFiles()),
        "python /home/user/code/main.py",
        "/home/user/code",
        30,
    )

    assert result == (
        7,
        "bounded stdout" + SANDBOX_OUTPUT_TRUNCATED_MARKER,
        "bounded stderr",
    )
    assert len(command_calls) == 1
    assert "/bin/sh -c" in command_calls[0]
    assert ".stdout" in command_calls[0] and ".stderr" in command_calls[0]
    assert len(removed) == 2
    assert all(
        call.args[2] == MAX_SANDBOX_COMMAND_OUTPUT_BYTES
        for call in bounded_reads.await_args_list
    )


def test_code_artifact_scan_helper_caps_massive_manifest_at_limit_plus_one(
    tmp_path: Any,
) -> None:
    for index in range(500):
        (tmp_path / f"artifact-{index}.txt").write_text("x", encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            _ARTIFACT_SCAN_HELPER,
            str(tmp_path),
            str(MAX_ARTIFACT_FILES_PER_RUN + 1),
            "[]",
            "4096",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    manifest = json.loads(result.stdout)

    assert len(manifest) == MAX_ARTIFACT_FILES_PER_RUN + 1
    assert len(result.stdout.encode()) <= MAX_ARTIFACT_SCAN_OUTPUT_BYTES


def test_code_artifact_upload_token_prefers_environment_over_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    token_file = tmp_path / "artifact-token"
    token_file.write_text("file-artifact-upload-token-value-0001\n", encoding="utf-8")
    environment_token = "environment-artifact-upload-token-0001"
    monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_ENV, environment_token)
    monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, str(token_file))

    assert _load_artifact_upload_token() == environment_token


def test_code_artifact_upload_token_falls_back_to_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    token_file = tmp_path / "artifact-token"
    file_token = "file-artifact-upload-token-value-0001"
    token_file.write_text(f"{file_token}\n", encoding="utf-8")
    monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_ENV, raising=False)
    monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, str(token_file))

    assert _load_artifact_upload_token() == file_token


@pytest.mark.parametrize(
    "upload_url",
    [
        None,
        "ftp://console-hub/workflow/artifacts/internal-upload",
        "http://console-hub/wrong-path",
        "http://user:password@console-hub/workflow/artifacts/internal-upload",
        "http://console-hub/workflow/artifacts/internal-upload?redirect=1",
        "http://console-hub/workflow/artifacts/internal-upload#fragment",
    ],
    ids=["missing", "scheme", "path", "userinfo", "query", "fragment"],
)
def test_code_artifact_upload_url_rejects_invalid_deployment_values(
    monkeypatch: pytest.MonkeyPatch, upload_url: str | None
) -> None:
    if upload_url is None:
        monkeypatch.delenv(ARTIFACT_UPLOAD_URL_ENV, raising=False)
    else:
        monkeypatch.setenv(ARTIFACT_UPLOAD_URL_ENV, upload_url)

    with pytest.raises(
        RuntimeError, match="Artifact upload configuration is unavailable"
    ):
        _load_artifact_upload_url()


@pytest.mark.asyncio
async def test_code_payload_artifact_url_cannot_trigger_request_or_receive_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnexpectedSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise AssertionError("HTTP session must not be created")

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        UnexpectedSession,
    )
    monkeypatch.delenv(ARTIFACT_UPLOAD_URL_ENV, raising=False)
    monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_ENV, "deployment-token-must-not-leak-0001")
    uploader = CodeArtifactUploader(
        {
            "artifact_upload_url": (
                "https://attacker.example/workflow/artifacts/internal-upload"
            ),
            "workflow_id": "flow-1",
            "uid": "user-1",
        }
    )

    assert uploader.is_configured() is False
    with pytest.raises(
        RuntimeError, match="Artifact upload configuration is unavailable"
    ):
        await uploader.upload("result.txt", b"done", "text/plain")


@pytest.mark.asyncio
@pytest.mark.parametrize("modern", [False, True])
async def test_code_artifact_uploader_uses_deployment_token_and_ignores_payload(
    monkeypatch: pytest.MonkeyPatch,
    modern: bool,
) -> None:
    request_kwargs: dict[str, Any] = {}
    fields: dict[str, Any] = {}
    deployment_token = "workflow-deployment-artifact-token-0001"

    class FakeFormData:
        def add_field(self, name: str, value: Any, **kwargs: Any) -> None:
            fields[name] = value

    class FakeResponse:
        status = 200

        async def __aenter__(self) -> "FakeResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def json(self, content_type: Any = None) -> dict[str, Any]:
            return {"code": 0, "data": {"id": 1}}

    class FakeSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def post(self, *args: Any, **kwargs: Any) -> FakeResponse:
            request_kwargs["url"] = args[0]
            request_kwargs.update(kwargs)
            return FakeResponse()

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.FormData",
        FakeFormData,
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        FakeSession,
    )
    monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_ENV, deployment_token)
    monkeypatch.setenv(
        ARTIFACT_UPLOAD_URL_ENV,
        "http://console-hub:8080/workflow/artifacts/internal-upload",
    )
    monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, raising=False)
    uploader = CodeArtifactUploader(
        {
            "artifact_upload_url": "http://hub/workflow/artifacts/internal-upload",
            "artifact_upload_token": "legacy-payload-token-must-not-be-used",
            "workflow_id": "flow-1",
            "uid": "owner",
            "console": modern,
            "run_id": "durable-run",
            "node_id": "ifly-code::one",
            "artifact_context": (
                {"root_id": "root", "uid": "caller"} if modern else None
            ),
        }
    )

    await uploader.upload("result.txt", b"done", "text/plain")

    assert request_kwargs["headers"] == {
        "X-Skill-Sandbox-Artifact-Token": deployment_token,
    }
    assert request_kwargs["url"] == (
        "http://console-hub:8080/workflow/artifacts/console-upload"
        if modern
        else "http://console-hub:8080/workflow/artifacts/internal-upload"
    )
    assert fields["uid"] == ("caller" if modern else "owner")
    assert fields["runId"] == "durable-run"
    assert (fields.get("rootId") == "root") is modern
    assert request_kwargs["allow_redirects"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status", "payload"),
    [
        (302, {"code": 0, "data": {"id": 1}}),
        (200, {"code": 7, "message": "SENSITIVE", "data": {"id": 1}}),
        (200, {"code": 0, "data": "SENSITIVE"}),
        (200, "SENSITIVE"),
    ],
    ids=["redirect", "error-code", "non-object-data", "non-object-root"],
)
async def test_code_artifact_uploader_rejects_untrusted_response_shape(
    monkeypatch: pytest.MonkeyPatch,
    status: int,
    payload: Any,
) -> None:
    sentinel = "https://objects.example/private?X-Amz-Signature=SENSITIVE"
    reflected_payload = json.loads(json.dumps(payload).replace("SENSITIVE", sentinel))

    class FakeResponse:
        def __init__(self) -> None:
            self.status = status

        async def __aenter__(self) -> "FakeResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def json(self, content_type: Any = None) -> Any:
            return reflected_payload

    class FakeSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def post(self, *args: Any, **kwargs: Any) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.FormData",
        MagicMock,
    )
    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        FakeSession,
    )
    monkeypatch.setenv(
        ARTIFACT_UPLOAD_URL_ENV,
        "http://console-hub:8080/workflow/artifacts/internal-upload",
    )
    monkeypatch.setenv(
        ARTIFACT_UPLOAD_TOKEN_ENV, "deployment-artifact-token-value-0001"
    )
    monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, raising=False)
    uploader = CodeArtifactUploader({"workflow_id": "flow-1", "uid": "user-1"})

    with pytest.raises(RuntimeError) as exc_info:
        await uploader.upload("result.txt", b"done", "text/plain")

    assert str(exc_info.value) == ARTIFACT_UPLOAD_FAILED_ERROR
    assert sentinel not in str(exc_info.value)
    assert exc_info.value.__cause__ is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "deployment_token",
    [None, "too-short", "x" * 32 + "\r\nInjected: true"],
    ids=["missing", "short", "crlf"],
)
async def test_code_artifact_upload_rejects_missing_or_short_deployment_token(
    monkeypatch: pytest.MonkeyPatch,
    deployment_token: str | None,
) -> None:
    class UnexpectedSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise AssertionError("HTTP session must not be created")

    monkeypatch.setattr(
        "workflow.engine.nodes.code.executor.e2b.e2b_executor.aiohttp.ClientSession",
        UnexpectedSession,
    )
    monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, raising=False)
    monkeypatch.setenv(
        ARTIFACT_UPLOAD_URL_ENV,
        "http://console-hub:8080/workflow/artifacts/internal-upload",
    )
    if deployment_token is None:
        monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_ENV, raising=False)
    else:
        monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_ENV, deployment_token)
    uploader = CodeArtifactUploader(
        {
            "artifact_upload_url": "http://hub/workflow/artifacts/internal-upload",
            "workflow_id": "flow-1",
            "uid": "user-1",
        }
    )

    with pytest.raises(
        RuntimeError, match="Artifact upload credential is missing or invalid"
    ):
        await uploader.upload("result.txt", b"done", "text/plain")


@pytest.mark.asyncio
async def test_console_code_sandbox_uses_durable_context_and_separate_owner(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from workflow.engine.entities.variable_pool import ParamKey, VariablePool

    executor = RecordingExecutor()
    monkeypatch.setattr(CodeExecutorFactory, "create_executor", lambda _: executor)
    node = CodeNode(
        input_identifier=[],
        output_identifier=["result"],
        code="def main(): return {'result': 'ok'}",
        appId="app",
        uid="owner",
        node_id="ifly-code::real",
        sandbox={
            "enabled": True,
            "console": True,
            "uid": "forged",
            "runId": "trace-sid",
            "nodeId": "forged",
            "workflowId": "forged",
            "spaceId": "7",
        },
    )
    pool = VariablePool([])
    pool.system_params.set(
        ParamKey.ConsoleContext, {"run_id": "durable", "root_id": "root"}
    )
    pool.system_params.set(ParamKey.FlowId, "flow")
    pool.system_params.set(ParamKey.Uid, "caller")
    await node.execute_code({}, DummySpan(), pool)
    config = executor.kwargs["sandbox"]
    assert config["run_id"] == "durable" and config["node_id"] == "ifly-code::real"
    assert config["artifact_context"] == {"uid": "caller", "root_id": "root"}
    assert _runtime_config_query(config) == {
        "uid": "owner",
        "spaceId": "7",
        "flowId": "flow",
    }
    with pytest.raises(CustomException):
        node._runtime_sandbox_config(DummySpan())
    pool.system_params.set(ParamKey.ConsoleContext, {"run_id": "durable"})
    with pytest.raises(CustomException):
        node._runtime_sandbox_config(DummySpan(), pool)


@pytest.mark.parametrize(
    "missing", ["artifact_context", "run_id", "node_id", "workflow_id"]
)
def test_modern_code_upload_missing_identity_cannot_use_legacy_route(
    missing: str,
) -> None:
    config = {
        "console": True,
        "artifact_context": {"root_id": "root", "uid": "caller"},
        "run_id": "run",
        "node_id": "code",
        "workflow_id": "flow",
        "uid": "owner",
    }
    config.pop(missing)
    with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
        CodeArtifactUploader(config).is_configured()
