from typing import Optional
from .messages import TaskMessage, ResultMessage, DiscoveryRequest, DiscoveryResponse
from .exceptions import ProtocolError

class A2AProtocol:
    def __init__(self, agent: "A2AAgent"):
        self.agent = agent

    async def process_message(self, message: TaskMessage) -> ResultMessage:
        if message.type == "task":
            return await self.agent.handle_task(message)
        elif message.type == "discovery_request":
            agents = await self.agent.discover_agents(message.payload.get("query"))
            return ResultMessage(success=True, result={"agents": [a.__dict__ for a in agents]})
        else:
            raise ProtocolError(f"Unsupported message type: {message.type}")