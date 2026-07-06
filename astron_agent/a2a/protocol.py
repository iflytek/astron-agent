from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum


class A2AMessageType(str, Enum):
    REQUEST = "request"
    RESPONSE = "response"
    ERROR = "error"


@dataclass
class A2AMessage:
    """Base A2A message."""
    type: A2AMessageType
    source_agent_id: str
    target_agent_id: str
    message_id: str
    payload: Any = None

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "source_agent_id": self.source_agent_id,
            "target_agent_id": self.target_agent_id,
            "message_id": self.message_id,
            "payload": self.payload,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "A2AMessage":
        return cls(
            type=A2AMessageType(data["type"]),
            source_agent_id=data["source_agent_id"],
            target_agent_id=data["target_agent_id"],
            message_id=data["message_id"],
            payload=data.get("payload"),
        )


@dataclass
class A2ARequest:
    """A request message for task execution."""
    task_type: str
    parameters: dict
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "task_type": self.task_type,
            "parameters": self.parameters,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "A2ARequest":
        return cls(
            task_type=data["task_type"],
            parameters=data["parameters"],
            metadata=data.get("metadata", {}),
        )


@dataclass
class A2AResponse:
    """A response message with results or status."""
    success: bool
    result: Any = None
    error: Optional["A2AError"] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "result": self.result,
            "error": self.error.to_dict() if self.error else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "A2AResponse":
        error = A2AError.from_dict(data["error"]) if data.get("error") else None
        return cls(
            success=data["success"],
            result=data.get("result"),
            error=error,
        )


@dataclass
class A2AError:
    """Error details for failed requests."""
    code: str
    message: str
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "A2AError":
        return cls(
            code=data["code"],
            message=data["message"],
            details=data.get("details", {}),
        )