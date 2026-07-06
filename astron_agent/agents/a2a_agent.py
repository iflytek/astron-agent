from astron_agent.a2a import A2AHandler, A2AMessage, A2AStatus
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)


class A2AAgent:
    """An agent that supports A2A (Agent-to-Agent) protocol."""

    def __init__(self, agent_id: str, capabilities: list = None):
        self.agent_id = agent_id
        self.capabilities = capabilities or []
        self.a2a_handler = A2AHandler(agent_id)
        self._register_default_handlers()

    def _register_default_handlers(self):
        self.a2a_handler.register_handler("request", self.handle_request)
        self.a2a_handler.register_handler("response", self.handle_response)
        self.a2a_handler.register_handler("notification", self.handle_notification)

    async def handle_request(self, message: A2AMessage):
        """Handle a request message. Override in subclass."""
        logger.info(f"Agent {self.agent_id} received request: {message.content}")
        # Example: respond with capability info
        response_content = {"capabilities": self.capabilities}
        response = A2AMessage(
            sender_id=self.agent_id,
            receiver_id=message.sender_id,
            content=response_content,
            message_type="response",
            correlation_id=message.message_id
        )
        await self.a2a_handler.send_message(response)

    async def handle_response(self, message: A2AMessage):
        """Handle a response message."""
        logger.info(f"Agent {self.agent_id} received response: {message.content}")

    async def handle_notification(self, message: A2AMessage):
        """Handle a notification message."""
        logger.info(f"Agent {self.agent_id} received notification: {message.content}")

    async def send_request(self, target_agent_id: str, content: Dict[str, Any]):
        """Send a request to another agent."""
        message = A2AMessage(
            sender_id=self.agent_id,
            receiver_id=target_agent_id,
            content=content,
            message_type="request"
        )
        return await self.a2a_handler.send_message(message)

    async def start(self):
        """Start listening for messages."""
        await self.a2a_handler.start_listening()
