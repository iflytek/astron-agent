import json
from dataclasses import dataclass, asdict
from typing import Optional, Any


class A2AError(Exception):
    pass


@dataclass
class A2AMessage:
    sender: str
    recipient: str
    action: str
    payload: Optional[dict] = None
    message_id: Optional[str] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, data: str) -> 'A2AMessage':
        try:
            obj = json.loads(data)
            return cls(**obj)
        except (TypeError, ValueError) as e:
            raise A2AError(f"Invalid A2A message: {e}")

    def validate(self) -> bool:
        if not self.sender or not self.recipient or not self.action:
            return False
        return True
