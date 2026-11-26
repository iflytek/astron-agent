"""Run a single file or command operation inside the shared execution container."""

import base64
import binascii
import errno
import fcntl
import hashlib
import heapq
import json
import os
import re
import selectors
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

WORKSPACE = Path("/workspace")
SKILLS = Path("/skills")
JOBCONTROL = Path("/run/sandbox-jobs")
DIRECTORY = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
FILE = os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_STAGE_BYTES = 100 * 1024 * 1024
MAX_ENTRIES = 500
MAX_ARTIFACTS = 20
MAX_SCAN = 4096


class JobError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


def path_parts(path):
    if not isinstance(path, str) or len(path) > 1024 or "\x00" in path or "\\" in path:
        raise JobError(400, "Invalid workspace path")
    parts = path.split("/")
    if any(part in ("", ".", "..") or len(part.encode()) > 255 for part in parts):
        raise JobError(400, "Invalid workspace path")
    return parts


@contextmanager
def directory(root, parts, create=False):
    fd = os.open(root, DIRECTORY)
    try:
        for part in parts:
            if create:
                try:
                    os.mkdir(part, mode=0o750, dir_fd=fd)
                except FileExistsError:
                    pass
            next_fd = os.open(part, DIRECTORY, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        yield fd
    finally:
        os.close(fd)


def entry_info(name, path, st):
    return {
        "name": name,
        "path": path,
        "isDirectory": stat.S_ISDIR(st.st_mode),
        "size": 0 if stat.S_ISDIR(st.st_mode) else st.st_size,
        "modifiedAt": datetime.fromtimestamp(st.st_mtime, UTC).isoformat(),
    }


def visible(st):
    return stat.S_ISDIR(st.st_mode) or (stat.S_ISREG(st.st_mode) and st.st_nlink == 1)


def cursor_key(raw):
    if not raw:
        return False, ""
    try:
        name = base64.b64decode(raw[1:], altchars=b"-_", validate=True).decode()
        if raw[0] not in "df" or path_parts(name) != [name]:
            raise ValueError
    except (ValueError, JobError) as exc:
        raise JobError(400, "Invalid workspace cursor") from exc
    return raw[0] == "f", name


def listed_entries(children, after_key):
    for entry in children:
        # Undecodable byte names cannot round trip through the HTTP API.
        try:
            path_parts(entry.name)
            st = entry.stat(follow_symlinks=False)
        except (JobError, UnicodeError, FileNotFoundError):
            continue
        key = (not stat.S_ISDIR(st.st_mode), entry.name)
        if visible(st) and key > after_key:
            yield key, st


def list_files(subject, path, after):
    prefix = path_parts(path) if path else []
    after_key = cursor_key(after)
    try:
        with directory(WORKSPACE, subject + prefix) as fd, os.scandir(fd) as children:
            candidates = heapq.nsmallest(
                MAX_ENTRIES + 1,
                listed_entries(children, after_key),
                key=lambda item: item[0],
            )
    except FileNotFoundError:
        if path:
            raise
        candidates = []
    page = candidates[:MAX_ENTRIES]
    entries = [
        entry_info(name, "/".join([*prefix, name]), st) for (_, name), st in page
    ]
    next_cursor = None
    if len(candidates) > MAX_ENTRIES:
        (is_file, name), _ = page[-1]
        next_cursor = ("f" if is_file else "d") + base64.urlsafe_b64encode(
            name.encode()
        ).decode()
    return {
        "entries": entries,
        "truncated": next_cursor is not None,
        "nextCursor": next_cursor,
    }


def read_file(root, parts, limit=MAX_FILE_BYTES):
    with directory(root, parts[:-1]) as parent:
        fd = os.open(parts[-1], FILE, dir_fd=parent)
        with os.fdopen(fd, "rb") as body:
            st = os.fstat(body.fileno())
            if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1:
                raise JobError(404, "Workspace file not found")
            if st.st_size > limit:
                raise JobError(413, "Workspace file exceeds the size limit")
            content = body.read(limit + 1)
    if len(content) > limit:
        raise JobError(413, "Workspace file exceeds the size limit")
    return content


def write_file(root, parts, content, *, create_only=False):
    with directory(root, parts[:-1], create=True) as parent:
        name = ".astron-stage-" + os.urandom(12).hex()
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
        fd = os.open(name, flags, 0o640, dir_fd=parent)
        try:
            with os.fdopen(fd, "wb") as body:
                body.write(content)
            if create_only:
                try:
                    os.link(
                        name,
                        parts[-1],
                        src_dir_fd=parent,
                        dst_dir_fd=parent,
                        follow_symlinks=False,
                    )
                except FileExistsError as exc:
                    raise JobError(409, "Workspace file already exists") from exc
            else:
                os.replace(name, parts[-1], src_dir_fd=parent, dst_dir_fd=parent)
        finally:
            try:
                os.unlink(name, dir_fd=parent)
            except FileNotFoundError:
                pass


def stage_files(subject, files, *, allow_skills=False, create_only=False):
    total = 0
    for item in files:
        path = item["path"]
        if len(item["content"]) > (MAX_FILE_BYTES + 2) // 3 * 4:
            raise JobError(413, "Workspace file exceeds the size limit")
        try:
            content = base64.b64decode(item["content"], validate=True)
        except (binascii.Error, ValueError) as exc:
            raise JobError(400, "Invalid workspace file content") from exc
        total += len(content)
        if len(content) > MAX_FILE_BYTES or total > MAX_STAGE_BYTES:
            raise JobError(413, "Workspace files exceed the size limit")
        if allow_skills and path.startswith("/skills/"):
            write_file(SKILLS, path_parts(path.removeprefix("/skills/")), content)
        else:
            write_file(
                WORKSPACE, subject + path_parts(path), content, create_only=create_only
            )


def clear_skills():
    for entry in SKILLS.iterdir():
        if entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry)
        else:
            entry.unlink()


