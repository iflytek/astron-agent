from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from enum import Enum


class A2AAction(str, Enum):
    DISCOVER = "discover"
    INVOKE = "invoke"
    RESULT = "result"
    ERROR = "error"


@dataclass
class AgentCapability:
    name: str
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


@dataclass
class AgentCard:
    agent_id: str
    name: str
    description: Optional[str] = None
    version: str = "1.0.0"
    capabilities: List[AgentCapability] = field(default_factory=list)
    endpoint: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "AgentCard":
        caps = [AgentCapability(**c) for c in data.get("capabilities", [])]
        return AgentCard(
            agent_id=data["agent_id"],
            name=data["name"],
            description=data.get("description"),
            version=data.get("version", "1.0.0"),
            capabilities=caps,
            endpoint=data.get("endpoint"),
            metadata=data.get("metadata", {}),
        )


@dataclass
class A2AMessage:
    action: A2AAction
    agent_id: Optional[str] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    message_id: Optional[str] = None
    source: Optional[str] = None
    target: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action.value,
            "agent_id": self.agent_id,
            "payload": self.payload,
            "message_id": self.message_id,
            "source": self.source,
            "target": self.target,
            "metadata": self.metadata,
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "A2AMessage":
        return A2AMessage(
            action=A2AAction(data["action"]),
            agent_id=data.get("agent_id"),
            payload=data.get("payload", {}),
            message_id=data.get("message_id"),
            source=data.get("source"),
            target=data.get("target"),
            metadata=data.get("metadata", {}),
        )
