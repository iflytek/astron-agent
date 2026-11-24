import asyncio
import ipaddress
import os
import re
import socket
from typing import Mapping, Tuple
from urllib.parse import SplitResult, parse_qs, urljoin, urlsplit, urlunsplit

import certifi
import idna
import urllib3
from pydantic import BaseModel

from workflow.configs import workflow_config
from workflow.engine.entities.node_entities import NodeType
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span

_PUBLIC_IPV6 = ipaddress.IPv6Network("2000::/3")
_FILE_HTTP_TIMEOUT = urllib3.Timeout(connect=10, read=10)
_MAX_FILE_REDIRECTS = 5


def _public_file_addresses(host: str, port: int) -> list[str]:
    addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    public_addresses: dict[str, None] = {}
    for _, _, _, _, sockaddr in addresses:
        address = ipaddress.ip_address(sockaddr[0])
        if isinstance(address, ipaddress.IPv6Address):
            if address.ipv4_mapped is not None:
                address = address.ipv4_mapped
            elif address not in _PUBLIC_IPV6 or address.sixtofour or address.teredo:
                continue
        if address.is_global and not (address.is_multicast or address.is_reserved):
            public_addresses[str(address)] = None
    if not public_addresses:
        raise ValueError("File host has no public address")
    return list(public_addresses)


def _file_connection(
    scheme: str, address: str, host: str, port: int
) -> urllib3.HTTPConnectionPool:
    if scheme == "http":
        return urllib3.HTTPConnectionPool(address, port)
    ca_bundle = (
        os.getenv("REQUESTS_CA_BUNDLE")
        or os.getenv("CURL_CA_BUNDLE")
        or certifi.where()
    )
    ca_is_directory = os.path.isdir(ca_bundle)
    tls_host = host.rstrip(".")
    return urllib3.HTTPSConnectionPool(
        address,
        port,
        server_hostname=tls_host,
        assert_hostname=tls_host,
        cert_reqs="CERT_REQUIRED",
        ca_certs=None if ca_is_directory else ca_bundle,
        ca_cert_dir=ca_bundle if ca_is_directory else None,
    )


def _request_file_headers(
    method: str, path: str, origin: SplitResult, *, private: bool
) -> tuple[int, Mapping[str, str], str | None]:
    hostname = origin.hostname
    if not hostname:
        raise ValueError("File URL must have a host")
    host = (
        hostname if hostname.isascii() else idna.encode(hostname, uts46=True).decode()
    )
    port = origin.port or (443 if origin.scheme == "https" else 80)
    authority = f"[{host}]" if ":" in host else host
    if origin.port is not None:
        authority = f"{authority}:{port}"
    addresses = [host] if private else _public_file_addresses(host, port)
    for address in addresses:
        with _file_connection(origin.scheme, address, host, port) as pool:
            try:
                response = pool.urlopen(
                    method,
                    path,
                    headers={"Host": authority},
                    timeout=_FILE_HTTP_TIMEOUT,
                    retries=False,
                    redirect=False,
                    preload_content=False,
                )
            except urllib3.exceptions.ConnectTimeoutError:
                # NewConnectionError is also a ConnectTimeoutError in urllib3.
                continue
            try:
                location = response.get_redirect_location()
                return response.status, response.headers, location or None
            finally:
                response.close()
    raise OSError("File server connection failed")


def _read_file_headers(
    method: str, url: str, *, storage: SplitResult | None = None
) -> Mapping[str, str]:
    for _ in range(_MAX_FILE_REDIRECTS + 1):
        target = urlsplit(url)
        origin = storage if storage is not None else target
        if (
            origin.scheme not in {"http", "https"}
            or origin.username is not None
            or origin.password is not None
        ):
            raise ValueError("File URL must have an HTTP(S) origin")

        # Use an origin-form request target. DNS cannot change the verified address
        # between validation and connection, and each redirect gets a new check.
        path = urlunsplit(("", "", target.path or "/", target.query, ""))
        status, headers, location = _request_file_headers(
            method, path, origin, private=storage is not None
        )
        if 200 <= status < 300:
            return headers
        if storage is not None or not location:
            raise ValueError("File server rejected the request")
        url = urljoin(url, location)
    raise ValueError("File URL has too many redirects")


class FileVarInfo:
    """
    Information about a file variable in the workflow.
    """

    file_var_name: str
    file_var_type: str
    allowed_file_type: str
    is_required: bool

    def __init__(
        self,
        file_var_name: str,
        file_var_type: str,
        allowed_file_type: str,
        is_required: bool,
    ):
        """
        Initialize file variable information.

        :param file_var_name: Name of the file variable
        :param file_var_type: Type of the file variable
        :param allowed_file_type: Allowed file type for this variable
        :param is_required: Whether this file variable is required
        """
        self.file_var_name = file_var_name
        self.file_var_type = file_var_type
        self.allowed_file_type = allowed_file_type
        self.is_required = is_required


