"""Tenant configuration and deployment-managed credentials."""

import os
import re
import ssl
import stat
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, unquote, urlsplit

from sqlalchemy import URL

BOOTSTRAP_TENANT_ID = "680ab54f"
LEGACY_TENANT_KEY = "7b709739e8da44536127a333c7603a83"
LEGACY_TENANT_SECRET = "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy"
MAX_CREDENTIAL_FILE_BYTES = 4096
CREDENTIAL = re.compile(r"[A-Za-z0-9._~-]{32,50}")


class ConfigError(ValueError):
    """Configuration error safe to report during startup."""


@dataclass(frozen=True)
class BootstrapCredentials:
    app_id: str
    api_key: str = field(repr=False)
    secret: str = field(repr=False)

    @classmethod
    def load(cls) -> "BootstrapCredentials":
        app_id = os.getenv("TENANT_ID", "").strip() or BOOTSTRAP_TENANT_ID
        if app_id != BOOTSTRAP_TENANT_ID:
            raise ConfigError(f"TENANT_ID must remain {BOOTSTRAP_TENANT_ID}")
        api_key = deployment_credential("TENANT_KEY")
        secret = deployment_credential("TENANT_SECRET")
        if api_key == secret:
            raise ConfigError("TENANT_KEY and TENANT_SECRET must be distinct")
        if api_key == LEGACY_TENANT_KEY or secret == LEGACY_TENANT_SECRET:
            raise ConfigError("published legacy tenant credentials cannot be used")
        return cls(app_id, api_key, secret)


