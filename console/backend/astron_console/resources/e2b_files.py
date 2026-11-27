"""Browse live E2B workspaces authenticated by Console resource identity."""

from datetime import timedelta
from logging import getLogger
from pathlib import PurePosixPath
from time import monotonic

import httpx
from django.core import signing
from django.core.exceptions import ValidationError
from django.http import Http404
from django.utils.crypto import salted_hmac
from e2b import (
    AuthenticationException,
    FileNotFoundException,
    FileType,
    Sandbox,
    SandboxException,
    SandboxNotFoundException,
    SandboxNotRunningException,
    SandboxQuery,
    SandboxState,
    ServiceBusyException,
    TimeoutException,
)

from .common import UpstreamError
from .local_sandbox import MAX_DOWNLOAD_BYTES, validate_file_path

WORKSPACES = {"agent": "/home/user/workspace", "workflow": "/home/user/code"}
METADATA_KEY = "astron_workspace"
DOWNLOAD_SALT = "astron.e2b.workspace.file"
CURSOR_SALT = "astron.e2b.workspace.cursor"
MISSING = (SandboxNotFoundException, SandboxNotRunningException, FileNotFoundException)
UNREACHABLE = (TimeoutException, httpx.TransportError)
PROVIDER_ERRORS = (SandboxException, AuthenticationException, ServiceBusyException, httpx.HTTPError)
REQUEST_TIMEOUT = 4
LIST_BUDGET = 16
PAGE_SIZE = 500
# Each directory component plus its separator needs at least two path bytes.
WORKSPACE_DEPTH = 512
logger = getLogger(__name__)


def workspace_metadata(resource, kind):
    identity = salted_hmac(
        "astron.e2b.workspace", f"{kind}:{resource.sandbox_directory}", algorithm="sha256"
    ).hexdigest()
    return {METADATA_KEY: identity}


def list_files(resource, kind, config, after):
    metadata = workspace_metadata(resource, kind)
    salt = CURSOR_SALT + metadata[METADATA_KEY]
    position = decode_cursor(after, salt) if after else (None, [], None, None)
    page_token, scanned_ids, active_id, active_path = position
    scanned = list(scanned_ids)
    directory = WORKSPACES[kind]
    entries = []
    truncated = False
    partial = False
    deadline = monotonic() + LIST_BUDGET
    options = {"api_key": config.api_key, "request_timeout": REQUEST_TIMEOUT}
    try:
        paginator = Sandbox.list(
            SandboxQuery(metadata=metadata, state=[SandboxState.RUNNING]),
            limit=20,
            order="desc",
            next_token=page_token,
            **options,
        )
        while paginator.has_next and not truncated:
            remaining = deadline - monotonic()
            if remaining <= 0:
                truncated = True
                break
            try:
                infos = paginator.next_items(request_timeout=min(REQUEST_TIMEOUT, remaining))
            except UNREACHABLE as exc:
                if page_token == position[0] and remaining > REQUEST_TIMEOUT:
                    raise
                logger.info("E2B workspace listing interrupted (%s)", type(exc).__name__)
                truncated = True
                break
            # Resume the partially read sandbox first even if instances with equal start times
            # change positions. The provider token advances between pages.
            infos = sorted(infos, key=lambda info: info.sandbox_id != active_id)
            for info in infos:
                remaining = deadline - monotonic()
                if remaining <= 0:
                    truncated = True
                    break
                sandbox_id = info.sandbox_id
                if sandbox_id in scanned or not owns_sandbox(info, metadata):
                    continue
                start_path = active_path if sandbox_id == active_id else None
                try:
                    sandbox = Sandbox.connect(
                        sandbox_id,
                        api_key=config.api_key,
                        request_timeout=min(REQUEST_TIMEOUT, remaining),
                    )
                    remaining = deadline - monotonic()
                    if remaining <= 0:
                        truncated = True
                        break
                    files = sandbox.files.list(
                        directory,
                        depth=WORKSPACE_DEPTH,
                        user="user",
                        request_timeout=min(REQUEST_TIMEOUT, remaining),
                    )
                except MISSING:
                    files = []
                except UNREACHABLE as exc:
                    logger.info(
                        "E2B workspace instance %s unavailable (%s)", sandbox_id, type(exc).__name__
                    )
                    partial = True
                    files = []
                for entry in _entries(files, sandbox_id, metadata, kind, directory, start_path):
                    if len(entries) == PAGE_SIZE:
                        truncated = True
                        break
                    entries.append(entry)
                    active_id, active_path = sandbox_id, entry["path"]
                if truncated:
                    break
                scanned.append(sandbox_id)
                active_id, active_path = None, None
            if not truncated:
                page_token = paginator.next_token
                scanned = []
    except PROVIDER_ERRORS:
        raise UpstreamError("无法读取 E2B 沙箱文件，请重试") from None

    next_position = (page_token, scanned, active_id, active_path)
    return {
        "entries": entries,
        "partial": partial,
        "truncated": truncated,
        "nextCursor": (
            signing.dumps(next_position, salt=salt, compress=True)
            if truncated and next_position != position
            else None
        ),
    }


