from starlette.responses import JSONResponse

from workflow.domain.entities.response import Resp
from workflow.exception.errors.err_code import CodeEnum

"""
The paths that need to be authenticated
"""
AUTH_OPEN_API_PATHS = [
    "/v1/publish",
    "/v1/auth",
    "/workflow/v1/publish",
    "/workflow/v1/auth",
]

"""
The paths that need to be authenticated for chat
"""
CHAT_OPEN_API_PATHS = [
    "/workflow/v1/chat/completions",
    "/workflow/v1/resume",
]

"""
The paths that not need to be authenticated for chat debug
"""
CHAT_DEBUG_API_PATHS = [
    "/workflow/v1/debug/chat/completions",
    "/workflow/v1/debug/resume",
]


class JSONResponseBase:
    """
    Base class for JSON responses.
    """

    @staticmethod
    def generate_error_response(
        url_path: str,
        error_message: str,
        sid: str,
        code: int = CodeEnum.PARAM_ERROR.code,
    ) -> JSONResponse:
        """
        Generate an error response.
        :param url_path: The path of the request
        :param error_message: The error message
        :param sid: The session ID
        :param code: The error code
        :return: The error response
        """

        # Handle chat endpoints with SSE response format for real-time communication
        if url_path in CHAT_OPEN_API_PATHS or url_path in CHAT_DEBUG_API_PATHS:
            return Resp.error_sse(code, error_message, sid)

        # Handle other endpoints with standard JSON response format
        else:
            return Resp.error(code, error_message, sid)
