"""Tests for route reload watcher."""

# pylint: disable=missing-function-docstring,protected-access,import-outside-toplevel,missing-class-docstring

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from plugin.aitools.utils.route_utils import RouteReloadWatcher
from watchdog.events import FileCreatedEvent, FileModifiedEvent


@pytest.mark.asyncio
async def test_route_reload_watcher_triggers_on_python_file_change(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)
    watcher._loop = asyncio.get_running_loop()

    reload_mock = MagicMock(return_value=1)
    monkeypatch.setattr(
        "plugin.aitools.utils.route_utils.reregister_api_services",
        reload_mock,
    )

    file_change = FileModifiedEvent("demo_service.py")

    from plugin.aitools.utils.route_utils import _PythonFileChangeHandler

    change_handler = _PythonFileChangeHandler(
        watcher._trigger_reload,
        watcher._trigger_dependency_install,
    )
    change_handler.on_any_event(file_change)
    await asyncio.sleep(0.08)
    assert reload_mock.call_count == 1


@pytest.mark.asyncio
async def test_route_reload_watcher_ignores_non_python_file(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)
    watcher._loop = asyncio.get_running_loop()

    reload_mock = MagicMock(return_value=1)
    monkeypatch.setattr(
        "plugin.aitools.utils.route_utils.reregister_api_services",
        reload_mock,
    )

    from plugin.aitools.utils.route_utils import _PythonFileChangeHandler

    change_handler = _PythonFileChangeHandler(
        watcher._trigger_reload,
        watcher._trigger_dependency_install,
    )
    change_handler.on_any_event(FileModifiedEvent("README.md"))
    await asyncio.sleep(0)
    assert reload_mock.call_count == 0


@pytest.mark.asyncio
async def test_route_reload_watcher_installs_deps_on_requirements_created(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)
    watcher._loop = asyncio.get_running_loop()

    install_mock = AsyncMock()
    monkeypatch.setattr(watcher, "_install_service_requirements", install_mock)

    from plugin.aitools.utils.route_utils import _PythonFileChangeHandler

    change_handler = _PythonFileChangeHandler(
        watcher._trigger_reload,
        watcher._trigger_dependency_install,
    )
    change_handler.on_any_event(FileCreatedEvent("requirements.txt"))

    await asyncio.sleep(0.08)
    install_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_route_reload_watcher_installs_deps_on_requirements_modified(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)
    watcher._loop = asyncio.get_running_loop()

    install_mock = AsyncMock()
    monkeypatch.setattr(watcher, "_install_service_requirements", install_mock)

    from plugin.aitools.utils.route_utils import _PythonFileChangeHandler

    change_handler = _PythonFileChangeHandler(
        watcher._trigger_reload,
        watcher._trigger_dependency_install,
    )
    change_handler.on_any_event(FileModifiedEvent("requirements.txt"))

    await asyncio.sleep(0.08)
    install_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_route_reload_watcher_debounce_coalesces_multiple_python_events(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.03)
    watcher._loop = asyncio.get_running_loop()

    reload_mock = MagicMock(return_value=1)
    monkeypatch.setattr(
        "plugin.aitools.utils.route_utils.reregister_api_services",
        reload_mock,
    )

    from plugin.aitools.utils.route_utils import _PythonFileChangeHandler

    change_handler = _PythonFileChangeHandler(
        watcher._trigger_reload,
        watcher._trigger_dependency_install,
    )
    change_handler.on_any_event(FileCreatedEvent("demo_service.py"))
    change_handler.on_any_event(FileModifiedEvent("demo_service.py"))

    await asyncio.sleep(0.12)
    assert reload_mock.call_count == 1


@pytest.mark.asyncio
async def test_route_reload_watcher_skips_when_lock_not_acquired(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)

    monkeypatch.setattr(watcher, "_acquire_process_lock", lambda: False)

    await watcher.start_watch()
    assert watcher._observer is None


@pytest.mark.asyncio
async def test_route_reload_watcher_releases_lock_on_stop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)

    release_mock = MagicMock()
    monkeypatch.setattr(watcher, "_release_process_lock", release_mock)

    await watcher.stop_watch()
    release_mock.assert_called_once()


@pytest.mark.asyncio
async def test_route_reload_watcher_releases_lock_when_observer_start_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    watcher = RouteReloadWatcher(app, watch_root=Path("."), debounce_seconds=0.01)

    monkeypatch.setattr(watcher, "_acquire_process_lock", lambda: True)
    release_mock = MagicMock()
    monkeypatch.setattr(watcher, "_release_process_lock", release_mock)

    class BrokenObserver:
        def schedule(self, *_args: object, **_kwargs: object) -> None:
            return None

        def start(self) -> None:
            raise RuntimeError("boom")

    monkeypatch.setattr("plugin.aitools.utils.route_utils.Observer", BrokenObserver)

    with pytest.raises(RuntimeError, match="boom"):
        await watcher.start_watch()

    release_mock.assert_called_once()
