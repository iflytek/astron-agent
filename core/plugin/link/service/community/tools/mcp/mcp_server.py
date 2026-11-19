"""MCP (Model Context Protocol) server integration module.

This module provides FastAPI endpoints and utilities for interacting with MCP servers.
It handles tool listing, tool execution, and server management operations with proper
error handling, observability tracing, and security validations.
"""

import asyncio
import os
from typing import Any, Dict, Optional, Tuple

from common.otlp.log_trace.node_trace_log import NodeTraceLog, Status
from common.otlp.metrics.meter import Meter
from common.otlp.trace.span import Span
from fastapi import Body
from loguru import logger
from opentelemetry.trace import Status as OTelStatus
from opentelemetry.trace import StatusCode
from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
    MCPCallToolData,
    MCPCallToolRequest,
    MCPCallToolResponse,
    MCPInfo,
    MCPItemInfo,
    MCPToolListData,
    MCPToolListRequest,
    MCPToolListResponse,
    MCPTransport,
)
from plugin.link.consts import const
from plugin.link.domain.models.manager import get_db_engine
from plugin.link.infra.kafka_telemetry import send_telemetry_sync
from plugin.link.infra.tool_crud.process import ToolCrudOperation
from plugin.link.infra.tool_exector.ssrf_guard import (
    OutboundPolicyError,
    validate_resolved_destination_async,
)
from plugin.link.service.community.tools.mcp.mcp_transport import (
    MCPTransportError,
    initialized_mcp_session,
)
from plugin.link.utils.errors.code import ErrCode
from plugin.link.utils.sid.sid_generator2 import new_sid

_DISCOVERY_BUDGET_SECONDS = 20.0
_DISCOVERY_CLEANUP_SECONDS = 2.0


async def _reject_unsafe_mcp_url(url: str) -> ErrCode | None:
    """Return the public MCP error when a URL is not a safe outbound target."""
    try:
        await validate_resolved_destination_async(url)
    except OutboundPolicyError as exc:
        if exc.blocked:
            return ErrCode.MCP_SERVER_BLACKLIST_URL_ERR
        return ErrCode.MCP_SERVER_LOCAL_URL_ERR
    return None


async def _process_mcp_server_by_id(
    mcp_server_id: str,
    span_context: Any,
    transport: MCPTransport = MCPTransport.AUTO,
) -> MCPItemInfo:
    """Process a single MCP server by ID and return its tools."""
    err, url = get_mcp_server_url(mcp_server_id=mcp_server_id, span=span_context)
    if err is not ErrCode.SUCCESSES:
        return MCPItemInfo(
            server_id=mcp_server_id,
            server_status=err.code,
            server_message=err.msg,
            tools=[],
        )

    err = await _reject_unsafe_mcp_url(url)
    if err is not None:
        return MCPItemInfo(
            server_id=mcp_server_id,
            server_status=err.code,
            server_message=err.msg,
            tools=[],
        )

    return await _connect_and_get_tools(
        url, server_id=mcp_server_id, transport=transport
    )


async def _process_mcp_server_by_url(
    url: str, transport: MCPTransport = MCPTransport.AUTO
) -> MCPItemInfo:
    """Process a single MCP server by URL and return its tools."""
    err = await _reject_unsafe_mcp_url(url)
    if err is not None:
        return MCPItemInfo(
            server_url=str(url),
            server_status=err.code,
            server_message=err.msg,
            tools=[],
        )

    return await _connect_and_get_tools(url, server_url=url, transport=transport)


def _transport_error_code(error: MCPTransportError) -> ErrCode:
    """Map a transport setup phase to the existing public MCP error codes."""
    if error.phase == "initialization":
        return ErrCode.MCP_SERVER_INITIAL_ERR
    if error.phase == "session creation":
        return ErrCode.MCP_SERVER_SESSION_ERR
    return ErrCode.MCP_SERVER_CONNECT_ERR


