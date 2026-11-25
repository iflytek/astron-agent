"""Expose Console-authorized packages through Deep Agents' filesystem tools."""

import asyncio
import re
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory

import aiohttp
import yaml
from deepagents.backends import FilesystemBackend, StateBackend
from deepagents.backends.protocol import (
    PERMISSION_DENIED,
    BackendProtocol,
    DeleteResult,
    EditResult,
    FileUploadResponse,
    SandboxBackendProtocol,
    WriteResult,
)

from agent.api.schemas.workflow_agent_inputs import CustomCompletionPluginSkillInputs
from agent.engine.sandbox import sandbox_backend
from agent.engine.workspace import (
    SANDBOX_ROUTE,
    AgentFilesystem,
    ExecutableWorkspace,
    MinIOWorkspace,
    workspace_store,
)
from agent.exceptions.agent_exc import AgentInternalExc
from agent.service.plugin.skill_resource_security import (
    MAX_SKILL_RESOURCE_BYTES,
    MAX_SKILL_RESOURCE_COUNT,
    MAX_SKILL_RESOURCE_TOTAL_BYTES,
    download_skill_resource,
    validate_skill_resource_url,
)
from agent.service.sandbox import AgentSandboxConfig

SKILL_SOURCE = "/skills/"
MAX_SKILL_RUN_BYTES = 100 * 1024 * 1024
DOWNLOAD_BATCH_SIZE = 4
_FRONTMATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)^---[ \t]*(?:\r?\n|\Z)", re.M | re.S)
_READ_ONLY = "Skill files are read-only"


class ReadOnlySkillFiles(FilesystemBackend):
    def write(self, file_path: str, content: str) -> WriteResult:
        return WriteResult(error=_READ_ONLY)

    def edit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        return EditResult(error=_READ_ONLY)

    def delete(self, file_path: str) -> DeleteResult:
        return DeleteResult(error=_READ_ONLY)

    def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        return [
            FileUploadResponse(path=path, error=PERMISSION_DENIED) for path, _ in files
        ]


def _native_entry(
    content: bytes, skill: CustomCompletionPluginSkillInputs, names: set[str]
) -> tuple[str, bytes]:
    """Keep valid frontmatter and give existing loose Markdown a virtual name."""
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise AgentInternalExc("SKILL.md must be UTF-8 text") from None
    match = _FRONTMATTER.match(text)
    metadata: dict = {}
    valid_header = False
    if match:
        try:
            raw = yaml.safe_load(match[1])
            if isinstance(raw, dict):
                metadata = raw
                valid_header = True
        except yaml.YAMLError:
            pass
    label = str(metadata.get("name") or skill.name).strip()
    description = str(metadata.get("description") or "").strip()
    name = re.sub(r"[^a-z0-9]+", "-", label.lower())[:64].strip("-") or "skill"
    suffix = 2
    while name in names:
        ending = f"-{suffix}"
        name = name[: 64 - len(ending)].rstrip("-") + ending
        suffix += 1
    if match and name == label and description and content == text.encode("utf-8"):
        if match.end() == len(text) and not content.endswith(b"\n"):
            content += b"\n"
        return name, content
    metadata["name"] = name
    metadata["description"] = (
        description or skill.description.strip() or f"Use {label or name}"
    )
    body = text[match.end() :] if match and valid_header else text
    header = yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False)
    return name, f"---\n{header}---\n{body}".encode("utf-8")


def _package_paths(
    skill: CustomCompletionPluginSkillInputs,
) -> dict[str, str]:
    if len(skill.resources) > MAX_SKILL_RESOURCE_COUNT:
        raise AgentInternalExc("Skill has too many files")
    paths = {"SKILL.md": validate_skill_resource_url(skill.download_url)}
    total_size = 0
    for item in skill.resources:
        path = PurePosixPath(item.path)
        if (
            path.is_absolute()
            or str(path) in {".", "SKILL.md"}
            or ".." in path.parts
            or "\\" in item.path
            or "\x00" in item.path
            or str(path) in paths
        ):
            raise AgentInternalExc("Skill contains an invalid file path")
        if not 0 <= item.file_size <= MAX_SKILL_RESOURCE_BYTES:
            raise AgentInternalExc("Skill file exceeds 5 MiB or has an invalid size")
        total_size += item.file_size
        paths[str(path)] = validate_skill_resource_url(item.download_url)
    if any(
        str(parent) in paths for path in paths for parent in PurePosixPath(path).parents
    ):
        raise AgentInternalExc("Skill contains a file and directory with the same path")
    if total_size > MAX_SKILL_RESOURCE_TOTAL_BYTES:
        raise AgentInternalExc("Skill attachments exceed 20 MiB")
    return paths


