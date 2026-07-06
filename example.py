#!/usr/bin/env python3
"""
Example usage of A2A protocol integration with astron-agent.
"""
from astron_agent.a2a.models import AgentCard, A2AMessage, A2AAction, AgentCapability
from astron_agent.a2a.integration import A2AIntegration
from astron_agent.a2a.protocol import A2AProtocol


# Assume BaseAgent exists in astron-agent
class BaseAgent:
    def __init__(self):
        self.name = "BaseAgent"

    def run(self, input_data):
        return f"Processed: {input_data}"


class MyA2AAgent(BaseAgent, A2AIntegration):
    def __init__(self):
        super().__init__()
        self.name = "MyA2AAgent"
        card = AgentCard(
            agent_id="agent-001",
            name="My A2A Agent",
            description="An example agent using A2A protocol.",
            capabilities=[
                AgentCapability(
                    name="echo",
                    description="Echo input back",
                    parameters={"type": "object", "properties": {"message": {"type": "string"}}},
                )
            ],
            endpoint="http://localhost:8080/a2a",
        )
        self.setup_a2a(card, invoke_handler=self.handle_invoke)

    def handle_invoke(self, request: A2AMessage) -> A2AMessage:
        """Handle an invoke action."""
        capability = request.payload.get("capability")
        params = request.payload.get("parameters", {})
        if capability == "echo":
            result = self.run(params.get("message", ""))
            return self._a2a_protocol.create_message(
                A2AAction.RESULT,
                target=request.source,
                payload={"result": result, "message_id": request.message_id}
            )
        else:
            return self._a2a_protocol.create_message(
                A2AAction.ERROR,
                target=request.source,
                payload={"error": f"Unknown capability: {capability}", "message_id": request.message_id}
            )


if __name__ == "__main__":
    agent = MyA2AAgent()
    print("Agent Card:", agent.get_agent_card().to_dict())
    # Simulate a discover request
    discover_msg = A2AMessage(action=A2AAction.DISCOVER)
    response = agent.handle_a2a_message(discover_msg)
    print("Discover response:", response.to_dict() if response else "None")
    # Simulate an invoke request
    invoke_msg = A2AMessage(
        action=A2AAction.INVOKE,
        source="agent-002",
        payload={
            "capability": "echo",
            "parameters": {"message": "Hello A2A!"}
        }
    )
    response = agent.handle_a2a_message(invoke_msg)
    print("Invoke response:", response.to_dict() if response else "None")
