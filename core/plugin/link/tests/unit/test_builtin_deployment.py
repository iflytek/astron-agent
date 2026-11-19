"""Rendered deployment endpoints retain connection-bound private-path restrictions."""

import importlib.util
import socket
from pathlib import Path
from urllib.parse import urlsplit

import pytest

from plugin.link.infra.tool_exector.ssrf_guard import (
    OutboundPolicy,
    OutboundPolicyError,
    create_socket_factory,
)

ROOT = Path(__file__).resolve().parents[5]
PATHS = ("smarttts", "image_generate", "image_understanding", "ocr")


def _load_gate(relative_path: str):
    spec = importlib.util.spec_from_file_location("deployment_gate", ROOT / relative_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("deployment", ["compose", "helm"])
@pytest.mark.parametrize("mode", ["default", "custom", "explicit"])
def test_rendered_builtin_endpoints_only_authorize_exact_targets(
    deployment: str, mode: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    if deployment == "compose":
        gate = _load_gate("docker/astronAgent/scripts/verify_security_contract.py")
        environment = gate._render_compose(
            ROOT / "docker/astronAgent/docker-compose.yaml",
            {
                "CORE_AITOOLS_PORT": "28668" if mode == "custom" else "18668",
                "AITOOLS_BASE_URL": "https://aitools.example.org" if mode == "explicit" else "",
                "PRIVATE_ENDPOINT_ALLOW_LIST": "",
            },
        )["services"]["core-link"]["environment"]
        expected = (
            "https://aitools.example.org"
            if mode == "explicit"
            else f"http://core-aitools:{'28668' if mode == 'custom' else '18668'}"
        )
    else:
        gate = _load_gate("helm/astron-agent/tests/verify_tenant_bootstrap.py")
        fullname = "custom-release" if mode == "custom" else "astron-agent"
        port = "28668" if mode == "custom" else "18668"
        rendered = gate._render(
            (
                "--set-string",
                f"fullnameOverride={fullname}",
                "--set",
                f"coreAitools.service.port={port}",
                "--set-string",
                "coreLink.env.aitoolsBaseUrl="
                + ("https://aitools.example.org/" if mode == "explicit" else ""),
            )
        )
        document = gate._find_document(rendered, "Deployment", fullname + "-core-link")
        _, entries = gate._main_container_environment(document)
        environment = {name: item.get("value", "") for name, item in entries.items()}
        expected = (
            "https://aitools.example.org"
            if mode == "explicit"
            else f"http://{fullname}-core-aitools:{port}"
        )

    assert environment["AITOOLS_BASE_URL"] == expected
    assert set(environment["PRIVATE_ENDPOINT_ALLOW_LIST"].split(",")) == {
        f"{expected}/aitools/v1/{path}" for path in PATHS
    }
    for name in ("SEGMENT_BLACK_LIST", "IP_BLACK_LIST", "IP_WHITE_LIST", "DOMAIN_BLACK_LIST"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("PRIVATE_ENDPOINT_ALLOW_LIST", environment["PRIVATE_ENDPOINT_ALLOW_LIST"])
    policy = OutboundPolicy.from_environment()
    port = urlsplit(expected).port or (443 if expected.startswith("https:") else 80)
    address = (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("10.0.0.8", port))
    for path in PATHS:
        factory = create_socket_factory(policy, f"{expected}/aitools/v1/{path}?request=1")
        sock = factory(address)
        sock.close()
    parsed = urlsplit(expected)
    other_scheme = "http" if parsed.scheme == "https" else "https"
    for target in (
        expected + "/admin",
        expected + "/aitools/v1/catalog",
        expected + "/aitools/v1/ocr/",
        expected + "/aitools/v1/ocr;ignored",
        f"{other_scheme}://{parsed.netloc}/aitools/v1/ocr",
        f"{parsed.scheme}://{parsed.hostname}:9999/aitools/v1/ocr",
        "http://unrelated-service:18668/aitools/v1/ocr",
        "http://core-aitools:9999/aitools/v1/ocr",
        "http://169.254.169.254/latest/meta-data",
    ):
        with pytest.raises(OutboundPolicyError):
            factory = create_socket_factory(policy, target)
            sock = factory(address)
            sock.close()

    # Explicit network blocks must continue to override the exact private exception.
    monkeypatch.setenv("IP_BLACK_LIST", "10.0.0.8")
    blocked = OutboundPolicy.from_environment()
    with pytest.raises(OutboundPolicyError):
        create_socket_factory(blocked, expected + "/aitools/v1/ocr")(address)
