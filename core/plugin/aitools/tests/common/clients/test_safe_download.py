"""Security regression tests for caller-controlled remote resource downloads."""

import base64
import socket
from types import SimpleNamespace
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from plugin.aitools.common.clients.safe_download import (
    RemoteResourcePolicyError,
    create_public_socket_factory,
    fetch_public_resource,
)
from plugin.aitools.common.exceptions.exceptions import HTTPClientException


def ipv4_addr_info(address: str, port: int = 443) -> tuple[Any, ...]:
    """Build the IPv4 addr_info tuple passed to aiohttp socket factories."""
    return (
        socket.AF_INET,
        socket.SOCK_STREAM,
        socket.IPPROTO_TCP,
        "",
        (address, port),
    )


def ipv6_addr_info(address: str, port: int = 443) -> tuple[Any, ...]:
    """Build the IPv6 addr_info tuple passed to aiohttp socket factories."""
    return (
        socket.AF_INET6,
        socket.SOCK_STREAM,
        socket.IPPROTO_TCP,
        "",
        (address, port, 0, 0),
    )


class FakeContent:
    """Minimal streaming response body used by safe-download tests."""

    def __init__(self, chunks: list[bytes]) -> None:
        self._chunks = chunks
        self.requested_chunk_size: int | None = None

    async def iter_chunked(self, size: int) -> AsyncIterator[bytes]:
        self.requested_chunk_size = size
        for chunk in self._chunks:
            yield chunk


class FakeResponse:
    """Async context manager matching the aiohttp response surface in use."""

    def __init__(
        self,
        *,
        status: int = 200,
        chunks: list[bytes] | None = None,
        content_length: int | None = None,
    ) -> None:
        self.status = status
        self.content_length = content_length
        self.content = FakeContent(chunks or [])

    async def __aenter__(self) -> "FakeResponse":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None


class FakeSession:
    """Capture the URL and request options supplied to ClientSession.get."""

    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.request_url: str | None = None
        self.request_kwargs: dict[str, Any] = {}

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    def get(self, url: str, **kwargs: Any) -> FakeResponse:
        self.request_url = url
        self.request_kwargs = kwargs
        return self.response


@pytest.fixture(autouse=True)
def clear_trusted_storage_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep public-target tests independent from deployment OSS configuration."""
    for setting in (
        "OSS_TYPE",
        "OSS_DOWNLOAD_HOST",
        "OSS_BUCKET_NAME",
        "OSS_BUCKET_CONSOLE",
    ):
        monkeypatch.delenv(setting, raising=False)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/image.png",
        "http://10.0.0.1/image.png",
        "http://169.254.169.254/latest/meta-data",
        "http://[::1]/image.png",
        "http://[fc00::1]/image.png",
        "http://[::ffff:127.0.0.1]/image.png",
    ],
)
async def test_fetch_public_resource_rejects_literal_private_address(
    url: str,
) -> None:
    """Literal private targets must fail before any client session is opened."""
    with patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.ClientSession"
    ) as session_class:
        with pytest.raises(HTTPClientException, match="unsafe"):
            await fetch_public_resource(url)

    session_class.assert_not_called()


def test_socket_factory_validates_the_actual_resolved_address() -> None:
    """A hostname that rebinds to a private address must fail at connect time."""
    factory = create_public_socket_factory("https://public.example/image.png")

    public_socket = factory(ipv4_addr_info("8.8.8.8"))
    public_socket.close()

    with pytest.raises(RemoteResourcePolicyError, match="unsafe"):
        factory(ipv4_addr_info("169.254.169.254"))


@pytest.mark.parametrize(
    "address",
    [
        "fec0::1",
        "ff02::1",
        "64:ff9b::a9fe:a9fe",
        "64:ff9b:1::a9fe:a9fe",
        "2002:a9fe:a9fe::1",
        "::ffff:127.0.0.1",
    ],
)
def test_socket_factory_rejects_special_ipv6_targets(address: str) -> None:
    """Special IPv6 forms must not bypass private-address classification."""
    factory = create_public_socket_factory("https://public.example/image.png")

    with pytest.raises(RemoteResourcePolicyError, match="unsafe"):
        factory(ipv6_addr_info(address))


def test_exact_s3_storage_path_may_resolve_to_private_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The configured Compose/Helm object store remains reachable privately."""
    monkeypatch.setenv("OSS_TYPE", "s3")
    monkeypatch.setenv("OSS_DOWNLOAD_HOST", "http://minio.localhost:18998")
    monkeypatch.setenv("OSS_BUCKET_NAME", "workflow")
    factory = create_public_socket_factory(
        "http://minio.localhost:18998/workflow/image.png"
    )

    storage_socket = factory(ipv4_addr_info("10.0.0.8", 18998))
    storage_socket.close()


