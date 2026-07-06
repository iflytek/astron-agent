"""Integration with Kagent for A2A protocol."""
from typing import Any, Dict, Optional
from astron_agent.a2a.protocol import A2AMessage, A2AAction
from astron_agent.a2a.agent import A2AAgentMixin

class KagentBridge:
    """Bridge between Astron Agent and Kagent using A2A."""

    def __init__(self, agent: A2AAgentMixin, transport):
        self.agent = agent
        self.transport = transport

    async def register_with_kagent(self, kagent_url: str) -> bool:
        # Send discover to kagent
        disc_msg = A2AMessage(
            action=A2AAction.DISCOVER,
            sender=self.agent.a2a_protocol.agent_id,
            target="kagent"
        )
        try:
            response = await self.transport.send(disc_msg.to_dict())
            return response.get("action") == "discover"
        except Exception:
            return False

    async def handle_kagent_message(self, raw_message: Dict[str, Any]) -> Dict[str, Any]:
        message = A2AMessage.from_dict(raw_message)
        response = await self.agent.handle_a2a_message(message)
        return response.to_dict()

    async def start_http_server(self, host: str = "0.0.0.0", port: int = 8080):
        from aiohttp import web
        async def handle(request):
            data = await request.json()
            resp_data = await self.handle_kagent_message(data)
            return web.json_response(resp_data)
        app = web.Application()
        app.router.add_post('/a2a', handle)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, host, port)
        await site.start()
        print(f"A2A HTTP server started on {host}:{port}")
        return runner
