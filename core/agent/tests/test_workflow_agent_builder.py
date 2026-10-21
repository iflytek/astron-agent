"""Test WorkflowAgentRunnerBuilder class"""

from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.api.schemas.llm_message import LLMMessage
from agent.api.schemas.workflow_agent_inputs import (
    CustomCompletionInputs,
    CustomCompletionInstructionInputs,
    CustomCompletionModelConfigInputs,
    CustomCompletionPluginInputs,
    CustomCompletionPluginKnowledgeInputs,
    CustomCompletionPluginKnowledgeMatchInputs,
    CustomCompletionPluginSkillInputs,
)
from agent.service.builder.workflow_agent_builder import (
    KnowledgeQueryParams,
    WorkflowAgentRunnerBuilder,
)
from agent.service.plugin.base import BasePlugin
from agent.service.runner.workflow_agent_runner import WorkflowAgentRunner


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    """
    # Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


class TestWorkflowAgentRunnerBuilder:
    """Test WorkflowAgentRunnerBuilder class"""

    @pytest.fixture
    def inputs(self) -> CustomCompletionInputs:
        """Create input instance for testing"""
        return CustomCompletionInputs(
            uid="test_uid",
            messages=[LLMMessage(role="user", content="test question")],
            model_config=CustomCompletionModelConfigInputs(
                domain="test_model",
                api="https://api.test.com",
                provider="anthropic",
                api_key="test_key",
            ),
            instruction=CustomCompletionInstructionInputs(
                reasoning="think step by step",
                answer="answer clearly",
            ),
            plugin=CustomCompletionPluginInputs(),
            max_loop_count=5,
        )

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.fixture
    def builder(
        self, inputs: CustomCompletionInputs, span: Span
    ) -> WorkflowAgentRunnerBuilder:
        """Create Builder instance for testing"""
        return WorkflowAgentRunnerBuilder(
            app_id="test_app",
            uid="test_uid",
            span=span,
            inputs=inputs,
        )

    def test_inject_skill_context_removes_untrusted_sandbox_credentials(
        self, builder: WorkflowAgentRunnerBuilder
    ) -> None:
        skills = [
            {
                "sandbox": {
                    "enabled": True,
                    "provider": "local",
                    "apiKey": "legacy-camel-api-key",
                    "api_key": "legacy-snake-api-key",
                    "timeoutSeconds": 600,
                    "allowInternetAccess": True,
                    "runtimeConfigUrl": "https://attacker.example/runtime-config",
                    "runtime_config_url": "https://attacker.example/snake-config",
                    "artifactUploadUrl": "https://attacker.example/workflow/artifacts/internal-upload",
                    "artifactUploadToken": "legacy-artifact-token",
                    "runtimeCredentialToken": "legacy-runtime-token",
                }
            }
        ]

        builder._inject_skill_runtime_context(skills)

        sandbox = skills[0]["sandbox"]
        assert "provider" not in sandbox
        assert "apiKey" not in sandbox
        assert "api_key" not in sandbox
        assert "timeoutSeconds" not in sandbox
        assert "allowInternetAccess" not in sandbox
        assert "runtimeConfigUrl" not in sandbox
        assert "runtime_config_url" not in sandbox
        assert "artifactUploadUrl" not in sandbox
        assert "artifactUploadToken" not in sandbox
        assert "runtimeCredentialToken" not in sandbox
        assert sandbox["uid"] == "test_uid"

    @pytest.mark.asyncio
    async def test_build(self, builder: WorkflowAgentRunnerBuilder) -> None:
        """Test building WorkflowAgentRunner"""
        mock_model = MagicMock()
        mock_plugins: list[BasePlugin] = []
        from langchain_core.language_models.fake_chat_models import (
            FakeMessagesListChatModel,
        )
        from langchain_core.messages import AIMessage

        from agent.domain.models.providers import ModelHandle
        from agent.engine.deepagents_runner import DeepAgentsRunner

        mock_model = ModelHandle(
            FakeMessagesListChatModel(responses=[AIMessage(content="ok")]),
            "test",
            "test",
        )
        with patch.object(
            WorkflowAgentRunnerBuilder, "create_model", return_value=mock_model
        ), patch.object(
            WorkflowAgentRunnerBuilder, "build_plugins", return_value=mock_plugins
        ), patch.object(
            WorkflowAgentRunnerBuilder,
            "query_knowledge_by_workflow",
            return_value=([], ""),
        ):
            runner = await builder.build()
        assert isinstance(runner, WorkflowAgentRunner)
        assert isinstance(runner.engine, DeepAgentsRunner)
        assert runner.engine.model_handle == mock_model

    @pytest.mark.asyncio
    async def test_build_passes_skills_to_plugin_builder(
        self, builder: WorkflowAgentRunnerBuilder
    ) -> None:
        """Test passing selected skills into plugin builder"""
        builder.inputs.plugin.skills = [
            CustomCompletionPluginSkillInputs(
                skill_id="skill-1",
                name="ui-ux-pro-max",
                description="Design reference skill",
                download_url="https://example.com/skill.md",
            )
        ]

        mock_model = MagicMock()
        mock_plugins: list[BasePlugin] = []
        from langchain_core.language_models.fake_chat_models import (
            FakeMessagesListChatModel,
        )
        from langchain_core.messages import AIMessage

        from agent.domain.models.providers import ModelHandle

        mock_model = ModelHandle(
            FakeMessagesListChatModel(responses=[AIMessage(content="ok")]),
            "test",
            "test",
        )
        with patch.object(
            WorkflowAgentRunnerBuilder, "create_model", return_value=mock_model
        ), patch.object(
            WorkflowAgentRunnerBuilder,
            "build_plugins",
            AsyncMock(return_value=mock_plugins),
        ) as mock_build_plugins, patch.object(
            WorkflowAgentRunnerBuilder,
            "query_knowledge_by_workflow",
            return_value=([], ""),
        ):
            await builder.build()

        assert mock_build_plugins.await_count == 1
        build_plugins_args = mock_build_plugins.await_args
        assert build_plugins_args is not None
        assert build_plugins_args.kwargs["skills"] == [
            {
                "skill_id": "skill-1",
                "name": "ui-ux-pro-max",
                "description": "Design reference skill",
                "download_url": "https://example.com/skill.md",
                "resources": [],
                "sandbox": {},
            }
        ]

    @pytest.mark.asyncio
    async def test_query_knowledge_by_workflow_empty(
        self, builder: WorkflowAgentRunnerBuilder, span: Span
    ) -> None:
        """Test querying knowledge base (empty list)"""
        metadata_list, backgrounds = await builder.query_knowledge_by_workflow([], span)

        assert metadata_list == []
        assert backgrounds == ""

    @pytest.mark.asyncio
    async def test_query_knowledge_by_workflow_with_knowledge(
        self, builder: WorkflowAgentRunnerBuilder, span: Span
    ) -> None:
        """Test querying knowledge base (with knowledge base configuration)"""
        knowledge_input = CustomCompletionPluginKnowledgeInputs(
            name="test_knowledge",
            description="test description",
            top_k=3,
            match=CustomCompletionPluginKnowledgeMatchInputs(
                repo_ids=["repo1"], doc_ids=["doc1"]
            ),
            repo_type=1,
        )

        mock_result = {
            "data": {
                "results": [
                    {
                        "title": "Test Doc",
                        "docId": "doc1",
                        "content": "Test content",
                        "references": {},
                    }
                ]
            }
        }

        with patch.object(
            WorkflowAgentRunnerBuilder,
            "exec_query_knowledge",
            return_value=mock_result,
        ):
            metadata_list, backgrounds = await builder.query_knowledge_by_workflow(
                [knowledge_input], span
            )

            assert len(metadata_list) > 0
            assert backgrounds != ""

    def test_create_knowledge_tasks_no_repo_or_doc_ids(
        self, builder: WorkflowAgentRunnerBuilder, span: Span
    ) -> None:
        """Test creating knowledge query tasks (no repo_ids and doc_ids)"""
        knowledge_input = CustomCompletionPluginKnowledgeInputs(
            name="test",
            description="test",
            top_k=3,
            match=CustomCompletionPluginKnowledgeMatchInputs(repo_ids=[], doc_ids=[]),
            repo_type=1,
        )

        tasks = builder._create_knowledge_tasks([knowledge_input], span)
        assert len(tasks) == 0

    def test_create_knowledge_tasks_with_repo_ids(
        self, builder: WorkflowAgentRunnerBuilder, span: Span
    ) -> None:
        """Test creating knowledge query tasks (with repo_ids)"""
        knowledge_input = CustomCompletionPluginKnowledgeInputs(
            name="test",
            description="test",
            top_k=3,
            match=CustomCompletionPluginKnowledgeMatchInputs(
                repo_ids=["repo1"], doc_ids=[]
            ),
            repo_type=1,
        )

        tasks = builder._create_knowledge_tasks([knowledge_input], span)
        assert len(tasks) == 1

    def test_process_knowledge_results(
        self, builder: WorkflowAgentRunnerBuilder
    ) -> None:
        """Test processing knowledge query results"""
        results = [
            {
                "data": {
                    "results": [
                        {
                            "title": "Doc 1",
                            "docId": "doc1",
                            "content": "Content 1",
                            "references": {},
                        },
                        {
                            "title": "Doc 2",
                            "docId": "doc1",
                            "content": "Content 2",
                            "references": {},
                        },
                    ]
                }
            }
        ]

        metadata_list, metadata_map = builder._process_knowledge_results(results)

        assert len(metadata_list) > 0
        assert "doc1" in metadata_map
        assert len(metadata_map["doc1"]) == 2

    def test_process_content_references_image(
        self, builder: WorkflowAgentRunnerBuilder
    ) -> None:
        """Test processing content references (image)"""
        content = "See <ref1> for details"
        references = {
            "ref1": {"format": "image", "link": "http://example.com/image.jpg"}
        }

        result = builder._process_content_references(content, references)
        assert "![alt](http://example.com/image.jpg)" in result

    def test_process_content_references_table(
        self, builder: WorkflowAgentRunnerBuilder
    ) -> None:
        """Test processing content references (table)"""
        content = "Table: <ref1>"
        references = {
            "ref1": {"format": "table", "content": "|col1|col2|\n|val1|val2|"}
        }

        result = builder._process_content_references(content, references)
        assert "|col1|col2|" in result

    def test_extract_backgrounds(self, builder: WorkflowAgentRunnerBuilder) -> None:
        """Test extracting background information"""
        metadata_list = [
            {
                "source_id": "doc1",
                "chunk": [
                    {"chunk_context": "Context 1"},
                    {"chunk_context": "Context 2"},
                ],
            },
            {
                "source_id": "doc2",
                "chunk": [{"chunk_context": "Context 3"}],
            },
        ]

        backgrounds = builder._extract_backgrounds(metadata_list)
        assert "Context 1" in backgrounds
        assert "Context 2" in backgrounds
        assert "Context 3" in backgrounds

    @pytest.mark.asyncio
    async def test_exec_query_knowledge(
        self, builder: WorkflowAgentRunnerBuilder, span: Span
    ) -> None:
        """Test executing knowledge query"""
        params = KnowledgeQueryParams(
            repo_ids=["repo1"],
            doc_ids=["doc1"],
            dataset_ids=["dataset1"],
            top_k=3,
            score_threshold=0.3,
            rag_type="AIUI-RAG2",
        )

        mock_result: dict[str, Any] = {"data": {"results": []}}

        with patch(
            "agent.service.builder.workflow_agent_builder.KnowledgePluginFactory"
        ) as mock_factory:
            mock_plugin = MagicMock()
            mock_plugin.run = AsyncMock(return_value=mock_result)
            mock_factory.return_value.gen.return_value = mock_plugin

            result = await builder.exec_query_knowledge(params, span)

            assert result == mock_result
            mock_factory.assert_called_once_with(
                query=builder.inputs.get_last_message_content(),
                top_k=3,
                repo_ids=["repo1"],
                doc_ids=["doc1"],
                dataset_ids=["dataset1"],
                score_threshold=0.3,
                rag_type="AIUI-RAG2",
            )


class TestKnowledgeQueryParams:
    """Test KnowledgeQueryParams dataclass"""

    def test_knowledge_query_params_creation(self) -> None:
        """Test creating KnowledgeQueryParams"""
        params = KnowledgeQueryParams(
            repo_ids=["repo1"],
            doc_ids=["doc1"],
            dataset_ids=[],
            top_k=3,
            score_threshold=0.3,
            rag_type="AIUI-RAG2",
        )

        assert params.repo_ids == ["repo1"]
        assert params.doc_ids == ["doc1"]
        assert params.dataset_ids == []
        assert params.top_k == 3
        assert params.score_threshold == 0.3
        assert params.rag_type == "AIUI-RAG2"