def scan_files(subject, base_path):
    prefix = ["output"] if base_path == "output" else []
    pending = [prefix]
    result = {}
    scanned = 0
    while pending:
        relative_dir = pending.pop()
        try:
            with (
                directory(WORKSPACE, subject + relative_dir) as fd,
                os.scandir(fd) as entries,
            ):
                for entry in entries:
                    scanned += 1
                    if scanned > MAX_SCAN:
                        return result, True
                    relative = [*relative_dir, entry.name]
                    path = "/".join(relative)
                    try:
                        path_parts(path)
                    except (JobError, UnicodeError):
                        continue
                    try:
                        st = entry.stat(follow_symlinks=False)
                    except FileNotFoundError:
                        continue
                    if stat.S_ISDIR(st.st_mode):
                        pending.append(relative)
                    elif visible(st):
                        result[path] = st
        except FileNotFoundError:
            continue
    return result, False


def tree_candidates(subject, after):
    pending = [""]
    while pending:
        parent = pending.pop()
        prefix = parent + "/" if parent else ""
        try:
            with (
                directory(
                    WORKSPACE, subject + (parent.split("/") if parent else [])
                ) as fd,
                os.scandir(fd) as children,
            ):
                for (_, name), st in listed_entries(children, (False, "")):
                    path = prefix + name
                    try:
                        path_parts(path)
                    except (JobError, UnicodeError):
                        continue
                    if stat.S_ISDIR(st.st_mode):
                        # Every descendant starts with this prefix. Skip subtrees
                        # whose entries all sort before the requested cursor.
                        child_prefix = path + "/"
                        if child_prefix > after or after.startswith(child_prefix):
                            pending.append(path)
                    elif path > after:
                        yield path, st
        except (FileNotFoundError, NotADirectoryError):
            continue


