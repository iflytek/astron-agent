"""Kagent adapter for A2A protocol.

Integrates Kagent agents with the A2A protocol, allowing Kagent agents
to communicate with other agents via the A2A message format.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from a2a_protocol import A2AAgent, A2AMessage, MessageType


class KagentAgentAdapter(A2AAgent):
    """Adapter that wraps a Kagent agent to make it A2A-compatible."""

    def __init__(self, kagent_instance: Any, agent_id: str = None, name: str = ""):
        """
        Initialize the adapter.

        Args:
            kagent_instance: The actual Kagent agent object.
            agent_id: Unique identifier. If None, uses kagent's id if available.
            name: Human-readable name.
        """
        # Try to extract agent_id from kagent instance
        if agent_id is None:
            agent_id = getattr(kagent_instance, "agent_id", str(id(kagent_instance)))
        super().__init__(agent_id, name)
        self._kagent = kagent_instance

        # Register default handlers
        self.register_handler(MessageType.REQUEST, self._handle_request)

    def _handle_request(self, message: A2AMessage) -> Optional[A2AMessage]:
        """Default handler for REQUEST messages.

        Attempts to call the underlying Kagent agent's run/process method.
        """
        # Look for a 'prompt' or 'input' key in payload
        input_text = message.payload.get("prompt") or message.payload.get("input", "")
        if not input_text:
            return A2AMessage(
                sender_id=self.agent_id,
                target_id=message.sender_id,
                message_type=MessageType.ERROR,
                payload={"error": "No input provided in payload"},
            )

        # Try to call the kagent agent. Assumes it has a 'run' method.
        if hasattr(self._kagent, "run"):
            try:
                result = self._kagent.run(input_text)
                return A2AMessage(
                    sender_id=self.agent_id,
                    target_id=message.sender_id,
                    message_type=MessageType.RESPONSE,
                    payload={"output": result},
                )
            except Exception as e:
                return A2AMessage(
                    sender_id=self.agent_id,
                    target_id=message.sender_id,
                    message_type=MessageType.ERROR,
                    payload={"error": str(e)},
                )
        else:
            return A2AMessage(
                sender_id=self.agent_id,
                target_id=message.sender_id,
                message_type=MessageType.ERROR,
                payload={"error": "Kagent agent does not have a 'run' method"},
            )

    @staticmethod
    def create_kagent_agent(kagent_agent_class: Any, **kwargs) -> "KagentAgentAdapter":
        """Factory method: create a Kagent agent instance and wrap it."""
        instance = kagent_agent_class(**kwargs)
        return KagentAgentAdapter(instance)
