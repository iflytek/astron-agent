from typing import Callable, Awaitable
from .protocol import A2AMessage, A2ARequest, A2AResponse, A2AError, A2AMessageType
from .transport import A2ATransport, HTTPTransport
import uuid
from loguru import logger


class A2AHandler:
    """Handles A2A protocol for an agent. Integrates with the agent's core logic."""

    def __init__(
        self,
        agent_id: str,
        transport: A2ATransport,
        process_request: Callable[[A2ARequest], Awaitable[A2AResponse]],
    ):
        self.agent_id = agent_id
        self.transport = transport
        self.process_request = process_request  # External function to handle tasks

    async def send_message(self, message: A2AMessage, target_url: str) -> A2AMessage:
        """Send a message and get response."""
        response_msg = await self.transport.send_message(message, target_url)
        if response_msg is None:
            raise ConnectionError(f"No response from {target_url}")
        return response_msg

    async def send_request(
        self, target_agent_url: str, request: A2ARequest
    ) -> A2AResponse:
        """Send a task request to another agent."""
        message = A2AMessage(
            type=A2AMessageType.REQUEST,
            source_agent_id=self.agent_id,
            target_agent_id="",  # Will be filled by remote agent or ignored
            message_id=str(uuid.uuid4()),
            payload=request.to_dict(),
        )
        response_msg = await self.send_message(message, target_agent_url)
        if response_msg.type == A2AMessageType.ERROR:
            error_data = response_msg.payload
            raise A2AError(**error_data)
        elif response_msg.type == A2AMessageType.RESPONSE:
            return A2AResponse.from_dict(response_msg.payload)
        else:
            raise ValueError(f"Unexpected message type: {response_msg.type}")

    async def handle_incoming_message(self, message_dict: dict) -> dict:
        """Process incoming HTTP request (for server handler)."""
        message = A2AMessage.from_dict(message_dict)
        return await self._handle_message(message)

    async def _handle_message(self, message: A2AMessage) -> dict:
        """Internal handler for incoming messages."""
        if message.type == A2AMessageType.REQUEST:
            request = A2ARequest.from_dict(message.payload)
            try:
                response = await self.process_request(request)
                response_msg = A2AMessage(
                    type=A2AMessageType.RESPONSE,
                    source_agent_id=self.agent_id,
                    target_agent_id=message.source_agent_id,
                    message_id=message.message_id,
                    payload=response.to_dict(),
                )
            except Exception as e:
                error = A2AError(code="INTERNAL_ERROR", message=str(e))
                response_msg = A2AMessage(
                    type=A2AMessageType.ERROR,
                    source_agent_id=self.agent_id,
                    target_agent_id=message.source_agent_id,
                    message_id=message.message_id,
                    payload=error.to_dict(),
                )
            return response_msg.to_dict()
        else:
            raise A2AError(code="INVALID_MESSAGE", message="Only REQUEST messages accepted")

    async def start_server(self):
        """Start the A2A transport server if applicable."""
        if isinstance(self.transport, HTTPTransport):
            # Wrap handle_incoming_message for the server
            async def handler(request):
                from aiohttp import web
                data = await request.json()
                response_data = await self.handle_incoming_message(data)
                return web.json_response(response_data)
            await self.transport.run_server(handler)
        else:
            logger.warning("Transport does not support server mode.")