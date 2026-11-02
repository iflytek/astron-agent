"""Sanitize persisted workflow protocols before storage, caching, or execution.

Sandbox runtime credentials are deployment-owned.  Older workflow protocols may still
contain copies of those credentials, so protocol boundaries must remove them without
removing unrelated database or plugin authentication fields in the DSL.
"""

from __future__ import annotations

import copy
import json
from typing import Any


def _normalized_key(key: Any) -> str:
    """Return a case/separator-insensitive representation of a mapping key."""
    return "".join(character for character in str(key).lower() if character.isalnum())


_SANDBOX_KEY = "sandbox"
_SANDBOX_ALLOWED_KEYS = {
    "enabled",
    "uid",
    "spaceid",
    "workflowid",
    "runid",
    "nodeid",
}

# These exact bootstrap credentials were published in historical deployment
# examples. They are deployment secrets, not legitimate model credentials, so
# remove only these disclosed values wherever an old protocol copy is loaded.
_DISCLOSED_BOOTSTRAP_VALUES = {
    "7b709739e8da44536127a333c7603a83",
    "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy",
}

# These fields were previously copied from deployment configuration into persisted
# workflow JSON.  Match their camelCase, snake_case, kebab-case, and case variants by
# comparing normalized keys.  Deliberately do not include apiKey/api_key: those names
# are valid model-provider credentials outside a model node or sandbox object.
_LEGACY_DEPLOYMENT_FIELDS = {
    "artifactuploadtoken",
    "artifactuploadurl",
    "runtimecredentialtoken",
    "runtimecredentialurl",
    "runtimeconfigtoken",
    "runtimeconfigurl",
    "runtimeconfigurationtoken",
    "runtimeconfigurationurl",
    "sandboxapikey",
    "sandboxartifactuploadtoken",
    "sandboxartifactuploadurl",
    "sandboxruntimecredentialtoken",
    "sandboxruntimecredentialurl",
    "sandboxruntimeconfigtoken",
    "sandboxruntimeconfigurl",
    "skillsandboxartifactuploadtoken",
    "skillsandboxartifactuploadurl",
    "skillsandboxruntimecredentialtoken",
    "skillsandboxruntimecredentialurl",
    "skillsandboxruntimeconfigtoken",
    "skillsandboxruntimeconfigurl",
}


def _sanitize_sandbox(value: Any) -> dict[Any, Any]:
    """Rebuild a sandbox object from its non-secret execution identity allowlist."""
    if not isinstance(value, dict):
        return {}

    sanitized: dict[Any, Any] = {}
    for key, item in value.items():
        if _normalized_key(key) not in _SANDBOX_ALLOWED_KEYS:
            continue
        sanitized[copy.deepcopy(key)] = _sanitize_value(item)
    return sanitized


def _sanitize_json_string(value: str, *, fail_closed: bool = False) -> Any:
    try:
        decoded = json.loads(value)
    except (json.JSONDecodeError, RecursionError, TypeError, ValueError):
        return {} if fail_closed else value

    # Treat only JSON objects and arrays as embedded protocol JSON.  Re-encoding JSON
    # scalars would unexpectedly change ordinary string values such as "true".
    if not isinstance(decoded, (dict, list)):
        return value
    try:
        sanitized = _sanitize_value(decoded)
    except RecursionError:
        return {} if fail_closed else value
    if sanitized == decoded:
        return value
    return json.dumps(sanitized, ensure_ascii=False, separators=(",", ":"))


_MODEL_NODE_TYPES = {
    "spark-llm",
    "decision-making",
    "extractor-parameter",
    "agent",
    "question-answer",
    "knowledge-base",
}
_MODEL_CREDENTIAL_KEYS = {"apikey", "apisecret"}


def _without_model_credentials(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    sanitized = {
        key: item
        for key, item in value.items()
        if _normalized_key(key) not in _MODEL_CREDENTIAL_KEYS
    }
    # Model settings may be nested for Agent nodes; plugin configuration and
    # prompts are separate and must retain their own service authentication.
    for key, item in sanitized.items():
        if _normalized_key(key) == "modelconfig":
            sanitized[key] = _without_model_credentials(item)
    return sanitized


def _sanitize_model_node(value: dict[Any, Any]) -> None:
    data = value.get("data")
    if not isinstance(data, dict):
        return
    node_type = str(value.get("id", "")).split("::", 1)[0]
    meta = data.get("nodeMeta", {})
    if node_type not in _MODEL_NODE_TYPES and (
        not isinstance(meta, dict) or meta.get("nodeType") not in _MODEL_NODE_TYPES
    ):
        return
    if "nodeParam" in data:
        data["nodeParam"] = _without_model_credentials(data["nodeParam"])


def _sanitize_value(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized: dict[Any, Any] = {}
        for key, item in value.items():
            normalized = _normalized_key(key)
            if normalized in _LEGACY_DEPLOYMENT_FIELDS:
                continue
            if normalized == _SANDBOX_KEY:
                sanitized[copy.deepcopy(key)] = _sanitize_sandbox(item)
                continue
            sanitized[copy.deepcopy(key)] = _sanitize_value(item)
        _sanitize_model_node(sanitized)
        return sanitized
    if isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    if isinstance(value, str):
        if value in _DISCLOSED_BOOTSTRAP_VALUES:
            return ""
        return _sanitize_json_string(value)
    return copy.deepcopy(value)


def sanitize_protocol(value: Any) -> Any:
    """Return a sanitized deep copy while preserving malformed JSON strings.

    This variant is suitable for persistence and migrations: malformed legacy data is
    left byte-for-byte unchanged rather than being silently destroyed.
    """
    try:
        return _sanitize_value(value)
    except RecursionError:
        # Persistence must not overwrite a pathological legacy value merely because it
        # exceeds the interpreter's safe traversal depth.
        return value


def sanitize_protocol_for_use(value: Any) -> Any:
    """Return a sanitized copy and fail closed for malformed protocol JSON strings."""
    if isinstance(value, str):
        return _sanitize_json_string(value, fail_closed=True)
    try:
        return _sanitize_value(value)
    except RecursionError:
        return {}


def sanitize_protocol_document_for_use(value: Any) -> Any:
    """Sanitize a complete protocol document, decoding valid JSON text.

    Flow protocol columns are dictionaries at runtime but old/raw database paths can
    expose their LONGTEXT representation.  Invalid JSON and JSON scalars are not valid
    executable protocols and therefore become an empty object.
    """
    decoded = value
    # Some historical DB/HTTP paths double-encoded the protocol. Decode a small,
    # bounded number of layers, then require the runtime document root to be a map.
    for _ in range(4):
        if not isinstance(decoded, str):
            break
        try:
            decoded = json.loads(decoded)
        except (json.JSONDecodeError, RecursionError, TypeError, ValueError):
            return {}
    if not isinstance(decoded, dict):
        return {}
    try:
        return _sanitize_value(decoded)
    except RecursionError:
        return {}
