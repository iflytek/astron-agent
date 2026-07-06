from typing import Optional, List, Dict
from .messages import AgentCard
from .exceptions import AgentNotFoundError

class AgentRegistry:
    def __init__(self):
        self._agents: Dict[str, AgentCard] = {}

    async def register(self, card: AgentCard):
        self._agents[card.agent_id] = card

    async def unregister(self, agent_id: str):
        if agent_id in self._agents:
            del self._agents[agent_id]

    async def get_agent(self, agent_id: str) -> Optional[AgentCard]:
        return self._agents.get(agent_id)

    async def discover(self, query: Optional[str] = None) -> List[AgentCard]:
        if not query:
            return list(self._agents.values())
        query_lower = query.lower()
        results = []
        for card in self._agents.values():
            if query_lower in card.name.lower() or query_lower in card.description.lower():
                results.append(card)
        return results