"""
Minimal Agent2Agent protocol entities.

These models cover the public agent card and the synchronous text message
adapter used by the workflow service.
"""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class A2ACapability(BaseModel):
    """Describes an A2A capability exposed by this service."""

    name: str
    description: str


class A2AAgentCard(BaseModel):
    """Public A2A discovery metadata."""

    name: str
    description: str
    version: str
    url: str
    protocol_version: str = Field("0.3.0", alias="protocolVersion")
    capabilities: List[A2ACapability]
    default_input_modes: List[str] = Field(
        default_factory=lambda: ["text/plain"], alias="defaultInputModes"
    )
    default_output_modes: List[str] = Field(
        default_factory=lambda: ["text/plain", "text/event-stream"],
        alias="defaultOutputModes",
    )


class A2ATextPart(BaseModel):
    """A text part in an A2A message."""

    kind: str = "text"
    text: str


class A2AMessage(BaseModel):
    """Subset of the A2A message shape needed for text chat."""

    role: str = "user"
    parts: List[A2ATextPart]
    message_id: str = Field("", alias="messageId")


class A2ASendMessageRequest(BaseModel):
    """Synchronous A2A message request mapped to workflow chat."""

    message: A2AMessage
    flow_id: str = Field(..., alias="flowId")
    uid: str = ""
    chat_id: str = Field("", alias="chatId")
    stream: bool = True
    parameters: Dict[str, Any] = Field(default_factory=dict)
    ext: Dict[str, Any] = Field(default_factory=dict)
    version: str = ""

    def text(self) -> str:
        """Return the concatenated text payload from all text parts."""
        return "\n".join(part.text for part in self.message.parts if part.text)
