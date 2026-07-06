"""Example usage of A2A protocol with Kagent adapter."""

from a2a_protocol import A2AAgent, A2AMessage, A2ARouter, MessageType
from kagent_adapter import KagentAgentAdapter


def main():
    # Create router
    router = A2ARouter()

    # Create a simple custom agent
    class CustomAgent(A2AAgent):
        def __init__(self, agent_id, name):
            super().__init__(agent_id, name)
            self.register_handler(MessageType.REQUEST, self.handle_request)

        def handle_request(self, message):
            # Echo back
            return A2AMessage(
                sender_id=self.agent_id,
                target_id=message.sender_id,
                message_type=MessageType.RESPONSE,
                payload={"reply": f"Agent {self.name} received: {message.payload}"},
            )

    custom_agent = CustomAgent("agent_custom", "Custom Agent")
    router.register_agent(custom_agent)

    # Simulate a Kagent agent (for example, we use a dummy class)
    class DummyKagent:
        def run(self, input_text):
            return f"Kagent processed: {input_text}"

    dummy_kagent = DummyKagent()
    kagent_adapter = KagentAgentAdapter(dummy_kagent, agent_id="kagent_adapter")
    router.register_agent(kagent_adapter)

    # Send a message from custom agent to kagent adapter
    request = A2AMessage(
        sender_id="agent_custom",
        target_id="kagent_adapter",
        message_type=MessageType.REQUEST,
        payload={"prompt": "Hello from custom agent!"},
    )
    response = router.route_message(request)
    if response:
        print(f"Response from kagent: {response.payload}")
    else:
        print("No response received")

    # Send a message from kagent adapter to custom agent
    request2 = A2AMessage(
        sender_id="kagent_adapter",
        target_id="agent_custom",
        message_type=MessageType.REQUEST,
        payload={"query": "Hi custom agent!"},
    )
    response2 = router.route_message(request2)
    if response2:
        print(f"Response from custom agent: {response2.payload}")


if __name__ == "__main__":
    main()
