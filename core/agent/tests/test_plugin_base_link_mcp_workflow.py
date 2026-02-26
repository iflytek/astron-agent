"""Test plugin base/link/mcp/workflow module"""

from dataclasses import dataclass
from typing import Any

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.link import LinkPluginFactory, LinkPluginRunner
from agent.service.plugin.workflow import (
    ResponseContext,
    WorkflowPluginFactory,
    WorkflowPluginRunner,
)


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


class TestPluginBase:
    """Test PluginResponse / BasePlugin"""

    def test_plugin_response_basic(self) -> None:
        resp = PluginResponse(
            code=0, sid="s", start_time=1, end_time=2, result={"ok": True}
        )
        assert resp.code == 0
        assert resp.sid == "s"
        assert resp.result["ok"] is True
        assert resp.log == []

    def test_base_plugin_creation(self) -> None:
        async def dummy_run(*args: Any, **kwargs: Any) -> None:  # noqa: ANN401
            return None

        plugin = BasePlugin(
            name="p",
            description="d",
            schema_template="st",
            typ="t",
            run=dummy_run,
        )
        assert plugin.name == "p"
        assert plugin.run_result is None


class TestLinkPluginRunner:
    """Test LinkPluginRunner logic for assembling parameters and body"""

    @pytest.fixture
    def runner(self) -> LinkPluginRunner:
        return LinkPluginRunner(
            app_id="app",
            uid="u",
            tool_id="tool1",
            version="V1.0",
            operation_id="op1",
            method_schema={
                "parameters": [
                    {
                        "in": "header",
                        "name": "X-A",
                        "schema": {"x-from": 0, "default": "d"},
                    },
                    {
                        "in": "query",
                        "name": "q1",
                        "schema": {"x-from": 1, "default": 1},
                    },
                ],
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "f1": {
                                        "type": "string",
                                        "x-from": 0,
                                        "default": "x",
                                    },
                                }
                            }
                        }
                    }
                },
            },
        )

    def test_assemble_parameters(self, runner: LinkPluginRunner) -> None:
        header, query = runner.assemble_parameters({"X-A": "override"}, {"q1": 2})
        assert header["X-A"] == "override"
        # q1 comes from business_input (x-from=1)
        assert query["q1"] == 2

    def test_assemble_body(self, runner: LinkPluginRunner) -> None:
        body_schema = runner.method_schema["requestBody"]["content"][
            "application/json"
        ]["schema"]
        body = runner.assemble_body(body_schema, {"f1": "y"}, {})
        assert body["f1"] == "y"

    def test_dumps(self) -> None:
        payload = {"a": 1}
        s = LinkPluginRunner.dumps(payload)
        assert s
        # Empty payload returns empty string
        assert LinkPluginRunner.dumps({}) == ""

    def test_collect_hidden_json_paths(self, runner: LinkPluginRunner) -> None:
        response_schema = {
            "type": "object",
            "properties": {
                "visible": {"type": "string", "x-display": True},
                "hidden": {"type": "string", "x-display": False},
                "nested": {
                    "type": "object",
                    "properties": {
                        "inner_hidden": {"type": "string", "x-display": False},
                        "inner_visible": {"type": "number", "x-display": True},
                    },
                },
            },
        }

        hidden_paths = runner.collect_hidden_json_paths(response_schema)
        assert ["hidden"] in hidden_paths
        assert ["nested", "inner_hidden"] in hidden_paths

    def test_pop_hidden_fields_supports_array_path(
        self, runner: LinkPluginRunner
    ) -> None:
        payload = {
            "items": [
                {"id": 1, "secret": "a"},
                {"id": 2, "secret": "b"},
            ],
            "secret": "root",
        }
        filtered = runner.pop_hidden_fields(
            payload,
            [["secret"], ["items", "*", "secret"]],
        )

        assert "secret" not in filtered
        assert filtered["items"][0] == {"id": 1}
        assert filtered["items"][1] == {"id": 2}

    def test_filter_response_by_schema_validate_and_filter(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string", "x-display": True},
                "secret": {"type": "string", "x-display": False},
            },
            "required": ["name"],
            "additionalProperties": True,
        }

        payload = {"name": "ok", "secret": "hidden", "not_declared": "keep"}
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert filtered == {"name": "ok", "not_declared": "keep"}

    def test_filter_response_by_schema_on_validation_failure(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "must": {"type": "string", "x-display": True},
                "secret": {"type": "string", "x-display": False},
            },
            "required": ["must"],
            "additionalProperties": True,
        }

        payload = {"secret": "hidden", "legacy_field": "keep"}
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert filtered == {"legacy_field": "keep"}

    def test_get_response_json_schema(self, runner: LinkPluginRunner) -> None:
        runner.method_schema = {
            "responses": {
                "200": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string", "x-display": True}
                                },
                            }
                        }
                    }
                }
            }
        }

        schema = runner.get_response_json_schema()
        assert schema.get("type") == "object"
        assert "name" in schema.get("properties", {})

    def test_filter_object_becomes_empty_dict_when_all_children_hidden(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string", "x-display": True},
                "profile": {
                    "type": "object",
                    "properties": {
                        "private_a": {"type": "string", "x-display": False},
                        "private_b": {"type": "string", "x-display": False},
                    },
                },
            },
            "additionalProperties": True,
        }

        payload = {
            "name": "ok",
            "profile": {"private_a": "a", "private_b": "b"},
        }
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert "profile" in filtered
        assert filtered["profile"] == {}

    def test_filter_array_item_becomes_empty_dict_when_all_children_hidden(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "private": {"type": "string", "x-display": False}
                        },
                    },
                }
            },
            "additionalProperties": True,
        }

        payload = {
            "items": [
                {"private": "a"},
                {"private": "b"},
            ]
        }
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert filtered["items"] == [{}, {}]

    def test_filter_remove_primitive_field_but_keep_container_empty_value(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "secret": {"type": "string", "x-display": False},
                "obj": {
                    "type": "object",
                    "properties": {"hidden": {"type": "string", "x-display": False}},
                },
                "arr": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "hidden": {"type": "string", "x-display": False}
                        },
                    },
                },
            },
            "additionalProperties": True,
        }

        payload = {
            "secret": "x",
            "obj": {"hidden": "x"},
            "arr": [{"hidden": "a"}, {"hidden": "b"}],
        }
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert "secret" not in filtered
        assert filtered["obj"] == {}
        assert filtered["arr"] == [{}, {}]

    def test_filter_deep_nested_array_object_single_pass_behavior(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "groups": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "x-display": True},
                            "members": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "public": {
                                            "type": "string",
                                            "x-display": True,
                                        },
                                        "private": {
                                            "type": "string",
                                            "x-display": False,
                                        },
                                    },
                                },
                            },
                        },
                    },
                }
            },
            "additionalProperties": True,
        }

        payload = {
            "groups": [
                {
                    "name": "g1",
                    "members": [
                        {"public": "p1", "private": "s1"},
                        {"private": "s2"},
                    ],
                }
            ]
        }
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert filtered["groups"][0]["members"][0] == {"public": "p1"}
        assert filtered["groups"][0]["members"][1] == {}

    def test_filter_parent_hidden_object_removed_even_if_child_visible(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "address": {
                    "type": "object",
                    "properties": {
                        "geo": {
                            "type": "object",
                            "x-display": False,
                            "properties": {
                                "lat": {"type": "string", "x-display": True},
                                "lng": {"type": "string", "x-display": False},
                            },
                        }
                    },
                }
            },
            "additionalProperties": True,
        }

        payload = {"address": {"geo": {"lat": "-37.3159", "lng": "81.1496"}}}
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert filtered == {"address": {}}

    def test_filter_parent_hidden_array_removed_even_if_items_visible(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        response_schema = {
            "type": "object",
            "properties": {
                "address": {
                    "type": "object",
                    "properties": {
                        "tags": {
                            "type": "array",
                            "x-display": False,
                            "items": {"type": "string", "x-display": True},
                        }
                    },
                }
            },
            "additionalProperties": True,
        }

        payload = {"address": {"tags": ["a", "b"]}}
        filtered = runner.filter_response_by_schema(payload, response_schema, span)

        assert filtered == {"address": {}}

    def test_filter_can_restore_field_after_toggle_to_visible(
        self, runner: LinkPluginRunner
    ) -> None:
        span = Span(app_id="app", uid="u")
        payload = {"address": {"geo": {"lat": "-37.3159", "lng": "81.1496"}}}

        hidden_schema = {
            "type": "object",
            "properties": {
                "address": {
                    "type": "object",
                    "properties": {"geo": {"type": "object", "x-display": False}},
                }
            },
            "additionalProperties": True,
        }
        visible_schema = {
            "type": "object",
            "properties": {
                "address": {
                    "type": "object",
                    "properties": {
                        "geo": {
                            "type": "object",
                            "x-display": True,
                            "properties": {
                                "lat": {"type": "string", "x-display": True},
                                "lng": {"type": "string", "x-display": True},
                            },
                        }
                    },
                }
            },
            "additionalProperties": True,
        }

        first = runner.filter_response_by_schema(payload, hidden_schema, span)
        second = runner.filter_response_by_schema(payload, visible_schema, span)

        assert first == {"address": {}}
        assert second["address"]["geo"] == {"lat": "-37.3159", "lng": "81.1496"}


class TestLinkPluginFactoryParseSchemas:
    """Test LinkPluginFactory schema parsing logic (without real link service request)"""

    @pytest.fixture
    def factory(self) -> LinkPluginFactory:
        return LinkPluginFactory(app_id="app", uid="u", tool_ids=[])

    def test_parse_request_query_schema(self, factory: LinkPluginFactory) -> None:
        schema = [
            {
                "name": "p1",
                "in": "query",
                "description": "d",
                "required": True,
                "schema": {"type": "string", "x-from": 0},
            }
        ]
        params, required = factory.parse_request_query_schema(schema)
        assert params["p1"]["type"] == "string"
        assert "p1" in required

    def test_recursive_parse_request_body_schema(
        self, factory: LinkPluginFactory
    ) -> None:
        body_schema = {
            "properties": {
                "f1": {"type": "string", "description": "d", "x-from": 0},
                "nested": {
                    "type": "object",
                    "properties": {
                        "f2": {"type": "number", "description": "n", "x-from": 0}
                    },
                },
            },
            "required": ["f1"],
        }
        props: dict[str, dict[str, Any]] = {}
        required: set[str] = set()
        factory.recursive_parse_request_body_schema(body_schema, props, required)
        assert "f1" in props and "f2" in props
        assert "f1" in required


class TestMcpPluginRunnerAndFactory:
    """Test McpPluginRunner and McpPluginFactory partial logic"""

    @pytest.mark.asyncio
    async def test_mcp_plugin_runner_timeout(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import asyncio

        from agent.service.plugin.mcp import McpPluginRunner

        runner = McpPluginRunner(server_id="sid", server_url="url", sid="", name="t")
        span = Span(app_id="app", uid="u")

        async def mock_post(*args: Any, **kwargs: Any) -> Any:  # noqa: ANN401
            raise asyncio.TimeoutError()

        import aiohttp

        # aiohttp.ClientSession.post is used as async with in source code, needs to return async CM
        class _CM:
            async def __aenter__(self) -> None:
                import asyncio  # Local import to avoid NameError

                raise asyncio.TimeoutError()

            async def __aexit__(
                self, exc_type: Any, exc: Any, tb: Any
            ) -> bool:  # noqa: ANN001
                return False

        monkeypatch.setattr(aiohttp.ClientSession, "post", lambda *a, **k: _CM())

        # Runtime will trigger PluginExc through RunMcpPluginExc (instance), here catch as PluginExc uniformly
        with pytest.raises(PluginExc):
            await runner.run({}, span)

    @pytest.mark.asyncio
    async def test_mcp_factory_convert_tool(self) -> None:
        from agent.service.plugin.mcp import McpPluginFactory

        tool = {
            "name": "t",
            "description": "d",
            "inputSchema": {"properties": {"x": {"type": "string"}}, "required": ["x"]},
        }
        schema = await McpPluginFactory.convert_tool(tool)
        assert "tool_name:t" in schema
        assert "tool_description:d" in schema


class TestWorkflowPluginRunnerAndFactory:
    """Test WorkflowPluginRunner / Factory partial logic"""

    def test_response_context_dataclass(self) -> None:
        ctx = ResponseContext(
            code=0,
            sid="s",
            start_time=1,
            end_time=2,
            action_input={"x": 1},
        )
        assert ctx.code == 0
        assert ctx.sid == "s"

    def test_build_request_params(self) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        params = runner._build_request_params({"p": 1})
        assert params["extra_body"]["flow_id"] == "fid"
        assert params["extra_body"]["parameters"] == {"p": 1}

    def test_create_error_and_success_response(self) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        ctx = ResponseContext(
            code=1, sid="s", start_time=1, end_time=2, action_input={"x": 1}
        )
        err_resp = runner._create_error_response(ctx, {"code": 1})
        assert err_resp.code == 1
        ok_resp = runner._create_success_response(ctx, "c", "r")
        assert ok_resp.result["content"] == "c"
        assert ok_resp.result["reasoning_content"] == "r"

    @pytest.mark.asyncio
    async def test_workflow_runner_timeout(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        span = Span(app_id="app", uid="u")

        # mock AsyncOpenAI.chat.completions.create to raise timeout
        import httpx

        import agent.service.plugin.workflow as wf_mod

        # Create mock object supporting chat.completions.create structure
        class DummyCompletions:
            async def create(
                self, *args: Any, **kwargs: Any
            ) -> Any:  # noqa: ANN401,E501
                raise httpx.TimeoutException("timeout")

        class DummyChat:
            def __init__(self) -> None:
                self.completions = DummyCompletions()

        class DummyClient:
            def __init__(self, *args: Any, **kwargs: Any) -> None:  # noqa: ANN401
                self.chat = DummyChat()

        # Simply monkeypatch AsyncOpenAI to an object that raises exceptions, and add workflow required configuration
        class DummyConfig:
            WORKFLOW_SSE_BASE_URL = "http://workflow"

        monkeypatch.setattr(wf_mod, "AsyncOpenAI", DummyClient)
        # workflow module originally doesn't have agent_config attribute, here dynamically add it via raising=False
        monkeypatch.setattr(wf_mod, "agent_config", DummyConfig(), raising=False)

        with pytest.raises(PluginExc):
            async for _ in runner.run({"x": 1}, span):
                pass

    @pytest.mark.asyncio
    async def test_workflow_factory_create_default_plugin(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        factory = WorkflowPluginFactory(app_id="app", uid="u", workflow_ids=[])
        # When schema has no node-start node, take default branch
        schema = {
            "data": {
                "data": {
                    "id": "fid",
                    "name": "n",
                    "description": "d",
                    "data": {"nodes": []},
                }
            }
        }
        plugin = await factory.create_workflow_plugin(schema)
        assert plugin.flow_id == "fid"
        assert plugin.typ == "workflow"
