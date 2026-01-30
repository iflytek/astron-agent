import json

from common.otlp.trace.span import SPAN_SIZE_LIMIT
from plugin.aitools.api.schemas.types import ErrorResponse
from plugin.aitools.common.clients.adapters import ClientT, SpanLike
from plugin.aitools.common.log.logger import log


def add_info(span: SpanLike, key: str, value: str) -> None:
    if len(value) >= SPAN_SIZE_LIMIT:
        value = f"{value[:SPAN_SIZE_LIMIT // 2]}...{len(value) - SPAN_SIZE_LIMIT // 2}"
    span.add_info_events({key: value})


class WebSocketSpanHooks:
    def setup(self, client: ClientT, span: SpanLike) -> None:
        try:
            span.set_attributes(
                {
                    "ws_url": client.url,
                    "ws_params": json.dumps(
                        client.ws_params, indent=2, ensure_ascii=False
                    ),
                    "ws_kwargs": json.dumps(
                        client.kwargs, indent=2, ensure_ascii=False
                    ),
                }
            )
        except Exception as e:
            log.exception(
                f"Failed to set attributes for span in WebSocketSpanHooks: {e}"
            )

    async def teardown(self, client: ClientT, span: SpanLike) -> None:
        try:
            if client.send_data_list:
                send_data = json.dumps(
                    client.send_data_list, indent=2, ensure_ascii=False
                )
                add_info(span, "Send data", send_data)
            if client.recv_data_list:
                recv_data = json.dumps(
                    client.recv_data_list, indent=2, ensure_ascii=False
                )
                add_info(span, "Recv data", recv_data)

            await client.close()
        except Exception as e:
            log.exception(
                f"Failed to add info events for span in WebSocketSpanHooks: {e}"
            )


class HttpSpanHooks:
    def setup(self, client: ClientT, span: SpanLike) -> None:
        try:
            span.set_attributes(
                {"Request URL": client.url, "Request method": client.method}
            )

            kwargs_str = json.dumps(client.kwargs, indent=2, ensure_ascii=False)
            add_info(span, "Request kwargs", kwargs_str)
        except Exception as e:
            log.exception(f"Failed to set attributes for span in HttpSpanHooks: {e}")

    async def teardown(self, client: ClientT, span: SpanLike) -> None:
        try:
            if isinstance(client.response, ErrorResponse):
                response_str = client.response.model_dump_json()
            elif isinstance(client.response.data.get("content", None), bytes):
                response_str = (
                    f"Binary data, length: {len(client.response.data['content'])}"
                )
            else:
                response_str = client.response.model_dump_json()
            add_info(span, "Response", response_str)
        except Exception as e:
            log.exception(f"Failed to add info events for span in HttpSpanHooks: {e}")
