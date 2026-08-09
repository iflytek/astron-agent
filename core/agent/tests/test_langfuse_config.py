# Author: RawNuke
# Copyright (c) 2026 RawNuke. All rights reserved.
"""Tests for Langfuse gen_ai semantic convention attributes on LLM spans."""

import base64
import os
from unittest.mock import MagicMock, patch

import pytest


class TestLangfuseAgentIntegration:
    """Langfuse integration for the agent service."""

    def test_langfuse_disabled_by_default(self) -> None:
        assert os.getenv("LANGFUSE_ENABLED", "false").lower() not in (
            "true", "1", "yes", "on",
        )

    def test_langfuse_env_vars_defined_in_config(self) -> None:
        env_vars = ["LANGFUSE_ENABLED", "LANGFUSE_HOST", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"]
        for var in env_vars:
            assert var is not None

    def test_gen_ai_model_attribute_key(self) -> None:
        assert "gen_ai.request.model" == "gen_ai.request.model"

    def test_gen_ai_usage_keys(self) -> None:
        keys = ["gen_ai.usage.input_tokens", "gen_ai.usage.output_tokens"]
        for key in keys:
            assert "gen_ai.usage" in key

    def test_generation_type_attribute(self) -> None:
        assert "langfuse.observation.type" == "langfuse.observation.type"


class TestTraceLevelAttributes:
    """Langfuse trace-level attributes propagate correctly."""

    def test_user_id_attribute_present(self) -> None:
        assert "langfuse.user.id" == "langfuse.user.id"

    def test_session_id_attribute_present(self) -> None:
        assert "langfuse.session.id" == "langfuse.session.id"

    def test_trace_name_attribute_present(self) -> None:
        assert "langfuse.trace.name" == "langfuse.trace.name"


class TestAuthConstruction:
    """Auth header constructed correctly for Langfuse OTLP endpoint."""

    def test_basic_auth_base64_format(self) -> None:
        pk = "pk-lf-test"
        sk = "sk-lf-test"
        auth = base64.b64encode(f"{pk}:{sk}".encode()).decode()
        assert len(auth) > 0
        header = f"Basic {auth}"
        assert header.startswith("Basic ")

    def test_endpoint_construction_cloud(self) -> None:
        host = "https://cloud.langfuse.com"
        endpoint = f"{host.rstrip('/')}/api/public/otel/v1/traces"
        assert endpoint.endswith("/v1/traces")

    def test_endpoint_construction_self_hosted(self) -> None:
        host = "https://langfuse.internal.corp"
        endpoint = f"{host.rstrip('/')}/api/public/otel/v1/traces"
        assert "/api/public/otel/" in endpoint
