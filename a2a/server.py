from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional
from aiohttp import web
from .protocol import A2AMessage, A2AError
from .handler import A2AHandler

logger = logging.getLogger(__name__)


class A2AServer:
    def __init__(self, handler: A2AHandler, host: str = "0.0.0.0", port: int = 8080):
        self.handler = handler
        self.host = host
        self.port = port
        self.app = web.Application()
        self._setup_routes()

    def _setup_routes(self):
        self.app.router.add_post("/a2a/message", self._handle_message)
        self.app.router.add_get("/a2a/card", self._handle_card)
        self.app.router.add_get("/health", self._health_check)

    async def _handle_message(self, request: web.Request) -> web.Response:
        try:
            body = await request.text()
            message = A2AMessage.from_json(body)
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            return web.json_response({"error": f"Invalid message format: {e}"}, status=400)

        try:
            response = await self.handler.handle_message(message)
            if response:
                return web.json_response(json.loads(response.to_json()))
            else:
                return web.json_response({}, status=204)
        except A2AError as e:
            return web.json_response({"error": e.message, "code": e.code}, status=e.code)
        except Exception as e:
            logger.exception("Unexpected error handling message")
            return web.json_response({"error": "Internal server error"}, status=500)

    async def _handle_card(self, request: web.Request) -> web.Response:
        try:
            card = self.handler.get_agent_card()
            return web.json_response(card)
        except A2AError as e:
            return web.json_response({"error": e.message}, status=e.code)

    async def _health_check(self, request: web.Request) -> web.Response:
        return web.json_response({"status": "ok"})

    def start(self):
        web.run_app(self.app, host=self.host, port=self.port)

    async def start_async(self):
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        return runner
