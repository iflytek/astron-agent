from typing import Any, Dict

from workflow.engine.nodes.memory.base import MemoryNode


class MemoryAddNode(MemoryNode):
    """
    Node for adding messages to a memory repository.
    """

    @property
    def api_path(self) -> str:
        """
        API path for adding messages to the memory service.
        :return: API path as a string
        """
        return "/v1/chat/add"

    def build_payload(self, uid: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build the request payload for adding a message to the memory service.
        :param inputs: Input data for the request
        :return: Payload dictionary
        """
        return {
            "repo_id": self.repo_id,
            **({"project_id": self.project_id} if self.project_id else {}),
            "uid": uid,
            "message": [
                {
                    "role": inputs.get("role"),
                    "content": inputs.get("content"),
                }
            ],
            "store_message": True,
        }

    def parse_response(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the response from the memory service after adding a message.
        :param raw_data: Raw response data from the API
        :return: Parsed result indicating success and message
        """
        return {
            "isSuccess": True,
            "message": raw_data.get("message", ""),
        }
