"""
ASE OCR LLM Service
"""

# pylint: disable=line-too-long,too-few-public-methods,too-many-instance-attributes,too-many-arguments
import asyncio
import base64
import json
import os
from typing import Any, Dict, List, Optional, Tuple

import fitz  # type: ignore
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.metrics.meter import Meter
from common.utils.hmac_auth import HMACAuth
from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.clients.aiohttp_client import HttpClient
from plugin.aitools.common.clients.websockets_client import WebSocketClient
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException
from plugin.aitools.common.log.logger import log
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

DOCUMENT_PAGE_UNLIMITED = -1


class OCRLLM(BaseModel):
    """OCR LLM Input"""

    file_url: str
    page_start: int = DOCUMENT_PAGE_UNLIMITED
    page_end: int = DOCUMENT_PAGE_UNLIMITED


class OcrRespParse:
    """OCR response parse"""

    @staticmethod
    def parse(ocr_resp: dict) -> str:
        """
        OCR response parse

        Args:
            ocr_resp:

        Returns:
        """
        images = ocr_resp.get("image", [])
        result = []
        for image in images:
            contents = image.get("content", [[]])
            for content in contents:
                for one in content:
                    child_ocr_texts = OcrRespParse._deal_one(one)
                    result.extend(child_ocr_texts)
        return "\n".join(result)

    @staticmethod
    def _deal_table_data(cells: List[Dict[str, Any]]) -> str:
        max_row = max(item["row"] for item in cells)
        table = "<table border='1'>\n"

        for r in range(1, max_row + 1):
            table += "  <tr>\n"
            for item in cells:
                if item["row"] == r:

                    # Wrap the content in a list to make it a valid input for _deal_one
                    root_content: List[List[Dict[str, Any]]] = [
                        item.get("content", [{}])
                    ]
                    c = {"content": root_content}
                    # Deal with the content
                    text_arr = OcrRespParse._deal_one(c)

                    # Check if it is a title row
                    if r == 1:
                        table += f"    <th colspan=\
                            '{item['colspan']}'>{'<br>'.join(text_arr)}</th>\n"
                    else:
                        table += f"    <td colspan='{item['colspan']}'\
                              rowspan=\
                                '{item['rowspan']}'>{'<br>'.join(text_arr)}</td>\n"

            # Set the style of the title row
            if r == 1:
                table += "  </tr>\n"
                table = table.replace(
                    "<th", "<th style='font-weight: bold; background-color: #f2f3f4;'"
                )
            else:
                table += "  </tr>\n"

        table += "</table>"
        return table

    @staticmethod
    def _deal_one(root_content: dict, is_get_text_attribute: bool = False) -> List[str]:
        """
        Deal with one content recursively

        Args:
            root_content:

        Returns:

        """
        child_contents = root_content.get("content", [[{}]])
        child_ocr_texts = []

        for child_content in child_contents:
            for child_content2 in child_content:
                # Get the content type
                content_type = child_content2.get("type", "")

                # Get the text attribute
                if is_get_text_attribute:
                    return OcrRespParse._process_text_attribute_mode(child_content2)
                # Deal with the text
                if content_type == "paragraph":
                    result = OcrRespParse._process_paragraph_content(child_content2)
                    child_ocr_texts.append(result)
                # Deal with the table information
                elif content_type == "table":
                    results = OcrRespParse._process_table_content(child_content2)
                    child_ocr_texts.extend(results)
                # Recursively deal with the other content types
                else:
                    results = OcrRespParse._process_other_content_types(
                        child_content2, content_type
                    )
                    child_ocr_texts.extend(results)

        return child_ocr_texts

    @staticmethod
    def _process_text_attribute_mode(child_content2: Dict[str, Any]) -> List[str]:
        """Process the text attribute mode"""
        content_type = child_content2.get("type", "")
        if content_type == "text_unit":
            attributes = child_content2.get("attribute", [{}])
            return [OcrRespParse._deal_text_attributes(attributes)]
        return OcrRespParse._deal_one(child_content2, True)

    @staticmethod
    def _process_paragraph_content(child_content2: Dict[str, Any]) -> str:
        """Process paragraph content"""
        text_arr = child_content2.get("text", [])
        text_str = "\n".join(text_arr).replace("\n", "<br>")
        # Get the text format information
        text_format = OcrRespParse._deal_one(child_content2, True)
        if text_format:
            text_str = text_format[0].format(text=text_str)
        return text_str

    @staticmethod
    def _process_table_content(child_content2: Dict[str, Any]) -> List[str]:
        """Process table content"""
        results = []
        # Deal with the table header
        note = child_content2.get("note", [])
        if note:
            header_content = OcrRespParse._deal_one({"content": [note]})
            results.append("<br>".join(header_content))
        cells = child_content2.get("cell", [])
        table_content = OcrRespParse._deal_table_data(cells)
        results.append(table_content)
        return results

    @staticmethod
    def _process_other_content_types(
        child_content2: Dict[str, Any], content_type: str
    ) -> List[str]:
        """Deal with the other content types(code, title, list, etc.)"""
        results = []
        if child_content2:
            content2_result = OcrRespParse._deal_one(child_content2)

            # Code block
            if content_type == "code":
                results.append("```")
                results.extend(content2_result)
                results.append("```")
            # Title
            elif content_type == "title":
                level = child_content2.get("level", 0)
                if level:
                    text = f'{"#" * level} {"<br>".join(content2_result)}'
                    results.append(text)
                else:
                    results.extend(content2_result)
            # List
            elif content_type == "item":
                results.append(f'- {"<br>".join(content2_result)}')
            # Other
            else:
                results.extend(content2_result)
        return results

    @staticmethod
    def _deal_text_attributes(attributes: List[Dict[str, str]]) -> str:
        ff = "{text}"
        for attribute in attributes:
            name = attribute.get("name", "")
            # Bold
            if name == "bold":
                ff = f"<b>{ff}</b>"
            # Italic
            elif name == "italic":
                ff = f"<i>{ff}</i>"
            # Other
            else:
                pass
        return ff


