import base64
import hashlib
import hmac
import json
from collections.abc import Iterator
from typing import Any

import pytest

from zwppt_mcp.client import ZhiwenApiError, ZhiwenClient
from zwppt_mcp.credentials import Credentials


EXPECTED_ENDPOINTS = {
    "get_theme_list": ("GET", "/api/ppt/v2/template/list"),
    "create_ppt_task": ("POST", "/api/ppt/v2/create"),
    "get_task_progress": ("GET", "/api/ppt/v2/progress"),
    "create_outline": ("POST", "/api/ppt/v2/createOutline"),
    "create_outline_by_doc": ("POST", "/api/ppt/v2/createOutlineByDoc"),
    "create_ppt_by_outline": ("POST", "/api/ppt/v2/createPptByOutline"),
}


class RecordingResponse:
    def __init__(self, status_code: int = 200, payload: Any = None) -> None:
        self.status_code = status_code
        self.payload = {"code": 0, "data": {}} if payload is None else payload
        self.text = json.dumps(self.payload) if isinstance(self.payload, dict) else str(self.payload)

    def json(self) -> Any:
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class RecordingSession:
    def __init__(self, responses: Iterator[RecordingResponse] | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self.responses = responses or iter(())

    def request(self, method: str, url: str, **kwargs: Any) -> RecordingResponse:
        call = {"method": method, "url": url, **kwargs}
        if "data" in kwargs:
            call["body"] = kwargs["data"].to_string()
        self.calls.append(call)
        return next(self.responses, RecordingResponse())


def test_signature_and_headers_are_deterministic() -> None:
    client = ZhiwenClient(
        Credentials("app-1", "secret-1"),
        session=RecordingSession(),
        clock=lambda: 1_725_000_000,
    )

    auth = hashlib.md5(b"app-11725000000").hexdigest()
    expected = base64.b64encode(
        hmac.new(b"secret-1", auth.encode(), hashlib.sha1).digest()
    ).decode()

    assert client.headers() == {
        "appId": "app-1",
        "timestamp": "1725000000",
        "signature": expected,
        "Content-Type": "application/json; charset=utf-8",
    }


def test_methods_send_documented_requests_and_return_documented_results(
    tmp_path: Any,
) -> None:
    complete = {"code": 0, "data": {"pptStatus": "done", "donePages": 3, "pptUrl": "https://ppt"}}
    session = RecordingSession(
        iter(
            [
                RecordingResponse(payload=complete),
                RecordingResponse(payload={"code": 0, "data": {"sid": "task-1"}}),
                RecordingResponse(payload=complete),
                RecordingResponse(payload=complete),
                RecordingResponse(payload=complete),
                RecordingResponse(payload={"code": 0, "data": {"sid": "task-1"}}),
            ]
        )
    )
    client = ZhiwenClient(Credentials("app-1", "secret-1"), session=session, clock=lambda: 1)
    document = tmp_path / "source.docx"
    document.write_bytes(b"document")

    assert client.get_theme_list(style="business", color="blue", industry="finance") == complete
    assert client.create_ppt_task("topic", "template-1") == {"sid": "task-1"}
    assert client.get_task_progress("task-1") == complete
    assert client.create_outline("topic") == complete
    assert client.create_outline_by_doc("source.docx", "topic", file_path=str(document)) == complete
    assert client.create_ppt_by_outline("topic", {"title": "outline"}, "template-1") == {"sid": "task-1"}

    assert [(call["method"], call["url"].removeprefix("https://zwapi.xfyun.cn")) for call in session.calls] == list(EXPECTED_ENDPOINTS.values())
    assert session.calls[0]["params"] == {"payType": "not_free", "pageNum": 2, "pageSize": 10, "style": "business", "color": "blue", "industry": "finance"}
    assert session.calls[2]["params"] == {"sid": "task-1"}
    assert session.calls[1]["headers"]["Content-Type"].startswith("multipart/form-data; boundary=")
    assert session.calls[3]["headers"]["Content-Type"].startswith("multipart/form-data; boundary=")
    assert session.calls[4]["headers"]["Content-Type"].startswith("multipart/form-data; boundary=")
    assert session.calls[5]["json"] == {
        "query": "topic", "outline": {"title": "outline"}, "templateId": "template-1",
        "author": "XXXX", "isCardNote": True, "search": False, "isFigure": True, "aiImage": "normal",
    }
    assert b'name="query"\r\n\r\ntopic' in session.calls[1]["body"]
    assert b'name="file"; filename="source.docx"' in session.calls[4]["body"]


@pytest.mark.parametrize(
    ("response", "expects_redaction"),
    [
        (RecordingResponse(status_code=500, payload={"message": "app-1 secret-1 failed"}), True),
        (RecordingResponse(payload=ValueError("invalid json")), False),
        (RecordingResponse(payload={"code": 1, "message": "app-1 secret-1 rejected"}), True),
    ],
)
def test_invalid_upstream_responses_raise_redacted_api_error(
    response: RecordingResponse, expects_redaction: bool
) -> None:
    client = ZhiwenClient(
        Credentials("app-1", "secret-1"),
        session=RecordingSession(iter([response])),
    )

    with pytest.raises(ZhiwenApiError) as error:
        client.get_task_progress("task-1")

    if expects_redaction:
        assert "secret-1" not in str(error.value)
        assert "app-1" not in str(error.value)
        assert "[redacted]" in str(error.value)


def test_create_outline_by_doc_requires_exactly_one_file_source() -> None:
    client = ZhiwenClient(Credentials("app-1", "secret-1"), session=RecordingSession())

    with pytest.raises(ValueError, match="exactly one"):
        client.create_outline_by_doc("source.docx", "topic")


def test_task_creation_rejects_missing_sid() -> None:
    client = ZhiwenClient(
        Credentials("app-1", "secret-1"),
        session=RecordingSession(iter([RecordingResponse(payload={"code": 0, "data": {}})])),
    )

    with pytest.raises(ZhiwenApiError, match="sid"):
        client.create_ppt_task("topic", "template-1")


def test_error_redaction_does_not_leak_an_overlapping_secret() -> None:
    client = ZhiwenClient(
        Credentials("app", "app-secret"),
        session=RecordingSession(
            iter([RecordingResponse(payload={"code": 1, "message": "app-secret app"})])
        ),
    )

    with pytest.raises(ZhiwenApiError) as error:
        client.get_task_progress("task-1")

    assert "app" not in str(error.value)
    assert "secret" not in str(error.value)
