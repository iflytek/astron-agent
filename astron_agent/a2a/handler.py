from typing import Optional
from .protocol import A2AMessage, A2AStatus
import asyncio
import logging

logger = logging.getLogger(__name__)


class A2AHandler:
    """Handles sending and receiving A2A messages."""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self._message_queue = asyncio.Queue()
        self._handlers = {}

    def register_handler(self, message_type: str, callback):
        """Register a callback for a specific message type."""
        self._handlers[message_type] = callback

    async def send_message(self, message: A2AMessage) -> A2AStatus:
        """Send a message to another agent.
        
        In a real implementation, this would use network transport.
        For now, we simulate by putting into the receiver's queue.
        """
        # Simulate sending by calling a global registry (not implemented here)
        logger.info(f"Agent {self.agent_id} sent message to {message.receiver_id}")
        # Placeholder: in production, use actual transport
        return A2AStatus.SUCCESS

    async def receive_message(self, timeout: float = 5.0) -> Optional[A2AMessage]:
        """Receive a message from the queue."""
        try:
            message = await asyncio.wait_for(self._message_queue.get(), timeout=timeout)
            return message
        except asyncio.TimeoutError:
            return None

    async def process_message(self, message: A2AMessage):
        """Process an incoming message by calling the appropriate handler."""
        handler = self._handlers.get(message.message_type)
        if handler:
            await handler(message)
        else:
            logger.warning(f"No handler for message type {message.message_type}")

    async def start_listening(self):
        """Continuously listen for incoming messages."""
        while True:
            message = await self.receive_message()
            if message:
                await self.process_message(message)
