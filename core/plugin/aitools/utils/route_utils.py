"""Watch service directory changes and hot-reload dynamic API routes."""

# pylint: disable=duplicate-code

import asyncio
import fcntl
import os
from pathlib import Path
from typing import IO, Callable

from fastapi import FastAPI
from loguru import logger as log
from plugin.aitools.api.routes.register import reregister_api_services
from plugin.aitools.const.const import PIP_INDEX_URL_KEY
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer
from watchdog.observers.api import BaseObserver


class _PythonFileChangeHandler(FileSystemEventHandler):
    """Forward service file change events to async callbacks."""

    def __init__(
        self,
        on_python_change: Callable[[], None],
        on_requirements_change: Callable[[], None],
    ) -> None:
        """Initialize callbacks for python and requirements.txt changes."""
        self._on_python_change = on_python_change
        self._on_requirements_change = on_requirements_change

    def on_any_event(self, event: FileSystemEvent) -> None:
        """Handle file-system events and trigger relevant callbacks."""
        if event.is_directory:
            return

        src_path = getattr(event, "src_path", "") or ""
        dest_path = getattr(event, "dest_path", "") or ""

        event_type = getattr(event, "event_type", "")
        path_candidates = [src_path, dest_path]
        if event_type in {"created", "modified"} and any(
            Path(path).name == "requirements.txt" for path in path_candidates if path
        ):
            self._on_requirements_change()

        if not src_path.endswith(".py") and not dest_path.endswith(".py"):
            return

        self._on_python_change()


