import os
from typing import List


def safe_get_float_env(key: str, default: float) -> float:
    """Safely get a float environment variable, with optional default."""
    value_str = os.getenv(key, str(default))
    if value_str is None:
        return default
    try:
        return float(value_str)
    except ValueError:
        print(
            f"Environment variable {key}='{value_str}' is not a valid float. Using default={default}."
        )
        return default


def safe_get_int_env(key: str, default: int) -> int:
    """Safely get an integer environment variable, with optional default."""
    value_str = os.getenv(key, str(default))
    if value_str is None:
        return default
    try:
        return int(value_str)
    except ValueError:
        print(
            f"Environment variable {key}='{value_str}' is not a valid integer. Using default={default}."
        )
        return default


def safe_get_bool_env(key: str, default: bool) -> bool:
    """Safely get a boolean environment variable, with optional default."""
    value_str = os.getenv(key, str(default)).lower()
    if value_str in ("true", "1", "yes"):
        return True
    elif value_str in ("false", "0", "no"):
        return False
    else:
        print(
            f"Environment variable {key}='{value_str}' is not a valid boolean. Using default={default}."
        )
        return default


def safe_get_list_env(key: str, default: List[str], separator: str = ",") -> list:
    """Safely get a list environment variable, with optional default."""
    value_str = os.getenv(key)
    if value_str is None:
        return default
    return [item.strip() for item in value_str.split(separator) if item.strip()]
