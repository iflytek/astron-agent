import socket
from typing import Any
from unittest.mock import Mock, patch

import pytest
from urllib3.exceptions import ConnectTimeoutError
from urllib3.response import HTTPResponse

from workflow.engine.entities.file import File
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum


def test_private_console_file_size_uses_get_and_closes_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OSS_ENDPOINT", "http://minio:9000")
    url = (
        f"http://minio:9000/console/published-workflow-inputs/{'a' * 32}/input.txt"
        "?X-Amz-Signature=private"
    )
    response = Mock(status=200, headers={"Content-Length": "24"})
    with patch("urllib3.HTTPConnectionPool.urlopen", return_value=response) as request:
        assert File.get_file_size(url) == "24"
        assert request.call_args.args == ("GET", url.split(":9000")[1])
        assert request.call_args.kwargs["redirect"] is False
        response.close.assert_called_once()

    with (
        patch("urllib3.HTTPConnectionPool.urlopen", side_effect=OSError(url)),
        pytest.raises(CustomException) as exc,
    ):
        File.get_file_size(url)
    assert "X-Amz-Signature" not in str(exc.value)


def test_public_file_size_keeps_https_identity_and_falls_back_to_get() -> None:
    url = "https://files.example/document.txt?version=2"
    addresses = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("1.1.1.1", 443))]
    with (
        patch("socket.getaddrinfo", return_value=addresses),
        patch("urllib3.HTTPSConnectionPool") as pool,
    ):
        pool.return_value.__enter__.return_value = pool.return_value
        request = pool.return_value.urlopen
        request.side_effect = [
            HTTPResponse(status=200),
            HTTPResponse(status=206, headers={"Content-Range": "bytes 0-1/48"}),
        ]

        assert File.get_file_size(url) == "48"
        assert pool.call_args.args == ("1.1.1.1", 443)
        assert pool.call_args.kwargs["assert_hostname"] == "files.example"
        assert pool.call_args.kwargs["server_hostname"] == "files.example"
        assert [call.args for call in request.call_args_list] == [
            ("HEAD", "/document.txt?version=2"),
            ("GET", "/document.txt?version=2"),
        ]
        assert request.call_args.kwargs["headers"] == {"Host": "files.example"}


def test_public_file_redirect_must_also_resolve_to_a_public_address() -> None:
    addresses = [
        [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("1.1.1.1", 80))],
        [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.10", 80))],
    ]
    redirect = HTTPResponse(
        status=302, headers={"Location": "http://storage.example/input.txt"}
    )
    with (
        patch("socket.getaddrinfo", side_effect=addresses),
        patch("urllib3.HTTPConnectionPool.urlopen", return_value=redirect) as request,
        pytest.raises(CustomException),
    ):
        File.get_file_size("http://files.example/input.txt")
    assert request.call_count == 1


def test_public_file_tries_other_addresses_with_the_original_tls_identity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REQUESTS_CA_BUNDLE", "/test/ca.pem")
    addresses = [
        (
            socket.AF_INET6,
            socket.SOCK_STREAM,
            6,
            "",
            ("2606:4700:4700::1111", 443, 0, 0),
        ),
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("1.1.1.1", 443)),
    ]
    with (
        patch("socket.getaddrinfo", return_value=addresses) as lookup,
        patch("urllib3.HTTPSConnectionPool") as pool,
    ):
        pool.return_value.__enter__.return_value = pool.return_value
        request = pool.return_value.urlopen
        request.side_effect = [
            ConnectTimeoutError("connection unavailable"),
            HTTPResponse(status=200, headers={"Content-Length": "12"}),
        ]

        assert File.get_file_size("https://faß.example./document.txt") == "12"
        lookup.assert_called_once_with(
            "xn--fa-hia.example.", 443, type=socket.SOCK_STREAM
        )
        assert [call.args for call in pool.call_args_list] == [
            ("2606:4700:4700::1111", 443),
            ("1.1.1.1", 443),
        ]
        assert pool.call_args.kwargs["assert_hostname"] == "xn--fa-hia.example"
        assert pool.call_args.kwargs["ca_certs"] == "/test/ca.pem"


@pytest.mark.parametrize("value", [[], {}, 42])
def test_file_size_rejects_non_url_values(value: Any) -> None:
    with patch("socket.getaddrinfo") as lookup, pytest.raises(CustomException) as exc:
        File.get_file_size(value)
    assert exc.value.code == CodeEnum.FILE_INVALID_TYPE_ERROR.code
    lookup.assert_not_called()