async def _connect_and_get_tools(
    url: str,
    server_id: Optional[str] = None,
    server_url: Optional[str] = None,
    transport: MCPTransport = MCPTransport.AUTO,
) -> MCPItemInfo:
    """Connect to MCP server and retrieve tools."""
    try:
        async with initialized_mcp_session(url, transport) as (session, _):
            try:
                tools_dict = []
                cursor = None
                seen_cursors: set[str] = set()
                while True:
                    page = (
                        await session.list_tools(cursor=cursor)
                        if cursor
                        else await session.list_tools()
                    )
                    page_data = page.model_dump()
                    tools_dict.extend(page_data["tools"])
                    cursor = page_data.get("nextCursor")
                    if not cursor:
                        break
                    if cursor in seen_cursors:
                        raise ValueError("MCP returned a repeated pagination cursor")
                    seen_cursors.add(cursor)
                tools = []
                for tool in tools_dict:
                    tool_info = MCPInfo.model_validate(tool)
                    tools.append(tool_info)

                success = ErrCode.SUCCESSES
                return MCPItemInfo(
                    server_id=server_id,
                    server_url=server_url,
                    server_status=success.code,
                    server_message=success.msg,
                    tools=tools,
                )
            except Exception:
                err = ErrCode.MCP_SERVER_TOOL_LIST_ERR
                return MCPItemInfo(
                    server_id=server_id,
                    server_url=server_url,
                    server_status=err.code,
                    server_message=err.msg,
                    tools=[],
                )
    except MCPTransportError as error:
        err = _transport_error_code(error)
        return MCPItemInfo(
            server_id=server_id,
            server_url=server_url,
            server_status=err.code,
            server_message=err.msg,
            tools=[],
        )
    except Exception:
        err = ErrCode.MCP_SERVER_SESSION_ERR
        return MCPItemInfo(
            server_id=server_id,
            server_url=server_url,
            server_status=err.code,
            server_message=err.msg,
            tools=[],
        )


async def _cancel_discovery_tasks(
    tasks: list[asyncio.Task[None]], deadline: float
) -> None:
    """Close SDK contexts in their owning tasks, including stalled termination."""
    pending = {task for task in tasks if not task.done()}
    for task in pending:
        task.cancel()
    try:
        if pending:
            await asyncio.wait(
                pending, timeout=max(0.0, deadline - asyncio.get_running_loop().time())
            )
    finally:
        # SDK Streamable HTTP termination sends DELETE while unwinding. A second
        # cancellation interrupts a stalled DELETE after its cleanup allowance.
        for task in pending:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def _discover_servers(
    list_info: MCPToolListRequest, span_context: Any
) -> list[MCPItemInfo]:
    # The budget covers queued connections too, leaving room below the caller's
    # 30s timeout for cancellation, response serialization and network overhead.
    deadline = asyncio.get_running_loop().time() + _DISCOVERY_BUDGET_SECONDS
    semaphore = asyncio.Semaphore(4)
    targets = [("id", value) for value in dict.fromkeys(list_info.mcp_server_ids or [])]
    targets += [
        ("url", value)
        for value in dict.fromkeys(list_info.mcp_server_urls or [])
        if value.strip()
    ]

    results: list[MCPItemInfo | None] = [None] * len(targets)
    started = [False] * len(targets)

    def failed(index: int, failure: str, message: str) -> MCPItemInfo:
        kind, value = targets[index]
        # The request-local index identifies URL targets without logging secrets.
        logger.warning(
            "MCP discovery failed; target={} kind={} type={}", index, kind, failure
        )
        err = ErrCode.MCP_SERVER_CONNECT_ERR
        identity = {"server_id" if kind == "id" else "server_url": value}
        return MCPItemInfo(
            **identity, server_status=err.code, server_message=message, tools=[]
        )

    async def discover(index: int, kind: str, value: str) -> None:
        try:
            async with semaphore:
                started[index] = True
                if kind == "id":
                    results[index] = await _process_mcp_server_by_id(
                        value, span_context, list_info.transport
                    )
                else:
                    results[index] = await _process_mcp_server_by_url(
                        value, list_info.transport
                    )
        except Exception as exc:
            results[index] = failed(
                index, type(exc).__name__, ErrCode.MCP_SERVER_CONNECT_ERR.msg
            )

    tasks = [
        asyncio.create_task(discover(index, kind, value))
        for index, (kind, value) in enumerate(targets)
    ]
    if not tasks:
        return []
    try:
        await asyncio.wait(
            tasks,
            timeout=max(
                0.0,
                deadline
                - _DISCOVERY_CLEANUP_SECONDS
                - asyncio.get_running_loop().time(),
            ),
        )
    finally:
        await _cancel_discovery_tasks(tasks, deadline)

    return [
        (
            result
            if result is not None
            else failed(
                index,
                "TimeoutError" if started[index] else "QueueTimeout",
                (
                    "MCP discovery timed out; retry the connection"
                    if started[index]
                    else "MCP discovery budget exhausted before connection started; retry"
                ),
            )
        )
        for index, result in enumerate(results)
    ]


