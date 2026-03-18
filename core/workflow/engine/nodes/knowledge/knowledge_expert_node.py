import json
import os
from typing import Any

from pydantic import BaseModel, Field

from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.engine.nodes.knowledge.knowledge_client import (
    KnowledgeClient,
    KnowledgeConfig,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span


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


class KnowledgeExpertNode(BaseNode):
    """
    Knowledge expert node for retrieving relevant information from knowledge repositories.

    This node performs semantic search against configured knowledge repositories
    and returns the most relevant results based on the input query.
    It is used to retrieve relevant information from knowledge repositories for a given query.
    """

    topN: str = Field(default="5", min_length=1)  # Number of top results to retrieve
    score: float = Field(default=0.01)  # Minimum similarity threshold for results
    ragType: str = Field(
        default="AIUI-RAG2"
    )  # Type of RAG (Retrieval-Augmented Generation) to use
    repos: list[RepositoryInfo] = Field(default_factory=list)

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

    def _get_repo_and_doc_ids(self) -> RepoAndDocIds:
        """
        Get repository IDs and document IDs from configuration.

        Supports both new format (repos) and legacy format (repoId, docIds).
        When using the new repos format, iterates through all repositories
        to collect their IDs and associated document IDs.

        :return: RepoAndDocIds object containing repo_ids and doc_ids
        """
        repo_ids, doc_ids = [], []
        if self.repos:
            for repo in self.repos:
                if repo.repoId:
                    repo_ids.append(repo.repoId)
                if repo.docIds:
                    doc_ids.extend(repo.docIds)
        return RepoAndDocIds(repo_ids=repo_ids, doc_ids=doc_ids)

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
            event_log_node_trace = kwargs.get("event_log_node_trace")
            # Get the query from the variable pool
            query = variable_pool.get_variable(
                node_id=self.node_id, key_name=self.input_identifier[0], span=span
            )
            inputs, outputs = {self.input_identifier[0]: query}, {}
            if not isinstance(query, str):
                query = str(query)
            status = self.run_s

            # Get repository and document IDs
            repo_and_doc_ids = self._get_repo_and_doc_ids()

            # Get knowledge base URL from environment variables
            knowledge_recall_url = (
                f"{os.getenv('KNOWLEDGE_BASE_URL')}/knowledge/v1/chunk/query"
            )
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
            )
            # Perform knowledge base search
            search_result = await KnowledgeClient(config=knowledge_config).top_k(
                request_span=span, event_log_node_trace=event_log_node_trace
            )
            result_dict = json.loads(search_result)["results"]
            result_dict = [
                {
                    "treID": item.get("docId", item.get("treID", "")),
                    "content": item.get("content", ""),
                }
                for item in result_dict
            ]
            outputs = {self.output_identifier[0]: result_dict}
            return NodeRunResult(
                status=status,
                inputs=inputs,
                outputs=outputs,
                raw_output=str(search_result),
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
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
