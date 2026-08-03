"""Signed HTTP client for the Zhiwen PPT API."""

import base64
import hashlib
import hmac
import json
import time
from contextlib import ExitStack
from typing import Any, Callable, cast

import requests
from requests_toolbelt.multipart.encoder import MultipartEncoder  # type: ignore[import-untyped]

from .credentials import Credentials


class ZhiwenApiError(RuntimeError):
    """Raised when Zhiwen returns an invalid or unsuccessful API response."""


class ZhiwenClient:
    """Call the Zhiwen PPT API with its required request signature."""

    _base_url = "https://zwapi.xfyun.cn"

    def __init__(
        self,
        credentials: Credentials,
        session: requests.Session | None = None,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._credentials = credentials
        self._session = session or requests.Session()
        self._clock = clock

    def headers(self, content_type: str = "application/json; charset=utf-8") -> dict[str, str]:
        timestamp = str(int(self._clock()))
        authorization = hashlib.md5(
            f"{self._credentials.app_id}{timestamp}".encode()
        ).hexdigest()
        signature = base64.b64encode(
            hmac.new(
                self._credentials.api_secret.encode(), authorization.encode(), hashlib.sha1
            ).digest()
        ).decode()
        return {
            "appId": self._credentials.app_id,
            "timestamp": timestamp,
            "signature": signature,
            "Content-Type": content_type,
        }

    def get_theme_list(
        self,
        pay_type: str = "not_free",
        style: str | None = None,
        color: str | None = None,
        industry: str | None = None,
        page_num: int = 2,
        page_size: int = 10,
    ) -> dict[str, Any]:
        params: dict[str, str | int] = {
            "payType": pay_type,
            "pageNum": page_num,
            "pageSize": page_size,
        }
        params.update(
            {
                key: value
                for key, value in {"style": style, "color": color, "industry": industry}.items()
                if value
            }
        )
        return self._request_json("GET", "/api/ppt/v2/template/list", params=params)

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
        form = MultipartEncoder(
            fields={
                "query": text,
                "templateId": template_id,
                "author": author,
                "isCardNote": str(is_card_note),
                "search": str(search),
                "isFigure": str(is_figure),
                "aiImage": ai_image,
            }
        )
        response = self._request_json(
            "POST", "/api/ppt/v2/create", data=form, content_type=form.content_type
        )
        return {"sid": self._required_sid(response)}

    def get_task_progress(self, sid: str) -> dict[str, Any]:
        return self._request_json("GET", "/api/ppt/v2/progress", params={"sid": sid})

    def create_outline(
        self, text: str, language: str = "cn", search: bool = False
    ) -> dict[str, Any]:
        form = MultipartEncoder(
            fields={"query": text, "language": language, "search": str(search)}
        )
        return self._request_json(
            "POST", "/api/ppt/v2/createOutline", data=form, content_type=form.content_type
        )

    def create_outline_by_doc(
        self,
        file_name: str,
        text: str,
        file_url: str | None = None,
        file_path: str | None = None,
        language: str = "cn",
        search: bool = False,
    ) -> dict[str, Any]:
        if bool(file_url) == bool(file_path):
            raise ValueError("exactly one of file_url or file_path is required")
        with ExitStack() as stack:
            fields: dict[str, Any] = {
                "fileName": file_name,
                "query": text,
                "language": language,
                "search": str(search),
            }
            if file_url:
                fields["fileUrl"] = file_url
            else:
                handle = stack.enter_context(open(cast(str, file_path), "rb"))
                fields["file"] = (file_name, handle, "application/octet-stream")
            form = MultipartEncoder(fields=fields)
            return self._request_json(
                "POST",
                "/api/ppt/v2/createOutlineByDoc",
                data=form,
                content_type=form.content_type,
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
        parsed_outline = json.loads(outline) if isinstance(outline, str) else outline
        response = self._request_json(
            "POST",
            "/api/ppt/v2/createPptByOutline",
            json_body={
                "query": text,
                "outline": parsed_outline,
                "templateId": template_id,
                "author": author,
                "isCardNote": is_card_note,
                "search": search,
                "isFigure": is_figure,
                "aiImage": ai_image,
            },
        )
        return {"sid": self._required_sid(response)}

    def _request_json(
        self,
        method: str,
        endpoint: str,
        *,
        params: dict[str, str | int] | None = None,
        data: MultipartEncoder | None = None,
        content_type: str | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {"headers": self.headers(content_type or "application/json; charset=utf-8")}
        if params is not None:
            kwargs["params"] = params
        if data is not None:
            kwargs["data"] = data
        if json_body is not None:
            kwargs["json"] = json_body
        try:
            response = self._session.request(method, f"{self._base_url}{endpoint}", **kwargs)
        except requests.RequestException as error:
            raise self._api_error(str(error)) from None
        if response.status_code != 200:
            raise self._api_error(response.text)
        try:
            payload = response.json()
        except ValueError as error:
            raise self._api_error(response.text or str(error)) from None
        if not isinstance(payload, dict):
            raise self._api_error(response.text)
        result = cast(dict[str, Any], payload)
        if result.get("code") != 0:
            raise self._api_error(response.text)
        return result

    def _required_sid(self, response: dict[str, Any]) -> str:
        data = response.get("data")
        if not isinstance(data, dict):
            raise ZhiwenApiError("Zhiwen API response does not contain a sid")
        sid = data.get("sid")
        if not isinstance(sid, str) or not sid.strip():
            raise ZhiwenApiError("Zhiwen API response does not contain a sid")
        return sid

    def _api_error(self, detail: str) -> ZhiwenApiError:
        redacted = detail
        for credential in sorted(
            (self._credentials.app_id, self._credentials.api_secret),
            key=len,
            reverse=True,
        ):
            if credential:
                redacted = redacted.replace(credential, "[redacted]")
        return ZhiwenApiError(f"Zhiwen API request failed: {redacted}")