def test_exact_console_s3_bucket_may_resolve_to_private_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Chat-uploaded objects from the explicit Console bucket remain usable."""
    monkeypatch.setenv("OSS_TYPE", "s3")
    monkeypatch.setenv("OSS_DOWNLOAD_HOST", "http://minio.localhost:18998")
    monkeypatch.setenv("OSS_BUCKET_NAME", "workflow")
    monkeypatch.setenv("OSS_BUCKET_CONSOLE", "console-oss")
    factory = create_public_socket_factory(
        "http://minio.localhost:18998/console-oss/chat/image.png"
    )

    storage_socket = factory(ipv4_addr_info("10.0.0.8", 18998))
    storage_socket.close()


def test_private_storage_exception_requires_s3_backend(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A matching URL alone must not authorize private non-S3 backends."""
    monkeypatch.setenv("OSS_TYPE", "ifly_gateway_storage")
    monkeypatch.setenv("OSS_DOWNLOAD_HOST", "http://storage.internal:8080")
    monkeypatch.setenv("OSS_BUCKET_NAME", "workflow")
    factory = create_public_socket_factory(
        "http://storage.internal:8080/workflow/image.png"
    )

    with pytest.raises(RemoteResourcePolicyError, match="unsafe"):
        factory(ipv4_addr_info("10.0.0.8", 8080))


@pytest.mark.parametrize(
    "candidate",
    [
        "http://other.internal:18998/workflow/image.png",
        "http://minio.localhost:18998/other/image.png",
        "http://minio.localhost:18998/workflow/image.png?download=1",
        "http://minio.localhost:18998/workflow/image.png;ignored",
        "http://minio.localhost:18998/workflow/image.png;",
        "http://minio.localhost:18998/workflow/image.png;%2f..%2fadmin",
    ],
)
def test_s3_private_exception_requires_exact_origin_bucket_and_no_query(
    monkeypatch: pytest.MonkeyPatch, candidate: str
) -> None:
    """User-controlled URL components must not broaden the storage exception."""
    monkeypatch.setenv("OSS_TYPE", "s3")
    monkeypatch.setenv("OSS_DOWNLOAD_HOST", "http://minio.localhost:18998")
    monkeypatch.setenv("OSS_BUCKET_NAME", "workflow")
    monkeypatch.setenv("OSS_BUCKET_CONSOLE", "console-oss")
    factory = create_public_socket_factory(candidate)

    with pytest.raises(RemoteResourcePolicyError, match="unsafe"):
        factory(ipv4_addr_info("10.0.0.8", 18998))


def test_s3_private_exception_uses_same_idna_host_as_aiohttp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An IDNA2003 lookalike must not inherit another host's private exception."""
    monkeypatch.setenv("OSS_TYPE", "s3")
    monkeypatch.setenv("OSS_DOWNLOAD_HOST", "http://fass.de")
    monkeypatch.setenv("OSS_BUCKET_NAME", "workflow")
    factory = create_public_socket_factory("http://faß.de/workflow/image.png")

    with pytest.raises(RemoteResourcePolicyError, match="unsafe"):
        factory(ipv4_addr_info("10.0.0.8", 80))


@pytest.mark.parametrize("address", ["127.0.0.1", "169.254.169.254"])
def test_s3_private_exception_never_allows_loopback_or_link_local(
    monkeypatch: pytest.MonkeyPatch, address: str
) -> None:
    """Even an exact storage URL cannot authorize host-local or metadata IPs."""
    monkeypatch.setenv("OSS_TYPE", "s3")
    monkeypatch.setenv("OSS_DOWNLOAD_HOST", "http://minio.localhost:18998")
    monkeypatch.setenv("OSS_BUCKET_NAME", "workflow")
    factory = create_public_socket_factory(
        "http://minio.localhost:18998/workflow/image.png"
    )

    with pytest.raises(RemoteResourcePolicyError, match="unsafe"):
        factory(ipv4_addr_info(address, 18998))


@pytest.mark.asyncio
async def test_fetch_public_resource_uses_hardened_session_configuration() -> None:
    """Downloads must bind validation to sockets and bypass proxy/DNS caches."""
    response = FakeResponse(chunks=[b"image"])
    session = FakeSession(response)
    connector = object()

    with patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.TCPConnector",
        return_value=connector,
    ) as connector_class, patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.ClientSession",
        return_value=session,
    ) as session_class:
        result = await fetch_public_resource("https://public.example/image.png")

    assert result == b"image"
    assert connector_class.call_args.kwargs["use_dns_cache"] is False
    assert callable(connector_class.call_args.kwargs["socket_factory"])
    assert session_class.call_args.kwargs["connector"] is connector
    assert session_class.call_args.kwargs["trust_env"] is False
    assert session.request_url == "https://public.example/image.png"
    assert session.request_kwargs["allow_redirects"] is False


