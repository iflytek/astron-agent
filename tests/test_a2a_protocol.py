"""Tests for A2A protocol core and Kagent adapter."""

import unittest
from a2a_protocol import A2AAgent, A2AMessage, A2ARouter, MessageType


class TestA2AAgent(unittest.TestCase):
    """Test A2A agent core functionality."""

    def setUp(self):
        self.agent1 = A2AAgent("agent1", "Agent One")
        self.agent2 = A2AAgent("agent2", "Agent Two")
        self.router = A2ARouter()
        self.router.register_agent(self.agent1)
        self.router.register_agent(self.agent2)

    def test_message_creation(self):
        msg = A2AMessage(
            sender_id="test",
            target_id="agent1",
            message_type=MessageType.REQUEST,
            payload={"query": "hello"},
        )
        self.assertEqual(msg.sender_id, "test")
        self.assertEqual(msg.message_type, MessageType.REQUEST)

    def test_serialization_roundtrip(self):
        msg = A2AMessage(
            sender_id="s1",
            target_id="t1",
            message_type=MessageType.RESPONSE,
            payload={"data": 42},
            metadata={"timestamp": "123"},
        )
        d = msg.to_dict()
        msg2 = A2AMessage.from_dict(d)
        self.assertEqual(msg.sender_id, msg2.sender_id)
        self.assertEqual(msg.target_id, msg2.target_id)
        self.assertEqual(msg.message_type, msg2.message_type)
        self.assertEqual(msg.payload, msg2.payload)

    def test_agent_send_and_route(self):
        # Setup agent2 to respond to requests
        def echo_handler(agent, message):
            return A2AMessage(
                sender_id=agent.agent_id,
                target_id=message.sender_id,
                message_type=MessageType.RESPONSE,
                payload={"echo": message.payload},
            )
        self.agent2.register_handler(MessageType.REQUEST, echo_handler)

        # Agent1 sends a message to agent2
        msg = A2AMessage(
            sender_id="agent1",
            target_id="agent2",
            message_type=MessageType.REQUEST,
            payload={"text": "ping"},
        )
        response = self.router.route_message(msg)
        self.assertIsNotNone(response)
        self.assertEqual(response.sender_id, "agent2")
        self.assertEqual(response.target_id, "agent1")
        self.assertEqual(response.payload, {"echo": {"text": "ping"}})

    def test_unknown_target(self):
        msg = A2AMessage(
            sender_id="agent1",
            target_id="ghost",
            message_type=MessageType.REQUEST,
        )
        response = self.router.route_message(msg)
        self.assertIsNotNone(response)
        self.assertEqual(response.message_type, MessageType.ERROR)
        self.assertIn("not found", response.payload["error"])


class TestKagentAdapter(unittest.TestCase):
    """Test Kagent adapter."""

    class FakeKagent:
        def __init__(self, name="FakeKagent"):
            self.name = name

        def run(self, input_text):
            return f"Processed: {input_text}"

    def test_adapter_creation(self):
        fake = self.FakeKagent()
        adapter = KagentAgentAdapter(fake, agent_id="kagent1")
        self.assertEqual(adapter.agent_id, "kagent1")
        self.assertEqual(adapter.name, "kagent1")

    def test_adapter_handles_request(self):
        fake = self.FakeKagent()
        adapter = KagentAgentAdapter(fake, agent_id="kagent1")
        # Simulate incoming request
        request = A2AMessage(
            sender_id="user",
            target_id="kagent1",
            message_type=MessageType.REQUEST,
            payload={"prompt": "Hello"},
        )
        response = adapter.receive_message(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.sender_id, "kagent1")
        self.assertEqual(response.message_type, MessageType.RESPONSE)
        self.assertEqual(response.payload, {"output": "Processed: Hello"})

    def test_adapter_missing_input(self):
        fake = self.FakeKagent()
        adapter = KagentAgentAdapter(fake, agent_id="kagent1")
        request = A2AMessage(
            sender_id="user",
            target_id="kagent1",
            message_type=MessageType.REQUEST,
            payload={},
        )
        response = adapter.receive_message(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.message_type, MessageType.ERROR)


if __name__ == "__main__":
    unittest.main()
