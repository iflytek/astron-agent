"""
Async WebSocket client for AiTools.

This module provides a WebSocket client for AiTools.
"""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, List, Optional

import websockets
from common.utils.hmac_auth import HMACAuth
from plugin.aitools.common.clients.adapters import (
    InstrumentedClient,
    NoOpSpanAdapter,
    SpanLike,
)
from plugin.aitools.common.clients.hooks import WebSocketSpanHooks
from plugin.aitools.common.clients.task_factory import AsyncIOTaskFactory, TaskFactory
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import WebSocketClientException
from plugin.aitools.common.log.logger import log


class WebSocketClient(InstrumentedClient):
    """Async WebSocket client

    Args:
        url(str): WebSocket URL.
        ws_params(dict): WebSocket parameters.
        auth(str): Authentication method, "ASE" for ASE authentication.
        api_key(str): ASE API key.
        api_secret(str): ASE API secret.
        method(str): HTTP method, "GET" or "POST".
    """

    span_name = "WebSocket Client"
    span_hooks = WebSocketSpanHooks()

    def __init__(
        self,
        url: str,
        ws_params: Optional[Dict[str, Any]] = None,
        span: Optional[SpanLike] = None,
        task_factory: Optional[TaskFactory] = None,
        **kwargs: Any,
    ) -> None:
        self.url = url
        self.kwargs = kwargs
        self.ws_params = ws_params or {}
        self.parent_span = span or NoOpSpanAdapter()
        self.task_factory = task_factory or AsyncIOTaskFactory()

        self.ws: websockets.WebSocketClientProtocol
        self.send_queue: asyncio.Queue[Any] = asyncio.Queue()
        self.recv_queue: asyncio.Queue[Any] = asyncio.Queue()
        self.send_data_list: List = []
        self.recv_data_list: List = []
        self._running = False
        self._tasks: List[asyncio.Task] = []

        self.send_interval = 0.01
        self._auth()

    @asynccontextmanager
    async def start(self) -> AsyncIterator["WebSocketClient"]:
        """Start async WebSocket client"""
        await self.connect()
        yield self

    def _auth(self) -> None:
        """Build WebSocket URL"""
        try:
            if "auth" in self.kwargs and self.kwargs["auth"] == "ASE":

                method = self.kwargs.get("method", "GET")
                api_key = self.kwargs.get("api_key", "")
                api_secret = self.kwargs.get("api_secret", "")
                new_url = HMACAuth.build_auth_request_url(
                    self.url, method, api_key, api_secret
                )

                if new_url is None:
                    log.error("WebSocket auth failed")
                    raise WebSocketClientException.from_error_code(
                        CodeEnums.WebSocketClientAuthError, extra_message="ASE 鉴权失败"
                    )

                self.url = new_url
        except Exception:
            raise

    async def connect(self) -> None:
        """Connect to WebSocket server"""
        try:
            self.ws = await websockets.connect(self.url, **self.ws_params)
            self._running = True
        except Exception as e:
            raise WebSocketClientException.from_error_code(
                CodeEnums.WebSocketClientNotConnectedError, extra_message=str(e)
            )

        self._tasks.append(self.task_factory.create(self._send_loop()))
        self._tasks.append(self.task_factory.create(self._recv_loop()))

    async def send(self, data: Any) -> None:
        """Send data to WebSocket server"""
        self.send_data_list.append(data)
        if not self._running:
            raise WebSocketClientException.from_error_code(
                CodeEnums.WebSocketClientNotConnectedError,
                extra_message="WebSocket 未连接",
            )
        else:
            if isinstance(data, str) or isinstance(data, bytes):
                await self.send_queue.put(data)
            elif isinstance(data, dict) or isinstance(data, list):
                await self.send_queue.put(json.dumps(data))
            else:
                raise WebSocketClientException.from_error_code(
                    CodeEnums.WebSocketClientDataFormatError,
                    extra_message="WebSocket 数据格式错误",
                )

    async def recv(self) -> AsyncIterator[Any]:
        """Receive data from WebSocket server"""
        while self._running:
            try:
                msg = self.recv_queue.get_nowait()
                if msg is None:
                    break
                if isinstance(msg, BaseException):
                    raise msg
                self.recv_data_list.append(msg)
                yield msg
            except asyncio.QueueEmpty:
                await asyncio.sleep(0.01)
            except WebSocketClientException:
                raise
            except Exception as e:
                raise WebSocketClientException.from_error_code(
                    CodeEnums.WebSocketClientRecvLoopError, extra_message=str(e)
                )

    async def _send_loop(self) -> None:
        """Send loop"""
        try:
            while self._running:
                data = self.send_queue.get_nowait()
                if data == "EOF":
                    break
                await self.ws.send(data)
                await asyncio.sleep(self.send_interval)
        except asyncio.QueueEmpty:
            await asyncio.sleep(0.01)
        except websockets.exceptions.ConnectionClosedOK as e:
            log.info(f"WebSocket closed normally: {e}")
        except websockets.exceptions.ConnectionClosedError as e:
            await self.recv_queue.put(
                WebSocketClientException.from_error_code(
                    CodeEnums.WebSocketClientNotConnectedError, extra_message=str(e)
                )
            )
        except asyncio.CancelledError:
            # Ignore cancel error
            pass
        except Exception as e:
            await self.recv_queue.put(
                WebSocketClientException.from_error_code(
                    CodeEnums.WebSocketClientSendLoopError, extra_message=str(e)
                )
            )

    async def _recv_loop(self) -> None:
        """Receive loop"""
        try:
            while self._running:
                data = await self.ws.recv()
                await self.recv_queue.put(data)
        except websockets.exceptions.ConnectionClosedOK as e:
            log.info(f"WebSocket closed normally: {e}")
        except websockets.exceptions.ConnectionClosedError as e:
            await self.recv_queue.put(
                WebSocketClientException.from_error_code(
                    CodeEnums.WebSocketClientNotConnectedError, extra_message=str(e)
                )
            )
        except asyncio.CancelledError:
            # Ignore cancel error
            pass
        except Exception as e:
            await self.recv_queue.put(
                WebSocketClientException.from_error_code(
                    CodeEnums.WebSocketClientRecvLoopError, extra_message=str(e)
                )
            )
        finally:
            await self.recv_queue.put(None)

    async def close(self) -> None:
        """Close WebSocket connection"""
        if not self._running:
            return

        self._running = False

        await self.send_queue.put("EOF")

        await self.ws.close()

        for task in self._tasks:
            task.cancel()

        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
