"""FastMCP SSE facade for the Zhiwen PPT API."""

import os
from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from mcp.server.fastmcp import FastMCP

from .client import ZhiwenClient
from .credentials import load_credentials


class ZhiwenTools(Protocol):
    """Trusted Zhiwen client contract; the MCP wrapper exposes a URL-only API."""

    def get_theme_list(
        self,
        pay_type: str = "not_free",
        style: str | None = None,
        color: str | None = None,
        industry: str | None = None,
        page_num: int = 2,
        page_size: int = 10,
    ) -> dict[str, Any]: ...

    def create_ppt_task(
        self,
        text: str,
        template_id: str,
        author: str = "XXXX",
        is_card_note: bool = True,
        search: bool = False,
        is_figure: bool = True,
        ai_image: str = "normal",
    ) -> dict[str, Any]: ...

    def get_task_progress(self, sid: str) -> dict[str, Any]: ...

    def create_outline(
        self, text: str, language: str = "cn", search: bool = False
    ) -> dict[str, Any]: ...

    def create_outline_by_doc(
        self,
        file_name: str,
        text: str,
        file_url: str | None = None,
        file_path: str | None = None,
        language: str = "cn",
        search: bool = False,
    ) -> dict[str, Any]: ...

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
    ) -> dict[str, Any]: ...


@dataclass(frozen=True)
class ServerSettings:
    host: str = "0.0.0.0"
    port: int = 3000
    sse_path: str = "/ppt/sse"
    message_path: str = "/ppt/messages/"

    @classmethod
    def from_environ(cls, environ: Mapping[str, str] | None = None) -> "ServerSettings":
        values = os.environ if environ is None else environ
        return cls(
            host=values.get("PPT_MCP_HOST", "0.0.0.0"),
            port=int(values.get("PPT_MCP_PORT", "3000")),
        )


