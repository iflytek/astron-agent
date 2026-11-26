"""Authenticate internal requests and run them in one configured Docker container."""

import asyncio
import hmac
import json
import logging
import os
import re
import threading
import uuid
from contextlib import asynccontextmanager, closing
from pathlib import Path
from typing import Literal

from docker.errors import DockerException
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from starlette.concurrency import run_in_threadpool

import docker

LOGGER = logging.getLogger("uvicorn.error")
TOKEN_HEADER = "X-Skill-Sandbox-Runtime-Credential-Token"
JOBCONTROL = Path("/run/sandbox-jobs")
MAX_REQUEST_BYTES = 141 * 1024 * 1024
MAX_RESPONSE_BYTES = 80 * 1024 * 1024
MAX_OUTPUT_BYTES = 4 * 1024 * 1024
MAX_QUEUED_REQUESTS = 16
QUEUE_TIMEOUT_SECONDS = 60
BODY_TIMEOUT_SECONDS = 30
SCOPE_PATTERN = re.compile(r"space-[1-9][0-9]*|user-[a-f0-9]{24,64}")
ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,255}")
LABEL = "ai.astron-agent.local-sandbox"
ALLOWED_MOUNTS = {
    "/workspace": "volume",
    "/run/sandbox-jobs": "volume",
    "/tmp": "tmpfs",
    "/skills": "tmpfs",
}

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
execution_slot = asyncio.Lock()
queued_requests = 0


class FileInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    path: str = Field(min_length=1, max_length=1024)
    content: str


