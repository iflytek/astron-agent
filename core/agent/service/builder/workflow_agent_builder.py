import asyncio
import json
from dataclasses import dataclass
from typing import Any, cast

from common.otlp.trace.span import Span

from agent.api.schemas.workflow_agent_inputs import (
    CustomCompletionInputs,
    CustomCompletionPluginKnowledgeInputs,
)
from agent.engine.deepagents_runner import DeepAgentsRunner
from agent.exceptions.plugin_exc import KnowledgeQueryExc
from agent.service.builder.base_builder import BaseApiBuilder
from agent.service.plugin.knowledge import KnowledgePluginFactory
from agent.service.plugin.web_search import tavily_search_plugin
from agent.service.runner.workflow_agent_runner import WorkflowAgentRunner
from agent.service.sandbox import AgentSandboxConfig


@dataclass
class KnowledgeQueryParams:
    """知识查询参数"""

    repo_ids: list[str]
    doc_ids: list[str]
    dataset_ids: list[str]
    top_k: int
    score_threshold: float
    rag_type: str


class WorkflowAgentRunnerBuilder(BaseApiBuilder):
    inputs: CustomCompletionInputs

    async def build(self) -> WorkflowAgentRunner:
        """构建"""
        with self.span.start("BuildRunner") as sp:
            model = await self.create_model(
                app_id=self.app_id,
                model_name=self.inputs.model_config_inputs.domain,
                base_url=self.inputs.model_config_inputs.api,
                provider=self.inputs.model_config_inputs.provider,
                api_key=self.inputs.model_config_inputs.api_key,
            )

            try:
                skills = self.inputs.plugin.skills
                sandbox_config = self._sandbox_config()
                plugins = await self.build_plugins(
                    tool_ids=self.inputs.plugin.tools,
                    mcp_server_ids=self.inputs.plugin.mcp_server_ids,
                    mcp_server_urls=self.inputs.plugin.mcp_server_urls,
                    workflow_ids=self.inputs.plugin.workflow_ids,
                    console_context=self.inputs.meta_data.console_context,
                )
                search = tavily_search_plugin()
                if search is not None:
                    plugins = [*plugins, search]
                metadata_list, knowledge = await self.query_knowledge_by_workflow(
                    self.inputs.plugin.knowledge, sp
                )
                engine = DeepAgentsRunner(
                    model_handle=model,
                    plugins=plugins,
                    skills=skills,
                    sandbox_config=sandbox_config,
                    workspace_scope=self._workspace_scope(),
                    chat_history=self.inputs.get_chat_history(),
                    reasoning_instruction=self.inputs.instruction.reasoning,
                    answer_instruction=self.inputs.instruction.answer,
                    knowledge=knowledge,
                    question=self.inputs.get_last_message_content(),
                    max_loop=self.inputs.max_loop_count,
                )
                return WorkflowAgentRunner(
                    engine=engine,
                    knowledge_metadata_list=metadata_list,
                )
            except BaseException:
                await model.aclose()
                raise

    def _workspace_scope(self) -> tuple[str, ...]:
        metadata = self.inputs.meta_data
        context = metadata.console_context
        if not metadata.run_id or context.get("run_id") != metadata.run_id:
            return ()
        owner = (str(metadata.space_id), self.inputs.uid, metadata.agent_id)
        if metadata.session_id:
            return (*owner, "session", metadata.session_id)
        return (
            *owner,
            "run",
            metadata.run_id,
            metadata.node_id,
            str(context.get("invocation_id", "")),
        )

    def _sandbox_config(self) -> AgentSandboxConfig | None:
        selection = self.inputs.sandbox
        if selection is None or not selection.enabled:
            return None
        metadata = self.inputs.meta_data
        context = metadata.console_context
        if context and any(
            not isinstance(context.get(key), str) or not context[key]
            for key in ("run_id", "root_id")
        ):
            raise ValueError("Console artifact execution context is incomplete")
        if context and context["run_id"] != metadata.run_id:
            raise ValueError("Console artifact run identity does not match")
        return AgentSandboxConfig(
            enabled=True,
            provider=selection.provider,
            console=bool(context),
            root_id=context.get("root_id", ""),
            uid=str(metadata.execution_uid or self.inputs.uid),
            artifact_uid=str(self.inputs.uid),
            workflow_id=str(metadata.workflow_id or ""),
            run_id=str(metadata.run_id or metadata.caller_sid),
            node_id=str(metadata.node_id or ""),
            agent_id=str(metadata.agent_id or ""),
            session_id=str(metadata.session_id or ""),
            space_id=str(metadata.space_id or ""),
        )

    async def query_knowledge_by_workflow(
        self, knowledge_list: list[CustomCompletionPluginKnowledgeInputs], span: Span
    ) -> tuple[list, str]:
        """查询知识库"""
        with span.start("QueryKnowledgeByWorkflow") as sp:
            tasks = self._create_knowledge_tasks(knowledge_list, sp)

            if not tasks:
                return [], ""

            pending = [asyncio.create_task(task) for task in tasks]
            try:
                results = await asyncio.gather(*pending)
            finally:
                # gather does not cancel siblings when one retrieval fails.
                for task in pending:
                    if not task.done():
                        task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
            metadata_list, _ = self._process_knowledge_results(results)
            backgrounds = self._extract_backgrounds(metadata_list)

            sp.add_info_events(
                {
                    "metadata-list": json.dumps(metadata_list, ensure_ascii=False),
                    "backgrounds": backgrounds,
                }
            )

            return metadata_list, backgrounds

    def _create_knowledge_tasks(
        self, knowledge_list: list[CustomCompletionPluginKnowledgeInputs], span: Span
    ) -> list:
        """创建知识查询任务"""
        repo_type_map = {
            "1": "AIUI-RAG2",
            "2": "CBG-RAG",
            "3": "Ragflow-RAG",
        }
        tasks = []
        if any(not item.match.repo_ids for item in knowledge_list):
            raise KnowledgeQueryExc()

        for knowledge in knowledge_list:
            repo_ids = knowledge.match.repo_ids or []
            doc_ids = knowledge.match.doc_ids or []
            dataset_ids = knowledge.match.dataset_ids or []

            # 添加调试日志
            span.add_info_events(
                {
                    "knowledge_name": knowledge.name,
                    "repo_type": knowledge.repo_type,
                    "repo_ids": repo_ids,
                    "doc_ids": doc_ids,
                    "dataset_ids": dataset_ids,
                }
            )

            top_k = knowledge.top_k or 3
            score_threshold = 0.3
            repo_type = (
                repo_type_map.get(str(knowledge.repo_type), "AIUI-RAG2")
                if knowledge.repo_type
                else "AIUI-RAG2"
            )

            # 添加映射后的日志
            span.add_info_events({"mapped_rag_type": repo_type})

            params = KnowledgeQueryParams(
                repo_ids=repo_ids,
                doc_ids=doc_ids,
                dataset_ids=dataset_ids,
                top_k=top_k,
                score_threshold=score_threshold,
                rag_type=repo_type,
            )
            task = self.exec_query_knowledge(params, span)
            tasks.append(task)

        return tasks

    def _process_knowledge_results(
        self, results: list
    ) -> tuple[list, dict[str, list[dict[str, str]]]]:
        """处理知识查询结果"""
        metadata_list = []
        metadata_map: dict[str, list[dict[str, str]]] = {}

        for resp in results:
            KnowledgePluginFactory.validate_response(resp)
            for result in resp["data"]["results"]:
                title = result.get("title", "")
                source_id = result.get("docId", "")
                content = result.get("content", "")
                references = result.get("references", {})

                content = self._process_content_references(content, references)

                if source_id not in metadata_map:
                    metadata_map[source_id] = []
                metadata_map[source_id].append({"chunk_context": f"{title}\n{content}"})

        for source_id, metadata in metadata_map.items():
            metadata_list.append({"source_id": source_id, "chunk": metadata})

        return metadata_list, metadata_map

    def _process_content_references(self, content: str, references: dict) -> str:
        """处理内容中的引用"""
        for ref_key, ref_value in references.items():
            if isinstance(ref_value, dict):
                ref_format = ref_value.get("format", "")
                if ref_format == "image":
                    content = content.replace(
                        f"<{ref_key}>",
                        f"![alt]({ref_value.get('link', '')})",
                    )
                elif ref_format == "table":
                    content = content.replace(
                        f"<{ref_key}>",
                        f"\n{ref_value.get('content', '')}\n",
                    )
            else:
                content = content.replace(f"{{{ref_key}}}", f"![alt]({ref_value})")
        return content

    def _extract_backgrounds(self, metadata_list: list) -> str:
        """提取背景信息"""
        background_list = []
        for metadata in metadata_list:
            chunk = metadata.get("chunk", [])
            for c in chunk:
                bg = c.get("chunk_context", "")
                background_list.append(bg)
        return "\n".join(background_list)

    async def exec_query_knowledge(
        self,
        params: KnowledgeQueryParams,
        span: Span,
    ) -> dict[str, Any]:
        knowledge_plugin = KnowledgePluginFactory(
            query=self.inputs.get_last_message_content(),
            top_k=params.top_k,
            repo_ids=params.repo_ids,
            doc_ids=params.doc_ids,
            dataset_ids=params.dataset_ids,
            score_threshold=params.score_threshold,
            rag_type=params.rag_type,
        ).gen()

        resp = await knowledge_plugin.run(span=span)

        return cast(dict[str, Any], resp)