@pytest.mark.asyncio
async def test_fetch_public_resource_rejects_redirect_response() -> None:
    """A 3xx response must not trigger an unvalidated second request."""
    response = FakeResponse(status=302)
    session = FakeSession(response)

    with patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.TCPConnector"
    ), patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.ClientSession",
        return_value=session,
    ):
        with pytest.raises(HTTPClientException, match="HTTP 302"):
            await fetch_public_resource("https://public.example/redirect")

    assert session.request_kwargs["allow_redirects"] is False


@pytest.mark.asyncio
async def test_fetch_public_resource_rejects_declared_oversize_response() -> None:
    """Content-Length larger than the configured budget must fail closed."""
    response = FakeResponse(content_length=6)
    session = FakeSession(response)

    with patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.TCPConnector"
    ), patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.ClientSession",
        return_value=session,
    ):
        with pytest.raises(HTTPClientException, match="too large"):
            await fetch_public_resource("https://public.example/image.png", max_bytes=5)


@pytest.mark.asyncio
async def test_fetch_public_resource_rejects_streamed_oversize_response() -> None:
    """Missing or false Content-Length must not bypass the streaming limit."""
    response = FakeResponse(chunks=[b"abc", b"def"], content_length=None)
    session = FakeSession(response)

    with patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.TCPConnector"
    ), patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.ClientSession",
        return_value=session,
    ):
        with pytest.raises(HTTPClientException, match="too large"):
            await fetch_public_resource("https://public.example/image.png", max_bytes=5)


@pytest.mark.asyncio
async def test_fetch_public_resource_returns_successful_chunked_download() -> None:
    """Valid public responses are returned byte-for-byte across chunks."""
    response = FakeResponse(chunks=[b"abc", b"def"], content_length=6)
    session = FakeSession(response)

    with patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.TCPConnector"
    ), patch(
        "plugin.aitools.common.clients.safe_download.aiohttp.ClientSession",
        return_value=session,
    ):
        result = await fetch_public_resource(
            "https://public.example/image.png", max_bytes=6
        )

    assert result == b"abcdef"
    assert response.content.requested_chunk_size == 64 * 1024


@pytest.mark.asyncio
async def test_image_understanding_gen_params_uses_safe_download() -> None:
    """Image understanding must no longer use the unrestricted shared client."""
    from plugin.aitools.service.image_understanding.image_understanding_service import (
        gen_params,
    )

    image_url = "https://public.example/image.png"
    span = object()
    image_bytes = b"safe image"

    with patch(
        "plugin.aitools.service.image_understanding."
        "image_understanding_service.fetch_public_resource",
        new=AsyncMock(return_value=image_bytes),
    ) as safe_fetch:
        params = await gen_params(
            "app-id", "what is this?", image_url, span  # type: ignore[arg-type]
        )

    safe_fetch.assert_awaited_once_with(image_url, span)
    messages = params["payload"]["message"]["text"]
    assert messages[0] == {
        "role": "user",
        "content": base64.b64encode(image_bytes).decode("utf-8"),
        "content_type": "image",
    }
    assert messages[1] == {"role": "user", "content": "what is this?"}


@pytest.mark.asyncio
async def test_ocr_service_uses_safe_download_for_file_url() -> None:
    """OCR must not regress to the unrestricted shared HTTP client."""
    from plugin.aitools.service.ocr_llm import (
        req_ase_ability_ocr_service as ocr_service,
    )

    file_url = "https://public.example/document.png"
    body = ocr_service.OCRLLM(file_url=file_url)
    request = SimpleNamespace(state=SimpleNamespace(sid="test-sid"))
    task = MagicMock()
    task.invoke = AsyncMock(return_value={"file_index": 0, "page_index": 0})

    with patch.object(
        ocr_service,
        "fetch_public_resource",
        new=AsyncMock(return_value=b"image bytes"),
    ) as safe_fetch, patch.object(
        ocr_service,
        "get_iflytek_open_platform_credentials",
        return_value=SimpleNamespace(
            app_id="app-id", api_key="api-key", api_secret="api-secret"
        ),
    ), patch.object(
        ocr_service, "OcrLLMTask", return_value=task
    ), patch.object(
        ocr_service, "merge_results", return_value=[]
    ):
        response = await ocr_service.req_ase_ability_ocr_service(body, request)

    safe_fetch.assert_awaited_once_with(file_url, None)
    task.invoke.assert_awaited_once()
    assert response.sid == "test-sid"
