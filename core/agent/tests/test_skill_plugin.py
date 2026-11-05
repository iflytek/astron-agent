"""Test SkillPlugin and SkillPluginFactory"""

import json
import subprocess
import sys
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.service.plugin.skill import SkillPlugin, SkillPluginFactory
from agent.service.plugin.skill_resource_security import (
    SKILL_RESOURCE_TRUSTED_BUCKET_ENV,
    SKILL_RESOURCE_TRUSTED_ORIGIN_ENV,
)
from agent.service.plugin.skill_sandbox import (
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
    ArtifactUploader,
    E2BSandboxProvider,
    SandboxExecutionRequest,
    SkillSandboxConfig,
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

_SIGV4_QUERY = (
    "X-Amz-Algorithm=AWS4-HMAC-SHA256&"
    "X-Amz-Credential=test%2F20260824%2Fus-east-1%2Fs3%2Faws4_request&"
    "X-Amz-Date=20260824T000000Z&X-Amz-Expires=300&"
    "X-Amz-SignedHeaders=host&X-Amz-Signature=" + "a" * 64
)
_SKILL_URL = f"https://example.com/console-oss/skill-files/user/skill.md?{_SIGV4_QUERY}"
_REFERENCE_URL = (
    f"https://example.com/console-oss/skill-files/user/beijing.md?{_SIGV4_QUERY}"
)
_SCRIPT_URL = (
    f"https://example.com/console-oss/skill-files/user/clean.py?{_SIGV4_QUERY}"
)


class _FakeStreamingContent:
    def __init__(self, value: bytes) -> None:
        self.value = value

    async def iter_chunked(self, _size: int) -> Any:
        yield self.value


class _FakeDownloadResponse:
    def __init__(self, value: str) -> None:
        self._value = value.encode()
        self.content = _FakeStreamingContent(self._value)
        self.content_length = len(self._value)
        self.status = 200

    async def __aenter__(self) -> "_FakeDownloadResponse":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    def raise_for_status(self) -> None:
        return None


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Automatically inject environment fixes for all tests."""
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]
    monkeypatch.setenv(SKILL_RESOURCE_TRUSTED_ORIGIN_ENV, "https://example.com")
    monkeypatch.setenv(SKILL_RESOURCE_TRUSTED_BUCKET_ENV, "console-oss")


class TestSkillPluginFactory:
    """Test SkillPluginFactory class"""

    @pytest.fixture
    def factory(self) -> SkillPluginFactory:
        """Create Factory instance for testing"""
        return SkillPluginFactory(
            skills=[
                {
                    "skill_id": "skill-1",
                    "name": "ui-ux-pro-max",
                    "description": "Design reference skill",
                    "download_url": _SKILL_URL,
                    "resources": [
                        {
                            "path": "references/beijing.md",
                            "name": "beijing.md",
                            "download_url": _REFERENCE_URL,
                            "file_ext": "md",
                            "file_size": 128,
                        }
                    ],
                }
            ]
        )

    def test_gen(self, factory: SkillPluginFactory) -> None:
        """Test generating SkillPlugin"""
        plugins = factory.gen()

        assert len(plugins) == 2
        assert isinstance(plugins[0], SkillPlugin)
        assert plugins[0].name == "read_skill_skill-1"
        assert plugins[0].typ == "skill"
        assert plugins[1].name == "run_skill_skill-1"
        assert plugins[1].typ == "skill"
        assert "working_dir" not in plugins[1].schema_template
        assert "output_dir" not in plugins[1].schema_template

    def test_gen_rejects_invalid_skills(self) -> None:
        """Test rejecting incomplete configured skills"""
        factory = SkillPluginFactory(
            skills=[
                {
                    "skill_id": "skill-1",
                    "name": "missing-download-url",
                },
                {
                    "name": "missing-id",
                    "download_url": _SKILL_URL,
                },
            ]
        )

        with pytest.raises(ValueError):
            factory.gen()

    def test_sandbox_config_ignores_untrusted_payload_credentials(self) -> None:
        """Runtime payload credentials are not retained in the sandbox model."""
        factory = SkillPluginFactory(skills=[])

        config = factory._normalize_sandbox_config(
            {
                "provider": "e2b",
                "enabled": True,
                "artifactUploadUrl": "http://hub/internal-upload",
                "artifactUploadToken": "payload-token-must-not-be-used",
                "apiKey": "legacy-api-key-must-not-be-used",
                "api_key": "legacy-snake-api-key-must-not-be-used",
                "runtimeConfigUrl": "https://attacker.example/runtime-config",
                "runtime_config_url": "https://attacker.example/snake-runtime-config",
                "runtimeCredentialToken": "payload-runtime-token-must-not-be-used",
                "runtime_credential_token": "snake-runtime-token-must-not-be-used",
                "workflowId": "flow-1",
                "uid": "user-1",
            }
        )

        assert config is not None
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
    async def test_runner_reads_skill_content(
        self, factory: SkillPluginFactory
    ) -> None:
        """Test downloading full skill content on demand"""
        plugin = factory.gen()[0]
        span = Span(app_id="test_app", uid="test_uid")

        def mock_get(
            *args: Any, **kwargs: Any
        ) -> _FakeDownloadResponse:  # noqa: ANN001
            return _FakeDownloadResponse("# Skill\n\nFull content")

        with patch("aiohttp.ClientSession.get", new=mock_get):
            response = await plugin.run({}, span)

        assert response.result["skill_id"] == "skill-1"
        assert response.result["name"] == "ui-ux-pro-max"
        assert response.result["description"] == "Design reference skill"
        assert response.result["content"] == "# Skill\n\nFull content"
        assert response.result["resources"] == [
            {
                "path": "references/beijing.md",
                "name": "beijing.md",
                "file_ext": "md",
                "file_size": 128,
            }
        ]

    @pytest.mark.asyncio
    async def test_runner_reads_skill_resource_by_path(
        self, factory: SkillPluginFactory
    ) -> None:
        """Test downloading referenced skill resource on demand"""
        plugin = factory.gen()[0]
        span = Span(app_id="test_app", uid="test_uid")

        def mock_get(
            *args: Any, **kwargs: Any
        ) -> _FakeDownloadResponse:  # noqa: ANN001
            url = str(args[1]) if len(args) > 1 else ""
            return _FakeDownloadResponse(
                "北京参考内容" if "beijing.md" in url else "# Skill\n\nFull content"
            )

        with patch("aiohttp.ClientSession.get", new=mock_get):
            response = await plugin.run({"path": "references/beijing.md"}, span)

        assert response.result["skill_id"] == "skill-1"
        assert response.result["path"] == "references/beijing.md"
        assert response.result["content"] == "北京参考内容"

    @pytest.mark.asyncio
    async def test_run_skill_returns_fixed_message_without_sandbox_config(
        self, factory: SkillPluginFactory
    ) -> None:
        """Test executable skill tool returns a stable model-readable message."""
        plugin = factory.gen()[1]
        span = Span(app_id="test_app", uid="test_uid")

        response = await plugin.run({"command": "python -m scripts.clean"}, span)

        assert response.result == {
            "skill_id": "skill-1",
            "configured": False,
            "message": (
                "当前环境未配置脚本沙箱，暂不支持直接执行 Skill 脚本。"
                "你可以向用户说明需要管理员在资源管理中配置脚本沙箱后才能运行。"
            ),
        }

    @pytest.mark.asyncio
    async def test_run_skill_executes_configured_sandbox_provider(self) -> None:
        """Test executable skill tool delegates command execution to sandbox provider."""
        factory = SkillPluginFactory(
            skills=[
                {
                    "skill_id": "skill-1",
                    "name": "script-skill",
                    "download_url": _SKILL_URL,
                    "sandbox": {
                        "provider": "local",
                        "enabled": True,
                        "api_key": "legacy-api-key-must-not-be-used",
                        "runtimeConfigUrl": "https://attacker.example/runtime-config",
                        "workflowId": "flow-1",
                        "timeout_seconds": 12,
                        "allow_internet_access": False,
                    },
                    "resources": [
                        {
                            "path": "scripts/clean.py",
                            "download_url": _SCRIPT_URL,
                            "file_ext": "py",
                            "file_size": 64,
                        }
                    ],
                }
            ]
        )
        plugin = factory.gen()[1]
        span = Span(app_id="test_app", uid="test_uid")

        class FakeProvider:
            def __init__(self, config: Any) -> None:
                self.config = config

            async def execute(self, request: Any) -> dict[str, Any]:
                assert request.command == "python -m scripts.clean"
                assert request.stdin == {"value": 1}
                assert request.working_dir == "."
                assert request.output_dir == "."
                assert request.resources[0].path == "scripts/clean.py"
                assert self.config.workflow_id == "flow-1"
                assert "provider" not in self.config.model_dump()
                assert "timeout_seconds" not in self.config.model_dump()
                assert "allow_internet_access" not in self.config.model_dump()
                assert "api_key" not in self.config.model_dump()
                assert "runtime_config_url" not in self.config.model_dump()
                return {
                    "sandbox_provider": "e2b",
                    "configured": True,
                    "command": request.command,
                    "working_dir": request.working_dir,
                    "exit_code": 0,
                    "stdout": '{"ok": true}',
                    "stderr": "",
                    "artifacts": [],
                }

        with patch(
            "agent.service.plugin.skill_sandbox.E2BSandboxProvider", FakeProvider
        ):
            response = await plugin.run(
                {
                    "command": "python -m scripts.clean",
                    "stdin": {"value": 1},
                    "working_dir": "scripts",
                    "output_dir": "output",
                },
                span,
            )

        assert response.result["configured"] is True
        assert response.result["sandbox_provider"] == "e2b"
        assert response.result["result_json"] == {"ok": True}

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("config", "expected_params"),
        [
            (
                SkillSandboxConfig(
                    workflow_id="flow-1", uid="user-1", space_id="space-1"
                ),
                {"uid": "user-1", "flowId": "flow-1", "spaceId": "space-1"},
            ),
            (
                SkillSandboxConfig(uid="user-1", space_id="space-1"),
                {"uid": "user-1", "spaceId": "space-1"},
            ),
            (SkillSandboxConfig(uid="user-1"), {"uid": "user-1"}),
        ],
        ids=["flow-uid-space", "uid-space", "personal-uid"],
    )
    async def test_runtime_config_fetch_uses_deployment_scope_and_token(
        self,
        monkeypatch: pytest.MonkeyPatch,
        config: SkillSandboxConfig,
        expected_params: dict[str, str],
    ) -> None:
        request: dict[str, Any] = {}
        deployment_token = "agent-runtime-credential-token-value-0001"
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
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )

        assert await _fetch_e2b_runtime_config(config) == (
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
    async def test_runtime_config_rejects_invalid_broker_policy(
        self, monkeypatch: pytest.MonkeyPatch, runtime_data: dict[str, Any]
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
            "agent-runtime-credential-token-value-0001",
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )

        with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
            await _fetch_e2b_runtime_config(
                SkillSandboxConfig(workflow_id="flow-1", uid="user-1")
            )

    def test_runtime_config_scope_requires_uid_even_with_flow_id(self) -> None:
        with pytest.raises(RuntimeError, match=SANDBOX_RUNTIME_CONFIG_ERROR):
            _runtime_config_query(SkillSandboxConfig(workflow_id="spoofed-flow"))

    def test_runtime_credential_token_prefers_environment_over_file(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Any
    ) -> None:
        token_file = tmp_path / "runtime-token"
        token_file.write_text("file-runtime-credential-token-value-0001\n")
        environment_token = "environment-runtime-credential-token-0001"
        monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_ENV, environment_token)
        monkeypatch.setenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV, str(token_file))

        assert _load_runtime_credential_token() == environment_token

    def test_runtime_credential_token_falls_back_to_file(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Any
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
    def test_runtime_credential_token_rejects_invalid_values(
        self,
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
    def test_runtime_config_url_rejects_invalid_deployment_values(
        self,
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
    async def test_provider_creates_e2b_with_only_fetched_ephemeral_key(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        create_kwargs: dict[str, Any] = {}
        ephemeral_api_key = "ephemeral-e2b-api-key-never-persist"

        class FakeCommands:
            async def run(self, *args: Any, **kwargs: Any) -> Any:
                return SimpleNamespace(exit_code=0, stdout="ok\n", stderr="")

        class FakeSandbox:
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
            "agent.service.plugin.skill_sandbox._fetch_e2b_runtime_config",
            AsyncMock(return_value=(ephemeral_api_key, 12, False)),
        )
        monkeypatch.setattr(
            E2BSandboxProvider, "_stage_resources", AsyncMock(return_value=None)
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._run_command_with_bounded_output",
            AsyncMock(return_value=(0, "ok\n", "")),
        )
        monkeypatch.setattr(
            E2BSandboxProvider, "_collect_artifacts", AsyncMock(return_value=[])
        )
        config = SkillSandboxConfig(
            enabled=True,
            workflow_id="flow-1",
        )

        result = await E2BSandboxProvider(config).execute(
            SandboxExecutionRequest(skill_id="skill-1", command="python run.py")
        )

        assert result["stdout"] == "ok\n"
        assert create_kwargs["api_key"] == ephemeral_api_key
        assert create_kwargs["timeout"] == 12
        assert create_kwargs["allow_internet_access"] is False
        assert "api_key" not in config.model_dump()

    @pytest.mark.asyncio
    async def test_runtime_config_http_failure_is_generic_and_fail_closed(
        self, monkeypatch: pytest.MonkeyPatch
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
            "agent-runtime-credential-token-value-0001",
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )

        with pytest.raises(RuntimeError) as exc_info:
            await _fetch_e2b_runtime_config(
                SkillSandboxConfig(workflow_id="flow-1", uid="user-1")
            )

        assert str(exc_info.value) == SANDBOX_RUNTIME_CONFIG_ERROR
        assert sensitive_server_error not in str(exc_info.value)
        assert exc_info.value.__cause__ is None

    @pytest.mark.asyncio
    async def test_runtime_config_rejects_redirect_with_valid_json_body(
        self, monkeypatch: pytest.MonkeyPatch
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
            "agent-runtime-credential-token-value-0001",
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )

        with pytest.raises(RuntimeError) as exc_info:
            await _fetch_e2b_runtime_config(
                SkillSandboxConfig(workflow_id="flow-1", uid="user-1")
            )

        assert str(exc_info.value) == SANDBOX_RUNTIME_CONFIG_ERROR
        assert exc_info.value.__cause__ is None

    @pytest.mark.asyncio
    async def test_collect_artifacts_scans_workspace_root_and_skips_resources(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test collecting generated files from the workspace root."""

        class FakeFiles:
            async def exists(self, path: str) -> bool:
                assert path == "/home/user/skill"
                return True

        class FakeSandbox:
            files = FakeFiles()

        class FakeUploader:
            def __init__(self, config: Any, skill_id: str) -> None:
                self.skill_id = skill_id

            def is_configured(self) -> bool:
                return True

            async def upload(
                self, file_name: str, file_bytes: bytes, content_type: str
            ) -> dict[str, Any]:
                return {
                    "id": 1,
                    "fileName": file_name,
                    "fileSize": len(file_bytes),
                    "contentType": content_type,
                }

        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.ArtifactUploader", FakeUploader
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._scan_artifact_candidates",
            AsyncMock(
                return_value=[
                    {"path": "scripts/test_script.py", "size": 4},
                    {"path": "e2b_skill_test_output.txt", "size": 4},
                    {"path": ".astron_stdin.json", "size": 4},
                ]
            ),
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._snapshot_artifact_bytes",
            AsyncMock(return_value=b"done"),
        )
        provider = E2BSandboxProvider(None)
        request = SandboxExecutionRequest(
            skill_id="skill-1",
            command="python scripts/test_script.py",
            output_dir=".",
            resources=[
                type("Resource", (), {"path": "scripts/test_script.py"})(),
            ],
        )

        artifacts = await provider._collect_artifacts(
            FakeSandbox(),
            "/home/user/skill",
            "/home/user/skill",
            request,
        )

        assert artifacts == [
            {
                "file_name": "e2b_skill_test_output.txt",
                "file_size": 4,
                "id": 1,
                "fileName": "e2b_skill_test_output.txt",
                "fileSize": 4,
                "contentType": "text/plain",
            }
        ]

    @pytest.mark.asyncio
    async def test_collect_artifacts_enforces_read_budget(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Oversized, excessive, and over-budget files are never read."""
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
            def __init__(self, config: Any, skill_id: str) -> None:
                return None

            def is_configured(self) -> bool:
                return True

            async def upload(
                self, file_name: str, file_bytes: bytes, content_type: str
            ) -> dict[str, Any]:
                return {"uploaded": file_name}

        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.ArtifactUploader", FakeUploader
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._scan_artifact_candidates",
            AsyncMock(return_value=scan_items),
        )

        async def snapshot(
            _sandbox: Any, path: str, _limit: int, _timeout: int
        ) -> bytes:
            read_paths.append(path)
            return b"done"

        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._snapshot_artifact_bytes", snapshot
        )
        provider = E2BSandboxProvider(None)

        artifacts = await provider._collect_artifacts(
            FakeSandbox(),
            "/home/user/skill",
            "/home/user/skill",
            SandboxExecutionRequest(skill_id="skill-1", command="generate"),
        )

        budget_file_count = (
            MAX_ARTIFACT_TOTAL_SIZE_BYTES // MAX_ARTIFACT_FILE_SIZE_BYTES
        )
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
            f"/home/user/skill/budget-{index}.txt" for index in range(budget_file_count)
        ]

    @pytest.mark.asyncio
    async def test_artifact_upload_failure_is_fixed_and_does_not_log_exception(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        sentinel = "https://objects.example/private?X-Amz-Signature=" + "b" * 64

        class FakeFiles:
            async def exists(self, _path: str) -> bool:
                return True

        class FakeUploader:
            def __init__(self, _config: Any, _skill_id: str) -> None:
                return None

            def is_configured(self) -> bool:
                return True

            async def upload(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
                raise RuntimeError(sentinel)

        warning = MagicMock()
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.ArtifactUploader", FakeUploader
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._scan_artifact_candidates",
            AsyncMock(return_value=[{"path": "result.txt", "size": 4}]),
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._snapshot_artifact_bytes",
            AsyncMock(return_value=b"done"),
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.logger.warning", warning
        )

        artifacts = await E2BSandboxProvider(None)._collect_artifacts(
            SimpleNamespace(files=FakeFiles()),
            "/home/user/skill",
            "/home/user/skill",
            SandboxExecutionRequest(skill_id="skill-1", command="generate"),
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
    async def test_collect_artifacts_rejects_growing_bounded_snapshot(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        class FakeFiles:
            async def exists(self, path: str) -> bool:
                return True

            async def read(self, *args: Any, **kwargs: Any) -> Any:
                raise AssertionError(
                    "The growing source must not be read through E2B SDK"
                )

        class FakeSandbox:
            files = FakeFiles()

        class FakeUploader:
            def __init__(self, config: Any, skill_id: str) -> None:
                return None

            def is_configured(self) -> bool:
                return True

            async def upload(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
                raise AssertionError("An over-limit stream must not be uploaded")

        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.ArtifactUploader", FakeUploader
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._scan_artifact_candidates",
            AsyncMock(return_value=[{"path": "growing.bin", "size": 1}]),
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox._snapshot_artifact_bytes",
            AsyncMock(side_effect=_ArtifactReadLimitExceeded),
        )

        artifacts = await E2BSandboxProvider(None)._collect_artifacts(
            FakeSandbox(),
            "/home/user/skill",
            "/home/user/skill",
            SandboxExecutionRequest(skill_id="skill-1", command="generate"),
        )

        assert artifacts == [
            {
                "file_name": "growing.bin",
                "file_size": MAX_ARTIFACT_FILE_SIZE_BYTES + 1,
                "upload_error": ARTIFACT_FILE_SIZE_LIMIT_ERROR,
            }
        ]

    @pytest.mark.asyncio
    async def test_bounded_snapshot_limits_sdk_buffer_and_is_deleted(self) -> None:
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
            sandbox, "/home/user/skill/growing.bin", max_bytes, 10
        )

        assert value == b"x" * max_bytes
        assert truncated is True
        assert len(command_calls) == 1
        assert "/home/user/skill/growing.bin" in command_calls[0][0]
        assert command_calls[0][1]["user"] == "root"
        assert len(removed) == 1
        assert removed[0][0].startswith("/root/.astron-artifact-snapshots/")
        assert removed[0][1] == "root"

    @pytest.mark.asyncio
    async def test_user_command_output_is_redirected_and_marked_when_truncated(
        self, monkeypatch: pytest.MonkeyPatch
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
            "agent.service.plugin.skill_sandbox._read_bounded_snapshot",
            bounded_reads,
        )
        result = await _run_command_with_bounded_output(
            SimpleNamespace(commands=FakeCommands(), files=FakeFiles()),
            "python generate.py",
            "/home/user/skill",
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

    def test_artifact_scan_helper_caps_massive_manifest_at_limit_plus_one(
        self, tmp_path: Any
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

    @pytest.mark.asyncio
    @pytest.mark.parametrize("standalone", [False, True])
    @pytest.mark.parametrize("modern", [False, True])
    async def test_artifact_upload_uses_authoritative_execution_identity(
        self, monkeypatch: pytest.MonkeyPatch, standalone: bool, modern: bool
    ) -> None:
        """Test numeric flow ids are not sent as workflow database ids."""
        fields: list[tuple[str, Any]] = []
        request_kwargs: dict[str, Any] = {}
        deployment_token = "agent-deployment-artifact-token-0001"

        class FakeFormData:
            def add_field(self, name: str, value: Any, **kwargs: Any) -> None:
                fields.append((name, value))

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
            "agent.service.plugin.skill_sandbox.aiohttp.FormData", FakeFormData
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )
        monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_ENV, deployment_token)
        monkeypatch.setenv(
            ARTIFACT_UPLOAD_URL_ENV,
            "http://console-hub:8080/workflow/artifacts/internal-upload",
        )
        monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, raising=False)

        uploader = ArtifactUploader(
            SkillSandboxConfig(
                artifact_upload_url="https://attacker.example/workflow/artifacts/internal-upload",
                workflow_id="" if standalone else "7460522478717390848",
                agent_id="42" if standalone else "",
                session_id="session" if standalone else "",
                uid="owner",
                artifact_uid="caller",
                console=modern,
                root_id="root" if modern else "",
                run_id="run",
                node_id="agent::one",
            ),
            "skill-1",
        )

        await uploader.upload("result.txt", b"done", "text/plain")

        field_names = [name for name, _ in fields]
        assert ("flowId" in field_names) is not standalone
        assert ("agentId" in field_names) is standalone
        assert ("sessionId" in field_names) is standalone
        assert "workflowId" not in field_names
        assert request_kwargs["headers"] == {
            "X-Skill-Sandbox-Artifact-Token": deployment_token,
        }
        assert request_kwargs["url"] == (
            "http://console-hub:8080/agents/artifacts/internal-upload"
            if standalone
            else (
                "http://console-hub:8080/workflow/artifacts/console-upload"
                if modern
                else "http://console-hub:8080/workflow/artifacts/internal-upload"
            )
        )
        assert ("uid", "caller") in fields
        assert (("rootId", "root") in fields) is (modern and not standalone)
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
    async def test_artifact_uploader_rejects_untrusted_response_shape(
        self,
        monkeypatch: pytest.MonkeyPatch,
        status: int,
        payload: Any,
    ) -> None:
        sentinel = "https://objects.example/private?X-Amz-Signature=SENSITIVE"
        reflected_payload = json.loads(
            json.dumps(payload).replace("SENSITIVE", sentinel)
        )

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
            "agent.service.plugin.skill_sandbox.aiohttp.FormData", MagicMock
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )
        monkeypatch.setenv(
            ARTIFACT_UPLOAD_URL_ENV,
            "http://console-hub:8080/workflow/artifacts/internal-upload",
        )
        monkeypatch.setenv(
            ARTIFACT_UPLOAD_TOKEN_ENV, "deployment-artifact-token-value-0001"
        )
        monkeypatch.delenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, raising=False)
        uploader = ArtifactUploader(
            SkillSandboxConfig(workflow_id="flow-1", uid="user-1"), "skill-1"
        )

        with pytest.raises(RuntimeError) as exc_info:
            await uploader.upload("result.txt", b"done", "text/plain")

        assert str(exc_info.value) == ARTIFACT_UPLOAD_FAILED_ERROR
        assert sentinel not in str(exc_info.value)
        assert exc_info.value.__cause__ is None

    def test_artifact_upload_token_prefers_environment_over_file(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Any
    ) -> None:
        token_file = tmp_path / "artifact-token"
        token_file.write_text(
            "file-artifact-upload-token-value-0001\n", encoding="utf-8"
        )
        environment_token = "environment-artifact-upload-token-0001"
        monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_ENV, environment_token)
        monkeypatch.setenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV, str(token_file))

        assert _load_artifact_upload_token() == environment_token

    def test_artifact_upload_token_falls_back_to_file(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Any
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
    def test_artifact_upload_url_rejects_invalid_deployment_values(
        self, monkeypatch: pytest.MonkeyPatch, upload_url: str | None
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
    async def test_payload_artifact_url_cannot_trigger_request_or_receive_token(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        class UnexpectedSession:
            def __init__(self, *args: Any, **kwargs: Any) -> None:
                raise AssertionError("HTTP session must not be created")

        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession",
            UnexpectedSession,
        )
        monkeypatch.delenv(ARTIFACT_UPLOAD_URL_ENV, raising=False)
        monkeypatch.setenv(
            ARTIFACT_UPLOAD_TOKEN_ENV, "deployment-token-must-not-leak-0001"
        )
        uploader = ArtifactUploader(
            SkillSandboxConfig(
                artifact_upload_url=(
                    "https://attacker.example/workflow/artifacts/internal-upload"
                ),
                workflow_id="flow-1",
                uid="user-1",
            ),
            "skill-1",
        )

        assert uploader.is_configured() is False
        with pytest.raises(
            RuntimeError, match="Artifact upload configuration is unavailable"
        ):
            await uploader.upload("result.txt", b"done", "text/plain")

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "deployment_token",
        [None, "too-short", "x" * 32 + "\r\nInjected: true"],
        ids=["missing", "short", "crlf"],
    )
    async def test_artifact_upload_rejects_missing_or_short_deployment_token(
        self,
        monkeypatch: pytest.MonkeyPatch,
        deployment_token: str | None,
    ) -> None:
        class UnexpectedSession:
            def __init__(self, *args: Any, **kwargs: Any) -> None:
                raise AssertionError("HTTP session must not be created")

        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession",
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
        uploader = ArtifactUploader(
            SkillSandboxConfig(
                workflow_id="flow-1",
                uid="user-1",
            ),
            "skill-1",
        )

        with pytest.raises(
            RuntimeError, match="Artifact upload credential is missing or invalid"
        ):
            await uploader.upload("result.txt", b"done", "text/plain")
