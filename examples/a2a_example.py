"""Example of using A2A with astron-agent."""
import asyncio
from astron_agent.a2a import A2AAgentMixin, AgentCard, A2AMessage, MessageRole


class MyAgent(A2AAgentMixin):
    """A simple agent with A2A support."""

    def __init__(self):
        super().__init__()
        self.setup_a2a(
            agent_id="my-agent-1",
            name="MyAgent",
            description="Example agent",
            port=8081
        )

    async def _handle_a2a_request(self, request):
        # Custom logic: reverse the message
        last_msg = request.messages[-1].content
        reversed_msg = last_msg[::-1]
        response_msg = A2AMessage(
            role=MessageRole.ASSISTANT,
            content=reversed_msg
        )
        return request.create_response(messages=[response_msg], finished=True)


async def main():
    # Create two agents
    agent1 = MyAgent()
    agent2 = MyAgent()

    # Start agent2's server in background
    import threading
    server_thread = threading.Thread(target=agent2.run_a2a_server, daemon=True)
    server_thread.start()
    await asyncio.sleep(1)  # Wait for server to start

    # Agent1 sends a message to agent2
    response = await agent1.send_a2a_message(
        target_url="http://localhost:8081",
        target_id="my-agent-2",
        message="Hello A2A!"
    )
    print(f"Response: {response.messages[0].content}")

    # Cleanup
    await agent1.a2a_client.close()


if __name__ == "__main__":
    asyncio.run(main())