class OcrLLMTask:
    """
    OCR async task
    """

    def __init__(
        self,
        url: str,
        app_id: Optional[str],
        api_key: Optional[str],
        api_secret: Optional[str],
        data: bytes,
        span: Optional[SpanLike] = None,
        meter: Optional[Meter] = None,
        node_trace: Optional[NodeTraceLog] = None,
        file_index: int = 0,
        page_index: int = 0,
    ) -> None:
        self.url = url
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.data = data
        self.parent_span = span
        self.meter = meter
        self.node_trace = node_trace
        self.file_index = file_index
        self.page_index = page_index

        self.body = self._build_params()

    def _build_params(self) -> Dict[str, Any]:
        body = {
            "header": {"app_id": self.app_id, "status": 2},
            "parameter": {
                "ocr": {
                    "result_option": "normal",
                    "result_format": "json",
                    "output_type": "one_shot",
                    "exif_option": "0",
                    "json_element_option": "",
                    "markdown_element_option": "watermark=0,page_header=0,page_footer=0,page_number=0,graph=0",
                    "sed_element_option": "watermark=0,page_header=0,page_footer=0,page_number=0,graph=0",
                    "alpha_option": "0",
                    "rotation_min_angle": 5,
                    "result": {
                        "encoding": "utf8",
                        "compress": "raw",
                        "format": "plain",
                    },
                }
            },
            "payload": {
                "image": {
                    "image": base64.b64encode(self.data).decode(),
                    "status": 2,
                    "seq": 0,
                }
            },
        }

        return body

    async def invoke(self) -> Dict[str, Any]:
        try:
            if self.url.startswith("ws"):
                async with WebSocketClient(
                    url=self.url,
                    auth="ASE",
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    span=self.parent_span,
                ).start() as client:
                    await client.send(self.body)

                    name = "markdown"
                    values = []
                    source_datas = []

                    async for msg in client.recv():
                        value, source_data = self._handle_message(msg)
                        values.append(value)
                        source_datas.append(source_data)

                    return {
                        "file_index": self.file_index,
                        "page_index": self.page_index,
                        "name": name,
                        "values": "\n".join(values),
                        "source_datas": source_datas,
                    }
            else:
                async with HttpClient(
                    method="GET",
                    url=self.url,
                    span=self.parent_span,
                    headers={"content-type": "application/json"},
                    params=HMACAuth.build_auth_params(
                        self.url, "GET", self.api_key, self.api_secret  # type: ignore[arg-type]
                    ),
                    json=self.body,
                ).start() as client:
                    async with client.request() as response:
                        name = "markdown"
                        values = []
                        source_datas = []

                        value, source_data = self._handle_message(
                            response.data["content"]  # type: ignore[index]
                        )
                        values.append(value)
                        source_datas.append(source_data)

                        return {
                            "file_index": self.file_index,
                            "page_index": self.page_index,
                            "name": name,
                            "values": "\n".join(values),
                            "source_datas": source_datas,
                        }
        except ServiceException as e:
            return {
                "file_index": self.file_index,
                "page_index": self.page_index,
                "name": "str",
                "values": f"OCR 服务调用失败: {e.message}",
                "source_datas": [],
            }
        except Exception as e:
            return {
                "file_index": self.file_index,
                "page_index": self.page_index,
                "name": "str",
                "values": f"OCR 服务调用失败: {str(e)}",
                "source_datas": [],
            }

    def _handle_message(self, msg: Any) -> Tuple[str, str]:
        data = msg
        payload = data.get("payload")
        header = data.get("header", {})

        code = header.get("code", 0)
        message = header.get("message", "")

        if code != 0:
            raise ServiceException.from_error_code(
                CodeEnums.ServiceResponseError, extra_message=message
            )

        if not payload:
            raise ServiceException.from_error_code(
                CodeEnums.ServiceResponseError,
                extra_message="OCR 服务返回载荷为空",
            )
        else:
            text = payload.get("result", {}).get("text", "")
            if text:
                tt = base64.b64decode(text).decode(encoding="utf-8")
                value = OcrRespParse.parse(json.loads(tt))
                source_data = tt

                return value, source_data
            else:
                raise ServiceException.from_error_code(
                    CodeEnums.ServiceResponseError,
                    extra_message="OCR 服务返回文本为空",
                )


