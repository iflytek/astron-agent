"""A2A protocol schemas used by the core agent adapter."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class A2ABaseModel(BaseModel):
    """Base model that accepts Python names and emits A2A camelCase names."""

    model_config = ConfigDict(populate_by_name=True)


class A2APart(A2ABaseModel):
    """A single A2A message or artifact part."""

    text: Optional[str] = None
    raw: Optional[str] = None
    url: Optional[str] = None
    data: Any = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    filename: str = ""
    media_type: str = Field(default="text/plain", alias="mediaType")


A2ARole = Literal["ROLE_USER", "ROLE_AGENT", "user", "agent"]


class A2AMessage(A2ABaseModel):
    """A2A message object."""

    message_id: str = Field(alias="messageId")
    context_id: str = Field(default="", alias="contextId")
    task_id: str = Field(default="", alias="taskId")
    role: A2ARole
    parts: list[A2APart]
    metadata: dict[str, Any] = Field(default_factory=dict)
    extensions: list[str] = Field(default_factory=list)
    reference_task_ids: list[str] = Field(
        default_factory=list, alias="referenceTaskIds"
    )


class A2ASendMessageConfiguration(A2ABaseModel):
    """Supported subset of A2A SendMessageConfiguration."""

    accepted_output_modes: list[str] = Field(
        default_factory=list, alias="acceptedOutputModes"
    )
    history_length: Optional[int] = Field(default=None, alias="historyLength")
    return_immediately: bool = Field(default=False, alias="returnImmediately")


class A2ASendMessageRequest(A2ABaseModel):
    """A2A SendMessage request."""

    tenant: str = ""
    message: A2AMessage
    configuration: A2ASendMessageConfiguration = Field(
        default_factory=A2ASendMessageConfiguration
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class A2AAgentInterface(A2ABaseModel):
    """A declared A2A transport interface."""

    url: str
    protocol_binding: str = Field(alias="protocolBinding")
    tenant: str = ""
    protocol_version: str = Field(alias="protocolVersion")


class A2AAgentProvider(A2ABaseModel):
    """A2A AgentCard provider."""

    url: str
    organization: str


class A2AAgentCapabilities(A2ABaseModel):
    """A2A AgentCard capability declaration."""

    streaming: bool = False
    push_notifications: bool = Field(default=False, alias="pushNotifications")
    extended_agent_card: bool = Field(default=False, alias="extendedAgentCard")


class A2AAuthentication(A2ABaseModel):
    """Legacy A2A AgentCard authentication declaration."""

    schemes: list[str] = Field(default_factory=list)
    credentials: str = ""


class A2AStringList(A2ABaseModel):
    """A2A list wrapper used by security requirements."""

    values: list[str] = Field(default_factory=list, alias="list")


class A2ASecurityRequirement(A2ABaseModel):
    """A2A security requirement declaration."""

    schemes: dict[str, A2AStringList]


class A2AAPIKeySecurityScheme(A2ABaseModel):
    """A2A API key security scheme."""

    description: str = ""
    location: Literal["query", "header", "cookie"]
    name: str


class A2ASecurityScheme(A2ABaseModel):
    """A2A security scheme union."""

    api_key_security_scheme: A2AAPIKeySecurityScheme = Field(
        alias="apiKeySecurityScheme"
    )


class A2AAgentSkill(A2ABaseModel):
    """A2A AgentCard skill declaration."""

    id: str
    name: str
    description: str
    tags: list[str]
    examples: list[str] = Field(default_factory=list)
    input_modes: list[str] = Field(default_factory=list, alias="inputModes")
    output_modes: list[str] = Field(default_factory=list, alias="outputModes")


class A2AAgentCard(A2ABaseModel):
    """A2A discovery card."""

    protocol_version: str = Field(default="0.3.0", alias="protocolVersion")
    name: str
    description: str
    url: str = ""
    preferred_transport: str = Field(default="HTTP+JSON", alias="preferredTransport")
    supported_interfaces: list[A2AAgentInterface] = Field(alias="supportedInterfaces")
    provider: A2AAgentProvider
    version: str
    capabilities: A2AAgentCapabilities
    authentication: A2AAuthentication = Field(default_factory=A2AAuthentication)
    security_schemes: dict[str, A2ASecurityScheme] = Field(
        default_factory=dict, alias="securitySchemes"
    )
    security_requirements: list[A2ASecurityRequirement] = Field(
        default_factory=list, alias="securityRequirements"
    )
    default_input_modes: list[str] = Field(alias="defaultInputModes")
    default_output_modes: list[str] = Field(alias="defaultOutputModes")
    skills: list[A2AAgentSkill]


class A2ATaskStatus(A2ABaseModel):
    """A2A task status."""

    state: Literal[
        "TASK_STATE_SUBMITTED",
        "TASK_STATE_WORKING",
        "TASK_STATE_COMPLETED",
        "TASK_STATE_FAILED",
        "TASK_STATE_CANCELED",
        "TASK_STATE_INPUT_REQUIRED",
        "TASK_STATE_REJECTED",
        "TASK_STATE_AUTH_REQUIRED",
    ]
    message: Optional[A2AMessage] = None
    timestamp: Optional[str] = None


class A2AArtifact(A2ABaseModel):
    """A2A task artifact."""

    artifact_id: str = Field(alias="artifactId")
    name: str = ""
    description: str = ""
    parts: list[A2APart]
    metadata: dict[str, Any] = Field(default_factory=dict)


class A2ATask(A2ABaseModel):
    """A2A task response."""

    id: str
    context_id: str = Field(alias="contextId")
    status: A2ATaskStatus
    artifacts: list[A2AArtifact] = Field(default_factory=list)
    history: list[A2AMessage] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class A2ASendMessageResponse(A2ABaseModel):
    """A2A SendMessage response payload."""

    task: Optional[A2ATask] = None
    message: Optional[A2AMessage] = None


class A2ATaskSendParams(A2ABaseModel):
    """A2A task send request used by task-oriented HTTP clients."""

    id: str = ""
    tenant: str = ""
    session_id: str = Field(default="", alias="sessionId")
    context_id: str = Field(default="", alias="contextId")
    message: A2AMessage
    configuration: A2ASendMessageConfiguration = Field(
        default_factory=A2ASendMessageConfiguration
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class A2ATaskStatusUpdateEvent(A2ABaseModel):
    """A2A task status update event."""

    task_id: str = Field(alias="taskId")
    context_id: str = Field(alias="contextId")
    kind: Literal["status-update"] = "status-update"
    status: A2ATaskStatus
    final: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class A2ATaskArtifactUpdateEvent(A2ABaseModel):
    """A2A task artifact update event."""

    task_id: str = Field(alias="taskId")
    context_id: str = Field(alias="contextId")
    kind: Literal["artifact-update"] = "artifact-update"
    artifact: A2AArtifact
    append: bool = False
    last_chunk: bool = Field(default=True, alias="lastChunk")
    metadata: dict[str, Any] = Field(default_factory=dict)


class A2ATaskEvents(A2ABaseModel):
    """Recorded task runtime events."""

    events: list[A2ATaskStatusUpdateEvent | A2ATaskArtifactUpdateEvent] = Field(
        default_factory=list
    )
