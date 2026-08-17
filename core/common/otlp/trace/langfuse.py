"""Privacy-preserving Langfuse bridge for the existing OpenTelemetry pipeline.

The bridge deliberately exports a sanitized copy of every span.  Astron spans may
contain full prompts, workflow DSL, request headers, or response bodies in events
and arbitrary attributes; none of those are safe to forward to a third party by
default.
"""

import base64
import hashlib
import hmac
import json
import math
import os
import re
import threading
import time
import weakref
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator, Mapping, Optional, Sequence
from urllib.parse import urlparse

from loguru import logger
from opentelemetry import baggage
from opentelemetry import context as context_api
from opentelemetry.context import Context
from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
    OTLPSpanExporter as OTLPHTTPSpanExporter,
)
from opentelemetry.propagate import inject
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import ReadableSpan, Span, SpanProcessor, TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    SpanExporter,
    SpanExportResult,
)
from opentelemetry.trace import SpanContext, Status, TraceState

_DEFAULT_LANGFUSE_HOST = "https://cloud.langfuse.com"
_DEFAULT_MAX_ATTRIBUTE_LENGTH = 8192
_LANGFUSE_TRACE_PATH = "/api/public/otel/v1/traces"
AGENT_TRACE_AUDIENCE = "astron-agent:/agent/v1/custom/chat/completions"
WORKFLOW_TRACE_AUDIENCE = "astron-workflow:/workflow/v1/chat/completions"
_TRUSTED_TRACE_TIMESTAMP_HEADER = "x-astron-langfuse-trace-timestamp"
_TRUSTED_TRACE_SIGNATURE_HEADER = "x-astron-langfuse-trace-signature"
_TRUSTED_TRACE_MAX_AGE_SECONDS = 60
_TRUSTED_TRACE_FIELDS = ("traceparent", "tracestate", "baggage")
_TRUSTED_TRACE_DOMAIN = "astron-langfuse-trace-v2"
_TRUSTED_TRACE_LOG_REDACTED_FIELDS = frozenset(
    {
        *_TRUSTED_TRACE_FIELDS,
        _TRUSTED_TRACE_TIMESTAMP_HEADER,
        _TRUSTED_TRACE_SIGNATURE_HEADER,
    }
)
_TRUTHY_VALUES = frozenset({"1", "true", "yes", "on"})
_LANGFUSE_ENVIRONMENT_PATTERN = re.compile(r"^(?!langfuse)[a-z0-9_-]{1,40}$")

_OBSERVATION_TYPES = frozenset(
    {
        "agent",
        "chain",
        "embedding",
        "evaluator",
        "event",
        "generation",
        "guardrail",
        "retriever",
        "span",
        "tool",
    }
)

_SENSITIVE_KEY_PARTS = frozenset(
    {
        "apikey",
        "api_key",
        "authorization",
        "auth_token",
        "bearer",
        "client_secret",
        "cookie",
        "credential",
        "password",
        "passwd",
        "private_key",
        "refresh_token",
        "secret",
        "secret_key",
        "set_cookie",
        "token",
    }
)
_CONTENT_KEY_PARTS = frozenset(
    {
        "body",
        "completion",
        "config",
        "content",
        "dsl",
        "header",
        "headers",
        "input",
        "inputs",
        "message",
        "messages",
        "output",
        "outputs",
        "payload",
        "prompt",
        "request",
        "response",
    }
)
_RESERVED_METADATA_PARTS = frozenset({"__proto__", "constructor", "proto", "prototype"})

