from contextvars import ContextVar
from typing import Any, Dict, Optional

_PLATFORM_ACCOUNT_CONFIG: ContextVar[Dict[str, Any]] = ContextVar(
    "platform_account_config", default={}
)


def set_platform_account_config(config: Dict[str, Any]) -> None:
    _PLATFORM_ACCOUNT_CONFIG.set(config)


def get_config_value(section: str, key: str, default: Optional[Any] = None) -> Any:
    return _PLATFORM_ACCOUNT_CONFIG.get({}).get(section, {}).get(key, default)