async def tool_list(list_info: MCPToolListRequest = Body()) -> MCPToolListResponse:
    """
    Get the list of tools.
    """
    session_id = new_sid()
    mcp_server_ids = list_info.mcp_server_ids
    mcp_server_urls = list_info.mcp_server_urls

    span = Span(
        app_id="appid_mcp",
        uid="mcp_uid",
    )

    if session_id:
        span.sid = session_id

    with span.start(func_name="tool_list") as span_context:
        logger.info(
            "MCP discovery started; servers={}",
            len(mcp_server_ids or []) + len(mcp_server_urls or []),
        )
        span_context.add_info_events(
            {"server_count": len(mcp_server_ids or []) + len(mcp_server_urls or [])}
        )
        span_context.set_attributes(attributes={"tool_id": "tool_list"})
        node_trace = NodeTraceLog(
            service_id="",
            sid=span_context.sid,
            app_id=span_context.app_id,
            uid=span_context.uid,
            chat_id=span_context.sid,
            sub="spark-link",
            caller="tool_list",
            log_caller="",
            question="MCP tool discovery",
        )
        m = Meter(app_id=span_context.app_id, func="tool_list")

        items = await _discover_servers(list_info, span_context)

        success = ErrCode.SUCCESSES
        result = MCPToolListResponse(
            code=success.code,
            message=success.msg,
            sid=session_id,
            data=MCPToolListData(servers=items),
        )
        span_context.add_info_events({"server_count": len(items)})
        if os.getenv(const.OTLP_ENABLE_KEY, "0").lower() == "1":
            m.in_success_count()
            node_trace.answer = "MCP discovery completed"
            node_trace.service_id = "tool_list"
            node_trace.log_caller = "mcp_type"
            node_trace.status = Status(
                code=success.code,
                message=success.msg,
            )
            send_telemetry_sync(node_trace)
        return result


def _create_error_response(err: ErrCode, session_id: str) -> MCPCallToolResponse:
    """Create a standardized error response for MCP call tool failures."""
    return MCPCallToolResponse(
        code=err.code,
        message=err.msg,
        sid=session_id,
        data=MCPCallToolData(isError=True, content=[]),
    )


def _log_error_to_kafka(
    err: ErrCode, node_trace: NodeTraceLog, mcp_server_id: str, m: Meter
) -> None:
    """Log error information to Kafka if OTLP is enabled."""
    if os.getenv(const.OTLP_ENABLE_KEY, "0").lower() == "1":
        m.in_error_count(err.code)
        node_trace.answer = err.msg
        node_trace.service_id = mcp_server_id
        node_trace.status = Status(
            code=err.code,
            message=err.msg,
        )
        send_telemetry_sync(node_trace)


async def _execute_tool_call(
    session: Any,
    tool_name: str,
    tool_args: Dict[str, Any],
    session_id: str,
    span_context: Any,
    node_trace: NodeTraceLog,
    mcp_server_id: str,
    m: Meter,
) -> MCPCallToolData | MCPCallToolResponse:
    """Preserve the official SDK result rather than reimplementing content DTOs."""
    try:
        call_result = await session.call_tool(tool_name, arguments=tool_args)
        return MCPCallToolData.model_validate(call_result.model_dump())
    except Exception:
        err = ErrCode.MCP_SERVER_CALL_TOOL_ERR
        span_context.add_error_event(err.msg)
        span_context.set_status(OTelStatus(StatusCode.ERROR))
        _log_error_to_kafka(err, node_trace, mcp_server_id, m)
        return _create_error_response(err, session_id)


async def _call_mcp_tool(
    url: str,
    tool_name: str,
    tool_args: Dict[str, Any],
    session_id: str,
    span_context: Any,
    node_trace: NodeTraceLog,
    mcp_server_id: str,
    m: Meter,
    transport: MCPTransport = MCPTransport.AUTO,
) -> MCPCallToolResponse:
    """Execute the actual MCP tool call with proper error handling."""
    try:
        async with initialized_mcp_session(url, transport) as (session, _):
            call_result = await _execute_tool_call(
                session,
                tool_name,
                tool_args,
                session_id,
                span_context,
                node_trace,
                mcp_server_id,
                m,
            )

            if isinstance(call_result, MCPCallToolResponse):
                return call_result

            success = ErrCode.SUCCESSES
            return MCPCallToolResponse(
                code=success.code,
                message=success.msg,
                sid=session_id,
                data=call_result,
            )
    except MCPTransportError as error:
        err = _transport_error_code(error)
        span_context.add_error_event(err.msg)
        span_context.set_status(OTelStatus(StatusCode.ERROR))
        _log_error_to_kafka(err, node_trace, mcp_server_id, m)
        return _create_error_response(err, session_id)
    except Exception:
        err = ErrCode.MCP_SERVER_SESSION_ERR
        span_context.add_error_event(err.msg)
        span_context.set_status(OTelStatus(StatusCode.ERROR))
        _log_error_to_kafka(err, node_trace, mcp_server_id, m)
        return _create_error_response(err, session_id)