_ALLOWED_ATTRIBUTE_KEYS = frozenset(
    {
        "flow_id",
        "gen_ai.operation.name",
        "gen_ai.provider.name",
        "gen_ai.request.frequency_penalty",
        "gen_ai.request.max_tokens",
        "gen_ai.request.model",
        "gen_ai.request.presence_penalty",
        "gen_ai.request.temperature",
        "gen_ai.request.top_k",
        "gen_ai.request.top_p",
        "gen_ai.response.finish_reasons",
        "gen_ai.response.id",
        "gen_ai.response.model",
        "gen_ai.tool.name",
        "langfuse.environment",
        "langfuse.observation.completion_start_time",
        "langfuse.observation.cost_details",
        "langfuse.observation.level",
        "langfuse.observation.model.name",
        "langfuse.observation.model.parameters",
        "langfuse.observation.prompt.name",
        "langfuse.observation.prompt.version",
        "langfuse.observation.status_message",
        "langfuse.observation.type",
        "langfuse.observation.usage_details",
        "langfuse.release",
        "langfuse.session.id",
        "langfuse.trace.name",
        "langfuse.trace.public",
        "langfuse.trace.tags",
        "langfuse.user.id",
        "langfuse.version",
        "span_version",
    }
)
_ALLOWED_ATTRIBUTE_PREFIXES = (
    "astron.agent.",
    "astron.workflow.",
    "gen_ai.usage.",
    "langfuse.observation.metadata.",
    "langfuse.trace.metadata.",
)
_TRACE_ATTRIBUTE_KEYS = frozenset(
    {
        "langfuse.environment",
        "langfuse.release",
        "langfuse.session.id",
        "langfuse.trace.name",
        "langfuse.trace.public",
        "langfuse.trace.tags",
        "langfuse.user.id",
        "langfuse.version",
    }
)
_TRACE_ATTRIBUTE_PREFIXES = ("langfuse.trace.metadata.",)
_JSON_ATTRIBUTE_KEYS = frozenset(
    {
        "langfuse.observation.cost_details",
        "langfuse.observation.input",
        "langfuse.observation.model.parameters",
        "langfuse.observation.output",
        "langfuse.observation.usage_details",
    }
)
_ALLOWED_RESOURCE_KEYS = frozenset(
    {
        "deployment.environment",
        "deployment.environment.name",
        "service.name",
        "service.namespace",
        "service.version",
        "telemetry.sdk.language",
        "telemetry.sdk.name",
        "telemetry.sdk.version",
    }
)

_registered_providers: "weakref.WeakSet[TracerProvider]" = weakref.WeakSet()
_registration_lock = threading.Lock()


def _is_enabled(value: str) -> bool:
    return value.strip().lower() in _TRUTHY_VALUES


