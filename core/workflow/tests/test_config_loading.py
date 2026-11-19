import os
from pathlib import Path

import pytest

from workflow.configs import LocalLoader


def _write_config(
    path: Path,
    *,
    include_memory_limit: bool = False,
    legacy_header: str = "fallback",
) -> None:
    memory_setting = "CODE_EXEC_MEMORY_LIMIT_MB=256\n" if include_memory_limit else ""
    if legacy_header == "fallback":
        header = (
            "# Supported fallback types: disabled, ifly, ifly-v2, langchain "
            "(default: disabled)\n"
        )
    else:
        header = (
            "# Supported types: disabled, ifly, ifly-v2, langchain, e2b "
            "(default: disabled)\n"
        )
    path.write_text(
        "# Code Executor Settings\n"
        f"{header}"
        "CODE_EXEC_TYPE=disabled\n"
        "CODE_EXEC_TIMEOUT_SEC=10\n"
        f"{memory_setting}",
        encoding="utf-8",
    )


def test_legacy_disabled_template_migrates_to_builtin_executor(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    _write_config(config_file)
    monkeypatch.delenv("CODE_EXEC_TYPE", raising=False)

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "langchain"


def test_earlier_legacy_disabled_template_migrates_to_builtin_executor(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    _write_config(config_file, legacy_header="types")
    monkeypatch.delenv("CODE_EXEC_TYPE", raising=False)

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "langchain"


def test_explicit_process_disabled_setting_remains_fail_closed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    _write_config(config_file)
    monkeypatch.setenv("CODE_EXEC_TYPE", "disabled")

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "disabled"


def test_deployment_mcp_route_overrides_legacy_mounted_localhost(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    config_file.write_text("MCP_BASE_URL=http://127.0.0.1:18888\n", encoding="utf-8")
    monkeypatch.setenv("MCP_BASE_URL", "http://core-link:18888")

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("MCP_BASE_URL") == "http://core-link:18888"


def test_new_template_can_explicitly_keep_disabled_setting(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    _write_config(config_file, include_memory_limit=True)
    monkeypatch.delenv("CODE_EXEC_TYPE", raising=False)

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "disabled"


def test_custom_legacy_config_disabled_setting_is_not_migrated(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    config_file.write_text(
        "# Code Executor Settings\n"
        "# Explicit administrator override: keep Code nodes disabled\n"
        "CODE_EXEC_TYPE=disabled\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("CODE_EXEC_TYPE", raising=False)

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "disabled"


def test_legacy_header_with_hash_in_value_is_not_migrated(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    config_file.write_text(
        "# Code Executor Settings\n"
        "# Supported fallback types: disabled, ifly, ifly-v2, langchain "
        "(default: disabled)\n"
        "CODE_EXEC_TYPE=disabled#custom-value\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("CODE_EXEC_TYPE", raising=False)

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "disabled#custom-value"


def test_empty_process_override_uses_new_template_value(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_file = tmp_path / "config.env"
    config_file.write_text(
        "CODE_EXEC_TYPE=langchain\nCODE_EXEC_MEMORY_LIMIT_MB=256\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("CODE_EXEC_TYPE", "")

    loader = LocalLoader()
    loader.env_file = config_file
    loader.load()

    assert os.getenv("CODE_EXEC_TYPE") == "langchain"