def owns_sandbox(info, metadata):
    return (
        info.state == SandboxState.RUNNING
        and info.metadata.get(METADATA_KEY) == metadata[METADATA_KEY]
    )


def decode_cursor(after, salt):
    try:
        page_token, scanned, sandbox_id, path = signing.loads(after, salt=salt)
    except (signing.BadSignature, TypeError, ValueError):
        raise ValidationError("文件分页位置无效") from None
    return page_token, scanned, sandbox_id, path


def _entries(files, sandbox_id, metadata, kind, directory, after):
    prefix = directory + "/"
    for file in sorted(files, key=lambda entry: entry.path):
        if file.type != FileType.FILE or file.symlink_target or not file.path.startswith(prefix):
            continue
        path = file.path.removeprefix(prefix)
        if kind == "workflow" and path == "main.py":
            continue
        try:
            validate_file_path(path, required=True)
        except ValidationError:
            continue
        if (after is not None and path <= after) or any(ord(char) < 32 for char in path):
            continue
        yield {
            "name": PurePosixPath(path).name,
            "path": path,
            "size": file.size,
            "modifiedAt": file.modified_time.isoformat(),
            "fileRef": signing.dumps(
                [sandbox_id, path],
                salt=DOWNLOAD_SALT + metadata[METADATA_KEY],
                compress=True,
            ),
        }


def download_file(resource, kind, config, path, file_ref):
    metadata = workspace_metadata(resource, kind)
    try:
        sandbox_id, signed_path = signing.loads(
            file_ref, salt=DOWNLOAD_SALT + metadata[METADATA_KEY], max_age=timedelta(hours=24)
        )
    except (signing.BadSignature, ValueError, TypeError):
        raise Http404 from None
    if signed_path != path:
        raise Http404
    options = {"api_key": config.api_key, "request_timeout": REQUEST_TIMEOUT}
    try:
        info = Sandbox.get_info(sandbox_id, **options)
        if not owns_sandbox(info, metadata):
            raise Http404
        sandbox = Sandbox.connect(sandbox_id, **options)
        return _read_file(sandbox, WORKSPACES[kind], path)
    except MISSING:
        raise Http404 from None
    except PROVIDER_ERRORS:
        raise UpstreamError("无法下载 E2B 沙箱文件，请重试") from None


def _read_file(sandbox, directory, path):
    parts = (directory.lstrip("/") + "/" + path).split("/")
    directory = ""
    deadline = monotonic() + LIST_BUDGET
    for index, part in enumerate(parts):
        directory += "/" + part
        remainder = deadline - monotonic()
        if remainder <= 0:
            raise UpstreamError("无法下载 E2B 沙箱文件，请重试")
        info = sandbox.files.get_info(
            directory, user="user", request_timeout=min(REQUEST_TIMEOUT, remainder)
        )
        expected = FileType.FILE if index == len(parts) - 1 else FileType.DIR
        if info.type != expected or info.symlink_target:
            raise Http404
    if info.size > MAX_DOWNLOAD_BYTES:
        raise ValidationError("文件超过下载大小限制")
    contents = bytearray()
    with sandbox.files.read(directory, format="stream", user="user", request_timeout=6) as stream:
        for chunk in stream:
            if len(contents) + len(chunk) > MAX_DOWNLOAD_BYTES:
                raise ValidationError("文件超过下载大小限制")
            contents.extend(chunk)
    return bytes(contents)
