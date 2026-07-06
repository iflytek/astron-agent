import unittest
from a2a import A2AMessage, A2AHandler
from agent import AstronAgent


class TestA2AProtocol(unittest.TestCase):
    def test_message_serialization(self):
        msg = A2AMessage(sender="agent1", recipient="agent2", action="greet", payload={"text": "hello"})
        json_str = msg.to_json()
        recovered = A2AMessage.from_json(json_str)
        self.assertEqual(msg.sender, recovered.sender)
        self.assertEqual(msg.payload, recovered.payload)

    def test_agent_ping(self):
        agent = AstronAgent("test_agent")
        request = A2AMessage(sender="other", recipient="test_agent", action="ping")
        response = agent.process_incoming_a2a(request.to_json())
        response_msg = A2AMessage.from_json(response)
        self.assertEqual(response_msg.action, "ping_response")
        self.assertEqual(response_msg.payload["result"]["status"], "ok")


if __name__ == '__main__':
    unittest.main()
