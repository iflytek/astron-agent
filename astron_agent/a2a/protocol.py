"""A2A Protocol data models."""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AgentCapability(str, Enum):
    """Capabilities of an agent."""
    TASK = "task"
    CHAT = "chat"
    RAG = "rag"
    TOOL = "tool"
    CUSTOM = "custom"


class AgentCard(BaseModel):
    """Agent identification and capabilities."""
    agent_id: str
    name: str
    description: Optional[str] = None
    version: str = "1.0.0"
    capabilities: List[AgentCapability] = Field(default_factory=list)
    endpoints: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    AGENT = "agent"


class A2AMessage(BaseModel):
    """A single message in an A2A conversation."""
    role: MessageRole
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class A2ARequest(BaseModel):
    """Request from one agent to another."""
    request_id: str
    source_agent: AgentCard
    target_agent_id: str
    conversation_id: Optional[str] = None
    messages: List[A2AMessage]
    tools: Optional[List[str]] = None
    max_tokens: Optional[int] = 4096
    temperature: Optional[float] = 0.7
    metadata: Dict[str, Any] = Field(default_factory=dict)


class A2AResponse(BaseModel):
    """Response from target agent."""
    request_id: str
    source_agent: AgentCard
    messages: List[A2AMessage]
    finished: bool = False
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class A2AError(BaseModel):
    """Error response."""
    error: str
    error_description: Optional[str] = None
    request_id: Optional[str] = None
