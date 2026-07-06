from typing import Any, Dict, Optional
from .protocol import A2AProtocol, A2AMessage, A2AAction

class A2AAgentMixin:
    """Mixin to add A2A protocol support to an agent."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.a2a_protocol = A2AProtocol(self.agent_id if hasattr(self, 'agent_id') else 'unknown')
        self.a2a_protocol.capabilities = self._get_a2a_capabilities()

    def _get_a2a_capabilities(self) -> Dict[str, Any]:
        return {
            "name": self.__class__.__name__,
            "version": "1.0",
            "actions": [a.value for a in A2AAction],
        }

    async def handle_a2a_message(self, message: A2AMessage) -> A2AMessage:
        return await self.a2a_protocol.handle_message(message)

    async def send_a2a_message(self, target: str, message: A2AMessage, transport) -> A2AMessage:
        # transport is an abstraction for sending messages over network
        message.sender = self.a2a_protocol.agent_id
        message.target = target
        response_dict = await transport.send(message.to_dict())
        return A2AMessage.from_dict(response_dict)

    async def discover_agent(self, target: str, transport) -> Dict[str, Any]:
        msg = A2AMessage(action=A2AAction.DISCOVER, sender=self.a2a_protocol.agent_id, target=target)
        response = await self.send_a2a_message(target, msg, transport)
        return response.payload

    async def request_capabilities(self, target: str, transport) -> Dict[str, Any]:
        msg = A2AMessage(action=A2AAction.CAPABILITIES, sender=self.a2a_protocol.agent_id, target=target)
        response = await self.send_a2a_message(target, msg, transport)
        return response.payload

    async def submit_task(self, target: str, task: Dict[str, Any], transport) -> Dict[str, Any]:
        msg = A2AMessage(action=A2AAction.TASK, payload=task, sender=self.a2a_protocol.agent_id, target=target)
        response = await self.send_a2a_message(target, msg, transport)
        return response.payload
