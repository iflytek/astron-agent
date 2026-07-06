"""Adapter to integrate Kagent with A2A protocol."""

from astron_agent.a2a.protocol import A2AAgent, A2AMessage
from kagent import Agent as KAgent  # Assuming Kagent package


class KagentA2AAdapter(A2AAgent):
    """Wraps a Kagent instance as an A2A-capable agent."""

    def __init__(self, kagent: KAgent, agent_id: str = None, endpoint: str = None):
        if agent_id is None:
            agent_id = kagent.name if hasattr(kagent, 'name') else str(id(kagent))
        super().__init__(agent_id, endpoint)
        self.kagent = kagent
        # Register default handlers that map to Kagent capabilities
        self.register_handler("query", self._handle_query)
        self.register_handler("execute", self._handle_execute)

    def _handle_query(self, message: A2AMessage) -> dict:
        """Handle a query intent by calling Kagent's query method."""
        query = message.payload.get("query", "")
        result = self.kagent.query(query)
        return {"response": result}

    def _handle_execute(self, message: A2AMessage) -> dict:
        """Handle an execute intent by calling Kagent's execute method."""
        action = message.payload.get("action", "")
        params = message.payload.get("params", {})
        result = self.kagent.execute(action, **params)
        return {"result": result}

    def start(self) -> None:
        """Start the agent's A2A server (if using HTTP)."""
        # In production, use a web framework like FastAPI or Flask.
        # This is a stub.
        print(f"Starting A2A endpoint for agent {self.agent_id} at {self.endpoint}")
