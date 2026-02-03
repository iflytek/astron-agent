import json
import os
import ssl
from dataclasses import dataclass
from typing import Sequence, Union, cast

import httpx
from common.otlp.trace.span import Span
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from agent.domain.models.base import BaseLLMModel
from agent.engine.nodes.chat.chat_runner import ChatRunner
from agent.engine.nodes.cot.cot_runner import CotRunner
from agent.engine.nodes.cot_process.cot_process_runner import CotProcessRunner
from agent.infra.app_auth import MaasAuth
from agent.service.plugin.base import BasePlugin
from agent.service.plugin.link import LinkPlugin, LinkPluginFactory
from agent.service.plugin.mcp import McpPlugin, McpPluginFactory
from agent.service.plugin.workflow import WorkflowPlugin, WorkflowPluginFactory


@dataclass
class RunnerParams:
    """Common parameters for Runner construction"""

    model: BaseLLMModel
    chat_history: list
    instruct: str
    knowledge: str
    question: str


@dataclass
class CotRunnerParams(RunnerParams):
    """Parameters for CoT Runner construction"""

    plugins: Sequence[BasePlugin]
    process_runner: CotProcessRunner
    max_loop: int = 30


class BaseApiBuilder(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    app_id: str
    uid: str = Field(default="")
    span: Span

    async def build_plugins(
        self,
        tool_ids: list,
        mcp_server_ids: list,
        mcp_server_urls: list,
        workflow_ids: list,
    ) -> list[Union[LinkPlugin, McpPlugin, WorkflowPlugin]]:

        with self.span.start("BuildPlugins") as sp:
            # Filter out empty strings from mcp_server_urls
            mcp_server_urls = [url for url in mcp_server_urls if url and url.strip()]

            plugins: list[Union[LinkPlugin, McpPlugin, WorkflowPlugin]] = []
            if tool_ids:
                link_tools = await LinkPluginFactory(
                    app_id=self.app_id, uid=self.uid, tool_ids=tool_ids
                ).gen(sp)
                plugins.extend(
                    cast(list[Union[LinkPlugin, McpPlugin, WorkflowPlugin]], link_tools)
                )

            if mcp_server_ids or mcp_server_urls:
                mcp_tools = await McpPluginFactory(
                    app_id=self.app_id,
                    mcp_server_ids=mcp_server_ids,
                    mcp_server_urls=mcp_server_urls,
                ).gen(sp)
                plugins.extend(
                    cast(list[Union[LinkPlugin, McpPlugin, WorkflowPlugin]], mcp_tools)
                )

            if workflow_ids:
                workflow_tools = await WorkflowPluginFactory(
                    app_id=self.app_id, uid=self.uid, workflow_ids=workflow_ids
                ).gen(sp)
                plugins.extend(
                    cast(
                        list[Union[LinkPlugin, McpPlugin, WorkflowPlugin]],
                        workflow_tools,
                    )
                )

            sp.add_info_events(
                {
                    "link-tool-ids": str(tool_ids),
                    "mcp-server-ids": mcp_server_ids,
                    "mcp-server-urls": mcp_server_urls,
                    "workflow-ids": workflow_ids,
                    "built-plugins": json.dumps(
                        [
                            f"{plugin.typ}\n{plugin.schema_template}"
                            for plugin in plugins
                        ],
                        ensure_ascii=False,
                    ),
                }
            )

            return plugins

    async def build_chat_runner(
        self,
        params: RunnerParams,
    ) -> ChatRunner:
        with self.span.start("BuildChatRunner") as sp:
            sp.add_info_events(
                {
                    "model": params.model.name,
                    "chat-history": json.dumps(
                        [history.model_dump() for history in params.chat_history],
                        ensure_ascii=False,
                    ),
                    "instruct": params.instruct,
                    "knowledge": params.knowledge,
                    "question": params.question,
                }
            )

            chat_runner = ChatRunner(
                model=params.model,
                chat_history=params.chat_history,
                instruct=params.instruct,
                knowledge=params.knowledge,
                question=params.question,
            )
            return chat_runner

    async def build_cot_runner(
        self,
        params: CotRunnerParams,
    ) -> CotRunner:
        with self.span.start("BuildCotRunner") as sp:
            sp.add_info_events(
                {
                    "model": params.model.name,
                    "plugins": json.dumps(
                        [
                            f"{plugin.typ}\n{plugin.schema_template}"
                            for plugin in params.plugins
                        ],
                        ensure_ascii=False,
                    ),
                    "chat-history": json.dumps(
                        [history.model_dump() for history in params.chat_history],
                        ensure_ascii=False,
                    ),
                    "instruct": params.instruct,
                    "knowledge": params.knowledge,
                    "question": params.question,
                }
            )

            plugins_list = cast(
                list[Union[BasePlugin, McpPlugin, LinkPlugin, WorkflowPlugin]],
                list(params.plugins),
            )
            cot_runner = CotRunner(
                model=params.model,
                plugins=plugins_list,
                chat_history=params.chat_history,
                instruct=params.instruct,
                knowledge=params.knowledge,
                question=params.question,
                process_runner=params.process_runner,
                max_loop=params.max_loop,
            )
            return cot_runner

    async def build_process_runner(
        self,
        params: RunnerParams,
    ) -> CotProcessRunner:
        with self.span.start("BuildProcessRunner") as sp:
            sp.add_info_events(
                {
                    "model": params.model.name,
                    "chat-history": json.dumps(
                        [history.model_dump() for history in params.chat_history],
                        ensure_ascii=False,
                    ),
                    "instruct": params.instruct,
                    "knowledge": params.knowledge,
                    "question": params.question,
                }
            )

            cot_runner = CotProcessRunner(
                model=params.model,
                chat_history=params.chat_history,
                instruct=params.instruct,
                knowledge=params.knowledge,
                question=params.question,
            )
            return cot_runner

    async def query_maas_sk(self, app_id: str, model_name: str) -> str:

        with self.span.start("BuildSk") as sp:
            app_id = app_id or self.app_id

            sp.add_info_events({"app_id": app_id})

            maas_auth = MaasAuth(app_id=app_id, model_name=model_name)
            sk = await maas_auth.sk(span=sp)

            return sk

    async def create_model(
        self, app_id: str, model_name: str, base_url: str, api_key: str = ""
    ) -> BaseLLMModel:

        with self.span.start("BuildModel") as sp:
            if api_key:
                sk = api_key
            else:
                sk = await self.query_maas_sk(app_id, model_name)

            # Normalize base_url: remove /chat/completions if present
            # OpenAI SDK automatically appends this path
            normalized_base_url = base_url
            if base_url.endswith("/chat/completions"):
                normalized_base_url = base_url.rsplit("/chat/completions", 1)[0]
                sp.add_info_event(
                    f"Normalized base_url: {base_url} -> {normalized_base_url}"
                )
            elif base_url.endswith("/completions"):
                normalized_base_url = base_url.rsplit("/completions", 1)[0]
                sp.add_info_event(
                    f"Normalized base_url: {base_url} -> {normalized_base_url}"
                )

            sp.add_info_events(
                {
                    "model": model_name,
                    "base_url": normalized_base_url,
                    "api_key": sk,
                    "app_id": app_id,
                }
            )
            # Configure HTTP client with SSL and timeout settings
            # Create SSL context
            ssl_context = ssl.create_default_context()
            # Allow skipping SSL verification for development/testing
            skip_ssl = os.getenv("SKIP_SSL_VERIFY", "false").lower()
            if skip_ssl == "true":
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                sp.add_info_event("⚠️  SSL verification disabled for LLM requests")

            # Create HTTP client with custom settings
            http_client = httpx.AsyncClient(
                verify=ssl_context,
                timeout=httpx.Timeout(
                    connect=60.0,  # Connection timeout: 60 seconds
                    read=300.0,  # Read timeout: 5 minutes
                    write=30.0,  # Write timeout: 30 seconds
                    pool=10.0,  # Pool timeout: 10 seconds
                ),
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            )

            model = BaseLLMModel(
                name=model_name,
                llm=AsyncOpenAI(
                    api_key=sk,
                    base_url=normalized_base_url,
                    http_client=http_client,
                    timeout=300.0,  # Overall timeout: 5 minutes
                    max_retries=2,  # Retry failed requests twice
                ),
            )
            return model