class Job(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    operation: Literal["probe", "list", "read", "write", "delete", "execute"]
    kind: Literal["agent", "workflow"] | None = None
    scope: str | None = Field(default=None, max_length=69)
    resourceId: str | None = Field(default=None, max_length=255)
    path: str = Field(default="", max_length=1024)
    after: str | None = Field(default=None, max_length=345)
    command: str | None = Field(default=None, max_length=65536, min_length=1)
    pythonCode: str | None = Field(
        default=None, max_length=2 * 1024 * 1024, min_length=1
    )
    timeout: int = Field(default=60, ge=1, le=600)
    outputLimit: int = Field(default=256 * 1024, ge=1, le=MAX_OUTPUT_BYTES)
    collectArtifacts: Literal[".", "output"] | None = None
    files: list[FileInput] = Field(default_factory=list, max_length=500)
    createOnly: bool = False

    @model_validator(mode="after")
    def validate_operation(self):
        if self.operation != "probe" and (
            not self.kind
            or not self.scope
            or not SCOPE_PATTERN.fullmatch(self.scope)
            or not self.resourceId
            or not ID_PATTERN.fullmatch(self.resourceId)
        ):
            raise ValueError("Invalid workspace identity")
        if self.operation == "execute" and (self.command is None) == (
            self.pythonCode is None
        ):
            raise ValueError("Provide either a shell command or a Python program")
        if self.operation in {"read", "delete"} and not self.path:
            raise ValueError("A workspace path is required")
        if self.createOnly and (self.operation != "write" or len(self.files) != 1):
            raise ValueError("Create-only accepts exactly one file")
        return self


def authenticate(request):
    try:
        expected = (
            Path(os.environ["SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN_FILE"])
            .read_bytes()
            .strip()
        )
    except (KeyError, OSError):
        raise HTTPException(503, "Local sandbox is unavailable") from None
    token = request.headers.get(TOKEN_HEADER, "").encode()
    if len(expected) < 32 or not hmac.compare_digest(token, expected):
        raise HTTPException(403, "Invalid local sandbox credential")


async def parse_job(request, first_frame):
    body = bytearray()
    frame = first_frame
    while True:
        if frame is None:
            frame = await request.receive()
        if frame["type"] == "http.disconnect":
            raise HTTPException(499, "Local sandbox request disconnected")
        chunk = frame.get("body", b"")
        if len(body) + len(chunk) > MAX_REQUEST_BYTES:
            raise HTTPException(413, "Local sandbox request exceeds the size limit")
        body.extend(chunk)
        if not frame.get("more_body", False):
            break
        frame = None
    try:
        return Job.model_validate_json(body)
    except ValidationError:
        raise HTTPException(400, "Invalid local sandbox request") from None


def active_container(client):
    container = client.containers.get(os.environ["LOCAL_SANDBOX_CONTAINER"])
    options = container.attrs["HostConfig"]
    mounts = {mount["Destination"]: mount for mount in container.attrs["Mounts"]}
    if (
        container.status != "running"
        or container.labels.get(LABEL) != "runtime"
        or container.attrs["Config"]["User"] != "10001:10001"
        or options.get("NetworkMode") != "none"
        or options.get("Privileged")
        or not options.get("ReadonlyRootfs")
        or options.get("PidMode") == "host"
        or not {"/workspace", "/run/sandbox-jobs"} <= mounts.keys()
        or any(
            ALLOWED_MOUNTS.get(path) != mount.get("Type")
            for path, mount in mounts.items()
        )
        or not mounts["/workspace"].get("RW")
        or mounts["/run/sandbox-jobs"].get("RW")
    ):
        raise RuntimeError("Invalid local execution container")
    return container


def run_job(job, identifier, cancelled):
    job_path = JOBCONTROL / f"{identifier}.json"
    cancel_path = JOBCONTROL / f"{identifier}.cancel"
    try:
        (JOBCONTROL / "lock").touch(mode=0o644)
        job_path.touch(mode=0o640, exist_ok=False)
        job_path.write_text(job.model_dump_json(), encoding="utf-8")
        if cancelled.is_set():
            return 499, "Local sandbox request disconnected"
        with closing(docker.from_env(timeout=job.timeout + 35)) as client:
            container = active_container(client)
            exec_id = client.api.exec_create(
                container.id,
                ["python", "/opt/astron-sandbox/execution.py", identifier],
                user="10001:10001",
            )["Id"]
            payload = bytearray()
            stream = client.api.exec_start(exec_id, stream=True, demux=True)
            with closing(stream):
                for stdout, stderr in stream:
                    if stderr or len(payload) + len(stdout or b"") > MAX_RESPONSE_BYTES:
                        raise RuntimeError("Invalid local execution response")
                    payload.extend(stdout or b"")
            status = client.api.exec_inspect(exec_id)
            if status["Running"] or status["ExitCode"] != 0:
                raise RuntimeError("Local execution response is incomplete")
        envelope = json.loads(payload)
        if envelope["status"] != 200:
            return envelope["status"], envelope["message"]
        return 200, envelope["data"]
    except (DockerException, OSError, RuntimeError, ValueError, KeyError) as exc:
        LOGGER.warning(
            "Local sandbox operation=%s error_type=%s",
            job.operation,
            type(exc).__name__,
        )
        return 503, "Local sandbox is unavailable"
    finally:
        job_path.unlink(missing_ok=True)
        cancel_path.unlink(missing_ok=True)


async def watch_disconnect(request, identifier, cancelled):
    await wait_for_disconnect(request)
    cancelled.set()
    (JOBCONTROL / f"{identifier}.cancel").touch()


async def wait_for_disconnect(request):
    while (await request.receive())["type"] != "http.disconnect":
        pass


@asynccontextmanager
async def reserve_execution(request):
    global queued_requests
    if queued_requests >= MAX_QUEUED_REQUESTS:
        raise HTTPException(503, "Local sandbox execution queue is full")
    queued_requests += 1
    queued = True
    acquire = asyncio.create_task(execution_slot.acquire())
    first_frame = None
    receive = asyncio.create_task(request.receive())
    waiting_for_disconnect = False
    try:
        async with asyncio.timeout(QUEUE_TIMEOUT_SECONDS):
            while not acquire.done():
                pending = {acquire, receive} if receive is not None else {acquire}
                done, _ = await asyncio.wait(
                    pending, return_when=asyncio.FIRST_COMPLETED
                )
                if receive not in done:
                    break
                frame = receive.result()
                if waiting_for_disconnect or frame["type"] == "http.disconnect":
                    raise HTTPException(499, "Local sandbox request disconnected")
                # Preserve one ASGI frame and leave the rest of uploads unread.
                first_frame = frame
                if not frame.get("more_body", False):
                    receive = asyncio.create_task(wait_for_disconnect(request))
                    waiting_for_disconnect = True
                else:
                    receive = None
    except TimeoutError:
        raise HTTPException(503, "Local sandbox execution queue timed out") from None
    else:
        queued_requests -= 1
        queued = False
        if receive is not None:
            if receive.done():
                frame = receive.result()
                if waiting_for_disconnect or frame["type"] == "http.disconnect":
                    raise HTTPException(499, "Local sandbox request disconnected")
                first_frame = frame
            receive.cancel()
            await asyncio.gather(receive, return_exceptions=True)
        yield first_frame
    finally:
        if queued:
            queued_requests -= 1
        if receive is not None:
            receive.cancel()
        if acquire.done() and not acquire.cancelled():
            if acquire.result():
                execution_slot.release()
        else:
            acquire.cancel()
        await asyncio.gather(
            *[task for task in (acquire, receive) if task is not None],
            return_exceptions=True,
        )


@app.post("/v1/sandbox")
async def sandbox(request: Request):
    authenticate(request)
    async with reserve_execution(request) as first_frame:
        try:
            async with asyncio.timeout(BODY_TIMEOUT_SECONDS):
                job = await parse_job(request, first_frame)
        except TimeoutError:
            raise HTTPException(408, "Local sandbox request upload timed out") from None
        identifier = uuid.uuid4().hex
        cancelled = threading.Event()
        watcher = asyncio.create_task(watch_disconnect(request, identifier, cancelled))
        worker = asyncio.create_task(
            run_in_threadpool(run_job, job, identifier, cancelled)
        )
        try:
            status, data = await asyncio.shield(worker)
        except asyncio.CancelledError:
            cancelled.set()
            (JOBCONTROL / f"{identifier}.cancel").touch()
            await asyncio.shield(worker)
            raise
        finally:
            watcher.cancel()
            await asyncio.gather(watcher, return_exceptions=True)
            (JOBCONTROL / f"{identifier}.cancel").unlink(missing_ok=True)
        if status != 200:
            raise HTTPException(status, data)
        LOGGER.info(
            "Local sandbox operation=%s kind=%s resource=%s",
            job.operation,
            job.kind,
            job.resourceId,
        )
        return data
