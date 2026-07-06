"""A2A (Agent-to-Agent) Protocol implementation for astron-agent."""

from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional
import json
import requests


@dataclass
class A2AMessage:
    """Base message structure for A2A communication."""
    sender_id: str
    receiver_id: str
    intent: str
    payload: Dict[str, Any]
    message_id: Optional[str] = None
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'A2AMessage':
        return cls(**data)

    @classmethod
    def from_json(cls, data: str) -> 'A2AMessage':
        return cls.from_dict(json.loads(data))


class A2AAgent:
    """Base class for an agent that supports A2A protocol."""

    def __init__(self, agent_id: str, endpoint: str = None):
        self.agent_id = agent_id
        self.endpoint = endpoint
        self.handlers: Dict[str, callable] = {}

    def register_handler(self, intent: str, handler: callable) -> None:
        """Register a handler for a specific intent."""
        self.handlers[intent] = handler

    def send_message(self, message: A2AMessage) -> Optional[A2AMessage]:
        """Send an A2A message to another agent's endpoint.
        
        This implementation uses HTTP POST. For a real system, consider
        async messaging or WebSockets.
        """
        if not message.receiver_id:
            raise ValueError("receiver_id is required")
        # In practice, look up receiver's endpoint from registry.
        # Here we assume endpoint is provided or discovered.
        url = f"http://{message.receiver_id}/a2a"  # Placeholder
        response = requests.post(url, json=message.to_dict())
        response.raise_for_status()
        return A2AMessage.from_dict(response.json())

    def handle_message(self, message: A2AMessage) -> A2AMessage:
        """Handle an incoming A2A message by dispatching to the right handler."""
        if message.intent in self.handlers:
            result = self.handlers[message.intent](message)
            return A2AMessage(
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                intent=message.intent + "_response",
                payload=result
            )
        else:
            raise ValueError(f"No handler for intent '{message.intent}'")

    def __repr__(self) -> str:
        return f"A2AAgent(agent_id={self.agent_id}, endpoint={self.endpoint})"
