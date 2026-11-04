import asyncio
import json
import os
import time
from typing import Any, cast

import aiohttp
from common.otlp.trace.span import Span
from pydantic import BaseModel, Field

from agent.exceptions.plugin_exc import GetMcpPluginExc, RunMcpPluginExc
from agent.service.plugin.base import BasePlugin, PluginResponse


class McpPlugin(BasePlugin):
    server_id: str = Field(default="")
    server_url: str = Field(default="")


class McpPluginRunner(BaseModel):
    server_id: str
    server_url: str
    sid: str
    name: str

    async def run(self, action_input: dict, span: Span) -> Any:
        with span.start("Run") as sp:
            start_time = int(round(time.time() * 1000))
            data = {
                "mcp_server_id": self.server_id,
                "mcp_server_url": self.server_url,
                "tool_name": self.name,
                "tool_args": action_input,
                "sid": sp.sid,
            }
            sp.add_info_events({"server_id": self.server_id, "tool_name": self.name})
            try:
                run_url = os.getenv("RUN_MCP_PLUGIN_URL")
                if not run_url:
                    raise RunMcpPluginExc("RUN_MCP_PLUGIN_URL is not set")
                async with aiohttp.ClientSession() as session:
                    timeout = aiohttp.ClientTimeout(
                        total=int(os.getenv("MCP_CALL_TIMEOUT", "90"))
                    )
                    async with session.post(
                        run_url,
                        json=data,
                        headers={"Content-Type": "application/json"},
                        timeout=timeout,
                    ) as response:
                        response.raise_for_status()
                        if response.status == 200:
                            resp = await response.json()
                            sp.add_info_events({"mcp-response-received": True})
                        else:
                            sp.add_info_events(
                                attributes={
                                    "mcp-plugin-run-outputs": (
                                        f"response code is {response.status}"
                                    )
                                }
                            )
                            raise RunMcpPluginExc
            except (asyncio.TimeoutError, aiohttp.ClientError, ValueError):
                raise RunMcpPluginExc from None

            end_time = int(round(time.time() * 1000))
            plugin_response = PluginResponse(
                code=resp.get("code", ""),
                sid=resp.get("sid", ""),
                start_time=start_time,
                end_time=end_time,
                result=resp,
                log=[{"name": self.name, "input": action_input, "output": resp}],
            )

            return plugin_response


class McpPluginFactory(BaseModel):
    app_id: str
    mcp_server_ids: list
    mcp_server_urls: list

    async def gen(self, span: Span) -> list[McpPlugin]:
        try:
            return await self.build_tools(span)
        except Exception:
            raise GetMcpPluginExc() from None

    async def build_tools(self, span: Span) -> list[McpPlugin]:
        mcp_plugins: list[McpPlugin] = []
        servers_list = await self.query_servers(span)
        expected = len(set(self.mcp_server_ids)) + len(set(self.mcp_server_urls))
        if len(servers_list) < expected:
            raise GetMcpPluginExc()
        for server in servers_list:
            server_status = server.get("server_status")
            server_id = server.get("server_id", "")
            server_url = server.get("server_url", "")

            if server_status != 0:
                # Missing configured tools must fail the run, not change its abilities.
                raise GetMcpPluginExc

            if not isinstance(server.get("tools"), list) or not server["tools"]:
                raise GetMcpPluginExc()
            for tool in server["tools"]:
                mcp_plugin = McpPlugin(
                    server_id=server_id,
                    server_url=server_url,
                    name=tool.get("name", ""),
                    description=tool.get("description", ""),
                    schema_template=await self.convert_tool(tool),
                    typ="mcp",
                    run=McpPluginRunner(
                        server_id=server_id,
                        server_url=server_url,
                        sid="",
                        name=tool.get("name", ""),
                    ).run,
                )
                mcp_plugins.append(mcp_plugin)
        return mcp_plugins

    async def query_servers(self, span: Span) -> list[dict]:
        with span.start("QueryServers") as sp:
            data = {
                "sid": sp.sid,
                "mcp_server_ids": self.mcp_server_ids,
                "mcp_server_urls": self.mcp_server_urls,
            }
            sp.add_info_events(
                {
                    "mcp-server-count": len(self.mcp_server_ids)
                    + len(self.mcp_server_urls)
                }
            )
            try:
                list_url = os.getenv("LIST_MCP_PLUGIN_URL")
                if not list_url:
                    raise GetMcpPluginExc("LIST_MCP_PLUGIN_URL is not set")
                async with aiohttp.ClientSession() as session:
                    timeout = aiohttp.ClientTimeout(total=40)
                    async with session.post(
                        list_url,
                        json=data,
                        timeout=timeout,
                    ) as response:
                        response.raise_for_status()
                        if response.status == 200:
                            resp = await response.json()
                            sp.add_info_events({"mcp-list-response-received": True})
                        else:
                            sp.add_info_events(
                                attributes={
                                    "mcp-plugin-list-outputs": (
                                        f"response code is {response.status}"
                                    )
                                }
                            )
                            raise GetMcpPluginExc
            except (asyncio.TimeoutError, aiohttp.ClientError, ValueError):
                raise GetMcpPluginExc from None

            code = resp.get("code")
            if code != 0:
                raise GetMcpPluginExc

            servers_list = resp.get("data", {}).get("servers", [])

            # Type cast to ensure return type matches annotation
            return cast(
                list[dict[Any, Any]],
                servers_list if isinstance(servers_list, list) else [],
            )

    @staticmethod
    async def convert_tool(tool: dict) -> str:
        property_template = json.dumps(
            {
                "type": "object",
                "properties": tool.get("inputSchema", {}).get("properties", {}),
                "required": tool.get("inputSchema", {}).get("required", []),
            },
            ensure_ascii=False,
        )
        action_name = tool.get("name", "")
        action_description = tool.get("description", "")
        schema_template = (
            f"tool_name:{action_name}, tool_description:{action_description}, "
            f"tool_parameters:{property_template}"
        )
        return schema_template
