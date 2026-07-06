from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Callable, Awaitable
from .protocol import A2AMessage, A2AMessageType, A2AError

logger = logging.getLogger(__name__)


class A2AHandler:
    def __init__(self, agent_id: str, agent_name: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self._handlers: Dict[A2AMessageType, Callable] = {}
        self._card: Optional[Dict[str, Any]] = None

    def register_handler(self, msg_type: A2AMessageType, handler: Callable[[A2AMessage], Awaitable[Optional[A2AMessage]]]):
        self._handlers[msg_type] = handler

    async def handle_message(self, message: A2AMessage) -> Optional[A2AMessage]:
        if message.target != self.agent_id:
            logger.warning(f"Message target {message.target} does not match agent {self.agent_id}")
            return None

        handler = self._handlers.get(message.type)
        if not handler:
            raise A2AError(f"No handler for message type {message.type}", 404)

        try:
            response = await handler(message)
            return response
        except A2AError as e:
            return e.to_message(self.agent_id, message.source)
        except Exception as e:
            logger.exception(f"Unhandled error processing message: {e}")
            return A2AError("Internal server error", 500).to_message(self.agent_id, message.source)

    def set_agent_card(self, card: Dict[str, Any]):
        self._card = card

    def get_agent_card(self) -> Dict[str, Any]:
        if self._card is None:
            raise A2AError("Agent card not set", 404)
        return self._card
