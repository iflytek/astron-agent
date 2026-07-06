"""Tests for A2A protocol implementation."""

import json
import unittest
from astron_agent.a2a.protocol import A2AMessage, A2AAgent


class TestA2AMessage(unittest.TestCase):

    def test_to_from_dict(self):
        msg = A2AMessage(
            sender_id="agent1",
            receiver_id="agent2",
            intent="greet",
            payload={"text": "Hello"}
        )
        d = msg.to_dict()
        self.assertEqual(d["sender_id"], "agent1")
        msg2 = A2AMessage.from_dict(d)
        self.assertEqual(msg2.sender_id, "agent1")
        self.assertEqual(msg2.payload, {"text": "Hello"})

    def test_to_from_json(self):
        msg = A2AMessage(
            sender_id="agent1",
            receiver_id="agent2",
            intent="greet",
            payload={"text": "Hello"}
        )
        json_str = msg.to_json()
        msg2 = A2AMessage.from_json(json_str)
        self.assertEqual(msg2.sender_id, "agent1")
        self.assertEqual(msg2.payload, {"text": "Hello"})


class TestA2AAgent(unittest.TestCase):

    def test_register_and_handle(self):
        agent = A2AAgent("test-agent")
        agent.register_handler("echo", lambda msg: msg.payload)
        msg = A2AMessage(
            sender_id="other",
            receiver_id="test-agent",
            intent="echo",
            payload={"data": 123}
        )
        response = agent.handle_message(msg)
        self.assertEqual(response.payload, {"data": 123})
        self.assertEqual(response.receiver_id, "other")
        self.assertIn("_response", response.intent)

    def test_no_handler_raises(self):
        agent = A2AAgent("test-agent")
        msg = A2AMessage(
            sender_id="other",
            receiver_id="test-agent",
            intent="unknown",
            payload={}
        )
        with self.assertRaises(ValueError):
            agent.handle_message(msg)


if __name__ == '__main__':
    unittest.main()
