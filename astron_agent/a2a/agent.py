"""A2A agent mixin for astron-agent."""
from typing import Optional
from .protocol import AgentCard, A2ARequest, A2AResponse, A2AMessage, MessageRole
from .server import A2AServer
from .client import A2AClient


class A2AAgentMixin:
    """Mixin to add A2A capabilities to an Agent class."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.a2a_card: Optional[AgentCard] = None
        self.a2a_server: Optional[A2AServer] = None
        self.a2a_client: Optional[A2AClient] = None

    def setup_a2a(
        self,
        agent_id: str,
        name: str,
        description: str = "",
        version: str = "1.0.0",
        host: str = "0.0.0.0",
        port: int = 8080
    ):
        """Initialize A2A components."""
        self.a2a_card = AgentCard(
            agent_id=agent_id,
            name=name,
            description=description,
            version=version
        )
        self.a2a_server = A2AServer(
            agent_id=agent_id,
            process_func=self._handle_a2a_request,
            host=host,
            port=port
        )
        self.a2a_client = A2AClient(agent_card=self.a2a_card)

    async def _handle_a2a_request(self, request: A2ARequest) -> A2AResponse:
        """Handle incoming A2A requests. Override in subclass.

        Default implementation echoes the last message.
        """
        last_msg = request.messages[-1].content if request.messages else ""
        response_msg = A2AMessage(
            role=MessageRole.ASSISTANT,
            content=f"Echo: {last_msg}"
        )
        return A2AResponse(
            request_id=request.request_id,
            source_agent=self.a2a_card,
            messages=[response_msg],
            finished=True
        )

    async def send_a2a_message(
        self,
        target_url: str,
        target_id: str,
        message: str,
        conversation_id: Optional[str] = None
    ) -> A2AResponse:
        """Send a message to another agent via A2A."""
        msg = A2AMessage(role=MessageRole.AGENT, content=message)
        response = await self.a2a_client.send_request(
            target_agent_url=target_url,
            target_agent_id=target_id,
            messages=[msg],
            conversation_id=conversation_id
        )
        return response

    def run_a2a_server(self):
        """Start the A2A server (blocking)."""
        self.a2a_server.run()