async def _download_file(session: aiohttp.ClientSession, url: str) -> bytes:
    try:
        return await download_skill_resource(session, url, MAX_SKILL_RESOURCE_BYTES)
    except RuntimeError:
        raise AgentInternalExc(
            "Cannot download Skill file (per-file limit 5 MiB)"
        ) from None


async def _write_package(
    root: Path, session: aiohttp.ClientSession, name: str, paths: dict[str, str]
) -> int:
    total = 0
    attachments = list(paths.items())
    for offset in range(0, len(attachments), DOWNLOAD_BATCH_SIZE):
        chunk = attachments[offset : offset + DOWNLOAD_BATCH_SIZE]
        tasks = [asyncio.create_task(_download_file(session, url)) for _, url in chunk]
        try:
            contents = await asyncio.gather(*tasks)
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        total += sum(map(len, contents))
        if total > MAX_SKILL_RESOURCE_TOTAL_BYTES:
            raise AgentInternalExc("Skill attachments exceed 20 MiB")
        for (relative_path, _), content in zip(chunk, contents, strict=True):
            target = root / name / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    return total


async def _materialize_skills(
    root: Path, skills: list[CustomCompletionPluginSkillInputs]
) -> dict[str, str]:
    packages: dict[str, CustomCompletionPluginSkillInputs] = {}
    for skill in skills:
        packages.setdefault(skill.skill_id, skill)
    try:
        manifests = [(skill, _package_paths(skill)) for skill in packages.values()]
    except RuntimeError:
        raise AgentInternalExc("Skill resource is unavailable") from None
    names: dict[str, str] = {}
    total_bytes = 0
    async with aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=30)
    ) as session:
        for skill, paths in manifests:
            entry = await _download_file(session, paths.pop("SKILL.md"))
            name, content = _native_entry(entry, skill, set(names))
            names[name] = skill.skill_id
            package = root / name
            package.mkdir()
            (package / "SKILL.md").write_bytes(content)
            total_bytes += len(content) + await _write_package(
                root, session, name, paths
            )
            if total_bytes > MAX_SKILL_RUN_BYTES:
                raise AgentInternalExc("Selected Skills exceed 100 MiB")
    return names


@asynccontextmanager
async def agent_backend(
    skills: list[CustomCompletionPluginSkillInputs],
    sandbox_config: AgentSandboxConfig | None,
    workspace_scope: tuple[str, ...] = (),
) -> AsyncIterator[BackendProtocol]:
    files: dict[str, bytes] = {}
    names: dict[str, str] = {}
    routes: dict[str, BackendProtocol] = {}
    async with AsyncExitStack() as stack:
        if skills:
            root = Path(
                stack.enter_context(TemporaryDirectory(prefix="astron-skills-"))
            )
            names = await _materialize_skills(root, skills)
            routes[SKILL_SOURCE] = ReadOnlySkillFiles(root_dir=root, virtual_mode=True)
            if sandbox_config and sandbox_config.enabled:
                files = {
                    f"{SKILL_SOURCE}{file.relative_to(root).as_posix()}": file.read_bytes()
                    for file in root.rglob("*")
                    if file.is_file()
                }
        backend = await stack.enter_async_context(
            sandbox_backend(sandbox_config, files, names)
        )
        sandbox = backend if isinstance(backend, SandboxBackendProtocol) else None
        if sandbox is not None:
            routes[SANDBOX_ROUTE] = getattr(sandbox, "file_backend", sandbox)
        store = workspace_store(workspace_scope)
        if store is not None:
            stack.callback(store.client.close)
            backend = (
                ExecutableWorkspace(store, sandbox)
                if sandbox is not None
                else MinIOWorkspace(store)
            )
            state = StateBackend()
            routes["/large_tool_results/"] = state
            routes["/conversation_history/"] = state
        yield AgentFilesystem(default=backend, routes=routes) if routes else backend
