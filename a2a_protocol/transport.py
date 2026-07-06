from abc import ABC, abstractmethod
from typing import Optional
from .messages import A2AMessage, ResultMessage, TaskMessage
from .exceptions import TransportError

class A2ATransport(ABC):
    @abstractmethod
    async def send(self, endpoint: str, message: A2AMessage) -> str:
        pass

    @abstractmethod
    async def start(self, agent: "A2AAgent"):
        pass

    @abstractmethod
    async def stop(self):
        pass

class HTTPTransport(A2ATransport):
    def __init__(self, host: str = "0.0.0.0", port: int = 8080):
        self.host = host
        self.port = port
        self._server = None

    async def send(self, endpoint: str, message: A2AMessage) -> str:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            payload = message.to_json()
            async with session.post(endpoint, data=payload) as resp:
                if resp.status != 200:
                    raise TransportError(f"HTTP {resp.status}: {await resp.text()}")
                return await resp.text()

    async def start(self, agent: "A2AAgent"):
        from aiohttp import web
        app = web.Application()
        app.router.add_post("/a2a", self._handle_message(agent))
        runner = web.AppRunner(app)
        await runner.setup()
        self._server = web.TCPSite(runner, self.host, self.port)
        await self._server.start()

    async def stop(self):
        if self._server:
            await self._server.stop()

    def _handle_message(self, agent):
        async def handler(request):
            data = await request.text()
            message = A2AMessage.from_json(data)
            if isinstance(message, TaskMessage):
                result = await agent.handle_task(message)
                return web.Response(text=result.to_json(), content_type="application/json")
            else:
                return web.Response(text=ErrorMessage(error_message="Unsupported message type").to_json(), status=400)
        return handler