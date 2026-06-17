"""HTTP endpoint that runs a single skill command in the E2B sandbox.

Reuses the audited ``E2BSandboxProvider`` so the Java standalone-agent runtime
(which has no E2B SDK) can execute ``run_skill`` via one internal HTTP call.
v1 returns only exit_code/stdout/stderr; artifact collection/upload is skipped.
"""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from agent.service.plugin.skill import SkillResource
from agent.service.plugin.skill_sandbox import (
    SCRIPT_SANDBOX_UNCONFIGURED_MESSAGE,
    E2BSandboxProvider,
    SandboxExecutionRequest,
    SkillSandboxConfig,
)

skill_sandbox_router = APIRouter()


class SandboxExecBody(BaseModel):
    skill_id: str
    command: str
    stdin: Any = None
    resources: list[dict[str, Any]] = Field(default_factory=list)
    sandbox: dict[str, Any] = Field(default_factory=dict)


class SandboxExecResponse(BaseModel):
    configured: bool
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    message: str = ""


def _build_config(raw: dict[str, Any]) -> SkillSandboxConfig:
    return SkillSandboxConfig(
        provider=str(raw.get("provider") or "e2b").strip().lower(),
        enabled=bool(raw.get("enabled")),
        api_key=str(raw.get("api_key") or raw.get("apiKey") or ""),
        timeout_seconds=int(
            raw.get("timeout_seconds") or raw.get("timeoutSeconds") or 60
        ),
        allow_internet_access=bool(
            raw.get("allow_internet_access") or raw.get("allowInternetAccess")
        ),
    )


@skill_sandbox_router.post(  # type: ignore[misc]
    "/skill/sandbox-exec",
    description="Execute a single skill command in the E2B sandbox (no artifact handling).",
    response_model=SandboxExecResponse,
)
async def sandbox_exec(body: SandboxExecBody) -> SandboxExecResponse:
    config = _build_config(body.sandbox)
    configured = config.enabled and config.provider == "e2b" and bool(config.api_key)
    if not configured:
        return SandboxExecResponse(
            configured=False, message=SCRIPT_SANDBOX_UNCONFIGURED_MESSAGE
        )
    if not body.command.strip():
        return SandboxExecResponse(
            configured=True, exit_code=1, stderr="command_required"
        )

    resources = [
        SkillResource(
            path=str(r.get("path") or ""),
            name=str(r.get("name") or ""),
            download_url=str(r.get("download_url") or r.get("downloadUrl") or ""),
            file_ext=str(r.get("file_ext") or r.get("fileExt") or ""),
            file_size=int(r.get("file_size") or r.get("fileSize") or 0),
        )
        for r in body.resources
    ]
    request = SandboxExecutionRequest(
        skill_id=body.skill_id,
        command=body.command,
        stdin=body.stdin,
        resources=resources,
    )
    result = await E2BSandboxProvider(config).execute(request)
    return SandboxExecResponse(
        configured=True,
        exit_code=int(result.get("exit_code") or 0),
        stdout=str(result.get("stdout") or ""),
        stderr=str(result.get("stderr") or ""),
    )
