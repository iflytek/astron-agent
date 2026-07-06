"""A2A (Agent-to-Agent) Protocol Core.

Defines base message types, agent interfaces, and protocol handlers
for enabling communication between agents in a multi-agent ecosystem.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from enum import Enum


class MessageType(Enum):
    """Enumeration of A2A message types."""
    REQUEST = "request"
    RESPONSE = "response"
    ERROR = "error"
    EVENT = "event"


@dataclass
class A2AMessage:
    """Base message unit for A2A communication."""
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str = ""
    target_id: str = ""
    message_type: MessageType = MessageType.REQUEST
    payload: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize message to dictionary."""
        return {
            "message_id": self.message_id,
            "sender_id": self.sender_id,
            "target_id": self.target_id,
            "message_type": self.message_type.value,
            "payload": self.payload,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "A2AMessage":
        """Deserialize from dictionary."""
        return cls(
            message_id=data.get("message_id", ""),
            sender_id=data.get("sender_id", ""),
            target_id=data.get("target_id", ""),
            message_type=MessageType(data.get("message_type", "request")),
            payload=data.get("payload", {}),
            metadata=data.get("metadata", {}),
        )


class A2AAgent:
    """Base class for agents that support A2A protocol."""

    def __init__(self, agent_id: str, name: str = ""):
        self.agent_id = agent_id
        self.name = name or agent_id
        self._message_handlers: Dict[MessageType, List[Callable]] = {
            msg_type: [] for msg_type in MessageType
        }
        self._outbox: List[A2AMessage] = []

    def register_handler(self, message_type: MessageType, handler: Callable):
        """Register a handler for a specific message type."""
        self._message_handlers[message_type].append(handler)

    def send_message(self, message: A2AMessage):
        """Send a message (add to outbox for dispatch)."""
        message.sender_id = self.agent_id
        self._outbox.append(message)

    def receive_message(self, message: A2AMessage) -> Optional[A2AMessage]:
        """Process an incoming message and return an optional response."""
        handlers = self._message_handlers.get(message.message_type, [])
        response = None
        for handler in handlers:
            result = handler(self, message)
            if isinstance(result, A2AMessage):
                response = result
        return response

    def process_inbox(self, messages: List[A2AMessage]) -> List[A2AMessage]:
        """Process a list of incoming messages and collect responses."""
        responses = []
        for msg in messages:
            response = self.receive_message(msg)
            if response:
                response.sender_id = self.agent_id
                responses.append(response)
        return responses

    def flush_outbox(self) -> List[A2AMessage]:
        """Retrieve and clear all outgoing messages."""
        messages = self._outbox[:]
        self._outbox.clear()
        return messages


class A2ARouter:
    """Simple router to deliver messages between agents."""

    def __init__(self):
        self._agents: Dict[str, A2AAgent] = {}

    def register_agent(self, agent: A2AAgent):
        """Register an agent with the router."""
        self._agents[agent.agent_id] = agent

    def unregister_agent(self, agent_id: str):
        """Unregister an agent."""
        self._agents.pop(agent_id, None)

    def route_message(self, message: A2AMessage) -> Optional[A2AMessage]:
        """Route a message to its target agent and return response."""
        target = self._agents.get(message.target_id)
        if target is None:
            return A2AMessage(
                sender_id="router",
                target_id=message.sender_id,
                message_type=MessageType.ERROR,
                payload={"error": f"Agent {message.target_id} not found"},
            )
        return target.receive_message(message)

    def route_all(self, messages: List[A2AMessage]) -> Dict[str, List[A2AMessage]]:
        """Route multiple messages and group responses by sender."""
        responses_map: Dict[str, List[A2AMessage]] = {}
        for msg in messages:
            response = self.route_message(msg)
            if response:
                responses_map.setdefault(response.target_id, []).append(response)
        return responses_map
