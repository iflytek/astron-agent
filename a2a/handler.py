from typing import Callable, Dict
from .protocol import A2AMessage, A2AError


class A2AHandler:
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self._handlers: Dict[str, Callable] = {}

    def register_handler(self, action: str, handler: Callable):
        self._handlers[action] = handler

    def handle_message(self, message: A2AMessage) -> str:
        if message.recipient != self.agent_id:
            raise A2AError(f"Message not for this agent: {message.recipient}")
        handler = self._handlers.get(message.action)
        if handler is None:
            raise A2AError(f"No handler for action: {message.action}")
        result = handler(message.payload)
        response = A2AMessage(
            sender=self.agent_id,
            recipient=message.sender,
            action=f"{message.action}_response",
            payload={"result": result}
        )
        return response.to_json()
