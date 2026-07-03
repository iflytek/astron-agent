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
