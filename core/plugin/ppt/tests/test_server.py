from typing import Any

import pytest

from zwppt_mcp.server import ServerSettings, create_mcp


class RecordingZhiwenClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]] = []

    def _record(self, name: str, *args: Any, **kwargs: Any) -> dict[str, Any]:
        self.calls.append((name, args, kwargs))
        return {"method": name, "args": args, "kwargs": kwargs}

    def get_theme_list(
        self,
        pay_type: str = "not_free",
        style: str | None = None,
        color: str | None = None,
        industry: str | None = None,
        page_num: int = 2,
        page_size: int = 10,
    ) -> dict[str, Any]:
        return self._record(
            "get_theme_list", pay_type, style, color, industry, page_num, page_size
        )

    def create_ppt_task(
        self,
        text: str,
        template_id: str,
        author: str = "XXXX",
        is_card_note: bool = True,
        search: bool = False,
        is_figure: bool = True,
        ai_image: str = "normal",
    ) -> dict[str, Any]:
        return self._record(
            "create_ppt_task",
            text,
            template_id,
            author,
            is_card_note,
            search,
            is_figure,
            ai_image,
        )

    def get_task_progress(self, sid: str) -> dict[str, Any]:
        return self._record("get_task_progress", sid)

    def create_outline(
        self, text: str, language: str = "cn", search: bool = False
    ) -> dict[str, Any]:
        return self._record("create_outline", text, language, search)

    def create_outline_by_doc(
        self,
        file_name: str,
        text: str,
        file_url: str | None = None,
        file_path: str | None = None,
        language: str = "cn",
        search: bool = False,
    ) -> dict[str, Any]:
        return self._record(
            "create_outline_by_doc",
            file_name,
            text,
            file_url,
            file_path,
            language,
            search,
        )

    def create_ppt_by_outline(
        self,
        text: str,
        outline: dict[str, Any] | str,
        template_id: str,
        author: str = "XXXX",
        is_card_note: bool = True,
        search: bool = False,
        is_figure: bool = True,
        ai_image: str = "normal",
    ) -> dict[str, Any]:
        return self._record(
            "create_ppt_by_outline",
            text,
            outline,
            template_id,
            author,
            is_card_note,
            search,
            is_figure,
            ai_image,
        )


def test_server_settings_use_internal_ppt_paths() -> None:
    settings = ServerSettings.from_environ({})

    assert settings.host == "0.0.0.0"
    assert settings.port == 3000
    assert settings.sse_path == "/ppt/sse"
    assert settings.message_path == "/ppt/messages/"


def test_server_settings_use_ppt_binding_variables_and_fixed_paths() -> None:
    settings = ServerSettings.from_environ(
        {
            "PPT_MCP_HOST": "127.0.0.1",
            "PPT_MCP_PORT": "3100",
            "MCP_HOST": "wrong-host",
            "MCP_PORT": "3200",
            "MCP_SSE_PATH": "/wrong/sse",
            "MCP_MESSAGE_PATH": "/wrong/messages/",
        }
    )

    assert settings.host == "127.0.0.1"
    assert settings.port == 3100
    assert settings.sse_path == "/ppt/sse"
    assert settings.message_path == "/ppt/messages/"


def test_create_mcp_registers_exactly_six_tools() -> None:
    server = create_mcp(RecordingZhiwenClient())
    tools = server._tool_manager.list_tools()

    assert [tool.name for tool in tools] == [
        "get_theme_list",
        "create_ppt_task",
        "get_task_progress",
        "create_outline",
        "create_outline_by_doc",
        "create_ppt_by_outline",
    ]
    assert server.settings.port == 3000
    assert server.settings.sse_path == "/ppt/sse"
    assert server.settings.message_path == "/ppt/messages/"


def test_get_theme_list_forwards_parameters_and_result() -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("get_theme_list")

    result = tool.fn("free", "business", "blue", "finance", 4, 25)

    assert result == {
        "method": "get_theme_list",
        "args": ("free", "business", "blue", "finance", 4, 25),
        "kwargs": {},
    }


def test_create_ppt_task_forwards_parameters_and_result() -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("create_ppt_task")

    result = tool.fn("topic", "template-1", "Ada", False, True, False, "advanced")

    assert result == {
        "method": "create_ppt_task",
        "args": ("topic", "template-1", "Ada", False, True, False, "advanced"),
        "kwargs": {},
    }


def test_get_task_progress_forwards_parameters_and_result() -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("get_task_progress")

    result = tool.fn("task-1")

    assert result == {"method": "get_task_progress", "args": ("task-1",), "kwargs": {}}


def test_create_outline_forwards_parameters_and_result() -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("create_outline")

    result = tool.fn("topic", "en", True)

    assert result == {
        "method": "create_outline",
        "args": ("topic", "en", True),
        "kwargs": {},
    }


def test_create_outline_by_doc_forwards_parameters_and_result() -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("create_outline_by_doc")

    result = tool.fn(
        "source.docx", "topic", "https://files.example/source.docx", "en", True
    )

    assert result == {
        "method": "create_outline_by_doc",
        "args": (
            "source.docx",
            "topic",
            "https://files.example/source.docx",
            None,
            "en",
            True,
        ),
        "kwargs": {},
    }


def test_create_outline_by_doc_schema_requires_url_and_hides_local_path() -> None:
    tool = create_mcp(RecordingZhiwenClient())._tool_manager.get_tool(
        "create_outline_by_doc"
    )

    assert "file_path" not in tool.parameters["properties"]
    assert "file_url" in tool.parameters["required"]


@pytest.mark.parametrize(
    "file_path",
    ["../secret.env", "/proc/self/environ", "/uploads/link-to-external-secret"],
)
def test_create_outline_by_doc_rejects_model_supplied_local_paths(
    file_path: str,
) -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("create_outline_by_doc")

    with pytest.raises(TypeError):
        tool.fn(
            "source.docx",
            "topic",
            "https://files.example/source.docx",
            file_path=file_path,
        )

    assert client.calls == []


def test_create_ppt_by_outline_forwards_parameters_and_result() -> None:
    client = RecordingZhiwenClient()
    tool = create_mcp(client)._tool_manager.get_tool("create_ppt_by_outline")

    result = tool.fn(
        "topic", {"title": "outline"}, "template-1", "Ada", False, True, False, "advanced"
    )

    assert result == {
        "method": "create_ppt_by_outline",
        "args": (
            "topic",
            {"title": "outline"},
            "template-1",
            "Ada",
            False,
            True,
            False,
            "advanced",
        ),
        "kwargs": {},
    }
