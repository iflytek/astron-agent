from typing import Any, Dict, Optional, Callable, Awaitable
import json
import asyncio

class Transport:
    """Abstract base class for A2A transport."""

    async def send(self, message: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

class HTTPTransport(Transport):
    """Simple HTTP transport using aiohttp or similar."""

    def __init__(self, base_url: str, session=None):
        self.base_url = base_url.rstrip('/')
        self.session = session

    async def send(self, message: Dict[str, Any]) -> Dict[str, Any]:
        import aiohttp
        if self.session is None:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/a2a", json=message) as resp:
                    return await resp.json()
        else:
            async with self.session.post(f"{self.base_url}/a2a", json=message) as resp:
                return await resp.json()
