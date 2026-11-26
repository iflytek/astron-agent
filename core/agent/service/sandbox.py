"""Authorized runtime context shared by Agent sandbox providers."""

from pydantic import BaseModel


class SandboxExecutionContext(BaseModel):
    enabled: bool = False
    console: bool = False
    root_id: str = ""
    artifact_uid: str = ""
    agent_id: str = ""
    session_id: str = ""
    workflow_id: str = ""
    run_id: str = ""
    node_id: str = ""
    uid: str = ""
    space_id: str = ""


class AgentSandboxConfig(SandboxExecutionContext):
    provider: str = "e2b"
