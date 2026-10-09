from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RUNTIME_", extra="ignore")

    database_url: str = ""
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_database: str = "sparkdb_manager"
    postgres_user: str = "spark"
    postgres_password: str = ""
    redis_url: str = ""
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_database: int = 1
    gateway_identity_secret: str = ""
    gateway_identity_secret_file: str = ""
    internal_api_key: str = ""
    internal_api_key_file: str = ""
    delegation_issuers_json: str = "{}"
    delegation_audience: str = "astron-agent-runtime"
    gateway_signature_max_age_seconds: int = 60
    core_agent_url: str = "http://core-agent:17870"
    core_workflow_url: str = "http://core-workflow:7880"
    console_hub_url: str = "http://console-hub:8080"
    code_version: str = "dev"
    workflow_internal_api_key: str = ""
    workflow_internal_api_key_file: str = ""
    event_poll_interval_seconds: float = Field(default=0.5, gt=0, le=5)
    queued_redispatch_seconds: int = Field(default=300, ge=30, le=3600)
    worker_soft_time_limit_seconds: int = 900
    worker_time_limit_seconds: int = 960

    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        user = quote_plus(self.postgres_user)
        password = quote_plus(self.postgres_password)
        credentials = f"{user}:{password}" if password else user
        return (
            f"postgresql+psycopg://{credentials}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_database}"
        )

    def resolved_redis_url(self) -> str:
        if self.redis_url:
            return self.redis_url
        password = f":{quote_plus(self.redis_password)}@" if self.redis_password else ""
        return (
            f"redis://{password}{self.redis_host}:{self.redis_port}/"
            f"{self.redis_database}"
        )

    @staticmethod
    def _read_secret(path: str) -> str:
        if not path:
            return ""
        secret_path = Path(path)
        try:
            if secret_path.is_symlink() or not secret_path.is_file():
                return ""
            if secret_path.stat().st_size > 4096:
                return ""
            return secret_path.read_text(encoding="utf-8").strip()
        except OSError:
            return ""

    def gateway_secret(self) -> str:
        return self.gateway_identity_secret or self._read_secret(
            self.gateway_identity_secret_file
        )

    def management_key(self) -> str:
        return self.internal_api_key or self._read_secret(self.internal_api_key_file)

    def workflow_key(self) -> str:
        return self.workflow_internal_api_key or self._read_secret(
            self.workflow_internal_api_key_file
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