def create_mcp(client: ZhiwenTools, settings: ServerSettings | None = None) -> FastMCP:
    runtime = settings or ServerSettings.from_environ()
    server = FastMCP(
        "ZWPPT_MCP",
        instructions=(
            "Generate Zhiwen PPT tasks, preserve the returned sid, and poll "
            "get_task_progress until data.pptStatus is done and data.pptUrl is set."
        ),
        host=runtime.host,
        port=runtime.port,
        sse_path=runtime.sse_path,
        message_path=runtime.message_path,
    )

    @server.tool()
    def get_theme_list(
        pay_type: str = "not_free",
        style: str | None = None,
        color: str | None = None,
        industry: str | None = None,
        page_num: int = 2,
        page_size: int = 10,
    ) -> dict[str, Any]:
        """获取PPT模板列表。

        使用说明：
        1. 此工具用于获取可用的PPT模板列表，需先调用本工具获取template_id，后续PPT生成需用到。
        2. 可通过style、color、industry等参数筛选模板。
        3. 需先设置环境变量AIPPT_APP_ID和AIPPT_API_SECRET。

        参数：
        - pay_type: 模板付费类型，可选值：free-免费模板，not_free-付费模板。
        - style: 模板风格，如：简约、商务、科技等。
        - color: 模板颜色，如：红色、蓝色等。
        - industry: 模板行业，如：教育培训、金融等。
        - page_num: 页码，从1开始。
        - page_size: 每页数量，最大100。

        返回：
        包含模板列表的字典，每个模板包含template_id等信息。
        """
        return client.get_theme_list(pay_type, style, color, industry, page_num, page_size)

    @server.tool()
    def create_ppt_task(
        text: str,
        template_id: str,
        author: str = "XXXX",
        is_card_note: bool = True,
        search: bool = False,
        is_figure: bool = True,
        ai_image: str = "normal",
    ) -> dict[str, Any]:
        """创建PPT生成任务。

        使用说明：
        1. 在调用本工具前，必须先调用get_theme_list获取有效的template_id。
        2. 工具会返回任务ID(sid)，需用get_task_progress轮询查询进度。
        3. 任务完成后，可从get_task_progress结果中获取PPT下载地址。
        4. 需先设置环境变量AIPPT_APP_ID和AIPPT_API_SECRET。

        参数：
        - text: PPT生成的内容描述，用于生成PPT的主题和内容。
        - template_id: PPT模板ID，需通过get_theme_list获取。
        - author: PPT作者名称，将显示在生成的PPT中。
        - is_card_note: 是否生成PPT演讲备注，True表示生成，False表示不生成。
        - search: 是否联网搜索，True表示联网搜索补充内容，False表示不联网。
        - is_figure: 是否自动配图，True表示自动配图，False表示不配图。
        - ai_image: AI配图类型，仅在is_figure为True时生效。可选值：normal-普通配图(20%正文配图)，advanced-高级配图(50%正文配图)。

        返回：
        成功时返回包含sid的字典，失败时抛出异常。
        """
        return client.create_ppt_task(
            text, template_id, author, is_card_note, search, is_figure, ai_image
        )

    @server.tool()
    def get_task_progress(sid: str) -> dict[str, Any]:
        """查询PPT生成任务进度。

        使用说明：
        1. 用于查询通过create_ppt_task或create_ppt_by_outline创建的任务进度。
        2. 需定期轮询本工具直到任务完成。
        3. 任务完成后，可从返回结果中获取PPT下载地址。
        4. 需先设置环境变量AIPPT_APP_ID和AIPPT_API_SECRET。

        参数：
        - sid: 任务ID，从create_ppt_task或create_ppt_by_outline工具获取。

        返回：
        包含任务状态和PPT下载地址的字典。
        """
        return client.get_task_progress(sid)

    @server.tool()
    def create_outline(
        text: str, language: str = "cn", search: bool = False
    ) -> dict[str, Any]:
        """创建PPT大纲。

        使用说明：
        1. 用于根据文本内容生成PPT大纲。
        2. 生成的大纲可用于create_ppt_by_outline工具。
        3. 可通过search参数控制是否联网搜索补充内容。
        4. 需先设置环境变量AIPPT_APP_ID和AIPPT_API_SECRET。

        参数：
        - text: 需要生成大纲的内容描述。
        - language: 大纲生成的语言，目前支持cn(中文)。
        - search: 是否联网搜索，True表示联网搜索补充内容，False表示不联网。

        返回：
        包含生成的大纲内容的字典。
        """
        return client.create_outline(text, language, search)

    @server.tool()
    def create_outline_by_doc(
        file_name: str,
        text: str,
        file_url: str,
        language: str = "cn",
        search: bool = False,
    ) -> dict[str, Any]:
        """从文档创建PPT大纲。

        使用说明：
        1. 用于根据文档内容生成PPT大纲。
        2. 仅支持通过file_url导入文档，不接受服务器本地文件路径。
        3. 文档格式支持：pdf(不支持扫描件)、doc、docx、txt、md。
        4. 文档大小限制：10M以内，字数限制8000字以内。
        5. 生成的大纲可用于create_ppt_by_outline工具。
        6. 需先设置环境变量AIPPT_APP_ID和AIPPT_API_SECRET。

        参数：
        - file_name: 文档文件名，必须包含文件后缀名。
        - file_url: 文档文件的URL地址。
        - text: 补充的文本内容，用于指导大纲生成。
        - language: 大纲生成的语言，目前支持cn(中文)。
        - search: 是否联网搜索，True表示联网搜索补充内容，False表示不联网。

        返回：
        包含生成的大纲内容的字典。
        """
        return client.create_outline_by_doc(
            file_name,
            text,
            file_url=file_url,
            language=language,
            search=search,
        )

    @server.tool()
    def create_ppt_by_outline(
        text: str,
        outline: dict[str, Any] | str,
        template_id: str,
        author: str = "XXXX",
        is_card_note: bool = True,
        search: bool = False,
        is_figure: bool = True,
        ai_image: str = "normal",
    ) -> dict[str, Any]:
        """根据大纲创建PPT。

        使用说明：
        1. 用于根据已生成的大纲创建PPT。
        2. 大纲需通过create_outline或create_outline_by_doc工具生成。
        3. template_id需通过get_theme_list工具获取。
        4. 工具会返回任务ID(sid)，需用get_task_progress轮询查询进度。
        5. 任务完成后，可从get_task_progress结果中获取PPT下载地址。
        6. 需先设置环境变量AIPPT_APP_ID和AIPPT_API_SECRET。

        参数：
        - text: PPT生成的内容描述，用于指导PPT生成。
        - outline: 大纲内容，需从create_outline或create_outline_by_doc工具返回的JSON响应中提取['data']['outline']字段的值。该字段包含生成的大纲内容，格式为dict。
        - template_id: PPT模板ID，需通过get_theme_list工具获取。
        - author: PPT作者名称，将显示在生成的PPT中。
        - is_card_note: 是否生成PPT演讲备注，True表示生成，False表示不生成。
        - search: 是否联网搜索，True表示联网搜索补充内容，False表示不联网。
        - is_figure: 是否自动配图，True表示自动配图，False表示不配图。
        - ai_image: AI配图类型，仅在is_figure为True时生效。可选值：normal-普通配图(20%正文配图)，advanced-高级配图(50%正文配图)。

        返回：
        成功时返回包含sid的字典，失败时抛出异常。
        """
        return client.create_ppt_by_outline(
            text, outline, template_id, author, is_card_note, search, is_figure, ai_image
        )

    return server


def main() -> None:
    client = ZhiwenClient(load_credentials())
    create_mcp(client).run(transport="sse")
