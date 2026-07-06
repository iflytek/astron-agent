import asyncio
import logging
from astron_agent.agents.a2a_agent import A2AAgent

logging.basicConfig(level=logging.INFO)


async def main():
    # Create two agents
    agent1 = A2AAgent(agent_id="agent1", capabilities=["compute", "storage"])
    agent2 = A2AAgent(agent_id="agent2", capabilities=["analysis"])

    # Start listening in background
    task1 = asyncio.create_task(agent1.start())
    task2 = asyncio.create_task(agent2.start())

    # Agent1 sends a request to Agent2
    await agent1.send_request("agent2", {"task": "analyze_data", "data": [1, 2, 3]})

    # Allow time for processing
    await asyncio.sleep(2)

    # Cancel tasks
    task1.cancel()
    task2.cancel()


if __name__ == "__main__":
    asyncio.run(main())
