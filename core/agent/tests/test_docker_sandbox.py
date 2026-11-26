from unittest.mock import AsyncMock

import pytest

from agent.engine import docker_sandbox
from agent.engine.skill_files import agent_backend
from agent.service.sandbox import AgentSandboxConfig


@pytest.mark.asyncio
@pytest.mark.parametrize("workflow_id", ["", "flow-7"])
async def test_docker_agent_uses_authorized_agent_directory(
    monkeypatch: pytest.MonkeyPatch, workflow_id: str
) -> None:
    policy = AsyncMock(
        return_value={
            "provider": "docker",
            "sandboxScope": "space-5",
            "sandboxResourceId": "42",
            "sandboxDirectory": "/workspace/agents/space-5/42",
            "timeoutSeconds": 60,
            "allowInternetAccess": False,
        }
    )
    request = AsyncMock(
        return_value={"stdout": "ok", "stderr": "", "exitCode": 0, "truncated": False}
    )
    monkeypatch.setattr(docker_sandbox, "_fetch_runtime_policy", policy)
    monkeypatch.setattr(
        docker_sandbox, "_load_runtime_credential_token", lambda: "x" * 32
    )
    monkeypatch.setattr(docker_sandbox.LocalSandbox, "request", request)
    config = AgentSandboxConfig(
        enabled=True,
        console=True,
        agent_id="42",
        workflow_id=workflow_id,
        provider="docker",
    )
    sandbox = docker_sandbox.DockerAgentSandbox({}, {}, config)

    result = await sandbox.aexecute("echo ok", timeout=100)

    assert result.output == "ok"
    policy.assert_awaited_once_with(config, docker=True)
    assert request.await_args is not None
    assert request.await_args.kwargs["timeout"] == 60
    runtime = await sandbox.runtime()
    assert runtime.kind == "agent"
    assert runtime.policy.resource_id == "42"

    async with agent_backend([], config, ("existing", "virtual")) as backend:
        assert (await backend.awrite("/skills/report.txt", "body")).error
        for tool_path in (
            "/sandbox/output/report.md",
            "/workspace/agents/space-5/42/output/report.md",
            "/output/report.md",
        ):
            write = await backend.awrite(tool_path, "report")
            assert not write.error
            assert request.await_args is not None
            assert request.await_args.kwargs["files"] == [
                docker_sandbox.sandbox_file("output/report.md", b"report")
            ]
        result = await backend.aexecute("pwd")
        assert result.output == "ok"