class File(BaseModel):
    """
    File handling utilities for workflow file variables.
    """

    @classmethod
    async def has_file_in_dsl(
        cls, spark_dsl: dict, span: Span
    ) -> Tuple[list[FileVarInfo], bool]:
        """
        Check if the workflow DSL contains file type data in the start node inputs.
        Returns file variable information and a boolean indicating if files are present.

        :param spark_dsl: Workflow protocol/DSL
        :param span: Tracing span for logging
        :return: Tuple containing:
                - List of FileVarInfo objects with file variable details
                - Boolean indicating if the protocol contains file types
        """
        has_file = False
        file_infos = []
        try:
            nodes = spark_dsl.get("data", {}).get("nodes", {})
            for node in nodes:
                node_id = node.get("id")
                if node_id.split(":")[0] == NodeType.START.value:
                    node_outputs = node.get("data").get("outputs")
                    for output in node_outputs:
                        file_flag = output.get("fileType")
                        if file_flag is None:
                            continue
                        await span.add_info_event_async(f"fileType: {file_flag}")
                        if file_flag == "file":
                            has_file = True
                            var_name = output.get("name")
                            var_type = output.get("schema", {}).get("type", "")
                            allowed_file_type = output.get("allowedFileType")[0]
                            is_required = output.get("required", False)
                            file_infos.append(
                                FileVarInfo(
                                    var_name, var_type, allowed_file_type, is_required
                                )
                            )
                        else:
                            raise CustomException(
                                err_code=CodeEnum.ENG_PROTOCOL_VALIDATE_ERROR,
                                err_msg="Error: fileType field is incorrect",
                            )
        except CustomException as err:
            raise err
        except Exception as e:
            span.add_error_event(
                "Failed to get file variable information from protocol"
            )
            span.record_exception(e)
            raise e

        return file_infos, has_file

    def get_file_url(self, file_id: str) -> str:
        """
        Get file information from OSS based on file_id and return the file access URL.

        :param file_id: Unique identifier of the file in the database
        :return: File access URL
        """
        # TODO: Implement
        raise NotImplementedError

    @staticmethod
    def _extract_content_length(headers: Mapping[str, str]) -> str | None:
        """
        Extract file size from common response headers.

        Some object storage gateways omit ``Content-Length`` on ``HEAD`` but still
        expose the total size in ``Content-Range``.
        """
        content_length = headers.get("Content-Length")
        if content_length:
            return content_length

        content_range = headers.get("Content-Range", "")
        match = re.search(r"/(\d+)$", content_range)
        if match:
            return match.group(1)
        return None

    @staticmethod
    def is_console_input_url(url: str) -> bool:
        if not isinstance(url, str):
            return False
        try:
            target = urlsplit(url)
            storage = urlsplit(os.getenv("OSS_ENDPOINT", ""))
            return (
                target.scheme in {"http", "https"}
                and (target.scheme, target.netloc) == (storage.scheme, storage.netloc)
                and target.username is None
                and target.password is None
                and bool(
                    re.fullmatch(
                        r"/[^/]+/published-workflow-inputs/[0-9a-f]{32}/input\.[a-z0-9]+",
                        target.path,
                    )
                )
                and "X-Amz-Signature" in parse_qs(target.query)
            )
        except (TypeError, ValueError):
            return False

    @classmethod
    def get_file_size(cls, input_file_url: str) -> str:
        """
        Get the size of a file from its URL.

        :param input_file_url: URL of the file to check
        :return: File size in bytes as string
        """
        if not isinstance(input_file_url, str):
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_TYPE_ERROR,
                cause_error="File URL must be a string",
            )
        storage = (
            urlsplit(os.getenv("OSS_ENDPOINT", ""))
            if cls.is_console_input_url(input_file_url)
            else None
        )
        try:
            if storage is None:
                headers = _read_file_headers("HEAD", input_file_url)
                content_length = cls._extract_content_length(headers)
                if content_length:
                    return content_length

            # MinIO signs the HTTP method. The Console gives the runtime a GET URL.
            # Also handle other OSS gateways whose HEAD lacks Content-Length.
            headers = _read_file_headers("GET", input_file_url, storage=storage)
        except (urllib3.exceptions.HTTPError, OSError, ValueError):
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_TYPE_ERROR,
                cause_error=(
                    "Unable to read the uploaded workflow input"
                    if storage is not None
                    else "Unable to read the public file URL"
                ),
            ) from None

        content_length = cls._extract_content_length(headers)
        if not content_length:
            raise CustomException(
                err_code=CodeEnum.FILE_INVALID_TYPE_ERROR,
                cause_error="File size is missing from response headers",
            )
        return content_length

    @classmethod
    async def check_file_var_isvalid(
        cls, input_file_url: str, allowed_file_type: str, span_context: Span
    ) -> None:
        """
        Validate if the uploaded file meets type and size requirements.

        :param input_file_url: File URL to validate
        :param allowed_file_type: Allowed file type for validation
        :param span_context: Tracing span for logging
        """
        try:
            await span_context.add_info_event_async(
                "input file: uploaded workflow input"
                if cls.is_console_input_url(input_file_url)
                else "input file: public file URL"
            )
            await span_context.add_info_event_async(
                f"allowed file type: {allowed_file_type}"
            )
            file_size = int(await asyncio.to_thread(cls.get_file_size, input_file_url))
            pattern = workflow_config.file_config.get_extensions_pattern()

            file_extension = ""
            # Find file extension
            match = re.search(pattern, input_file_url)
            if match:
                file_extension = match.group(2).lower()
            else:
                span_context.add_error_event("Failed to match file type")
                raise CustomException(err_code=CodeEnum.FILE_INVALID_ERROR)
            workflow_config.file_config.is_valid(
                category=allowed_file_type,
                extension=file_extension,
                file_size=file_size,
            )

        except Exception as e:
            span_context.record_exception(e)
            raise e
