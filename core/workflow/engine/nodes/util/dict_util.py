import re
from typing import Any


def to_snake_case(s: str) -> str:
    """
    Convert camel case string to snake case string.

    This function transforms camelCase or PascalCase strings into snake_case format.
    It handles various patterns including consecutive uppercase letters and mixed cases.

    :param s: Input string in camel case or Pascal case format
    :return: String converted to snake_case format
    """
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", s)
    s = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", s)
    s = s.replace("-", "_")
    return s.lower()


def keys_to_snake_case(obj: Any) -> Any:
    """
    Convert dictionary keys to snake case format recursively.

    This function recursively traverses nested dictionaries and lists,
    converting all dictionary keys from camelCase to snake_case format
    while preserving the structure and values.

    :param obj: Input object (dict, list, or other type)
    :return: Object with dictionary keys converted to snake_case format
    """
    if isinstance(obj, dict):
        return {to_snake_case(k): keys_to_snake_case(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [keys_to_snake_case(item) for item in obj]
    else:
        return obj
