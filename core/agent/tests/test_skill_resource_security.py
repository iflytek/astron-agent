"""Security regressions for Skill resource downloads and staging."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from agent.service.plugin.skill import SkillPluginFactory
from agent.service.plugin.skill_resource_security import (
    MAX_SKILL_TEXT_BYTES,
    SKILL_RESOURCE_ERROR,
    SKILL_RESOURCE_TRUSTED_BUCKET_ENV,
    SKILL_RESOURCE_TRUSTED_ORIGIN_ENV,
    download_skill_resource,
    read_bounded_response,
    validate_skill_resource_url,
)
from agent.service.plugin.skill_sandbox import E2BSandboxProvider, SkillSandboxConfig

_QUERY = (
    "X-Amz-Algorithm=AWS4-HMAC-SHA256&"
    "X-Amz-Credential=test%2F20260824%2Fus-east-1%2Fs3%2Faws4_request&"
    "X-Amz-Date=20260824T000000Z&X-Amz-Expires=300&"
    "X-Amz-SignedHeaders=host&X-Amz-Signature=" + "a" * 64
)
_VALID_URL = f"https://objects.example/console-oss/skill-files/user/skill.md?{_QUERY}"


@pytest.fixture(autouse=True)
def _trusted_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(SKILL_RESOURCE_TRUSTED_ORIGIN_ENV, "https://objects.example")
    monkeypatch.setenv(SKILL_RESOURCE_TRUSTED_BUCKET_ENV, "console-oss")


def test_valid_resource_requires_exact_origin_bucket_prefix_and_sigv4() -> None:
    assert validate_skill_resource_url(_VALID_URL) == _VALID_URL


@pytest.mark.parametrize(
    "url",
    [
        "http://objects.example/console-oss/skill-files/user/skill.md?" + _QUERY,
        "https://objects.example:444/console-oss/skill-files/user/skill.md?" + _QUERY,
        "https://user:pass@objects.example/console-oss/skill-files/user/skill.md?"
        + _QUERY,
        "https://attacker.example/console-oss/skill-files/user/skill.md?" + _QUERY,
        "https://objects.example/other/skill-files/user/skill.md?" + _QUERY,
        "https://objects.example/console-oss/not-skill/user/skill.md?" + _QUERY,
        "https://objects.example/console-oss/skill-files/%2e%2e/admin?" + _QUERY,
        "https://objects.example/console-oss/skill-files/user/skill.md",
        _VALID_URL + "&X-Amz-Signature=" + "b" * 64,
        _VALID_URL + "#redirect",
        "https://objects.example/console-oss/skill-files/%ZZ/skill.md?" + _QUERY,
        _VALID_URL + "&invalid=%ZZ",
    ],
    ids=[
        "scheme",
        "port",
        "userinfo",
        "host",
        "bucket",
        "prefix",
        "encoded-traversal",
        "unsigned",
        "duplicate-signature",
        "fragment",
        "invalid-path-percent-escape",
        "invalid-query-percent-escape",
    ],
)
def test_invalid_resource_urls_fail_before_network(url: str) -> None:
    with pytest.raises(RuntimeError, match=SKILL_RESOURCE_ERROR):
        validate_skill_resource_url(url)


def test_malicious_bot_skill_is_rejected_without_creating_http_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnexpectedSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise AssertionError("invalid bot payload must not create an HTTP session")

    monkeypatch.setattr("aiohttp.ClientSession", UnexpectedSession)
    factory = SkillPluginFactory(
        skills=[
            {
                "skillId": "42",
                "name": "attacker",
                "downloadUrl": "http://169.254.169.254/latest/meta-data",
                "resources": [
                    {
                        "path": "payload.py",
                        "downloadUrl": "http://127.0.0.1/admin",
                    }
                ],
            }
        ]
    )

    with pytest.raises(ValueError):
        factory.gen()


@pytest.mark.asyncio
async def test_stage_resources_prevalidates_all_urls_before_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnexpectedSession:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise AssertionError("invalid resources must fail before opening a session")

    monkeypatch.setattr(
        "agent.service.plugin.skill_sandbox.aiohttp.ClientSession", UnexpectedSession
    )
    resources = [
        SimpleNamespace(path="valid.py", download_url=_VALID_URL, file_size=10),
        SimpleNamespace(
            path="attack.py",
            download_url="http://169.254.169.254/latest/meta-data",
            file_size=10,
        ),
    ]

    with pytest.raises(RuntimeError, match=SKILL_RESOURCE_ERROR):
        await E2BSandboxProvider(SkillSandboxConfig())._stage_resources(
            SimpleNamespace(), "/home/user/skill", resources
        )


class _Chunks:
    def __init__(self, chunks: list[bytes]) -> None:
        self.chunks = chunks

    async def iter_chunked(self, _size: int) -> Any:
        for chunk in self.chunks:
            yield chunk


@pytest.mark.asyncio
async def test_unknown_length_response_is_streamed_with_hard_limit() -> None:
    response = SimpleNamespace(
        content_length=None,
        content=_Chunks([b"a" * MAX_SKILL_TEXT_BYTES, b"b"]),
    )

    with pytest.raises(RuntimeError, match=SKILL_RESOURCE_ERROR):
        await read_bounded_response(response, MAX_SKILL_TEXT_BYTES)


@pytest.mark.asyncio
async def test_redirect_response_is_not_followed_or_read() -> None:
    class UnexpectedContent:
        async def iter_chunked(self, _size: int) -> Any:
            raise AssertionError("redirect response body must not be read")
            yield b""  # pragma: no cover

    class RedirectResponse:
        status = 302
        content_length = None
        content = UnexpectedContent()

        async def __aenter__(self) -> "RedirectResponse":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def raise_for_status(self) -> None:
            raise AssertionError("explicit 2xx validation must run first")

    class FakeSession:
        def __init__(self) -> None:
            self.requests: list[tuple[str, dict[str, Any]]] = []

        def get(self, url: str, **kwargs: Any) -> RedirectResponse:
            self.requests.append((url, kwargs))
            return RedirectResponse()

    session: Any = FakeSession()

    with pytest.raises(RuntimeError, match=SKILL_RESOURCE_ERROR):
        await download_skill_resource(session, _VALID_URL, MAX_SKILL_TEXT_BYTES)

    assert session.requests == [(_VALID_URL, {"allow_redirects": False})]
