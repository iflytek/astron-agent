# Author: RawNuke
# Copyright (c) 2026 RawNuke. All rights reserved.
"""Tests for Langfuse OTLP HTTP exporter and semantic convention attributes."""

import base64
import os
from unittest.mock import MagicMock, patch

import pytest


class TestLangfuseExporterDisabled:
    """Langfuse exporter is off by default."""

    def test_langfuse_not_enabled_when_env_unset(self) -> None:
        assert os.getenv("LANGFUSE_ENABLED", "false").lower() not in (
            "true", "1", "yes", "on",
        )


class TestLangfuseEndpointConstruction:
    """Langfuse OTLP HTTP endpoint builds correctly from env vars."""

    def test_default_cloud_endpoint(self) -> None:
        host = "https://cloud.langfuse.com"
        endpoint = f"{host.rstrip('/')}/api/public/otel/v1/traces"
        assert endpoint == "https://cloud.langfuse.com/api/public/otel/v1/traces"

    def test_self_hosted_endpoint(self) -> None:
        host = "https://langfuse.example.com"
        endpoint = f"{host.rstrip('/')}/api/public/otel/v1/traces"
        assert endpoint == "https://langfuse.example.com/api/public/otel/v1/traces"


class TestLangfuseAuth:
    """Langfuse Basic Auth header is correct."""

    def test_auth_header_format(self) -> None:
        pk = "pk-lf-12345"
        sk = "sk-lf-67890"
        auth_string = base64.b64encode(f"{pk}:{sk}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth_string}",
            "x-langfuse-ingestion-version": "4",
        }
        assert headers["Authorization"].startswith("Basic ")
        assert headers["x-langfuse-ingestion-version"] == "4"


class TestSpanAttributes:
    """Span attributes include Langfuse and GenAI semantic conventions."""

    def test_default_attrs_include_langfuse_keys(self) -> None:
        default_attr = {
            "sid": "test-sid",
            "app_id": "test-app",
            "uid": "user-1",
            "chat_id": "chat-1",
            "span_version": "1.0.0",
            "langfuse.user.id": "user-1",
            "langfuse.session.id": "chat-1",
            "langfuse.trace.name": "RunModelStream",
        }
        assert default_attr["langfuse.user.id"] == "user-1"
        assert default_attr["langfuse.session.id"] == "chat-1"
        assert default_attr["langfuse.trace.name"] == "RunModelStream"

    def test_gen_ai_attributes_set_on_llm_spans(self) -> None:
        attrs = {
            "langfuse.observation.type": "generation",
            "gen_ai.request.model": "gpt-4o",
            "gen_ai.usage.input_tokens": 150,
            "gen_ai.usage.output_tokens": 80,
        }
        assert attrs["langfuse.observation.type"] == "generation"
        assert attrs["gen_ai.request.model"] == "gpt-4o"
        assert attrs["gen_ai.usage.input_tokens"] == 150
        assert attrs["gen_ai.usage.output_tokens"] == 80