class RouteReloadWatcher:  # pylint: disable=too-many-instance-attributes
    """Run a watchdog observer and re-register routes when service files change."""

    def __init__(
        self,
        app: FastAPI,
        watch_root: Path | None = None,
        debounce_seconds: float = 5.0,
    ) -> None:
        """Initialize the watcher with app and optional watch root."""
        self.app = app
        self.watch_root = watch_root or (
            Path(__file__).resolve().parents[1] / "service"
        )
        self.project_root = Path(__file__).resolve().parents[1]
        self.debounce_seconds = max(0.0, debounce_seconds)

        self._loop: asyncio.AbstractEventLoop | None = None
        self._observer: BaseObserver | None = None
        self._reload_task: asyncio.Task | None = None
        self._dependency_task: asyncio.Task | None = None
        self._reload_debounce_task: asyncio.Task | None = None
        self._dependency_debounce_task: asyncio.Task | None = None
        self._lock_file: IO[str] | None = None
        self._owns_lock = False
        self._stopping = False

    def _acquire_process_lock(self) -> bool:
        """Acquire cross-process lock for singleton watcher behavior."""
        lock_path = self.project_root / ".route_reload_watcher.pid.lock"
        # Keep file descriptor open for lock lifetime.
        # pylint: disable=consider-using-with
        lock_file = open(lock_path, "w", encoding="utf-8")
        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            self._lock_file = lock_file
            self._owns_lock = True
            return True
        except BlockingIOError:
            lock_file.close()
            return False

    def _release_process_lock(self) -> None:
        """Release singleton watcher lock if held by this process."""
        if not self._lock_file:
            return

        if self._owns_lock:
            try:
                fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_UN)
            except OSError:
                pass
        self._lock_file.close()
        self._lock_file = None
        self._owns_lock = False

    def _trigger_reload(self) -> None:
        """Schedule a route reload on the event loop."""
        if self._stopping or not self._loop:
            return
        self._loop.call_soon_threadsafe(self._debounce_reload)

    def _debounce_reload(self) -> None:
        """Debounce frequent file events before scheduling a route reload."""
        if self._reload_debounce_task and not self._reload_debounce_task.done():
            self._reload_debounce_task.cancel()
        self._reload_debounce_task = asyncio.create_task(
            self._wait_and_schedule_reload()
        )

    async def _wait_and_schedule_reload(self) -> None:
        """Wait for debounce window before creating the reload task."""
        try:
            await asyncio.sleep(self.debounce_seconds)
            self._schedule_reload()
        except asyncio.CancelledError:
            pass

    def _schedule_reload(self) -> None:
        """Schedule the route reload task if not already running."""
        if self._stopping:
            return
        if self._reload_task and not self._reload_task.done():
            return
        self._reload_task = asyncio.create_task(self._reload_routes())

    def _trigger_dependency_install(self) -> None:
        """Schedule a dependency installation on the event loop."""
        if self._stopping or not self._loop:
            return
        self._loop.call_soon_threadsafe(self._debounce_dependency_install)

    def _debounce_dependency_install(self) -> None:
        """Debounce frequent file events before scheduling dependency install."""
        if self._dependency_debounce_task and not self._dependency_debounce_task.done():
            self._dependency_debounce_task.cancel()
        self._dependency_debounce_task = asyncio.create_task(
            self._wait_and_schedule_dependency_install()
        )

    async def _wait_and_schedule_dependency_install(self) -> None:
        """Wait for debounce window before creating dependency task."""
        try:
            await asyncio.sleep(self.debounce_seconds)
            self._schedule_dependency_install()
        except asyncio.CancelledError:
            pass

    def _schedule_dependency_install(self) -> None:
        """Schedule the dependency installation task if not already running."""
        if self._stopping:
            return
        if self._dependency_task and not self._dependency_task.done():
            return
        self._dependency_task = asyncio.create_task(
            self._install_service_requirements()
        )

    async def _reload_routes(self) -> None:
        """Reload dynamic API routes and log the result."""
        try:
            route_count = reregister_api_services(self.app)
            log.info(
                "Dynamic API routes reloaded successfully. route_count={}", route_count
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            log.exception("Failed to reload dynamic API routes: {}", e)

    async def _install_service_requirements(self) -> None:
        """Install dependencies from requirements.txt and log the result."""
        requirements_file = self.watch_root / "requirements.txt"
        if not requirements_file.exists():
            return

        python_path = self.project_root / ".venv" / "bin" / "python"
        command = ["uv", "pip", "install"]
        if python_path.exists():
            command.extend(["--python", str(python_path)])
        command.extend(["-r", str(requirements_file)])
        index_url = os.getenv(PIP_INDEX_URL_KEY, None)
        if index_url:
            command.extend(["-i", index_url])

        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=str(self.project_root),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            log.info("Installed dependencies from {}", requirements_file)
            return

        error_text = (stderr or stdout or b"").decode("utf-8", errors="ignore").strip()
        log.error(
            "Failed to install dependencies from {}: {}",
            requirements_file,
            error_text,
        )

    async def start_watch(self) -> None:
        """Start watchdog observer."""
        if self._observer:
            return

        if not self._acquire_process_lock():
            log.info(
                "Route reload watcher lock is held by another worker; "
                "skip watch. pid={}",
                os.getpid(),
            )
            return

        self._stopping = False
        self._loop = asyncio.get_running_loop()

        handler = _PythonFileChangeHandler(
            self._trigger_reload,
            self._trigger_dependency_install,
        )
        observer = Observer()
        observer.schedule(handler, str(self.watch_root), recursive=True)
        try:
            observer.start()
        except Exception:
            self._release_process_lock()
            log.exception(
                "Route reload watcher failed to start observer. pid={}",
                os.getpid(),
            )
            raise

        self._observer = observer
        log.info(
            "Route reload watcher started with singleton lock. pid={}",
            os.getpid(),
        )

    async def _stop_observer(self) -> None:
        """Stop and join observer thread if running."""
        if not self._observer:
            return
        self._observer.stop()
        await asyncio.to_thread(self._observer.join, 5)
        self._observer = None

    async def _cancel_task(self, task: asyncio.Task | None) -> None:
        """Cancel and await a task if it is still running."""
        if not task or task.done():
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    async def stop_watch(self) -> None:
        """Stop watchdog observer and in-flight reload task."""
        self._stopping = True

        await self._stop_observer()
        await self._cancel_task(self._reload_task)
        await self._cancel_task(self._dependency_task)
        await self._cancel_task(self._reload_debounce_task)
        await self._cancel_task(self._dependency_debounce_task)

        self._reload_task = None
        self._dependency_task = None
        self._reload_debounce_task = None
        self._dependency_debounce_task = None
        self._loop = None
        self._release_process_lock()
