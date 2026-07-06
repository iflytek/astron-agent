from __future__ import annotations
import uuid
from typing import Callable, Dict, Optional, Any
from .models import AgentCard, A2AMessage, A2AAction


class A2AProtocol:
    """
    Core A2A protocol implementation.
    Handles message creation, serialization, and dispatching.
    """

    def __init__(self, agent_card: AgentCard):
        self.agent_card = agent_card
        self._handlers: Dict[A2AAction, Callable] = {}

    def register_handler(self, action: A2AAction, handler: Callable):
        """Register a handler for a specific A2A action."""
        self._handlers[action] = handler

    def create_message(
        self,
        action: A2AAction,
        target: Optional[str] = None,
        payload: Optional[dict] = None,
        **kwargs
    ) -> A2AMessage:
        """Create a new A2A message."""
        return A2AMessage(
            action=action,
            agent_id=self.agent_card.agent_id,
            payload=payload or {},
            message_id=str(uuid.uuid4()),
            source=self.agent_card.agent_id,
            target=target,
            **kwargs
        )

    def handle_message(self, message: A2AMessage) -> Optional[A2AMessage]:
        """Handle an incoming A2A message. Returns response if any."""
        handler = self._handlers.get(message.action)
        if handler:
            return handler(message)
        return None

    def discover(self) -> AgentCard:
        """Respond to a discover request with this agent's card."""
        return self.agent_card

    def invoke(self, request: A2AMessage, context: Optional[Dict[str, Any]] = None) -> A2AMessage:
        """Invoke a capability on this agent."""
        # Default implementation: delegate to registered invoke handler
        if A2AAction.INVOKE in self._handlers:
            return self._handlers[A2AAction.INVOKE](request)
        return self.create_message(
            A2AAction.ERROR,
            target=request.source,
            payload={"error": "No invoke handler registered"}
        )

    def to_dict(self):
        return self.agent_card.to_dict()
