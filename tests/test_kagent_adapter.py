"""Tests for Kagent A2A adapter."""

import unittest
from unittest.mock import MagicMock
from astron_agent.a2a.kagent_adapter import KagentA2AAdapter
from astron_agent.a2a.protocol import A2AMessage


class TestKagentA2AAdapter(unittest.TestCase):

    def test_handle_query(self):
        mock_kagent = MagicMock()
        mock_kagent.query.return_value = "some result"
        adapter = KagentA2AAdapter(mock_kagent, agent_id="kagent-1")
        msg = A2AMessage(
            sender_id="requester",
            receiver_id="kagent-1",
            intent="query",
            payload={"query": "What's the weather?"}
        )
        response = adapter.handle_message(msg)
        mock_kagent.query.assert_called_once_with("What's the weather?")
        self.assertEqual(response.payload, {"response": "some result"})

    def test_handle_execute(self):
        mock_kagent = MagicMock()
        mock_kagent.execute.return_value = "executed"
        adapter = KagentA2AAdapter(mock_kagent, agent_id="kagent-1")
        msg = A2AMessage(
            sender_id="requester",
            receiver_id="kagent-1",
            intent="execute",
            payload={"action": "send_email", "params": {"to": "test@test.com"}}
        )
        response = adapter.handle_message(msg)
        mock_kagent.execute.assert_called_once_with("send_email", to="test@test.com")
        self.assertEqual(response.payload, {"result": "executed"})


if __name__ == '__main__':
    unittest.main()
