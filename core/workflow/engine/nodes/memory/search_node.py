from datetime import datetime
from typing import Any, Dict

from pydantic import Field

from workflow.engine.nodes.memory.base import MemoryNode


class MemorySearchNode(MemoryNode):
    """
    Node for searching messages in a memory repository.
    """

    limit: int = Field(..., description="Number of search results to return")

    @property
    def api_path(self) -> str:
        """
        API path for searching messages in the memory service.
        :return: API path as a string
        """
        return "/v1/memory/search"

    def build_payload(self, uid: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build the request payload for searching messages in the memory service.
        :param inputs: Input data for the request
        :return: Payload dictionary
        """
        return {
            "repo_id": self.repo_id,
            **({"project_id": self.project_id} if self.project_id else {}),
            "uid": uid,
            "query": inputs.get("input", ""),
            "limit": self.limit,
        }

    def parse_response(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the response from the memory service after searching messages.
        :param raw_data: Raw response data from the API
        :return: Parsed search results
        """

        def _fmt_time(ts: int | None) -> str:
            return (
                datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S") if ts else ""
            )

        results = []
        pref_results = []
        event_results = []
        data = raw_data.get("data", {})
        if "preference" in data:
            for item in data.get("preference", []):
                pref_results.append(
                    {
                        "value": item.get("data", ""),
                        "date": _fmt_time(item.get("update_time")),
                    }
                )
        if "event" in data:
            for item in data.get("event", []):
                event_results.append(
                    {
                        "value": item.get("data", ""),
                        "date": _fmt_time(item.get("update_time")),
                    }
                )
        pref_len = len(pref_results)
        event_len = len(event_results)
        half = self.limit // 2
        pref_take = min(pref_len, half)
        event_take = min(event_len, self.limit - pref_take)
        if event_take < self.limit - pref_take:
            pref_take = min(pref_len, self.limit - event_take)

        results = pref_results[:pref_take] + event_results[:event_take]
        return {"memory": results}
