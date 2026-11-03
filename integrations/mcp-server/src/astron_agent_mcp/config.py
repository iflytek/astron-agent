"""Environment-based settings for the Astron Agent MCP server."""

import os
from dataclasses import dataclass

DEFAULT_SPARK_BASE_URL = "https://spark-api-open.xf-yun.com/v1"
DEFAULT_SPARK_MODEL = "4.0Ultra"
DEFAULT_WORKFLOW_TIMEOUT_SECONDS = 600.0


@dataclass(frozen=True)
class Settings:
    spark_api_password: str
    spark_base_url: str
    spark_model: str
    astron_base_url: str
    astron_api_key: str
    astron_api_secret: str
    astron_flow_id: str
    workflow_timeout_seconds: float

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            spark_api_password=os.getenv("SPARK_API_PASSWORD", "").strip(),
            spark_base_url=_base_url("SPARK_BASE_URL", DEFAULT_SPARK_BASE_URL),
            spark_model=os.getenv("SPARK_MODEL", "").strip() or DEFAULT_SPARK_MODEL,
            astron_base_url=_base_url("ASTRON_BASE_URL", ""),
            astron_api_key=os.getenv("ASTRON_API_KEY", "").strip(),
            astron_api_secret=os.getenv("ASTRON_API_SECRET", "").strip(),
            astron_flow_id=os.getenv("ASTRON_FLOW_ID", "").strip(),
            workflow_timeout_seconds=_positive_float(
                "ASTRON_WORKFLOW_TIMEOUT_SECONDS", DEFAULT_WORKFLOW_TIMEOUT_SECONDS
            ),
        )

    def missing_spark(self) -> list[str]:
        return [] if self.spark_api_password else ["SPARK_API_PASSWORD"]

    def missing_astron(self) -> list[str]:
        required = {
            "ASTRON_BASE_URL": self.astron_base_url,
            "ASTRON_API_KEY": self.astron_api_key,
            "ASTRON_API_SECRET": self.astron_api_secret,
        }
        return [name for name, value in required.items() if not value]


def _base_url(name: str, default: str) -> str:
    return (os.getenv(name, "").strip() or default).rstrip("/")


def _positive_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number, got {raw!r}") from exc
    if value <= 0:
        raise ValueError(f"{name} must be greater than 0, got {raw!r}")
    return value