async def _validate_and_get_url(
    call_info: MCPCallToolRequest, session_id: str, span_context: Any, m: Meter
) -> Tuple[ErrCode, str]:
    """Validate URL and get it from database if needed."""
    url = call_info.mcp_server_url

    # Get URL from database if not provided
    if not url:
        err, url = get_mcp_server_url(
            mcp_server_id=call_info.mcp_server_id, span=span_context
        )
        if err is not ErrCode.SUCCESSES:
            if os.getenv(const.OTLP_ENABLE_KEY, "0").lower() == "1":
                m.in_error_count(err.code)
            return err, ""

    err = await _reject_unsafe_mcp_url(url)
    if err is not None:
        if os.getenv(const.OTLP_ENABLE_KEY, "0").lower() == "1":
            m.in_error_count(err.code)
        return err, ""

    return ErrCode.SUCCESSES, url


async def call_tool(call_info: MCPCallToolRequest = Body()) -> MCPCallToolResponse:
    """
    Call a tool.
    """
    session_id = new_sid()
    mcp_server_id = call_info.mcp_server_id
    tool_name = call_info.tool_name
    tool_args = call_info.tool_args

    span = Span(
        app_id="appid_mcp",
        uid="mcp_uid",
    )

    if session_id:
        span.sid = session_id

    with span.start(func_name="call_tool") as span_context:
        logger.info("MCP call started; server_id={}, tool={}", mcp_server_id, tool_name)
        span_context.add_info_events({"tool_name": tool_name})
        span_context.set_attributes(attributes={"tool_id": str(mcp_server_id)})
        node_trace = NodeTraceLog(
            service_id="",
            sid=span_context.sid,
            app_id=span_context.app_id,
            uid=span_context.uid,
            chat_id=span_context.sid,
            sub="spark-link",
            caller="call_tool",
            log_caller="",
            question=tool_name,
        )
        m = Meter(app_id=span_context.app_id, func="call_tool")

        # Validate URL and get it from database if needed
        err, url = await _validate_and_get_url(call_info, session_id, span_context, m)
        if err is not ErrCode.SUCCESSES:
            if not call_info.mcp_server_url:
                node_trace.answer = err.msg
            return _create_error_response(err, session_id)

        # Call the MCP tool
        result = await _call_mcp_tool(
            url,
            tool_name,
            tool_args,
            session_id,
            span_context,
            node_trace,
            mcp_server_id,
            m,
            call_info.transport,
        )
        span_context.add_info_events(
            {"code": result.code, "is_error": result.data.isError}
        )
        if result.code == ErrCode.SUCCESSES.code and result.data.isError:
            span_context.set_status(OTelStatus(StatusCode.ERROR))
            _log_error_to_kafka(
                ErrCode.MCP_SERVER_CALL_TOOL_ERR, node_trace, mcp_server_id, m
            )
        elif (
            result.code == ErrCode.SUCCESSES.code
            and os.getenv(const.OTLP_ENABLE_KEY, "0").lower() == "1"
        ):
            m.in_success_count()
            node_trace.answer = "MCP call completed"
            node_trace.service_id = mcp_server_id
            node_trace.log_caller = "mcp_type"
            node_trace.status = Status(
                code=ErrCode.SUCCESSES.code, message=ErrCode.SUCCESSES.msg
            )
            send_telemetry_sync(node_trace)

        return result


def get_mcp_server_url(mcp_server_id: str, span: Span) -> Tuple[ErrCode, str]:
    """Retrieve MCP server URL from database by server ID.

    Args:
        mcp_server_id: Unique identifier for the MCP server
        span: OpenTelemetry span for tracing

    Returns:
        Tuple containing error code and server URL string
    """
    if not mcp_server_id:
        return (ErrCode.MCP_SERVER_ID_EMPTY_ERR, "")

    tool_id_info = [{"app_id": "1232223", "tool_id": mcp_server_id}]
    try:
        crud_inst = ToolCrudOperation(get_db_engine())
        query_results = crud_inst.get_tools(tool_id_info, span=span)
    except Exception:
        return (ErrCode.MCP_CRUD_OPERATION_FAILED_ERR, "")

    if not query_results:
        return (ErrCode.MCP_SERVER_NOT_FOUND_ERR, "")

    mcp_server = ""
    for query_result in query_results:
        result_dict = query_result.dict()
        if result_dict.get("tool_id", "") != mcp_server_id:
            continue

        # Database extension mcp_server_url stores MCP URL data
        mcp_server = result_dict.get("mcp_server_url", "")
        break

    if not mcp_server:
        return (ErrCode.MCP_SERVER_URL_EMPTY_ERR, mcp_server)

    return (ErrCode.SUCCESSES, mcp_server)
