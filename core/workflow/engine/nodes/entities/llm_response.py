from typing import Any


class LLMResponse:
    """
    Response wrapper for Large Language Model (LLM) interactions.

    This class encapsulates the response message from an LLM provider,
    providing a standardized interface for handling LLM responses.

    :param msg: Dictionary containing the LLM response message
    """

    def __init__(self, msg: dict[Any, Any]) -> None:
        """
        Initialize LLM response with message data.

        :param msg: Dictionary containing the LLM response message
        """
        self.msg = msg

    def __repr__(self) -> str:
        """
        String representation of the LLM response.

        :return: String representation of the response
        """
        return f"LLMResponse(msg='{self.msg}')"
