"""Test SkillPlugin and SkillPluginFactory"""

from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.service.plugin.skill import SkillPlugin, SkillPluginFactory
from agent.service.plugin.skill_sandbox import (
    ArtifactUploader,
    E2BSandboxProvider,
    SandboxExecutionRequest,
    SkillSandboxConfig,
)


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    """Automatically inject environment fixes for all tests."""
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


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
                    "download_url": "https://example.com/skill.md",
                    "resources": [
                        {
                            "path": "references/beijing.md",
                            "name": "beijing.md",
                            "download_url": "https://example.com/references/beijing.md",
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

    def test_gen_skips_invalid_skills(self) -> None:
        """Test skipping invalid skill definitions"""
        factory = SkillPluginFactory(
            skills=[
                {
                    "skill_id": "skill-1",
                    "name": "missing-download-url",
                },
                {
                    "name": "missing-id",
                    "download_url": "https://example.com/skill.md",
                },
            ]
        )

        assert factory.gen() == []

    @pytest.mark.asyncio
    async def test_runner_reads_skill_content(
        self, factory: SkillPluginFactory
    ) -> None:
        """Test downloading full skill content on demand"""
        plugin = factory.gen()[0]
        span = Span(app_id="test_app", uid="test_uid")

        def mock_get(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            mock_resp = AsyncMock()
            mock_resp.raise_for_status = MagicMock()
            mock_resp.text = AsyncMock(return_value="# Skill\n\nFull content")
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

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

        def mock_get(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            mock_resp = AsyncMock()
            mock_resp.raise_for_status = MagicMock()
            url = str(args[1]) if len(args) > 1 else ""
            mock_resp.text = AsyncMock(
                return_value=(
                    "北京参考内容" if "beijing.md" in url else "# Skill\n\nFull content"
                )
            )
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

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
                    "download_url": "https://example.com/skill.md",
                    "sandbox": {
                        "provider": "e2b",
                        "enabled": True,
                        "api_key": "test-key",
                        "timeout_seconds": 12,
                        "allow_internet_access": False,
                    },
                    "resources": [
                        {
                            "path": "scripts/clean.py",
                            "download_url": "https://example.com/scripts/clean.py",
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
                assert self.config.api_key == "test-key"
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
    async def test_collect_artifacts_scans_workspace_root_and_skips_resources(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test collecting generated files from the workspace root."""

        class FakeFiles:
            async def exists(self, path: str) -> bool:
                assert path == "/home/user/skill"
                return True

            async def read(self, path: str, format: str) -> bytes:
                assert path == "/home/user/skill/e2b_skill_test_output.txt"
                assert format == "bytes"
                return b"done"

        class FakeCommands:
            async def run(self, command: str, cwd: str, timeout: int) -> Any:
                assert command == "find . -maxdepth 5 -type f -printf '%P\\t%s\\n'"
                assert cwd == "/home/user/skill"
                assert timeout == 60
                return type(
                    "Result",
                    (),
                    {
                        "exit_code": 0,
                        "stdout": (
                            "scripts/test_script.py\t4\n"
                            "e2b_skill_test_output.txt\t4\n"
                            ".astron_stdin.json\t4\n"
                        ),
                        "stderr": "",
                    },
                )()

        class FakeSandbox:
            files = FakeFiles()
            commands = FakeCommands()

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
    async def test_artifact_upload_uses_flow_id_without_workflow_id_param(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test numeric flow ids are not sent as workflow database ids."""
        fields: list[tuple[str, Any]] = []

        class FakeFormData:
            def add_field(self, name: str, value: Any, **kwargs: Any) -> None:
                fields.append((name, value))

        class FakeResponse:
            async def __aenter__(self) -> "FakeResponse":
                return self

            async def __aexit__(self, *args: Any) -> None:
                return None

            def raise_for_status(self) -> None:
                return None

            async def json(self, content_type: Any = None) -> dict[str, Any]:
                return {"data": {"id": 1}}

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
            "agent.service.plugin.skill_sandbox.aiohttp.FormData", FakeFormData
        )
        monkeypatch.setattr(
            "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", FakeSession
        )

        uploader = ArtifactUploader(
            SkillSandboxConfig(
                artifact_upload_url="http://console-hub:8080/workflow/artifacts/internal-upload",
                workflow_id="7460522478717390848",
                uid="user-1",
            ),
            "skill-1",
        )

        await uploader.upload("result.txt", b"done", "text/plain")

        field_names = [name for name, _ in fields]
        assert "flowId" in field_names
        assert "workflowId" not in field_names
