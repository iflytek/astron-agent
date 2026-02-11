import json
import os
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

from workflow.configs import workflow_config
from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.entities.history import EnableChatHistoryV2, History
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.base_node import BaseLLMNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.engine.nodes.knowledge.adaptive_search_prompt import (
    adaptive_search_system_prompt,
)
from workflow.engine.nodes.knowledge.knowledge_client import (
    KnowledgeClient,
    KnowledgeConfig,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span


class SearchMode(str, Enum):
    """
    Search mode types for knowledge node
    """

    DIRECT = "direct"
    ADAPTIVE = "adaptive"


class RepositoryInfo(BaseModel):
    """
    Knowledge repository information.

    :param name: Repository name
    :param description: Repository description
    :param RepoId: External repository ID
    :param DocIds: Document IDs
    """

    name: str = Field(..., min_length=1)
    description: str = Field(default="")
    repoId: str = Field(..., min_length=1)
    docIds: list[str] = Field(default_factory=list)


class RepoAndDocIds(BaseModel):
    """
    Container for repository IDs and document IDs.

    :param repo_ids: List of repository IDs
    :param doc_ids: List of document IDs
    """

    repo_ids: list[str] = Field(default_factory=list)
    doc_ids: list[str] = Field(default_factory=list)


class KnowledgeNode(BaseLLMNode):
    """
    Knowledge base node for retrieving relevant information from knowledge repositories.

    This node performs semantic search against configured knowledge repositories
    and returns the most relevant results based on the input query.
    """

    topN: str = Field(default="5", min_length=1)  # Number of top results to retrieve
    ragType: str = Field(
        default="AIUI-RAG2"
    )  # Type of RAG (Retrieval-Augmented Generation) to use
    repoId: list[str] = Field(default_factory=list)
    docIds: list[str] = Field(
        default_factory=list
    )  # Optional list of specific document IDs to search
    score: float = Field(default=0.1)  # Minimum similarity threshold for results
    enableChatHistoryV2: EnableChatHistoryV2 = Field(
        default_factory=EnableChatHistoryV2
    )
    repos: list[RepositoryInfo] = Field(default_factory=list)
    search_mode: Literal["direct", "adaptive"] = Field(default=SearchMode.DIRECT.value)
    domain: str = Field(default="")
    appId: str = Field(default="")
    source: str = Field(default=ModelProviderEnum.OPENAI.value)

    @property
    def run_s(self) -> WorkflowNodeExecutionStatus:
        """
        Get the success execution status.

        :return: SUCCEEDED status for successful execution
        """
        return WorkflowNodeExecutionStatus.SUCCEEDED

    @property
    def run_f(self) -> WorkflowNodeExecutionStatus:
        """
        Get the failure execution status.

        :return: FAILED status for failed execution
        """
        return WorkflowNodeExecutionStatus.FAILED

    async def _should_use_knowledge(
        self,
        query: str,
        span: Span,
        variable_pool: VariablePool,
    ) -> tuple[bool, dict]:
        """
        Determine if knowledge base search is needed using LLM.

        Provides all repository names and descriptions to the LLM for a one-time
        determination of whether the user query requires knowledge base retrieval.

        :param query: User query
        :param span: Span object for tracing and logging
        :param variable_pool: Variable pool for accessing system parameters
        :return: Tuple of (should_use, token_usage) where:
                 - should_use: True if knowledge base should be used, False otherwise
                 - token_usage: Dictionary containing token usage statistics
        """
        try:
            if self.repos:
                repositories = [
                    {"name": repo.name, "description": repo.description}
                    for repo in self.repos
                ]
            else:
                repositories = [{"name": "", "description": ""}]

            repos_json = json.dumps(repositories, ensure_ascii=False)
            prompt = adaptive_search_system_prompt.format(
                repositories=repos_json, user_query=query
            )

            token_usage, decision, _, _ = await self._chat_with_llm(
                span=span,
                flow_id=variable_pool.system_params.get(ParamKey.FlowId, default=""),
                variable_pool=variable_pool,
                prompt_template=prompt,
            )

            should_use = "是" in decision or "yes" in decision.lower()
            return should_use, token_usage

        except Exception as e:
            span.add_error_event(f"Adaptive search decision failed: {str(e)}")
            span.record_exception(e)
            # Return default behavior (use knowledge) with empty token usage
            return True, {}

    def _load_llm_config(self) -> None:
        """
        Load LLM configuration from workflow config.

        Sets the following attributes from workflow_config.llm_config:
        - url: Base URL for LLM API
        - domain: Model name/domain
        - apiKey: API key for authentication
        - temperature: Sampling temperature
        - maxTokens: Maximum tokens in response
        - topK: Top-K sampling parameter
        """
        self.url = workflow_config.knowledge_node_llm_config.base_url
        self.domain = workflow_config.knowledge_node_llm_config.model
        self.apiKey = workflow_config.knowledge_node_llm_config.api_key
        self.temperature = workflow_config.knowledge_node_llm_config.temperature
        self.maxTokens = workflow_config.knowledge_node_llm_config.max_tokens
        self.topK = workflow_config.knowledge_node_llm_config.top_k

    def _create_node_result(
        self,
        status: WorkflowNodeExecutionStatus,
        inputs: dict[str, Any],
        outputs: dict[str, Any],
        token_usage: dict[str, int],
        raw_output: str = "",
    ) -> NodeRunResult:
        """
        Create a NodeRunResult with token cost information.

        :param status: Execution status
        :param inputs: Input parameters
        :param outputs: Output results
        :param token_usage: Token usage statistics (completion_tokens, prompt_tokens, total_tokens)
        :param raw_output: Optional raw output string
        :return: NodeRunResult object
        """
        return NodeRunResult(
            status=status,
            inputs=inputs,
            outputs=outputs,
            raw_output=raw_output,
            node_id=self.node_id,
            alias_name=self.alias_name,
            node_type=self.node_type,
            token_cost=GenerateUsage(
                completion_tokens=token_usage.get("completion_tokens", 0),
                prompt_tokens=token_usage.get("prompt_tokens", 0),
                total_tokens=token_usage.get("total_tokens", 0),
            ),
        )

    def _get_chat_history(self, variable_pool: VariablePool) -> list:
        """Extract chat history from variable pool if enabled."""
        if not self.enableChatHistoryV2.is_enabled:
            return []

        rounds = self.enableChatHistoryV2.rounds
        if variable_pool.history_v2:
            history_v2 = History(
                origin_history=variable_pool.history_v2.origin_history,
                rounds=rounds,
            )
            return history_v2.origin_history
        return []

    def _get_repo_and_doc_ids(self) -> RepoAndDocIds:
        """
        Get repository IDs and document IDs from configuration.

        Supports both new format (repos) and legacy format (repoId, docIds).
        When using the new repos format, iterates through all repositories
        to collect their IDs and associated document IDs.

        :return: RepoAndDocIds object containing repo_ids and doc_ids
        """
        if self.repos:
            repo_ids, doc_ids = [], []
            for repo in self.repos:
                if repo.repoId:
                    repo_ids.append(repo.repoId)
                if repo.docIds:
                    doc_ids.extend(repo.docIds)
            return RepoAndDocIds(repo_ids=repo_ids, doc_ids=doc_ids)
        return RepoAndDocIds(repo_ids=self.repoId, doc_ids=self.docIds)

    async def execute(
        self, variable_pool: VariablePool, span: Span, **kwargs: Any
    ) -> NodeRunResult:
        """
        Execute the knowledge base search operation.

        Retrieves the query from the variable pool, performs a knowledge base search,
        and returns the results in a NodeRunResult object.

        :param variable_pool: Pool containing workflow variables
        :param span: Span object for tracing and logging
        :param kwargs: Additional keyword arguments including event_log_node_trace
        :return: NodeRunResult containing the search results or error information
        """
        try:
            # Initialize token usage (will be updated in adaptive mode)
            token_usage: dict[str, int] = {}

            # Load LLM configuration
            self._load_llm_config()

            event_log_node_trace = kwargs.get("event_log_node_trace")

            # Get the query from the variable pool
            query = variable_pool.get_variable(
                node_id=self.node_id, key_name=self.input_identifier[0], span=span
            )
            inputs: dict[str, Any] = {self.input_identifier[0]: query}
            outputs: dict[str, Any] = {}
            if not isinstance(query, str):
                query = str(query)
            status = self.run_s

            # Process chat history if enabled
            history = self._get_chat_history(variable_pool)

            if self.search_mode == SearchMode.ADAPTIVE.value:
                should_use, token_usage = await self._should_use_knowledge(
                    query, span, variable_pool
                )
                if not should_use:
                    outputs = {self.output_identifier[0]: []}
                    return self._create_node_result(
                        status=status,
                        inputs=inputs,
                        outputs=outputs,
                        token_usage=token_usage,
                    )

            # Get repository and document IDs
            repo_and_doc_ids = self._get_repo_and_doc_ids()

            # Get knowledge base URL from environment variables
            knowledge_base_url = os.getenv("KNOWLEDGE_BASE_URL")
            if not knowledge_base_url:
                raise CustomException(
                    err_code=CodeEnum.KNOWLEDGE_NODE_EXECUTION_ERROR,
                    err_msg="Knowledge base URL is not set",
                    cause_error="Knowledge base URL is not set",
                )
            knowledge_recall_url = f"{knowledge_base_url}/knowledge/v1/chunk/query"
            flow_id: str = variable_pool.system_params.get(ParamKey.FlowId)
            knowledge_config = KnowledgeConfig(
                top_n=self.topN,
                rag_type=self.ragType,
                repo_id=repo_and_doc_ids.repo_ids,
                url=knowledge_recall_url,
                query=str(query),
                flow_id=flow_id,
                doc_ids=repo_and_doc_ids.doc_ids,
                threshold=self.score,
                history=history,
            )
            # Perform knowledge base search
            search_result = await KnowledgeClient(config=knowledge_config).top_k(
                request_span=span, event_log_node_trace=event_log_node_trace
            )
            result_dict = json.loads(search_result)["results"]
            outputs = {self.output_identifier[0]: result_dict}

            return self._create_node_result(
                status=status,
                inputs=inputs,
                outputs=outputs,
                token_usage=token_usage,
                raw_output=str(search_result),
            )
        except CustomException as err:
            status = self.run_f
            span.add_error_event(str(err))
            span.record_exception(err)
            return NodeRunResult(
                status=status,
                error=err,
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
            )
        except Exception as e:
            span.record_exception(e)
            status = self.run_f
            return NodeRunResult(
                status=status,
                error=CustomException(
                    CodeEnum.KNOWLEDGE_NODE_EXECUTION_ERROR,
                    cause_error=e,
                ),
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
            )

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        Asynchronous execution method.

        Delegates to the main execute method for asynchronous knowledge base search.

        :param variable_pool: Pool containing workflow variables
        :param span: Span object for tracing and logging
        :param event_log_node_trace: Optional node log trace object
        :param kwargs: Additional keyword arguments
        :return: NodeRunResult containing the search results or error information
        """
        return await self.execute(
            variable_pool, span, event_log_node_trace=event_log_node_trace, **kwargs
        )
