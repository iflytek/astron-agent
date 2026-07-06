"""A2A (Agent-to-Agent) Protocol implementation for astron-agent."""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from enum import Enum


class A2AMessageType(str, Enum):
    """Supported A2A message types."""
    TASK_REQUEST = "task_request"
    TASK_RESPONSE = "task_response"
    STATUS_UPDATE = "status_update"
    ERROR = "error"


@dataclass
class A2AMessage:
    """Base A2A message structure."""
    type: A2AMessageType
    sender_id: str
    receiver_id: str
    payload: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    message_id: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "payload": self.payload,
            "metadata": self.metadata,
            "message_id": self.message_id
        }

    @classmethod
    def from_dict(cls, data: dict) -> "A2AMessage":
        return cls(
            type=A2AMessageType(data["type"]),
            sender_id=data["sender_id"],
            receiver_id=data["receiver_id"],
            payload=data.get("payload", {}),
            metadata=data.get("metadata", {}),
            message_id=data.get("message_id")
        )


class A2AProtocolHandler:
    """Handles A2A communication for an agent."""

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self._registry: Dict[str, callable] = {}

    def register_message_handler(self, msg_type: A2AMessageType, handler: callable):
        """Register a handler for a specific message type."""
        self._registry[msg_type] = handler

    async def process_message(self, message: A2AMessage) -> A2AMessage:
        """Process an incoming A2A message and return a response."""
        if message.receiver_id != self.agent_id:
            raise ValueError(f"Message intended for {message.receiver_id}, but this agent is {self.agent_id}")
        
        handler = self._registry.get(message.type)
        if handler is None:
            return A2AMessage(
                type=A2AMessageType.ERROR,
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                payload={"error": f"Unsupported message type: {message.type.value}"}
            )
        
        try:
            response = await handler(message)
            if isinstance(response, A2AMessage):
                return response
            else:
                return A2AMessage(
                    type=A2AMessageType.TASK_RESPONSE,
                    sender_id=self.agent_id,
                    receiver_id=message.sender_id,
                    payload={"result": response}
                )
        except Exception as e:
            return A2AMessage(
                type=A2AMessageType.ERROR,
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                payload={"error": str(e)}
            )

    async def send_message(self, message: A2AMessage, transport: Any) -> A2AMessage:
        """Send an A2A message via the given transport and return the response."""
        # Placeholder for actual transport (e.g., HTTP, WebSocket, etc.)
        # For now, assume transport has async send method
        response_data = await transport.send(message.to_dict())
        return A2AMessage.from_dict(response_data)