def list_tree(subject, after):
    if after:
        path_parts(after)
    candidates = heapq.nsmallest(
        MAX_ENTRIES + 1, tree_candidates(subject, after or ""), key=lambda item: item[0]
    )
    page = candidates[:MAX_ENTRIES]
    truncated = len(candidates) > MAX_ENTRIES
    return {
        "entries": [entry_info(path.rsplit("/", 1)[-1], path, st) for path, st in page],
        "truncated": truncated,
        "nextCursor": page[-1][0] if truncated else None,
    }


def deletion_marker(resource_id):
    return ".deleted-" + hashlib.sha256(resource_id.encode()).hexdigest()


def purge_resource(subject):
    with directory(WORKSPACE, subject[:-1], create=True) as parent:
        resource_id = subject[-1]
        marker = deletion_marker(resource_id)
        fd = os.open(
            marker, os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600, dir_fd=parent
        )
        os.close(fd)
        try:
            st = os.stat(resource_id, dir_fd=parent, follow_symlinks=False)
        except FileNotFoundError:
            return
        if stat.S_ISDIR(st.st_mode):
            shutil.rmtree(resource_id, dir_fd=parent)
        else:
            os.unlink(resource_id, dir_fd=parent)


def require_live_resource(subject):
    try:
        with directory(WORKSPACE, subject[:-1]) as parent:
            os.stat(deletion_marker(subject[-1]), dir_fd=parent, follow_symlinks=False)
    except FileNotFoundError:
        return
    raise JobError(410, "Workspace resource was deleted")


def version(st):
    return st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns


def changed_files(subject, base_path, before):
    prior, prior_truncated = before
    # A partial initial snapshot cannot distinguish old files from new files.
    if prior_truncated:
        return {"changedFiles": [], "artifactsTruncated": True}
    after, truncated = scan_files(subject, base_path)
    changed = []
    bytes_left = MAX_FILE_BYTES
    for path, st in sorted(after.items()):
        if path in prior and version(prior[path]) == version(st):
            continue
        if len(changed) >= MAX_ARTIFACTS or st.st_size > bytes_left:
            truncated = True
            continue
        try:
            content = read_file(WORKSPACE, subject + path_parts(path), bytes_left)
        except (FileNotFoundError, NotADirectoryError, JobError):
            continue
        info = entry_info(path.rsplit("/", 1)[-1], path, st)
        changed.append({**info, "content": base64.b64encode(content).decode()})
        bytes_left -= len(content)
    return {"changedFiles": changed, "artifactsTruncated": truncated}


