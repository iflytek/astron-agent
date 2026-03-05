"""Unit tests for polaris_utils module."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from plugin.aitools.utils.polaris_utils import AIToolsPolaris


@pytest.fixture
def polaris_env() -> dict[str, str]:
    return {
        "POLARIS_URL": "http://polaris.test",
        "POLARIS_USERNAME": "user",
        "POLARIS_PASSWORD": "pwd",
        "PROJECT_NAME": "proj",
        "POLARIS_CLUSTER": "dev",
        "SERVICE_NAME": "aitools",
        "VERSION": "1.0.0",
        "CONFIG_FILE": "config.env",
    }


def test_init_loads_config_filter(polaris_env: dict[str, str]) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        polaris = AIToolsPolaris()

    assert polaris._config_filter is not None
    assert polaris._config_filter.project_name == "proj"
    assert polaris._config_filter.cluster_group == "dev"


def test_pull_onece_updates_hash_and_cache(polaris_env: dict[str, str]) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        polaris = AIToolsPolaris()

    with patch.object(AIToolsPolaris, "pull", return_value={"A": "1", "B": "2"}):
        polaris.pull_onece()

    assert polaris._config_cache == {"A": "1", "B": "2"}
    assert polaris._config_hash is not None


@pytest.mark.asyncio
async def test_trigger_callbacks_supports_sync_and_async(
    polaris_env: dict[str, str],
) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        polaris = AIToolsPolaris()

    sync_cb = MagicMock()
    async_cb = AsyncMock()
    polaris.register_callback(sync_cb)
    polaris.register_callback(async_cb)

    await polaris._trigger_callbacks()

    sync_cb.assert_called_once()
    async_cb.assert_awaited_once()


@pytest.mark.asyncio
async def test_watch_loop_requires_config_filter(polaris_env: dict[str, str]) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        polaris = AIToolsPolaris()

    polaris._config_filter = None

    with pytest.raises(ValueError):
        await polaris._watch_loop(None, interval=0)


@pytest.mark.asyncio
async def test_watch_loop_triggers_on_hash_change(
    polaris_env: dict[str, str],
) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        polaris = AIToolsPolaris()

    polaris._config_hash = "old"
    with (
        patch.object(
            AIToolsPolaris,
            "pull_async",
            new=AsyncMock(side_effect=[{"A": "1"}, asyncio.CancelledError()]),
        ),
        patch.object(AIToolsPolaris, "_trigger_callbacks", new=AsyncMock()) as mock_cb,
    ):
        with pytest.raises(asyncio.CancelledError):
            await polaris._watch_loop(polaris._config_filter, interval=0)

    mock_cb.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_and_stop_watch(polaris_env: dict[str, str]) -> None:
    with patch.dict("os.environ", polaris_env, clear=False):
        polaris = AIToolsPolaris()

    with patch.object(AIToolsPolaris, "_watch_loop", new=AsyncMock(return_value=None)):
        polaris.start_watch(interval=1)
        assert polaris._watch_task is not None

        task = polaris._watch_task
        polaris.stop_watch()
        await asyncio.sleep(0)
        assert task.cancelled() or task.done()
