from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from .messages import AgentCard, TaskMessage, ResultMessage
from .transport import A2ATransport
from .discovery import AgentRegistry
from .exceptions import ProtocolError
from .protocol import A2AProtocol

class A2AAgent(ABC):
    def __init__(self, agent_card: AgentCard, transport: A2ATransport, registry: AgentRegistry):
        self.card = agent_card
        self.transport = transport
        self.registry = registry
        self.protocol = A2AProtocol(self)

    @abstractmethod
    async def handle_task(self, task: TaskMessage) -> ResultMessage:
        """Handle an incoming task and return a result."""
        pass

    async def start(self):
        """Start listening for incoming messages."""
        await self.transport.start(self)

    async def stop(self):
        """Stop listening."""
        await self.transport.stop()

    async def send_task(self, dest_agent_id: str, task: TaskMessage) -> ResultMessage:
        """Send a task to another agent."""
        dest_card = await self.registry.get_agent(dest_agent_id)
        if not dest_card:
            raise ProtocolError(f"Agent {dest_agent_id} not found")
        response = await self.transport.send(dest_card.endpoint, task)
        return ResultMessage.from_json(response)

    async def discover_agents(self, query: Optional[str] = None) -> list:
        """Discover agents matching query."""
        return await self.registry.discover(query)

    async def register(self):
        """Register this agent with the registry."""
        await self.registry.register(self.card)

    async def unregister(self):
        """Unregister this agent."""
        await self.registry.unregister(self.card.agent_id)