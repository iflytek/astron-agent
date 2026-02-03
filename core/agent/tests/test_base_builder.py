"""Test BaseApiBuilder class"""

import os
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import urlparse

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.domain.models.base import BaseLLMModel
from agent.engine.nodes.chat.chat_runner import ChatRunner
from agent.engine.nodes.cot.cot_runner import CotRunner
from agent.engine.nodes.cot_process.cot_process_runner import CotProcessRunner
from agent.infra.app_auth import MaasAuth
from agent.service.builder.base_builder import (
    BaseApiBuilder,
    CotRunnerParams,
    RunnerParams,
)
from agent.service.plugin.base import BasePlugin
from agent.service.plugin.base import BasePlugin as RealBasePlugin


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


class TestBaseApiBuilder:
    """Test BaseApiBuilder class"""

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.fixture
    def builder(self, span: Span) -> BaseApiBuilder:
        """Create Builder instance for testing"""
        return BaseApiBuilder(app_id="test_app", uid="test_uid", span=span)

    @pytest.mark.asyncio
    async def test_build_plugins_empty(self, builder: BaseApiBuilder) -> None:
        """Test building plugins (empty list)"""
        plugins = await builder.build_plugins([], [], [], [])
        assert plugins == []

    @pytest.mark.asyncio
    async def test_build_plugins_with_tool_ids(self, builder: BaseApiBuilder) -> None:
        """Test building plugins (tool IDs)"""
        mock_plugin = MagicMock(spec=BasePlugin)
        mock_plugin.name = "test_tool"
        mock_plugin.typ = "tool"
        mock_plugin.schema_template = "tool schema"

        with patch(
            "agent.service.builder.base_builder.LinkPluginFactory"
        ) as mock_factory:
            mock_factory.return_value.gen = AsyncMock(return_value=[mock_plugin])

            plugins = await builder.build_plugins(["tool1"], [], [], [])

            assert len(plugins) > 0

    @pytest.mark.asyncio
    async def test_build_plugins_with_mcp_server_ids(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test building plugins (MCP server IDs)"""
        mock_plugin = MagicMock(spec=BasePlugin)
        mock_plugin.name = "mcp_plugin"
        mock_plugin.typ = "mcp"
        mock_plugin.schema_template = "mcp schema"

        with patch(
            "agent.service.builder.base_builder.McpPluginFactory"
        ) as mock_factory:
            mock_factory.return_value.gen = AsyncMock(return_value=[mock_plugin])

            plugins = await builder.build_plugins([], ["mcp1"], [], [])

            assert len(plugins) > 0

    @pytest.mark.asyncio
    async def test_build_plugins_with_workflow_ids(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test building plugins (workflow IDs)"""
        mock_plugin = MagicMock(spec=BasePlugin)
        mock_plugin.name = "workflow_plugin"
        mock_plugin.typ = "workflow"
        mock_plugin.schema_template = "workflow schema"

        with patch(
            "agent.service.builder.base_builder.WorkflowPluginFactory"
        ) as mock_factory:
            mock_factory.return_value.gen = AsyncMock(return_value=[mock_plugin])

            plugins = await builder.build_plugins([], [], [], ["workflow1"])

            assert len(plugins) > 0

    @pytest.mark.asyncio
    async def test_build_plugins_filters_empty_mcp_urls(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test filtering empty MCP URLs when building plugins"""
        with patch(
            "agent.service.builder.base_builder.McpPluginFactory"
        ) as mock_factory:
            mock_factory.return_value.gen = AsyncMock(return_value=[])

            await builder.build_plugins([], [], ["", "  ", "valid_url"], [])

            # Verify only valid URLs are processed
            mock_factory.assert_called_once()
            call_args = mock_factory.call_args
            mcp_urls = call_args[1]["mcp_server_urls"]
            assert "valid_url" in mcp_urls
            assert "" not in mcp_urls
            assert "  " not in mcp_urls

    @pytest.mark.asyncio
    async def test_build_chat_runner(self, builder: BaseApiBuilder) -> None:
        """Test building ChatRunner"""
        mock_model = BaseLLMModel.model_construct(name="m", llm=MagicMock())
        params = RunnerParams(
            model=mock_model,
            chat_history=[],
            instruct="instruction",
            knowledge="knowledge",
            question="question",
        )

        runner = await builder.build_chat_runner(params)

        assert isinstance(runner, ChatRunner)
        assert runner.model == mock_model
        assert runner.instruct == "instruction"
        assert runner.knowledge == "knowledge"
        assert runner.question == "question"

    @pytest.mark.asyncio
    async def test_build_cot_runner(self, builder: BaseApiBuilder) -> None:
        """Test building CotRunner"""
        mock_model = BaseLLMModel.model_construct(name="m", llm=MagicMock())

        mock_plugin = RealBasePlugin(
            name="p",
            description="d",
            schema_template="st",
            typ="tool",
            run=AsyncMock(),
        )
        mock_plugins = [mock_plugin]
        mock_process_runner = MagicMock(spec=CotProcessRunner)

        params = CotRunnerParams(
            model=mock_model,
            chat_history=[],
            instruct="instruction",
            knowledge="knowledge",
            question="question",
            plugins=mock_plugins,
            process_runner=mock_process_runner,
            max_loop=10,
        )

        runner = await builder.build_cot_runner(params)

        assert isinstance(runner, CotRunner)
        assert runner.model == mock_model
        assert runner.plugins == mock_plugins
        assert runner.max_loop == 10

    @pytest.mark.asyncio
    async def test_build_process_runner(self, builder: BaseApiBuilder) -> None:
        """Test building CotProcessRunner"""
        mock_model = BaseLLMModel.model_construct(name="m", llm=MagicMock())
        params = RunnerParams(
            model=mock_model,
            chat_history=[],
            instruct="instruction",
            knowledge="knowledge",
            question="question",
        )

        runner = await builder.build_process_runner(params)

        assert isinstance(runner, CotProcessRunner)
        assert runner.model == mock_model

    @pytest.mark.asyncio
    async def test_query_maas_sk(self, builder: BaseApiBuilder) -> None:
        """Test querying MaaS SK"""
        mock_sk = "test_key:test_secret"

        with patch.object(MaasAuth, "sk", return_value=mock_sk):
            sk = await builder.query_maas_sk("test_app", "test_model")

            assert sk == mock_sk

    @pytest.mark.asyncio
    async def test_create_model_with_api_key(self, builder: BaseApiBuilder) -> None:
        """Test creating model (with API key provided)"""
        model = await builder.create_model(
            app_id="test_app",
            model_name="test_model",
            base_url="https://api.test.com",
            api_key="provided_key",
        )

        assert isinstance(model, BaseLLMModel)
        assert model.name == "test_model"
        # Verify provided API key is used
        assert model.llm.api_key == "provided_key"

    @pytest.mark.asyncio
    async def test_create_model_without_api_key(self, builder: BaseApiBuilder) -> None:
        """Test creating model (no API key, needs to query)"""
        mock_sk = "queried_key:queried_secret"

        # Patching instance method triggers Pydantic __setattr__ restrictions, here patch class method
        with patch.object(BaseApiBuilder, "query_maas_sk", return_value=mock_sk):
            model = await builder.create_model(
                app_id="test_app",
                model_name="test_model",
                base_url="https://api.test.com",
                api_key="",
            )

            assert isinstance(model, BaseLLMModel)

    @pytest.mark.asyncio
    async def test_create_model_normalize_base_url_chat_completions(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test normalizing base_url (contains /chat/completions)"""
        model = await builder.create_model(
            app_id="test_app",
            model_name="test_model",
            base_url="https://api.test.com/chat/completions",
            api_key="test_key",
        )

        # Verify base_url is normalized by AsyncOpenAI (removes /chat/completions)
        assert "/chat/completions" not in str(model.llm.base_url)
        # Verify URL hostname using proper URL parsing to avoid security issues
        parsed_url = urlparse(str(model.llm.base_url))
        assert parsed_url.netloc == "api.test.com"

    @pytest.mark.asyncio
    async def test_create_model_normalize_base_url_completions(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test normalizing base_url (contains /completions)"""
        model = await builder.create_model(
            app_id="test_app",
            model_name="test_model",
            base_url="https://api.test.com/completions",
            api_key="test_key",
        )

        # Verify base_url is normalized by AsyncOpenAI (removes /completions)
        assert "/completions" not in str(model.llm.base_url)
        # Verify URL hostname using proper URL parsing to avoid security issues
        parsed_url = urlparse(str(model.llm.base_url))
        assert parsed_url.netloc == "api.test.com"

    @pytest.mark.asyncio
    async def test_create_model_ssl_verify_enabled(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test creating model (SSL verification enabled)"""
        with patch.dict(os.environ, {"SKIP_SSL_VERIFY": "false"}):
            model = await builder.create_model(
                app_id="test_app",
                model_name="test_model",
                base_url="https://api.test.com",
                api_key="test_key",
            )

            assert isinstance(model, BaseLLMModel)
            # Verify HTTP client is configured with SSL verification

    @pytest.mark.asyncio
    async def test_create_model_ssl_verify_disabled(
        self, builder: BaseApiBuilder
    ) -> None:
        """Test creating model (SSL verification disabled)"""
        with patch.dict(os.environ, {"SKIP_SSL_VERIFY": "true"}):
            model = await builder.create_model(
                app_id="test_app",
                model_name="test_model",
                base_url="https://api.test.com",
                api_key="test_key",
            )

            assert isinstance(model, BaseLLMModel)
            # Verify HTTP client has SSL verification disabled


class TestRunnerParams:
    """Test RunnerParams dataclass"""

    def test_runner_params_creation(self) -> None:
        """Test creating RunnerParams"""
        mock_model = MagicMock(spec=BaseLLMModel)
        params = RunnerParams(
            model=mock_model,
            chat_history=[],
            instruct="instruction",
            knowledge="knowledge",
            question="question",
        )

        assert params.model == mock_model
        assert params.chat_history == []
        assert params.instruct == "instruction"
        assert params.knowledge == "knowledge"
        assert params.question == "question"


class TestCotRunnerParams:
    """Test CotRunnerParams dataclass"""

    def test_cot_runner_params_creation(self) -> None:
        """Test creating CotRunnerParams"""
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_plugins = [MagicMock(spec=BasePlugin)]
        mock_process_runner = MagicMock(spec=CotProcessRunner)

        params = CotRunnerParams(
            model=mock_model,
            chat_history=[],
            instruct="instruction",
            knowledge="knowledge",
            question="question",
            plugins=mock_plugins,
            process_runner=mock_process_runner,
            max_loop=15,
        )

        assert params.plugins == mock_plugins
        assert params.process_runner == mock_process_runner
        assert params.max_loop == 15
        assert params.max_loop == 15  # Default value test