def pdf_convert_png(
    pdf_content: bytes,
    page_start: int = DOCUMENT_PAGE_UNLIMITED,
    page_end: int = DOCUMENT_PAGE_UNLIMITED,
) -> Tuple[Dict[int, bytes], Dict[int, str]]:
    """
    PDF convert to PNG.

    Args:
        pdf_content: PDF content in bytes.
        page_start: Start page number. -1 means all pages.
        page_end: End page number. -1 means all pages.

    Returns:
        A tuple of two dictionaries. The first dictionary contains the page number as key and the corresponding PNG image in bytes as value. The second dictionary contains the page number as key and the corresponding text in the page as value.
    """
    if (
        page_start > page_end != DOCUMENT_PAGE_UNLIMITED
        and page_start != DOCUMENT_PAGE_UNLIMITED
    ):
        raise ServiceException.from_error_code(
            CodeEnums.ServiceLocalError, extra_message="起始页号应该小于等于结束页号"
        )

    if not pdf_content.startswith(b"%PDF-"):
        raise ServiceException.from_error_code(
            CodeEnums.ServiceLocalError, extra_message="PDF 内容格式错误"
        )

    pngs = {}
    texts = {}
    with fitz.Document(stream=pdf_content, filetype="pdf") as pdf:
        for i, page in enumerate(pdf):
            if page_start != DOCUMENT_PAGE_UNLIMITED and i < page_start:
                continue
            if page_end != DOCUMENT_PAGE_UNLIMITED and i > page_end:
                break
            # rotate = int(0)
            # Each size zoom factor is 2, which will generate an image with a resolution of 4.
            # Here, if not set, the default image size is: 792X612, dpi=96
            image_list = page.get_images(full=True)
            if image_list:
                zoom_x = 2  # (2-->1584x1224)
                zoom_y = 2
                mat = fitz.Matrix(zoom_x, zoom_y)
                pixmap = page.get_pixmap(matrix=mat, alpha=False)
                image_bytes = pixmap.pil_tobytes(format="PNG")
                pngs[i] = image_bytes
            else:
                text = page.get_text()
                texts[i] = text
    return pngs, texts


