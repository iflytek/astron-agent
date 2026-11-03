"""MCP server exposing iFlytek Spark chat and published Astron Agent workflows."""

import argparse
import logging
from typing import Annotated, Any

import httpx2
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations
from pydantic import Field

from astron_agent_mcp import __version__, clients
from astron_agent_mcp.config import Settings

INSTRUCTIONS = """\
Use spark_chat to ask an iFlytek Spark model a question.
Use astron_run_workflow to run a workflow that was published as an API in Astron Agent;
the keys of `parameters` must match the workflow's Start node inputs.
If a workflow result has status `interrupted`, ask the user for the requested input and
pass their answer to astron_resume_workflow together with the returned event_id.
"""


def create_server(
    settings: Settings | None = None,
    transport: httpx2.AsyncBaseTransport | None = None,
) -> MCPServer:
    """Build the server. `transport` lets tests replace the upstream HTTP APIs."""
    settings = settings or Settings.from_env()
    server = MCPServer(
        "astron-agent",
        title="Astron Agent",
        instructions=INSTRUCTIONS,
        website_url="https://github.com/iflytek/astron-agent",
        version=__version__,
    )

    @server.tool(annotations=ToolAnnotations(read_only_hint=True, open_world_hint=True))
    async def spark_chat(
        prompt: Annotated[str, Field(min_length=1, description="The user message.")],
        system: Annotated[str | None, Field(description="Optional system prompt.")] = None,
        model: Annotated[
            str | None,
            Field(
                description=(
                    "Spark model, e.g. 4.0Ultra, generalv3.5, max-32k, generalv3, "
                    "pro-128k or lite. Defaults to SPARK_MODEL."
                )
            ),
        ] = None,
        temperature: Annotated[float | None, Field(ge=0, le=2)] = None,
        max_tokens: Annotated[int | None, Field(ge=1)] = None,
    ) -> str:
        """Send a single-turn chat request to an iFlytek Spark model and return its reply."""
        _require(settings.missing_spark(), "spark_chat")
        messages = [{"role": "user", "content": prompt}]
        if system:
            messages.insert(0, {"role": "system", "content": system})
        try:
            return await clients.spark_chat(
                settings, messages, model, temperature, max_tokens, transport
            )
        except clients.UpstreamError as exc:
            raise ToolError(str(exc)) from exc

    @server.tool(annotations=ToolAnnotations(read_only_hint=False, open_world_hint=True))
    async def astron_run_workflow(
        parameters: Annotated[
            dict[str, Any],
            Field(description='Start-node inputs of the workflow, e.g. {"query": "..."}.'),
        ],
        flow_id: Annotated[
            str | None,
            Field(description="Flow ID of the published workflow. Defaults to ASTRON_FLOW_ID."),
        ] = None,
        chat_id: Annotated[
            str | None,
            Field(max_length=128, description="Conversation ID to continue a conversation."),
        ] = None,
        uid: Annotated[str | None, Field(max_length=40, description="End-user identifier.")] = None,
    ) -> clients.WorkflowResult:
        """Run a workflow published as an API in Astron Agent and return its output.

        Workflows can call models, knowledge bases, tools and RPA robots, so a run may
        have side effects depending on how the workflow was built.
        """
        _require(settings.missing_astron(), "astron_run_workflow")
        resolved_flow_id = (flow_id or settings.astron_flow_id).strip()
        if not resolved_flow_id:
            raise ToolError("flow_id is required when ASTRON_FLOW_ID is not set")
        try:
            return await clients.run_workflow(
                settings, resolved_flow_id, parameters, uid, chat_id, transport
            )
        except clients.UpstreamError as exc:
            raise ToolError(str(exc)) from exc

    @server.tool(annotations=ToolAnnotations(read_only_hint=False, open_world_hint=True))
    async def astron_resume_workflow(
        event_id: Annotated[
            str, Field(min_length=1, description="event_id from an interrupted result.")
        ],
        content: Annotated[str, Field(description="The user's reply to the workflow.")],
    ) -> clients.WorkflowResult:
        """Resume an Astron workflow that paused with status `interrupted`."""
        _require(settings.missing_astron(), "astron_resume_workflow")
        try:
            return await clients.resume_workflow(settings, event_id, content, transport)
        except clients.UpstreamError as exc:
            raise ToolError(str(exc)) from exc

    return server


def _require(missing: list[str], tool: str) -> None:
    if missing:
        raise ToolError(f"{tool} is not configured: set {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="astron-agent-mcp",
        description="MCP server for iFlytek Spark and Astron Agent workflows.",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "streamable-http"],
        default="stdio",
        help="MCP transport (default: stdio)",
    )
    parser.add_argument("--host", default="127.0.0.1", help="HTTP bind host")
    parser.add_argument("--port", type=int, default=8000, help="HTTP port")
    parser.add_argument("--version", action="version", version=__version__)
    args = parser.parse_args()

    # stdout carries the stdio protocol, so logs go to stderr.
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    server = create_server()
    if args.transport == "stdio":
        server.run("stdio")
    else:
        server.run("streamable-http", host=args.host, port=args.port)