def read_credential_file(path: str) -> str:
    """Read a bounded regular file without following a final symlink."""
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    with os.fdopen(os.open(path, flags), "rb") as file:
        info = os.fstat(file.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise ConfigError(
                "credential file must be a regular non-symbolic-link file"
            )
        value = file.read(MAX_CREDENTIAL_FILE_BYTES + 1)
    if len(value) > MAX_CREDENTIAL_FILE_BYTES:
        raise ConfigError("credential file is too large")
    return value.decode("utf-8").strip()


def deployment_credential(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        file_name = os.getenv(f"{name}_FILE", "").strip()
        if not file_name:
            raise ConfigError(f"{name} or {name}_FILE is required")
        try:
            value = read_credential_file(file_name)
        except (OSError, UnicodeError, ConfigError):
            raise ConfigError(f"invalid {name}_FILE") from None
    if not CREDENTIAL.fullmatch(value):
        raise ConfigError(f"{name} must contain 32-50 ASCII letters, digits or ._~-")
    return value


TIMEOUT_OPTIONS = {
    "timeout": "connect_timeout",
    "readTimeout": "read_timeout",
    "writeTimeout": "write_timeout",
}
DURATION_UNITS = {
    "ns": 1e-9,
    "us": 1e-6,
    "µs": 1e-6,
    "μs": 1e-6,
    "ms": 1e-3,
    "s": 1,
    "m": 60,
    "h": 3600,
}
DURATION_PART = re.compile(r"(\d+(?:\.\d*)?|\.\d+)(ns|us|µs|μs|ms|s|m|h)")


def timeout_seconds(value: str) -> float:
    """Convert a duration in the legacy MySQL address to socket seconds."""
    parts = list(DURATION_PART.finditer(value.removeprefix("+")))
    if value == "0":
        return 0
    if not parts or "".join(part[0] for part in parts) != value.removeprefix("+"):
        raise ConfigError("invalid timeout duration in DATABASE_URL")
    result = sum(float(part[1]) * DURATION_UNITS[part[2]] for part in parts)
    if not 0 <= result <= 31_536_000:
        raise ConfigError("timeout duration in DATABASE_URL is out of range")
    return result


def tls_parameters(mode: str) -> dict[str, Any]:
    """Translate the built-in MySQL DSN TLS modes to PyMySQL arguments."""
    if mode == "preferred":
        return {}
    if mode in {"false", "0", "no", "off"}:
        return {"ssl_disabled": True}
    if mode in {"true", "1", "yes", "on"}:
        return {"ssl": ssl.create_default_context()}
    if mode == "skip-verify":
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return {"ssl": context}
    raise ConfigError("unsupported TLS mode in DATABASE_URL")


def connection_parameters(options: dict[str, str], password: str) -> dict[str, Any]:
    """Translate connection options without relying on PyMySQL's Latin-1 encoding."""
    parameters = tls_parameters(options.pop("tls", "false").lower())
    parameters["password"] = password.encode("utf-8")
    sql_mode = options.pop("sql_mode", None)
    if sql_mode is not None:
        parameters["sql_mode"] = sql_mode.removeprefix("'").removesuffix("'")
    time_zone = options.pop("time_zone", None)
    if time_zone is not None:
        zone = time_zone.removeprefix("'").removesuffix("'")
        # MySQL accepts a named zone or a signed offset. Restrict the MySQL
        # init command to these characters before placing the value in SQL.
        if not re.fullmatch(r"[A-Za-z0-9_+./:-]+", zone):
            raise ConfigError("invalid time_zone in DATABASE_URL")
        parameters["init_command"] = f"SET SESSION time_zone = '{zone}'"
    # PyMySQL decodes DATETIME into wall-clock values directly, with no Go Location.
    options.pop("parseTime", None)
    options.pop("loc", None)
    for option, parameter in TIMEOUT_OPTIONS.items():
        seconds = timeout_seconds(options.pop(option, "0"))
        if seconds:
            parameters[parameter] = seconds
    return parameters


def database_settings(
    address: str, username: str, password: str
) -> tuple[URL, dict[str, Any]]:
    """Parse the existing Tenant address and translate portable driver options."""
    endpoint, _, query = address.partition("?")
    address_match = re.fullmatch(r"\(([^()]+)\)/(.+)", endpoint)
    if not address_match or not username or not password:
        raise ConfigError(
            "MySQL requires credentials and DATABASE_URL=(host:port)/database"
        )
    host_port, database = address_match.groups()
    try:
        parsed = urlsplit(f"//{host_port}")
        host, port = parsed.hostname, parsed.port
        if (
            not host
            or parsed.username is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError
    except ValueError:
        raise ConfigError("invalid MySQL host or port in DATABASE_URL") from None

    options = dict(parse_qsl(query))
    connect_args = connection_parameters(options, password)
    charset = options.pop("charset", "utf8mb4").split(",")[0]
    collation = options.pop("collation", "")
    if options:
        raise ConfigError("unsupported driver option in DATABASE_URL")
    if collation:
        connect_args["collation"] = collation
    url = URL.create(
        "mysql+pymysql",
        username=username,
        password=password,
        host=host,
        port=port or 3306,
        database=unquote(database),
        query={"charset": charset},
    )
    return url, connect_args


@dataclass(frozen=True)
class Settings:
    port: int
    log_path: Path
    database: URL = field(repr=False)
    max_open: int
    max_idle: int
    bootstrap: BootstrapCredentials
    connect_args: dict[str, Any] = field(default_factory=dict, repr=False)

    @classmethod
    def load(cls, config_path: Path) -> "Settings":
        config = {}
        if config_path.exists():
            try:
                with config_path.open("rb") as file:
                    config = tomllib.load(file)
            except (OSError, ValueError):
                raise ConfigError("cannot load Tenant configuration") from None

        def setting(section: str, key: str, env: str, default: str = "") -> str:
            return os.getenv(env) or str(config.get(section, {}).get(key, default))

        service = "service" if "service" in config else "server"
        port = int(setting(service, "port", "SERVICE_PORT", "5052"))
        if not 1 <= port <= 65535:
            raise ConfigError("SERVICE_PORT must be between 1 and 65535")
        if setting("database", "dbType", "DATABASE_DB_TYPE", "mysql") != "mysql":
            raise ConfigError("DATABASE_DB_TYPE must be mysql")
        url, connect_args = database_settings(
            setting("database", "url", "DATABASE_URL"),
            setting("database", "username", "DATABASE_USERNAME"),
            setting("database", "password", "DATABASE_PASSWORD"),
        )
        return cls(
            port,
            Path(
                setting(
                    "log",
                    "path",
                    "LOG_PATH",
                    config.get("log", {}).get("logFile", "./logs/app.log"),
                )
            ),
            url,
            int(setting("database", "maxOpenConns", "DATABASE_MAX_OPEN_CONNS", "10")),
            int(setting("database", "maxIdleConns", "DATABASE_MAX_IDLE_CONNS", "5")),
            BootstrapCredentials.load(),
            connect_args,
        )
