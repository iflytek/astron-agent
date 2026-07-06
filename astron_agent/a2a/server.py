"""A2A server using FastAPI."""
import logging
from typing import Optional, Callable, Awaitable
from fastapi import FastAPI, HTTPException
from pydantic import ValidationError
from .protocol import A2ARequest, A2AResponse, A2AMessage, MessageRole

logger = logging.getLogger(__name__)


class A2AServer:
    """FastAPI-based server for A2A protocol."""

    def __init__(
        self,
        agent_id: str,
        process_func: Optional[Callable[[A2ARequest], Awaitable[A2AResponse]]] = None,
        host: str = "0.0.0.0",
        port: int = 8080
    ):
        self.agent_id = agent_id
        self.process_func = process_func
        self.host = host
        self.port = port
        self.app = FastAPI(title=f"A2A Server - {agent_id}")

        @self.app.post("/a2a/chat")
        async def chat(request_data: dict):
            try:
                request = A2ARequest(**request_data)
            except ValidationError as e:
                raise HTTPException(status_code=400, detail=e.errors())
            if self.process_func is None:
                raise HTTPException(status_code=501, detail="No process function defined")
            try:
                response = await self.process_func(request)
                return response.model_dump()
            except Exception as e:
                logger.exception("Error processing A2A request")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/a2a/health")
        async def health():
            return {"status": "ok", "agent_id": self.agent_id}

    def run(self, **uvicorn_kwargs):
        import uvicorn
        uvicorn.run(self.app, host=self.host, port=self.port, **uvicorn_kwargs)
