from abc import ABC, abstractmethod
from typing import Optional
from .protocol import A2AMessage


class A2ATransport(ABC):
    """Abstract base class for A2A transport layer."""

    @abstractmethod
    async def send_message(self, message: A2AMessage, target_url: str) -> Optional[A2AMessage]:
        """Send A2A message to a target agent and optionally receive a response.

        Args:
            message: The A2AMessage to send.
            target_url: The endpoint URL of the target agent.

        Returns:
            Response A2AMessage if expected, None otherwise.
        """
        pass

    @abstractmethod
    async def receive_message(self) -> A2AMessage:
        """Receive an incoming A2A message. This method should be implemented
        to listen for incoming messages (e.g., from an HTTP server).

        Returns:
            The received A2AMessage.
        """
        pass


class HTTPTransport(A2ATransport):
    """HTTP-based transport for A2A communication."""

    def __init__(self, server_host: str = "0.0.0.0", server_port: int = 8080):
        self.server_host = server_host
        self.server_port = server_port

    async def send_message(self, message: A2AMessage, target_url: str) -> Optional[A2AMessage]:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                target_url,
                json=message.to_dict(),
                headers={"Content-Type": "application/json"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return A2AMessage.from_dict(data)
                else:
                    return None

    async def receive_message(self) -> A2AMessage:
        # In a real implementation, you would have an HTTP server running.
        # For simplicity, we raise NotImplementedError here.
        # The integration would tie this to a running server (e.g., aiohttp web).
        raise NotImplementedError("Use run_server() to start listening.")

    async def run_server(self, handler):
        from aiohttp import web
        app = web.Application()
        app.router.add_post("/a2a/message", handler)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, self.server_host, self.server_port)
        await site.start()
        print(f"A2A HTTP server started on {self.server_host}:{self.server_port}")
        # Keep running until cancelled
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            await runner.cleanup()