from __future__ import annotations
from typing import Optional, Dict, Any, Callable
from astron_agent.a2a.models import AgentCard, A2AMessage, A2AAction, AgentCapability
from astron_agent.a2a.protocol import A2AProtocol


class A2AIntegration:
    """
    Mixin to add A2A protocol support to an astron-agent agent.
    Usage:
        class MyAgent(BaseAgent, A2AIntegration):
            def __init__(self):
                super().__init__()
                self.setup_a2a(card=self._build_card())
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._a2a_protocol: Optional[A2AProtocol] = None

    def setup_a2a(
        self,
        card: AgentCard,
        invoke_handler: Optional[Callable[[A2AMessage], A2AMessage]] = None,
        extra_handlers: Optional[Dict[A2AAction, Callable]] = None
    ):
        """Initialize A2A protocol with the given agent card."""
        self._a2a_protocol = A2AProtocol(card)
        self._a2a_protocol.register_handler(A2AAction.DISCOVER, lambda msg: self._a2a_protocol.discover())
        if invoke_handler:
            self._a2a_protocol.register_handler(A2AAction.INVOKE, invoke_handler)
        if extra_handlers:
            for action, handler in extra_handlers.items():
                self._a2a_protocol.register_handler(action, handler)

    def handle_a2a_message(self, message: A2AMessage) -> Optional[A2AMessage]:
        """Process an incoming A2A message."""
        if self._a2a_protocol is None:
            return None
        return self._a2a_protocol.handle_message(message)

    def send_a2a_message(self, message: A2AMessage, transport: Callable[[A2AMessage], A2AMessage]) -> Optional[A2AMessage]:
        """Send an A2A message using provided transport."""
        return transport(message)

    def get_agent_card(self) -> AgentCard:
        """Return the agent's card."""
        if self._a2a_protocol:
            return self._a2a_protocol.agent_card
        raise RuntimeError("A2A not initialized")