def merge_results(
    results: List[Dict[str, Any]], texts_list: List[Dict[int, str]]
) -> List:
    merged: Dict[int, Dict[int, Any]] = {}

    for i, texts in enumerate(texts_list):
        merged[i] = {}
        for page_idx, text in texts.items():
            # merged[i][page_idx] = text.strip() if text else ""
            merged[i][page_idx] = {
                "name": "str",
                "value": text.strip() if text else "",
                "source_data": "",
            }

    for r in results:
        file_index = r["file_index"]
        page_index = r["page_index"]

        if file_index not in merged:
            merged[file_index] = {}

        if page_index not in merged[file_index]:
            merged[file_index][page_index] = {
                "name": r.get("name"),
                "value": r.get("values"),
                "source_data": r.get("source_datas"),
            }
        else:
            merged[file_index][page_index]["value"] += r.get("values")

    sorted_merged = []
    for file_index, pages in merged.items():
        contents = []
        for page_index, content in sorted(pages.items()):
            contents.append(content)
        sorted_merged.append({"file_index": file_index, "content": contents})

    return sorted_merged


@api_service(
    method="POST",
    path="/aitools/v1/ocr",
    query=None,
    body=OCRLLM,
    response=BaseResponse,
    summary="OCR with LLM",
    description="OCR with LLM",
    tags=["public_cn"],
    deprecated=False,
)
async def req_ase_ability_ocr_service(
    body: OCRLLM,
    request: Request,
    span: Optional[SpanLike] = None,
    meter: Optional[Meter] = None,
    node_trace: Optional[NodeTraceLog] = None,
) -> BaseResponse:
    image_byte_arrays = []
    async with HttpClient("GET", body.file_url, span).start() as client:
        async with client.request() as response:
            image_byte_arrays.append(await response.data["content"].read())  # type: ignore[index]

    url = os.getenv(
        "OCR_LLM_HTTP_URL", "https://cbm01.cn-huabei-1.xf-yun.com/v1/private/se75ocrbm"
    )
    app_id = os.getenv("AI_APP_ID")
    api_key = os.getenv("AI_API_KEY")
    api_secret = os.getenv("AI_API_SECRET")

    pngs_list = []
    texts_list = []
    ocr_tasks_list = []

    for i, data_byte in enumerate(image_byte_arrays):
        pngs: Dict[int, bytes] = {}
        texts: Dict[int, str] = {}

        if data_byte.startswith(b"%PDF-"):
            pngs, texts = await run_in_threadpool(
                pdf_convert_png, data_byte, body.page_start, body.page_end
            )
            # pngs, texts = pdf_convert_png(data_byte, body.page_start, body.page_end)
            for j in pngs.keys():
                ocr_tasks_list.append(
                    OcrLLMTask(
                        url=url,
                        app_id=app_id,
                        api_key=api_key,
                        api_secret=api_secret,
                        data=pngs[j],
                        # span=span,
                        file_index=i,
                        page_index=j,
                    )
                )
        else:
            pngs[0] = data_byte
            ocr_tasks_list.append(
                OcrLLMTask(
                    url=url,
                    app_id=app_id,
                    api_key=api_key,
                    api_secret=api_secret,
                    data=pngs[0],
                    # span=span,
                )
            )

        pngs_list.append(pngs)
        texts_list.append(texts)

    sem = asyncio.Semaphore(50)

    async def safe_invoke(task: OcrLLMTask) -> Dict[str, Any]:
        async with sem:
            return await task.invoke()

    raw_results = await asyncio.gather(
        *(safe_invoke(task) for task in ocr_tasks_list), return_exceptions=True
    )
    ok_results: List[Dict[str, Any]] = []
    for r in raw_results:
        if isinstance(r, ServiceException):
            log.error(f"OCR failed: {r.message}")
        elif isinstance(r, BaseException):
            log.error(f"OCR failed: {r}")
        else:
            ok_results.append(r)

    merged_results = merge_results(ok_results, texts_list)

    return SuccessResponse(data=merged_results, sid=request.state.sid)