def _parse_max_attribute_length(value: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return _DEFAULT_MAX_ATTRIBUTE_LENGTH
    return parsed if parsed > 0 else _DEFAULT_MAX_ATTRIBUTE_LENGTH


def _langfuse_endpoint(host: str) -> str:
    host = host.rstrip("/")
    if host.endswith(_LANGFUSE_TRACE_PATH):
        return host
    if host.endswith("/api/public/otel"):
        return f"{host}/v1/traces"
    return f"{host}{_LANGFUSE_TRACE_PATH}"


@dataclass(frozen=True)
class LangfuseConfig:
    """Configuration for the dedicated Langfuse OTLP/HTTP exporter."""

    enabled: bool = False
    public_key: str = ""
    secret_key: str = ""
    host: str = _DEFAULT_LANGFUSE_HOST
    capture_input_output: bool = False
    max_attribute_length: int = _DEFAULT_MAX_ATTRIBUTE_LENGTH
    environment: str = "default"
    release: str = ""
    trace_context_secret: str = ""

    @classmethod
    def from_env(cls, environ: Optional[Mapping[str, str]] = None) -> "LangfuseConfig":
        """Load configuration without logging credentials or their values."""

        source = os.environ if environ is None else environ
        return cls(
            enabled=_is_enabled(source.get("LANGFUSE_ENABLED", "false")),
            public_key=source.get("LANGFUSE_PUBLIC_KEY", "").strip(),
            secret_key=source.get("LANGFUSE_SECRET_KEY", "").strip(),
            host=(source.get("LANGFUSE_HOST", _DEFAULT_LANGFUSE_HOST).strip()).rstrip(
                "/"
            )
            or _DEFAULT_LANGFUSE_HOST,
            capture_input_output=_is_enabled(
                source.get("LANGFUSE_CAPTURE_INPUT_OUTPUT", "false")
            ),
            max_attribute_length=_parse_max_attribute_length(
                source.get(
                    "LANGFUSE_MAX_ATTRIBUTE_LENGTH",
                    str(_DEFAULT_MAX_ATTRIBUTE_LENGTH),
                )
            ),
            environment=source.get("LANGFUSE_ENVIRONMENT", "default").strip()
            or "default",
            release=source.get("LANGFUSE_RELEASE", "").strip(),
            trace_context_secret=source.get("ASTRON_TRACE_CONTEXT_SECRET", "").strip(),
        )

    @property
    def endpoint(self) -> str:
        return _langfuse_endpoint(self.host)

    @property
    def has_credentials(self) -> bool:
        return bool(self.public_key and self.secret_key)

    @property
    def has_valid_host(self) -> bool:
        parsed = urlparse(self.host)
        return bool(
            parsed.scheme in {"http", "https"}
            and parsed.netloc
            and parsed.username is None
            and parsed.password is None
            and not parsed.query
            and not parsed.fragment
        )

    @property
    def has_valid_environment(self) -> bool:
        """Whether the label satisfies Langfuse's immutable environment contract."""

        return bool(_LANGFUSE_ENVIRONMENT_PATTERN.fullmatch(self.environment))

    @property
    def is_effectively_enabled(self) -> bool:
        """Whether instrumentation and export are both valid and requested."""

        return bool(
            self.enabled
            and self.has_credentials
            and self.has_valid_host
            and self.has_valid_environment
        )


def langfuse_enabled() -> bool:
    """Return whether Langfuse is requested and completely configured."""

    return LangfuseConfig.from_env().is_effectively_enabled


def _case_insensitive_headers(headers: Mapping[str, str]) -> dict[str, str]:
    return {str(key).lower(): str(value) for key, value in headers.items()}


def _trusted_trace_payload(
    carrier: Mapping[str, str],
    timestamp: str,
    *,
    method: str,
    audience: str,
    tenant_id: str,
) -> bytes:
    normalized = _case_insensitive_headers(carrier)
    payload = {
        "audience": audience,
        "carrier": {
            field: normalized.get(field, "") for field in _TRUSTED_TRACE_FIELDS
        },
        "domain": _TRUSTED_TRACE_DOMAIN,
        "method": method,
        "tenant_id": tenant_id,
        "timestamp": timestamp,
    }
    return json.dumps(
        payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")


def inject_trusted_langfuse_context(
    *, method: str, audience: str, tenant_id: str
) -> dict[str, str]:
    """Inject and authenticate trace context for an Astron service-to-service call.

    The MAC uses an Astron-only credential and binds the carrier to one HTTP
    method, destination audience, and tenant.  Langfuse credentials are never
    used as an internal trust root or placed in propagation headers.
    """

    config = LangfuseConfig.from_env()
    normalized_method = method.strip().upper()
    normalized_audience = audience.strip()
    normalized_tenant = tenant_id.strip()
    if (
        not config.is_effectively_enabled
        or not config.trace_context_secret
        or not normalized_method
        or not normalized_audience
        or not normalized_tenant
    ):
        return {}

    carrier: dict[str, str] = {}
    inject(carrier)
    if "traceparent" not in carrier:
        return {}

    timestamp = str(int(time.time()))
    signature = hmac.new(
        config.trace_context_secret.encode("utf-8"),
        _trusted_trace_payload(
            carrier,
            timestamp,
            method=normalized_method,
            audience=normalized_audience,
            tenant_id=normalized_tenant,
        ),
        hashlib.sha256,
    ).hexdigest()
    carrier[_TRUSTED_TRACE_TIMESTAMP_HEADER] = timestamp
    carrier[_TRUSTED_TRACE_SIGNATURE_HEADER] = signature
    return carrier


def extract_trusted_langfuse_context(
    headers: Mapping[str, str],
    *,
    method: str,
    audience: str,
    tenant_id: str,
) -> dict[str, str]:
    """Return a verified internal W3C carrier, or fail closed with an empty one."""

    config = LangfuseConfig.from_env()
    normalized_method = method.strip().upper()
    normalized_audience = audience.strip()
    normalized_tenant = tenant_id.strip()
    if (
        not config.is_effectively_enabled
        or not config.trace_context_secret
        or not normalized_method
        or not normalized_audience
        or not normalized_tenant
    ):
        return {}

    normalized = _case_insensitive_headers(headers)
    timestamp = normalized.get(_TRUSTED_TRACE_TIMESTAMP_HEADER, "")
    supplied_signature = normalized.get(_TRUSTED_TRACE_SIGNATURE_HEADER, "")
    try:
        issued_at = int(timestamp)
    except (TypeError, ValueError):
        return {}
    if abs(int(time.time()) - issued_at) > _TRUSTED_TRACE_MAX_AGE_SECONDS:
        return {}

    carrier = {
        field: normalized[field]
        for field in _TRUSTED_TRACE_FIELDS
        if normalized.get(field)
    }
    if "traceparent" not in carrier:
        return {}
    expected_signature = hmac.new(
        config.trace_context_secret.encode("utf-8"),
        _trusted_trace_payload(
            carrier,
            timestamp,
            method=normalized_method,
            audience=normalized_audience,
            tenant_id=normalized_tenant,
        ),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(supplied_signature, expected_signature):
        return {}
    return carrier


def redact_trusted_trace_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Return headers safe to record, excluding every signed propagation field."""

    return {
        str(key): str(value)
        for key, value in headers.items()
        if str(key).lower() not in _TRUSTED_TRACE_LOG_REDACTED_FIELDS
    }


def _truncate(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    marker = "...[truncated]"
    if max_length <= len(marker):
        return marker[:max_length]
    return f"{value[: max_length - len(marker)]}{marker}"


def _truncate_json(value: str, max_length: int) -> str:
    """Bound serialized JSON without turning it into an invalid fragment."""

    if len(value) <= max_length:
        return value
    # Observation input/output and usage attributes are JSON strings in
    # Langfuse.  Returning a partial object makes the entire attribute
    # unusable, so prefer the most descriptive valid JSON sentinel that fits.
    for sentinel in ('{"truncated":true}', '"truncated"', "null", '""', "0"):
        if len(sentinel) <= max_length:
            return sentinel
    return "0"


def _key_parts(key: str) -> set[str]:
    # Split camelCase/PascalCase before normalizing separators.  Payloads often
    # use names such as ``accessToken`` or ``clientSecret``; treating those as
    # one opaque word would let common credentials bypass the denylist.
    expanded = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", key)
    expanded = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", expanded)
    normalized = re.sub(r"[^a-z0-9]+", "_", expanded.lower()).strip("_")
    tokens = list(filter(None, normalized.split("_")))
    parts = set(tokens)
    # Include adjacent compound names so prefixed HTTP headers such as
    # ``x-api-key`` and ``x-goog-api-key`` still match ``api_key``.  Checking
    # only individual tokens would miss both, while treating ``key`` alone as
    # sensitive would remove harmless metadata such as ``cache_key``.
    parts.update(f"{left}_{right}" for left, right in zip(tokens, tokens[1:]))
    parts.add(normalized)
    return parts


def _is_sensitive_key(key: str) -> bool:
    parts = _key_parts(key)
    return bool(parts.intersection(_SENSITIVE_KEY_PARTS))


def _has_content_key(key: str) -> bool:
    return bool(_key_parts(key).intersection(_CONTENT_KEY_PARTS))


def _sanitize_payload(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            str(key): _sanitize_payload(item)
            for key, item in value.items()
            if not _is_sensitive_key(str(key))
        }
    if isinstance(value, (list, tuple)):
        return [_sanitize_payload(item) for item in value]
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, (str, bool, int)) or value is None:
        return value
    return str(value)


def serialize_langfuse_value(
    value: Any, max_length: Optional[int] = None
) -> Optional[str]:
    """Serialize a Langfuse attribute value and apply a hard length limit."""

    if value is None:
        return None
    limit = max_length or LangfuseConfig.from_env().max_attribute_length
    sanitized = _sanitize_payload(value)
    if isinstance(sanitized, str):
        return _truncate(sanitized, limit)
    try:
        serialized = json.dumps(
            sanitized,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
            allow_nan=False,
        )
    except (TypeError, ValueError):
        serialized = json.dumps(str(sanitized), ensure_ascii=False)
    return _truncate_json(serialized, limit)


def langfuse_content_attributes(
    *, input_value: Any = None, output_value: Any = None
) -> dict[str, Any]:
    """Build explicitly opted-in observation content attributes."""

    config = LangfuseConfig.from_env()
    if not config.is_effectively_enabled or not config.capture_input_output:
        return {}

    attributes: dict[str, Any] = {}
    input_content = serialize_langfuse_value(
        input_value, max_length=config.max_attribute_length
    )
    output_content = serialize_langfuse_value(
        output_value, max_length=config.max_attribute_length
    )
    if input_content is not None:
        attributes["langfuse.observation.input"] = input_content
    if output_content is not None:
        attributes["langfuse.observation.output"] = output_content
    return attributes


def _safe_metadata_key(key: Any) -> Optional[str]:
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(key)).strip("._")
    if not value or _is_sensitive_key(value):
        return None
    if _key_parts(value).intersection(_RESERVED_METADATA_PARTS):
        return None
    return value[:128]


def _metadata_attributes(prefix: str, metadata: Any, max_length: int) -> dict[str, Any]:
    if not isinstance(metadata, Mapping):
        return {}
    result: dict[str, Any] = {}
    for key, value in metadata.items():
        safe_key = _safe_metadata_key(key)
        if safe_key is None:
            continue
        serialized = serialize_langfuse_value(value, max_length=max_length)
        if serialized is not None:
            result[f"{prefix}.{safe_key}"] = serialized
    return result


def _normalize_usage_details(usage_details: Any) -> Any:
    """Normalize common OpenAI/OTel token names for Langfuse cost inference."""

    if not isinstance(usage_details, Mapping):
        return usage_details
    aliases = {
        "completion_tokens": "output",
        "input_tokens": "input",
        "output_tokens": "output",
        "prompt_tokens": "input",
        "total_tokens": "total",
    }
    normalized: dict[str, Any] = {}
    for key, value in usage_details.items():
        safe_key = _safe_metadata_key(key)
        if safe_key is None or not isinstance(value, (int, float)):
            continue
        normalized[aliases.get(safe_key, safe_key)] = value
    if "total" not in normalized and ("input" in normalized or "output" in normalized):
        normalized["total"] = normalized.get("input", 0) + normalized.get("output", 0)
    return normalized


def langfuse_observation_attributes(
    observation_type: str,
    *,
    input_value: Any = None,
    output_value: Any = None,
    model: Any = None,
    model_parameters: Any = None,
    usage_details: Any = None,
    metadata: Any = None,
) -> dict[str, Any]:
    """Return stable Langfuse attributes for one nested observation."""

    config = LangfuseConfig.from_env()
    if not config.is_effectively_enabled:
        return {}
    normalized_type = str(observation_type).strip().lower()
    if normalized_type not in _OBSERVATION_TYPES:
        normalized_type = "span"

    attributes: dict[str, Any] = {
        "langfuse.observation.type": normalized_type,
    }
    model_name = serialize_langfuse_value(model, max_length=config.max_attribute_length)
    if model_name is not None:
        attributes["langfuse.observation.model.name"] = model_name
        attributes["gen_ai.request.model"] = model_name

    normalized_usage = _normalize_usage_details(usage_details)
    for key, value in (
        ("langfuse.observation.model.parameters", model_parameters),
        (
            "langfuse.observation.usage_details",
            normalized_usage,
        ),
    ):
        serialized = serialize_langfuse_value(
            value, max_length=config.max_attribute_length
        )
        if serialized is not None:
            attributes[key] = serialized

    if isinstance(normalized_usage, Mapping):
        for usage_key, otel_key in (
            ("input", "gen_ai.usage.input_tokens"),
            ("output", "gen_ai.usage.output_tokens"),
            ("total", "gen_ai.usage.total_tokens"),
        ):
            value = normalized_usage.get(usage_key)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                attributes[otel_key] = value

    attributes.update(
        _metadata_attributes(
            "langfuse.observation.metadata",
            metadata,
            config.max_attribute_length,
        )
    )
    attributes.update(
        langfuse_content_attributes(
            input_value=input_value,
            output_value=output_value,
        )
    )
    return attributes


def langfuse_trace_attributes(
    name: str,
    *,
    user_id: str = "",
    session_id: str = "",
    metadata: Any = None,
    tags: Any = None,
) -> dict[str, Any]:
    """Return trace-wide attributes suitable for baggage propagation."""

    config = LangfuseConfig.from_env()
    if not config.is_effectively_enabled:
        return {}
    environment = config.environment if config.has_valid_environment else ""
    attributes: dict[str, Any] = {}
    for key, value in (
        ("langfuse.trace.name", name),
        ("langfuse.user.id", user_id),
        ("langfuse.session.id", session_id),
        ("langfuse.environment", environment),
        ("langfuse.release", config.release),
    ):
        serialized = serialize_langfuse_value(
            value, max_length=config.max_attribute_length
        )
        if serialized:
            attributes[key] = serialized

    if isinstance(tags, (list, tuple, set)):
        safe_tags = [
            _truncate(str(tag), config.max_attribute_length)
            for tag in tags
            if tag is not None
        ]
        if safe_tags:
            attributes["langfuse.trace.tags"] = safe_tags

    attributes.update(
        _metadata_attributes(
            "langfuse.trace.metadata", metadata, config.max_attribute_length
        )
    )
    return attributes


def _is_trace_attribute(key: str) -> bool:
    return key in _TRACE_ATTRIBUTE_KEYS or key.startswith(_TRACE_ATTRIBUTE_PREFIXES)


def _encode_baggage_value(value: Any, max_length: int) -> str:
    serialized = serialize_langfuse_value(value, max_length=max_length)
    return serialized or ""


def _decode_baggage_value(key: str, value: Any, max_length: int) -> Any:
    if not isinstance(value, str):
        return value
    value = _truncate(value, max_length)
    # Identity and trace labels are strings in Langfuse.  Unconditionally
    # applying json.loads would silently turn values such as "123" and "true"
    # into int/bool, or turn a JSON-looking session id into a mapping that OTel
    # rejects.  Only the two genuinely structured trace fields are decoded.
    if key == "langfuse.trace.tags":
        try:
            decoded = json.loads(value)
        except (TypeError, ValueError):
            return [value]
        if isinstance(decoded, list):
            return [
                _truncate(str(item), max_length) for item in decoded if item is not None
            ]
        return [value]
    if key == "langfuse.trace.public":
        try:
            decoded = json.loads(value)
        except (TypeError, ValueError):
            return value
        return decoded if isinstance(decoded, bool) else value
    return value


@contextmanager
def langfuse_trace_context(
    trace_attributes: Mapping[str, Any],
    parent_context: Optional[Context] = None,
    *,
    trust_parent: bool = False,
) -> Iterator[Context]:
    """Attach local trace fields, preserving only explicitly trusted parent baggage."""

    config = LangfuseConfig.from_env()
    baggage_context = (
        parent_context if parent_context is not None else context_api.get_current()
    )
    if not config.is_effectively_enabled:
        yield baggage_context
        return
    # Baggage is an unsigned caller-controlled header at an HTTP boundary.  It
    # may carry ordinary application correlation values, but it must not be an
    # authority for Langfuse user/session attribution or trace metadata.
    if not trust_parent:
        existing = baggage.get_all(context=baggage_context)
        for key in existing:
            if key.startswith("langfuse."):
                baggage_context = baggage.remove_baggage(key, context=baggage_context)
    for key, value in trace_attributes.items():
        if not _is_trace_attribute(key) or _is_sensitive_key(key):
            continue
        baggage_context = baggage.set_baggage(
            key,
            _encode_baggage_value(value, config.max_attribute_length),
            context=baggage_context,
        )

    token = context_api.attach(baggage_context)
    try:
        yield baggage_context
    finally:
        context_api.detach(token)


class LangfuseBaggageSpanProcessor(SpanProcessor):
    """Copy approved Langfuse baggage values onto every newly started span."""

    def __init__(self, max_attribute_length: int) -> None:
        self._max_attribute_length = max_attribute_length

    def on_start(self, span: Span, parent_context: Optional[Context] = None) -> None:
        try:
            source_context = (
                parent_context
                if parent_context is not None
                else context_api.get_current()
            )
            for key, value in baggage.get_all(context=source_context).items():
                if not _is_trace_attribute(key) or _is_sensitive_key(key):
                    continue
                span.set_attribute(
                    key,
                    _decode_baggage_value(key, value, self._max_attribute_length),
                )
        except Exception:
            # Baggage enrichment must never interrupt application execution.
            logger.warning("Unable to apply Langfuse trace context to a span")

    def on_end(self, span: ReadableSpan) -> None:
        return None

    def shutdown(self) -> None:
        return None

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return True


def _is_allowed_attribute(key: str, capture_input_output: bool) -> bool:
    if _is_sensitive_key(key):
        return False
    if key in {
        "langfuse.observation.input",
        "langfuse.observation.output",
    }:
        return capture_input_output
    if key.startswith("langfuse.trace.") and key.endswith((".input", ".output")):
        return False
    if key in _ALLOWED_ATTRIBUTE_KEYS:
        return True
    if key.startswith("gen_ai.usage."):
        return True
    if key.startswith(_ALLOWED_ATTRIBUTE_PREFIXES):
        return not _has_content_key(key)
    return False


def _sanitize_json_attribute(key: str, value: Any, max_length: int) -> str:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            pass
    if key == "langfuse.observation.usage_details":
        value = _normalize_usage_details(value)
    return serialize_langfuse_value(value, max_length=max_length) or ""


def _sanitize_sequence(value: Sequence[Any], max_length: int) -> list[Any]:
    safe_values: list[Any] = []
    for item in value:
        if isinstance(item, str):
            safe_values.append(_truncate(item, max_length))
        elif isinstance(item, (bool, int, float)):
            safe_values.append(item)
        else:
            safe_values.append(
                serialize_langfuse_value(item, max_length=max_length) or ""
            )
    return safe_values


def _sanitize_attribute_value(key: str, value: Any, max_length: int) -> Any:
    if key in _JSON_ATTRIBUTE_KEYS:
        return _sanitize_json_attribute(key, value, max_length)
    if isinstance(value, str):
        return _truncate(value, max_length)
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray)):
        return _sanitize_sequence(value, max_length)
    return serialize_langfuse_value(value, max_length=max_length) or ""


def _sanitized_resource(resource: Resource, max_length: int) -> Resource:
    attributes = {
        key: _sanitize_attribute_value(key, value, max_length)
        for key, value in resource.attributes.items()
        if key in _ALLOWED_RESOURCE_KEYS and not _is_sensitive_key(key)
    }
    return Resource(attributes)


def _sanitized_span_context(
    context: Optional[SpanContext],
) -> Optional[SpanContext]:
    """Copy trace identity without caller-controlled W3C tracestate."""

    if context is None:
        return None
    return SpanContext(
        trace_id=context.trace_id,
        span_id=context.span_id,
        is_remote=context.is_remote,
        trace_flags=context.trace_flags,
        trace_state=TraceState(),
    )


def _sanitized_span(span: ReadableSpan, config: LangfuseConfig) -> ReadableSpan:
    attributes = {
        key: _sanitize_attribute_value(key, value, config.max_attribute_length)
        for key, value in (span.attributes or {}).items()
        if _is_allowed_attribute(key, config.capture_input_output)
    }
    return ReadableSpan(
        name=_truncate(span.name, config.max_attribute_length),
        context=_sanitized_span_context(span.context),
        parent=_sanitized_span_context(span.parent),
        resource=_sanitized_resource(span.resource, config.max_attribute_length),
        attributes=attributes,
        events=(),
        links=(),
        kind=span.kind,
        status=Status(span.status.status_code),
        start_time=span.start_time,
        end_time=span.end_time,
        instrumentation_scope=getattr(span, "instrumentation_scope", None),
    )


class SanitizingSpanExporter(SpanExporter):
    """Export sanitized span copies and never forward original span events."""

    def __init__(self, exporter: SpanExporter, config: LangfuseConfig) -> None:
        self._exporter = exporter
        self._config = config

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        try:
            sanitized = tuple(_sanitized_span(span, self._config) for span in spans)
        except Exception:
            # Never fall back to exporting originals: that would break the privacy boundary.
            logger.error("Langfuse span sanitization failed; dropping export batch")
            return SpanExportResult.FAILURE
        return self._exporter.export(sanitized)

    def shutdown(self) -> None:
        self._exporter.shutdown()

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        force_flush = getattr(self._exporter, "force_flush", None)
        if callable(force_flush):
            return bool(force_flush(timeout_millis=timeout_millis))
        return True


def add_langfuse_span_processor(provider: TracerProvider) -> bool:
    """Add a dedicated Langfuse OTLP/HTTP processor, failing closed on config errors."""

    config = LangfuseConfig.from_env()
    if not config.is_effectively_enabled:
        if not config.enabled:
            return False
        if not config.has_credentials:
            logger.warning(
                "Langfuse tracing requested but required credentials are missing; exporter disabled"
            )
        elif not config.has_valid_host:
            logger.warning(
                "Langfuse tracing requested with an invalid host; exporter disabled"
            )
        elif not config.has_valid_environment:
            logger.warning(
                "Langfuse tracing requested with an invalid environment; exporter disabled"
            )
        return False

    with _registration_lock:
        if provider in _registered_providers:
            return True

        try:
            auth = base64.b64encode(
                f"{config.public_key}:{config.secret_key}".encode("utf-8")
            ).decode("ascii")
            exporter = OTLPHTTPSpanExporter(
                endpoint=config.endpoint,
                headers={
                    "Authorization": f"Basic {auth}",
                    "x-langfuse-ingestion-version": "4",
                },
            )
            sanitizing_exporter = SanitizingSpanExporter(exporter, config)
            processor = BatchSpanProcessor(sanitizing_exporter)
            baggage_processor = LangfuseBaggageSpanProcessor(
                config.max_attribute_length
            )
            # Baggage attributes are applied synchronously before a span ends; the
            # processor order is otherwise immaterial to BatchSpanProcessor.
            provider.add_span_processor(baggage_processor)
            provider.add_span_processor(processor)
        except Exception:
            logger.error(
                "Unable to initialize the Langfuse exporter; tracing remains disabled"
            )
            return False

        _registered_providers.add(provider)
        logger.info("Langfuse OTLP/HTTP exporter enabled")
        return True


__all__ = [
    "AGENT_TRACE_AUDIENCE",
    "LangfuseBaggageSpanProcessor",
    "LangfuseConfig",
    "SanitizingSpanExporter",
    "WORKFLOW_TRACE_AUDIENCE",
    "add_langfuse_span_processor",
    "extract_trusted_langfuse_context",
    "inject_trusted_langfuse_context",
    "langfuse_content_attributes",
    "langfuse_enabled",
    "langfuse_observation_attributes",
    "langfuse_trace_attributes",
    "langfuse_trace_context",
    "redact_trusted_trace_headers",
    "serialize_langfuse_value",
]
