from enum import Enum
from typing import Tuple


class BaseCodeEnum:
    value: Tuple[int, str]

    @property
    def code(self) -> int:
        """Get code"""
        return self.value[0]

    @property
    def message(self) -> str:
        """Get message"""
        return self.value[1]


class CodeEnums(BaseCodeEnum, Enum):
    """45000 ~ 46000"""

    ServiceInernalError = (45000, "服务通用错误")
    ServiceParamsError = (45001, "服务参数错误")
    ServiceResponseError = (45002, "服务响应错误")

    ServiceLocalError = (45010, "本地服务错误")

    HTTPClientError = (45100, "HTTP客户端错误")
    HTTPClientConnectionError = (45101, "HTTP客户端连接错误")
    HTTPClientAuthError = (45102, "HTTP客户端认证错误")

    WebSocketClientError = (45200, "WebSocket客户端错误")
    WebSocketClientAuthError = (45201, "WebSocket客户端认证错误")
    WebSocketClientNotConnectedError = (45202, "WebSocket客户端未连接错误")
    WebSocketClientDataFormatError = (45203, "WebSocket客户端数据格式错误")
    WebSocketClientSendLoopError = (45204, "WebSocket客户端发送循环错误")
    WebSocketClientRecvLoopError = (45205, "WebSocket客户端接收循环错误")

    RouteGetMethodParamsError = (46000, "路由GET方法参数错误")
