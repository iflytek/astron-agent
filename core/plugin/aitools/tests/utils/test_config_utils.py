"""Unit tests for config_utils module."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from plugin.aitools.utils.config_utils import ConfigWatcher


@pytest.fixture
def polaris_env() -> dict[str, str]:
    return {
        "POLARIS_URL": "http://polaris.test",
        "POLARIS_USERNAME": "user",
        "POLARIS_PASSWORD": "pwd",
        "PROJECT_NAME": "proj",
        "POLARIS_CLUSTER": "dev",
        "SERVICE_SUB": "aitools",
        "VERSION": "1.0.0",
        "CONFIG_FILE": "config.env",
        "USE_POLARIS": "false",
        "HOT_RELOAD_ENABLE": "true",
        "CONFIG_WATCH_INTERVAL": "0",
    }


def test_init_loads_env_file_config(polaris_env: dict[str, str]) -> None:
    env_file_data = {"A": "1", "B": "2"}
    with patch.dict("os.environ", polaris_env, clear=False):
        with (
            patch(
                "plugin.aitools.utils.config_utils.EnvFileLoader.load_env_file",
                return_value=env_file_data,
            ),
            patch("plugin.aitools.utils.config_utils.load_dotenv"),
            patch("plugin.aitools.utils.config_utils.init_uvicorn_logger"),
        ):
            watcher = ConfigWatcher()

    assert watcher.current_config == env_file_data
    assert watcher.current_config_hash is not None
    assert watcher.enable_polaris is False


@pytest.mark.asyncio
async def test_trigger_callbacks_supports_sync_and_async(
    polaris_env: dict[str, str],
) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        with (
            patch(
                "plugin.aitools.utils.config_utils.EnvFileLoader.load_env_file",
                return_value={"A": "1"},
            ),
            patch("plugin.aitools.utils.config_utils.load_dotenv"),
            patch("plugin.aitools.utils.config_utils.init_uvicorn_logger"),
        ):
            watcher = ConfigWatcher()

    sync_cb = MagicMock()
    async_cb = AsyncMock()
    watcher.register_callback(sync_cb)
    watcher.register_callback(async_cb)

    await watcher._trigger_callbacks()

    sync_cb.assert_called_once()
    async_cb.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_watch_no_task_when_polaris_disabled(
    polaris_env: dict[str, str],
) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        with (
            patch(
                "plugin.aitools.utils.config_utils.EnvFileLoader.load_env_file",
                return_value={"A": "0"},
            ),
            patch("plugin.aitools.utils.config_utils.load_dotenv"),
            patch("plugin.aitools.utils.config_utils.init_uvicorn_logger"),
        ):
            watcher = ConfigWatcher()

    watcher.enable_hot_reload = True
    watcher.enable_polaris = False

    await watcher.start_watch()

    assert watcher._watch_task is None


@pytest.mark.asyncio
async def test_watch_polaris_triggers_on_hash_change(
    polaris_env: dict[str, str],
) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        with (
            patch(
                "plugin.aitools.utils.config_utils.EnvFileLoader.load_env_file",
                return_value={"A": "0"},
            ),
            patch("plugin.aitools.utils.config_utils.load_dotenv"),
            patch("plugin.aitools.utils.config_utils.init_uvicorn_logger"),
        ):
            watcher = ConfigWatcher()

    watcher.enable_polaris = True
    watcher.current_config_hash = "old"
    watcher.interval = 0
    watcher.polaris_client = MagicMock()
    watcher.polaris_client.download_config = AsyncMock(
        side_effect=[({"A": "1"}, "A=1"), asyncio.CancelledError()]
    )

    with (
        patch.object(watcher, "_trigger_callbacks", new=AsyncMock()) as mock_cb,
        patch("plugin.aitools.utils.config_utils.load_dotenv"),
    ):
        with pytest.raises(asyncio.CancelledError):
            await watcher.watch_polaris()

    mock_cb.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_and_stop_watch(polaris_env: dict[str, str]) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        with (
            patch(
                "plugin.aitools.utils.config_utils.EnvFileLoader.load_env_file",
                return_value={"A": "1"},
            ),
            patch("plugin.aitools.utils.config_utils.load_dotenv"),
            patch("plugin.aitools.utils.config_utils.init_uvicorn_logger"),
        ):
            watcher = ConfigWatcher()

    watcher.enable_hot_reload = True
    watcher.enable_polaris = True

    with patch.object(watcher, "watch_polaris", new=AsyncMock(return_value=None)):
        await watcher.start_watch()
        assert watcher._watch_task is not None

        task = watcher._watch_task
        await watcher.stop_watch()
        await asyncio.sleep(0)
        assert task.cancelled() or task.done()