def end_group(pid):
    try:
        os.killpg(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def run_command(argv, cwd, timeout, output_limit, cancel_path):
    with (
        subprocess.Popen(
            argv,
            cwd=cwd,
            env={
                "HOME": os.getcwd(),
                "PATH": "/usr/local/bin:/usr/bin:/bin",
                "LANG": "C.UTF-8",
                "PYTHONPATH": os.getcwd(),
                "TMPDIR": "/tmp",
            },
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        ) as process,
        selectors.DefaultSelector() as selector,
    ):
        selector.register(process.stdout, selectors.EVENT_READ, 0)
        selector.register(process.stderr, selectors.EVENT_READ, 1)
        buffers = [bytearray(), bytearray()]
        stopped = truncated = timed_out = killed_group = False
        deadline = time.monotonic() + timeout
        try:
            while selector.get_map() or process.poll() is None:
                if time.monotonic() >= deadline or cancel_path.exists():
                    timed_out = time.monotonic() >= deadline
                    stopped = True
                    end_group(process.pid)
                    break
                if not killed_group and process.poll() is not None:
                    end_group(process.pid)
                    killed_group = True
                for key, _ in selector.select(timeout=0.05):
                    data = os.read(key.fd, 64 * 1024)
                    if not data:
                        selector.unregister(key.fileobj)
                        continue
                    buffer = buffers[key.data]
                    remaining = output_limit - len(buffer)
                    buffer.extend(data[:remaining])
                    truncated |= len(data) > remaining
        finally:
            end_group(process.pid)
            process.wait()
    return {
        "exitCode": 124 if timed_out else 130 if stopped else process.returncode,
        "stdout": buffers[0].decode("utf-8", errors="replace"),
        "stderr": buffers[1].decode("utf-8", errors="replace"),
        "truncated": truncated,
        "timedOut": timed_out,
    }


def execute(subject, job, cancel_path):
    clear_skills()
    try:
        stage_files(subject, job["files"], allow_skills=True)
        collect = job["collectArtifacts"]
        with tempfile.TemporaryDirectory(prefix="astron-") as temp:
            if job["pythonCode"] is not None:
                program = Path(temp, "main.py")
                program.write_text(job["pythonCode"], encoding="utf-8")
                argv = [sys.executable, str(program)]
            else:
                argv = ["/bin/bash", "-c", job["command"]]
            with directory(WORKSPACE, subject, create=True) as fd:
                os.fchdir(fd)
                if job["kind"] == "agent":
                    with directory(WORKSPACE, subject + ["output"], create=True):
                        pass
                before = scan_files(subject, collect) if collect else None
                result = run_command(
                    argv, ".", job["timeout"], job["outputLimit"], cancel_path
                )
        if collect and before is not None:
            result.update(changed_files(subject, collect, before))
        return result
    finally:
        clear_skills()


def dispatch(job, cancel_path):
    operation = job["operation"]
    if operation == "probe":
        with tempfile.TemporaryDirectory(prefix=".probe-", dir=WORKSPACE) as temp:
            path = Path(temp, "probe.txt")
            path.write_bytes(b"ready")
            if path.read_bytes() != b"ready":
                raise JobError(503, "Local sandbox probe failed")
            return {"status": "ok"}
    subject = [job["kind"] + "s", job["scope"], job["resourceId"]]
    if operation == "purge":
        purge_resource(subject)
        return {}
    require_live_resource(subject)
    path = job["path"]
    if operation == "list-tree":
        return list_tree(subject, job.get("after"))
    if operation == "execute":
        return execute(subject, job, cancel_path)
    if operation == "list":
        return list_files(subject, path, job.get("after"))
    if operation == "read":
        value = read_file(WORKSPACE, subject + path_parts(path))
        return {"content": base64.b64encode(value).decode()}
    if operation == "write":
        stage_files(subject, job["files"], create_only=job.get("createOnly", False))
        return {}
    parts = subject + path_parts(path)
    with directory(WORKSPACE, parts[:-1]) as fd:
        os.unlink(parts[-1], dir_fd=fd)
    return {}


def main():
    identifier = sys.argv[1]
    if re.fullmatch(r"[0-9a-f]{32}", identifier) is None:
        raise ValueError("Invalid job ID")
    try:
        job = json.loads((JOBCONTROL / (identifier + ".json")).read_bytes())
        try:
            with (JOBCONTROL / "lock").open("rb") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                result = dispatch(job, JOBCONTROL / (identifier + ".cancel"))
        except BlockingIOError as exc:
            raise JobError(503, "Local sandbox is busy") from exc
        print(json.dumps({"status": 200, "data": result}, separators=(",", ":")))
    except JobError as exc:
        print(json.dumps({"status": exc.status, "message": exc.message}))
    except (FileNotFoundError, NotADirectoryError):
        print(json.dumps({"status": 404, "message": "Workspace file not found"}))
    except OSError as exc:
        status = 404 if exc.errno in (errno.ELOOP, errno.EISDIR) else 503
        print(json.dumps({"status": status, "message": "Workspace operation failed"}))
    except UnicodeError:
        print(json.dumps({"status": 400, "message": "Invalid workspace path"}))


if __name__ == "__main__":
    main()
