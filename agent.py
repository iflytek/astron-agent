'''
Example integration of A2A support into an agent.
Assumes agent has a method to send/receive messages.
'''
from a2a import A2AMessage, A2AHandler
from a2a.protocol import A2AError
import json


class AstronAgent:
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.a2a_handler = A2AHandler(agent_id)
        self._register_default_handlers()

    def _register_default_handlers(self):
        def ping(payload):
            return {"status": "ok"}
        self.a2a_handler.register_handler("ping", ping)

    def process_incoming_a2a(self, raw_message: str) -> str:
        try:
            message = A2AMessage.from_json(raw_message)
            return self.a2a_handler.handle_message(message)
        except A2AError as e:
            error_response = A2AMessage(
                sender=self.agent_id,
                recipient="unknown",
                action="error",
                payload={"error": str(e)}
            )
            return error_response.to_json()

    def send_a2a(self, recipient: str, action: str, payload: dict = None) -> str:
        message = A2AMessage(
            sender=self.agent_id,
            recipient=recipient,
            action=action,
            payload=payload
        )
        # In real implementation, this would send over network
        return message.to_json()
