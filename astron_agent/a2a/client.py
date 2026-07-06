"""A2A client for sending requests to other agents."""
import uuid
import aiohttp
from typing import Optional, List
from .protocol import AgentCard, A2ARequest, A2AResponse, A2AMessage, MessageRole


class A2AClient:
    """Async client for A2A protocol."""

    def __init__(self, agent_card: AgentCard, timeout: int = 30):
        self.agent_card = agent_card
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None

    async def _ensure_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()

    async def send_request(
        self,
        target_agent_url: str,
        target_agent_id: str,
        messages: List[A2AMessage],
        conversation_id: Optional[str] = None,
        **kwargs
    ) -> A2AResponse:
        """Send an A2A request to a target agent.

        Args:
            target_agent_url: Base URL of the target agent (e.g., "http://agent2:8080")
            target_agent_id: ID of the target agent
            messages: List of messages to send
            conversation_id: Optional conversation ID for multi-turn
            **kwargs: Additional parameters for the request

        Returns:
            A2AResponse from the target agent
        """
        await self._ensure_session()
        request = A2ARequest(
            request_id=str(uuid.uuid4()),
            source_agent=self.agent_card,
            target_agent_id=target_agent_id,
            conversation_id=conversation_id,
            messages=messages,
            **kwargs
        )
        url = f"{target_agent_url.rstrip('/')}/a2a/chat"
        async with self.session.post(url, json=request.model_dump(), timeout=self.timeout) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return A2AResponse(**data)

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def __aenter__(self):
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
