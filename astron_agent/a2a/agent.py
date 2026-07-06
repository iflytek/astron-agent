import logging
import asyncio
from typing import Dict, List, Callable, Awaitable, Optional
import aiohttp
from uuid import uuid4
from datetime import datetime, timezone

from .protocol import A2AMessage, MessageType


logger = logging.getLogger(__name__)


class A2AAgent:
    """
    An agent that can communicate with other agents using the A2A protocol.
    """

    def __init__(self, agent_id: str, base_url: str = "http://localhost:8080"):
        self.agent_id = agent_id
        self.base_url = base_url.rstrip("/")
        self._handlers: Dict[MessageType, List[Callable[[A2AMessage], Awaitable[None]]]] = {}
        self._session: Optional[aiohttp.ClientSession] = None
        self._registered = False

    async def start(self):
        """Initialize the A2A agent and register with the network if needed."""
        self._session = aiohttp.ClientSession()
        await self._register()
        logger.info(f"A2A agent {self.agent_id} started and registered.")

    async def stop(self):
        """Clean up resources."""
        if self._session:
            await self._session.close()
        logger.info(f"A2A agent {self.agent_id} stopped.")

    async def send_message(self, receiver_id: str, payload: Dict, message_type: MessageType = MessageType.TASK) -> str:
        """
        Send an A2A message to another agent.
        Returns the message ID.
        """
        message_id = str(uuid4())
        msg = A2AMessage(
            sender_id=self.agent_id,
            receiver_id=receiver_id,
            message_type=message_type,
            payload=payload,
            message_id=message_id,
            correlation_id=None,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        async with self._session.post(
            f"{self.base_url}/a2a/send",
            json={
                "sender_id": msg.sender_id,
                "receiver_id": msg.receiver_id,
                "message_type": msg.message_type.value,
                "payload": msg.payload,
                "message_id": msg.message_id,
                "timestamp": msg.timestamp
            }
        ) as resp:
            if resp.status != 200:
                raise RuntimeError(f"Failed to send message: {resp.status}")
            data = await resp.json()
            logger.debug(f"Sent message {message_id} to {receiver_id}")
            return message_id

    async def handle_message(self, message: A2AMessage):
        """Process an incoming A2A message."""
        logger.info(f"Received message {message.message_id} from {message.sender_id}")
        handlers = self._handlers.get(message.message_type, [])
        if not handlers:
            logger.warning(f"No handler for message type {message.message_type}")
            # Send error back
            error_msg = A2AMessage(
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                message_type=MessageType.ERROR,
                payload={"error": f"No handler for {message.message_type.value}", "original_message_id": message.message_id},
                message_id=str(uuid4()),
                correlation_id=message.message_id
            )
            await self.send_message_raw(error_msg)
            return
        for handler in handlers:
            await handler(message)

    async def send_message_raw(self, message: A2AMessage):
        """Send an A2AMessage directly."""
        async with self._session.post(
            f"{self.base_url}/a2a/send",
            json={
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "message_type": message.message_type.value,
                "payload": message.payload,
                "message_id": message.message_id,
                "correlation_id": message.correlation_id,
                "timestamp": message.timestamp
            }
        ) as resp:
            if resp.status != 200:
                raise RuntimeError(f"Failed to send message: {resp.status}")

    def register_handler(self, message_type: MessageType, handler: Callable[[A2AMessage], Awaitable[None]]):
        """Register a handler for a specific message type."""
        if message_type not in self._handlers:
            self._handlers[message_type] = []
        self._handlers[message_type].append(handler)
        logger.debug(f"Registered handler for {message_type.value}")

    async def discover_agents(self) -> List[Dict]:
        """Discover other agents in the network."""
        async with self._session.get(f"{self.base_url}/a2a/discover") as resp:
            if resp.status != 200:
                raise RuntimeError(f"Failed to discover agents: {resp.status}")
            data = await resp.json()
            return data.get("agents", [])

    async def health_check(self) -> bool:
        """Check if the A2A network is healthy."""
        async with self._session.get(f"{self.base_url}/a2a/health") as resp:
            return resp.status == 200

    async def _register(self):
        """Register this agent with the A2A network."""
        async with self._session.post(
            f"{self.base_url}/a2a/register",
            json={"agent_id": self.agent_id}
        ) as resp:
            if resp.status == 200:
                self._registered = True
            else:
                logger.warning(f"Failed to register agent: {resp.status}")

    def __repr__(self):
        return f"A2AAgent(agent_id={self.agent_id}, registered={self._registered})"