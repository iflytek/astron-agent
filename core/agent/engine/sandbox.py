"""Select a Deep Agents sandbox backend for the current run."""

from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, aclosing, asynccontextmanager

from deepagents.backends import StateBackend
from deepagents.backends.protocol import BackendProtocol, SandboxBackendProtocol
from loguru import logger

from agent.engine.e2b_sandbox import E2BAgentSandbox
from agent.service.sandbox import AgentSandboxConfig

SandboxFactory = Callable[
    [dict[str, bytes], dict[str, str], AgentSandboxConfig],
    AbstractAsyncContextManager[SandboxBackendProtocol],
]


def _open_e2b(
    files: dict[str, bytes],
    artifact_owners: dict[str, str],
    config: AgentSandboxConfig,
) -> AbstractAsyncContextManager[SandboxBackendProtocol]:
    return aclosing(E2BAgentSandbox(files, artifact_owners, config))


SANDBOX_PROVIDERS: dict[str, SandboxFactory] = {"e2b": _open_e2b}


@asynccontextmanager
async def sandbox_backend(
    config: AgentSandboxConfig | None,
    files: dict[str, bytes],
    artifact_owners: dict[str, str],
) -> AsyncIterator[BackendProtocol]:
    if not config or not config.enabled:
        yield StateBackend()
        return

    factory = SANDBOX_PROVIDERS.get(config.provider)
    if factory is None:
        raise ValueError("Unsupported Agent sandbox provider")
    logger.info("Agent sandbox provider={}", config.provider)
    async with factory(files, artifact_owners, config) as backend:
        yield backend
