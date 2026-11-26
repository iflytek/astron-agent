import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from deepagents.backends import CompositeBackend, FilesystemBackend
from deepagents.middleware.filesystem import supports_execution
from e2b import CommandExitException

from agent.engine import e2b_sandbox
from agent.engine.skill_files import agent_backend
from agent.service.plugin import skill_sandbox as sandbox_provider
from agent.service.sandbox import AgentSandboxConfig


@pytest.fixture
def remote_sandbox(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    remote = SimpleNamespace(
        files=SimpleNamespace(
            write_files=AsyncMock(),
            make_dir=AsyncMock(),
            exists=AsyncMock(return_value=True),
            remove=AsyncMock(),
        ),
        kill=AsyncMock(),
    )
    remote.create = AsyncMock(return_value=remote)
    monkeypatch.setattr(e2b_sandbox.AsyncSandbox, "create", remote.create)
    monkeypatch.setattr(
        e2b_sandbox,
        "_fetch_e2b_runtime_config",
        AsyncMock(return_value=("key", 60, False)),
    )
    return remote


def make_backend() -> e2b_sandbox.E2BAgentSandbox:
    return e2b_sandbox.E2BAgentSandbox(
        {"/skills/reports/SKILL.md": b"Reports"},
        {"reports": "34", "tables": "36"},
        AgentSandboxConfig(enabled=True),
    )


@pytest.mark.asyncio
async def test_e2b_shell_runs_without_skill_mounts_or_artifact_upload(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    run = AsyncMock(return_value=(0, "ready", ""))
    collect = AsyncMock()
    monkeypatch.setattr(e2b_sandbox, "_run_command_with_bounded_output", run)
    monkeypatch.setattr(
        sandbox_provider.E2BSandboxProvider, "_collect_artifacts", collect
    )
    backend = e2b_sandbox.E2BAgentSandbox({}, {}, AgentSandboxConfig(enabled=True))

    result = await backend.aexecute("printf ready")
    await backend.aclose()

    assert result.output == "ready" and result.exit_code == 0
    run.assert_awaited_once()
    remote_sandbox.files.write_files.assert_not_awaited()
    collect.assert_not_awaited()
    remote_sandbox.kill.assert_awaited_once()


@pytest.mark.asyncio
async def test_e2b_file_tools_and_commands_share_one_workspace(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    remote_sandbox.files.write = AsyncMock()
    run = AsyncMock(return_value=(0, "", ""))
    monkeypatch.setattr(e2b_sandbox, "_run_command_with_bounded_output", run)

    async with agent_backend([], AgentSandboxConfig(enabled=True)) as backend:
        write = await backend.awrite("/output/report.md", "body")
        assert write.error is None
        remote_sandbox.files.write.assert_awaited_once_with(
            "/home/user/workspace/output/report.md", b"body", user="user"
        )
        assert (await backend.aexecute("pwd")).exit_code == 0
        assert run.await_args is not None
        assert run.await_args.args[2] == "/home/user/workspace"

    remote_sandbox.kill.assert_awaited_once()


@pytest.mark.asyncio
async def test_sandbox_file_helpers_keep_large_json_responses_intact(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    filename = "/home/user/workspace/report.txt"
    content = "文" * 150_000 + "\u0001" * 30000
    response = json.dumps(
        {
            "content": content,
            "encoding": "utf-8",
            "total_lines": 1,
            "start_line": 1,
            "end_line": 1,
        }
    )
    assert len(response) > sandbox_provider.MAX_SANDBOX_COMMAND_OUTPUT_BYTES

    async def capture(
        sandbox: object, command: str, cwd: str, timeout: int, *, stdout_limit: int
    ) -> tuple[int, str, str]:
        return 0, response[:stdout_limit], ""

    run = AsyncMock(side_effect=capture)
    monkeypatch.setattr(e2b_sandbox, "_run_command_with_bounded_output", run)

    backend = e2b_sandbox.E2BAgentSandbox({}, {}, AgentSandboxConfig(enabled=True))
    result = await backend.file_backend.aread(filename)
    await backend.aexecute("printf ready")
    await backend.aclose()
    helper, user = run.await_args_list
    assert result.file_data and result.file_data["content"] == content
    assert helper.kwargs["stdout_limit"] >= len(response)
    assert (
        user.kwargs["stdout_limit"] == sandbox_provider.MAX_SANDBOX_COMMAND_OUTPUT_BYTES
    )


@pytest.mark.asyncio
async def test_sandbox_grep_rejects_incomplete_transport_records(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    output = "/one.txt\0" + "1:match\n/two.txt\0" + "1:part"
    run = AsyncMock(
        return_value=(0, output + sandbox_provider.SANDBOX_OUTPUT_TRUNCATED_MARKER, "")
    )
    monkeypatch.setattr(e2b_sandbox, "_run_command_with_bounded_output", run)
    backend = e2b_sandbox.E2BAgentSandbox({}, {}, AgentSandboxConfig(enabled=True))
    result = await backend.file_backend.agrep("match", "/")
    await backend.aclose()
    assert result.error and "exceeded the limit" in result.error
    assert result.matches is None


@pytest.mark.asyncio
async def test_native_shell_mounts_once_limits_timeout_and_returns_artifact_links(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    run = AsyncMock(side_effect=[(7, "output", "error"), (0, "again", "")])
    collect = AsyncMock(side_effect=[[{"download_url": "/files/artifact"}], []])
    monkeypatch.setattr(e2b_sandbox, "_run_command_with_bounded_output", run)
    monkeypatch.setattr(
        sandbox_provider.E2BSandboxProvider, "_collect_artifacts", collect
    )
    backend = make_backend()
    composite = CompositeBackend(backend, {"/skills/": FilesystemBackend()})
    assert supports_execution(composite)
    remote_sandbox.create.assert_not_awaited()

    first = await composite.aexecute("echo output", timeout=120)
    second = await composite.aexecute("echo again", timeout=15)
    await backend.aclose()
    await backend.aclose()

    assert first.exit_code == 7
    assert "/files/artifact" in first.output
    assert "output\nerror" in first.output
    assert second.output == "again"
    assert [call.args[-1] for call in run.await_args_list] == [60, 15]
    assert all(
        call.args[2] == e2b_sandbox.SANDBOX_WORKSPACE for call in run.await_args_list
    )
    assert run.await_args_list[0].args[1] == "/bin/bash -c 'echo output'"
    assert collect.await_args_list[0].args[2] == e2b_sandbox.SANDBOX_OUTPUT_DIRECTORY
    assert (
        collect.await_args_list[0].kwargs["budget"]
        is collect.await_args_list[1].kwargs["budget"]
    )
    remote_sandbox.create.assert_awaited_once_with(
        api_key="key",
        timeout=sandbox_provider.MAX_SANDBOX_TIMEOUT_SECONDS,
        allow_internet_access=False,
    )
    remote_sandbox.files.write_files.assert_awaited_once_with(
        [{"path": "/skills/reports/SKILL.md", "data": b"Reports"}], user="root"
    )
    remote_sandbox.files.make_dir.assert_awaited_once_with(
        e2b_sandbox.SANDBOX_OUTPUT_DIRECTORY, user="user"
    )
    remote_sandbox.kill.assert_awaited_once()


@pytest.mark.asyncio
async def test_sandbox_cancelled_during_initial_upload_can_be_released(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    started = asyncio.Event()

    async def block_upload(*args: object, **kwargs: object) -> None:
        started.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(remote_sandbox.files, "write_files", block_upload)
    backend = make_backend()
    task = asyncio.create_task(backend.aexecute("echo output"))
    await started.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    await backend.aclose()

    remote_sandbox.kill.assert_awaited_once()


@pytest.mark.asyncio
async def test_e2b_nonzero_exit_keeps_bounded_streams(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    remote_sandbox.commands = SimpleNamespace(
        run=AsyncMock(
            side_effect=CommandExitException(
                stderr="sdk", stdout="", exit_code=4, error=None
            )
        )
    )
    snapshot = AsyncMock(
        side_effect=[(b"bounded stdout", False), (b"bounded stderr", True)]
    )
    monkeypatch.setattr(sandbox_provider, "_read_bounded_snapshot", snapshot)

    result = await sandbox_provider._run_command_with_bounded_output(
        remote_sandbox, "false", "/", 30
    )

    assert result == (
        4,
        "bounded stdout",
        "bounded stderr" + sandbox_provider.SANDBOX_OUTPUT_TRUNCATED_MARKER,
    )
    assert remote_sandbox.files.remove.await_count == 2


@pytest.mark.asyncio
async def test_artifact_budget_attributes_output_to_selected_skill(
    remote_sandbox: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    budget = sandbox_provider.ArtifactBudget({"reports": "34", "tables": "36"})
    scanner = AsyncMock(
        side_effect=[
            [{"path": "tables/results.csv", "size": 3, "version": [3, 123, 456]}],
            [],
        ]
    )
    upload = AsyncMock(return_value={"downloadUrl": "/files/csv"})
    uploader = SimpleNamespace(is_configured=lambda: True, upload=upload)
    uploader_factory = Mock(return_value=uploader)
    monkeypatch.setattr(sandbox_provider, "_scan_artifact_candidates", scanner)
    monkeypatch.setattr(
        sandbox_provider, "_snapshot_artifact_bytes", AsyncMock(return_value=b"a,b")
    )
    monkeypatch.setattr(sandbox_provider, "ArtifactUploader", uploader_factory)
    config = sandbox_provider.SkillSandboxConfig(enabled=True)
    provider = sandbox_provider.E2BSandboxProvider(config)
    request = sandbox_provider.SandboxExecutionRequest(skill_id="34", command="echo")

    artifacts = await provider._collect_artifacts(
        remote_sandbox, "/work", "/work/output", request, budget=budget
    )
    repeated = await provider._collect_artifacts(
        remote_sandbox, "/work", "/work/output", request, budget=budget
    )

    assert artifacts[0]["downloadUrl"] == "/files/csv"
    assert repeated == []
    assert budget.versions == {"tables/results.csv": [3, 123, 456]}
    assert budget.uploaded_count == 1
    assert budget.uploaded_bytes == 3
    uploader_factory.assert_called_once_with(config, "36")
    upload.assert_awaited_once_with(
        file_name="results.csv", file_bytes=b"a,b", content_type="text/csv"
    )
