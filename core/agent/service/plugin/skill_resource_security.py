"""Trust-boundary and streaming limits for server-derived Skill resources."""

from __future__ import annotations

import os
import re
from typing import Any
from urllib.parse import parse_qsl, unquote_to_bytes, urlsplit

import aiohttp

SKILL_RESOURCE_TRUSTED_ORIGIN_ENV = "SKILL_RESOURCE_TRUSTED_ORIGIN"
SKILL_RESOURCE_TRUSTED_BUCKET_ENV = "SKILL_RESOURCE_TRUSTED_BUCKET"
SKILL_OBJECT_PREFIX = "skill-files/"
MAX_SKILL_RESOURCE_BYTES = 5 * 1024 * 1024
MAX_SKILL_RESOURCE_COUNT = 100
MAX_SKILL_RESOURCE_TOTAL_BYTES = 20 * 1024 * 1024
SKILL_RESOURCE_ERROR = "Skill resource is unavailable"
_SIGV4_REQUIRED_PARAMETERS = {
    "x-amz-algorithm",
    "x-amz-credential",
    "x-amz-date",
    "x-amz-expires",
    "x-amz-signedheaders",
    "x-amz-signature",
}
_INVALID_PERCENT_ESCAPE = re.compile(r"%(?![0-9a-fA-F]{2})")


def _effective_port(parsed: Any) -> int:
    port = parsed.port
    if port is not None:
        return port
    return 443 if parsed.scheme.lower() == "https" else 80


def _decoded_path(raw_path: str) -> str:
    try:
        if _INVALID_PERCENT_ESCAPE.search(raw_path):
            raise ValueError
        path = unquote_to_bytes(raw_path).decode("utf-8", errors="strict")
    except (UnicodeDecodeError, ValueError):
        raise ValueError from None
    if (
        not path.startswith("/")
        or "\\" in path
        or any(ord(character) < 32 or ord(character) == 127 for character in path)
        or any(segment in {".", ".."} for segment in path.split("/"))
    ):
        raise ValueError
    return path


def _validate_resource_inputs(
    candidate_value: str, origin_value: str, bucket: str
) -> None:
    if (
        not candidate_value
        or len(candidate_value) > 8192
        or any(character in candidate_value for character in ("\r", "\n", "\t"))
        or not origin_value
        or len(origin_value) > 2048
        or any(character in origin_value for character in ("\r", "\n", "\t"))
        or not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", bucket)
    ):
        raise ValueError


def _validate_resource_origin(candidate: Any, origin: Any) -> None:
    if (
        origin.scheme.lower() not in {"http", "https"}
        or not origin.hostname
        or origin.username is not None
        or origin.password is not None
        or bool(origin.query)
        or bool(origin.fragment)
        or candidate.scheme.lower() != origin.scheme.lower()
        or not candidate.hostname
        or candidate.hostname.lower() != origin.hostname.lower()
        or _effective_port(candidate) != _effective_port(origin)
        or candidate.username is not None
        or candidate.password is not None
        or bool(candidate.fragment)
    ):
        raise ValueError


def _validate_resource_path(candidate: Any, origin: Any, bucket: str) -> None:
    origin_path = _decoded_path(origin.path or "/").rstrip("/")
    candidate_path = _decoded_path(candidate.path)
    if _INVALID_PERCENT_ESCAPE.search(candidate.query):
        raise ValueError
    required_prefix = f"{origin_path}/{bucket}/{SKILL_OBJECT_PREFIX}"
    if not candidate_path.startswith(required_prefix) or len(candidate_path) <= len(
        required_prefix
    ):
        raise ValueError


def _parse_sigv4_parameters(query: str) -> dict[str, str]:
    pairs = parse_qsl(
        query,
        keep_blank_values=True,
        strict_parsing=True,
        encoding="utf-8",
        errors="strict",
    )
    parameters: dict[str, str] = {}
    for raw_key, value in pairs:
        key = raw_key.lower()
        if not key or not value or key in parameters:
            raise ValueError
        parameters[key] = value
    return parameters


def _validate_sigv4_parameters(parameters: dict[str, str]) -> None:
    if not _SIGV4_REQUIRED_PARAMETERS.issubset(parameters):
        raise ValueError
    if (
        parameters["x-amz-algorithm"] != "AWS4-HMAC-SHA256"
        or re.fullmatch(r"\d{8}T\d{6}Z", parameters["x-amz-date"]) is None
        or re.fullmatch(r"[0-9a-fA-F]{64}", parameters["x-amz-signature"]) is None
    ):
        raise ValueError
    expiry = int(parameters["x-amz-expires"])
    if not 1 <= expiry <= 604800:
        raise ValueError


def validate_skill_resource_url(url: str) -> str:
    """Require the configured origin, console bucket, Skill prefix, and SigV4 shape."""
    candidate_value = str(url or "").strip()
    origin_value = (os.getenv(SKILL_RESOURCE_TRUSTED_ORIGIN_ENV) or "").strip()
    bucket = (os.getenv(SKILL_RESOURCE_TRUSTED_BUCKET_ENV) or "").strip()
    try:
        _validate_resource_inputs(candidate_value, origin_value, bucket)
        candidate = urlsplit(candidate_value)
        origin = urlsplit(origin_value)
        _validate_resource_origin(candidate, origin)
        _validate_resource_path(candidate, origin, bucket)
        _validate_sigv4_parameters(_parse_sigv4_parameters(candidate.query))
    except (TypeError, ValueError):
        raise RuntimeError(SKILL_RESOURCE_ERROR) from None
    return candidate_value


async def read_bounded_response(response: aiohttp.ClientResponse, limit: int) -> bytes:
    """Stream at most ``limit + 1`` bytes so absent Content-Length stays bounded."""
    if limit < 1 or limit > MAX_SKILL_RESOURCE_BYTES:
        raise RuntimeError(SKILL_RESOURCE_ERROR)
    content_length = response.content_length
    if content_length is not None and content_length > limit:
        raise RuntimeError(SKILL_RESOURCE_ERROR)
    value = bytearray()
    async for chunk in response.content.iter_chunked(64 * 1024):
        remaining = limit + 1 - len(value)
        if remaining <= 0:
            break
        value.extend(chunk[:remaining])
        if len(value) > limit:
            raise RuntimeError(SKILL_RESOURCE_ERROR)
    return bytes(value)


async def download_skill_resource(
    session: aiohttp.ClientSession, url: str, limit: int
) -> bytes:
    trusted_url = validate_skill_resource_url(url)
    try:
        async with session.get(trusted_url, allow_redirects=False) as response:
            if not 200 <= response.status < 300:
                raise RuntimeError(SKILL_RESOURCE_ERROR)
            response.raise_for_status()
            return await read_bounded_response(response, limit)
    except RuntimeError:
        raise
    except Exception:
        raise RuntimeError(SKILL_RESOURCE_ERROR) from None
