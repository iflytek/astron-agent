"""Test direct and file-based startup configuration."""

import os
import ssl
from pathlib import Path

import pytest

from tenant.config import (
    BOOTSTRAP_TENANT_ID,
    BootstrapCredentials,
    ConfigError,
    Settings,
    database_settings,
)

VALID_KEY = "K" * 32
VALID_SECRET = "S" * 32


def test_settings_from_legacy_toml_and_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config = tmp_path / "config.toml"
    config.write_text(
        '[server]\nport = 5052\n[database]\nusername = "tenant"\npassword = "original"\n'
        'url = "(localhost:3308)/tenant"\n[log]\nlogFile = "./logs/tenant.log"\n'
    )
    credential_file = tmp_path / "key"
    credential_file.write_text(VALID_KEY + "\n")
    monkeypatch.setenv("TENANT_KEY_FILE", str(credential_file))
    monkeypatch.setenv("TENANT_SECRET", VALID_SECRET)
    monkeypatch.setenv("TENANT_ID", BOOTSTRAP_TENANT_ID)
    monkeypatch.delenv("TENANT_KEY", raising=False)
    monkeypatch.setenv("SERVICE_PORT", "6052")
    monkeypatch.setenv("DATABASE_PASSWORD", "p@ss:/word")
    result = Settings.load(config)
    assert result.port == 6052 and result.database.port == 3308
    assert result.database.password == "p@ss:/word"
    assert result.log_path == Path("./logs/tenant.log")
    assert result.bootstrap.api_key == VALID_KEY
    assert VALID_SECRET not in repr(result)
    monkeypatch.setenv("TENANT_KEY", "D" * 32)
    credential_file.unlink()
    assert BootstrapCredentials.load().api_key == "D" * 32


@pytest.mark.parametrize(
    "file_kind", ["symbolic link", "fifo", "large file", "invalid value"]
)
def test_reject_unsafe_credential_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, file_kind: str
) -> None:
    credential_file = tmp_path / "key"
    if file_kind == "symbolic link":
        regular_file = tmp_path / "regular"
        regular_file.write_text(VALID_KEY)
        credential_file.symlink_to(regular_file)
    elif file_kind == "fifo":
        os.mkfifo(credential_file)
    elif file_kind == "large file":
        credential_file.write_bytes(b"x" * 4097)
    else:
        credential_file.write_text("xxx")
    monkeypatch.delenv("TENANT_KEY", raising=False)
    monkeypatch.setenv("TENANT_KEY_FILE", str(credential_file))
    with pytest.raises(ConfigError, match="TENANT_KEY"):
        BootstrapCredentials.load()


def test_legacy_database_options() -> None:
    url, options = database_settings(
        "(db:3306)/tenant?tls=true&timeout=1s500ms&writeTimeout=2s"
        "&charset=utf8mb4&collation=utf8mb4_bin&parseTime=true&loc=Asia%2FSingapore",
        "tenant",
        "test",
    )
    assert url.database == "tenant"
    assert url.query["charset"] == "utf8mb4"
    assert options["connect_timeout"] == 1.5
    assert options["write_timeout"] == 2
    assert options["collation"] == "utf8mb4_bin"
    assert options["ssl"].verify_mode == ssl.CERT_REQUIRED
    assert options["ssl"].check_hostname


@pytest.mark.parametrize(
    "query", ["tls=unregistered-profile", "timeout=10bad", "unsupported=1"]
)
def test_reject_unsupported_database_options(query: str) -> None:
    with pytest.raises(ConfigError, match="DATABASE_URL"):
        database_settings(f"(db:3306)/tenant?{query}", "tenant", "test")
