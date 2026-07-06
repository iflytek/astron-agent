from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from enum import Enum

class A2AAction(Enum):
    DISCOVER = "discover"
    CAPABILITIES = "capabilities"
    TASK = "task"
    RESULT = "result"
    ERROR = "error"

@dataclass
class A2AMessage:
    action: A2AAction
    payload: Dict[str, Any] = field(default_factory=dict)
    sender: Optional[str] = None
    target: Optional[str] = None
    message_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action.value,
            "payload": self.payload,
            "sender": self.sender,
            "target": self.target,
            "message_id": self.message_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "A2AMessage":
        return cls(
            action=A2AAction(data["action"]),
            payload=data.get("payload", {}),
            sender=data.get("sender"),
            target=data.get("target"),
            message_id=data.get("message_id"),
        )

class A2AProtocol:
    """Base protocol handler for A2A communication."""

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.capabilities: Dict[str, Any] = {}

    async def handle_message(self, message: A2AMessage) -> A2AMessage:
        if message.action == A2AAction.DISCOVER:
            return self._handle_discover(message)
        elif message.action == A2AAction.CAPABILITIES:
            return self._handle_capabilities(message)
        elif message.action == A2AAction.TASK:
            return await self._handle_task(message)
        else:
            return A2AMessage(
                action=A2AAction.ERROR,
                payload={"error": f"Unsupported action: {message.action}"},
                sender=self.agent_id,
                target=message.sender,
            )

    def _handle_discover(self, message: A2AMessage) -> A2AMessage:
        return A2AMessage(
            action=A2AAction.DISCOVER,
            payload={"agent_id": self.agent_id},
            sender=self.agent_id,
            target=message.sender,
        )

    def _handle_capabilities(self, message: A2AMessage) -> A2AMessage:
        return A2AMessage(
            action=A2AAction.CAPABILITIES,
            payload=self.capabilities,
            sender=self.agent_id,
            target=message.sender,
        )

    async def _handle_task(self, message: A2AMessage) -> A2AMessage:
        raise NotImplementedError("Subclasses must implement task handling")
