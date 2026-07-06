import json
import requests
from typing import Callable, Dict, Optional
from .message import A2AMessage

class A2AAgent:
    def __init__(self, agent_id: str, host: str = "0.0.0.0", port: int = 8000):
        self.agent_id = agent_id
        self.host = host
        self.port = port
        self.message_handlers: Dict[str, Callable] = {}

    def register_handler(self, message_type: str, handler: Callable):
        self.message_handlers[message_type] = handler

    def send_message(self, message: A2AMessage, target_url: str) -> bool:
        try:
            response = requests.post(
                f"{target_url}/a2a/message",
                json=json.loads(message.to_json()),
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def handle_message(self, message: A2AMessage) -> Optional[str]:
        handler = self.message_handlers.get(message.message_type)
        if handler:
            return handler(message)
        return None

    def start(self):
        # In production, would start a web server (e.g., Flask/FastAPI)
        # For brevity, placeholder
        print(f"Agent {self.agent_id} listening on {self.host}:{self.port}")
