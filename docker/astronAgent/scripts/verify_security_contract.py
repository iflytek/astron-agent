#!/usr/bin/env python3
"""Verify rendered Compose security and internal-credential contracts."""

import argparse
import copy
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from typing import (
    Any,
    Callable,
    List,
    Mapping,
    MutableMapping,
    Optional,
    Sequence,
    Tuple,
)

SERVICES = ("console-hub", "core-agent", "core-workflow")
CONSUMERS = ("core-agent", "core-workflow")
INTERNAL_CREDENTIAL_INIT = "internal-credentials-init"
INTERNAL_CREDENTIAL_CONSUMERS = (
    "core-tenant",
    "core-agent",
    "core-workflow",
    "console-hub",
    "agent-runtime-api",
    "agent-runtime-worker",
)

LEGACY_TENANT_KEY = "7b709739e8da44536127a333c7603a83"
LEGACY_TENANT_SECRET = "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy"
WORKFLOW_PLACEHOLDER = "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY"

GENERATED_CREDENTIALS = (
    {
        "volume": "workflow_internal_secrets",
        "init_target": "/secrets/workflow",
        "consumer_target": "/app/secrets/workflow",
        "consumers": {
            "core-agent": {
                "WORKFLOW_INTERNAL_API_KEY_FILE": (
                    "/app/secrets/workflow/workflow-internal-api-key"
                ),
            },
            "core-workflow": {
                "WORKFLOW_INTERNAL_API_KEY_FILE": (
                    "/app/secrets/workflow/workflow-internal-api-key"
                ),
            },
            "console-hub": {},
            "agent-runtime-api": {
                "RUNTIME_GATEWAY_IDENTITY_SECRET_FILE": (
                    "/app/secrets/workflow/workflow-internal-api-key"
                ),
            },
            "agent-runtime-worker": {
                "RUNTIME_WORKFLOW_INTERNAL_API_KEY_FILE": (
                    "/app/secrets/workflow/workflow-internal-api-key"
                ),
            },
        },
    },
    {
        "volume": "agent_runtime_internal_secrets",
        "init_target": "/secrets/agent-runtime",
        "consumer_target": "/app/secrets/agent-runtime",
        "consumers": {
            "console-hub": {
                "AGENT_RUNTIME_INTERNAL_API_KEY_FILE": (
                    "/app/secrets/agent-runtime/runtime-internal-api-key"
                ),
            },
            "agent-runtime-api": {
                "RUNTIME_INTERNAL_API_KEY_FILE": (
                    "/app/secrets/agent-runtime/runtime-internal-api-key"
                ),
            },
            "agent-runtime-worker": {
                "RUNTIME_INTERNAL_API_KEY_FILE": (
                    "/app/secrets/agent-runtime/runtime-internal-api-key"
                ),
            },
        },
    },
    {
        "volume": "tenant_bootstrap_secrets",
        "init_target": "/secrets/tenant",
        "consumer_target": "/app/secrets/tenant",
        "consumers": {
            "core-tenant": {
                "TENANT_KEY_FILE": "/app/secrets/tenant/tenant-key",
                "TENANT_SECRET_FILE": "/app/secrets/tenant/tenant-secret",
            },
            "core-agent": {
                "APP_AUTH_API_KEY_FILE": "/app/secrets/tenant/tenant-key",
                "APP_AUTH_SECRET_FILE": "/app/secrets/tenant/tenant-secret",
            },
            "core-workflow": {
                "TENANT_KEY_FILE": "/app/secrets/tenant/tenant-key",
                "TENANT_SECRET_FILE": "/app/secrets/tenant/tenant-secret",
                "APP_MANAGE_PLAT_KEY_FILE": "/app/secrets/tenant/tenant-key",
                "APP_MANAGE_PLAT_SECRET_FILE": ("/app/secrets/tenant/tenant-secret"),
            },
            "console-hub": {},
        },
    },
)

FORBIDDEN_INLINE_CREDENTIALS = {
    "core-tenant": ("TENANT_KEY", "TENANT_SECRET"),
    "core-agent": (
        "APP_AUTH_API_KEY",
        "APP_AUTH_SECRET",
        "WORKFLOW_INTERNAL_API_KEY",
    ),
    "core-workflow": (
        "TENANT_KEY",
        "TENANT_SECRET",
        "APP_MANAGE_PLAT_KEY",
        "APP_MANAGE_PLAT_SECRET",
        "WORKFLOW_INTERNAL_API_KEY",
    ),
    "console-hub": (
        "TENANT_KEY",
        "TENANT_SECRET",
        "WORKFLOW_INTERNAL_API_KEY",
    ),
    "agent-runtime-api": (
        "RUNTIME_GATEWAY_IDENTITY_SECRET",
        "RUNTIME_INTERNAL_API_KEY",
        "RUNTIME_WORKFLOW_INTERNAL_API_KEY",
    ),
    "agent-runtime-worker": (
        "RUNTIME_GATEWAY_IDENTITY_SECRET",
        "RUNTIME_INTERNAL_API_KEY",
        "RUNTIME_WORKFLOW_INTERNAL_API_KEY",
    ),
}

CREDENTIALS = (
    {
        "volume": "artifact_upload_secrets",
        "target": "/app/secrets/artifact",
        "file_env": "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN_FILE",
        "file_path": "/app/secrets/artifact/artifact-upload-token",
    },
    {
        "volume": "sandbox_runtime_credential_secrets",
        "target": "/app/secrets/runtime",
        "file_env": "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN_FILE",
        "file_path": "/app/secrets/runtime/sandbox-runtime-credential-token",
    },
)

INTERNAL_URLS = {
    "SKILL_SANDBOX_ARTIFACT_UPLOAD_URL": (
        "http://console-hub:8080/workflow/artifacts/internal-upload"
    ),
    "SKILL_SANDBOX_RUNTIME_CONFIG_URL": (
        "http://console-hub:8080/skill-sandbox/internal-runtime-config"
    ),
}

HUB_HEALTHCHECK_TEST = [
    "CMD-SHELL",
    "curl --fail --silent --show-error http://localhost:8080/health >/dev/null",
]


class GateError(RuntimeError):
    """A safe-to-print gate error which never contains rendered values."""


def _compose_commands() -> Sequence[Sequence[str]]:
    commands: List[Sequence[str]] = []
    if shutil.which("docker"):
        commands.append(("docker", "compose"))
    if shutil.which("docker-compose"):
        commands.append(("docker-compose",))
    return commands


def _select_compose_command(compose_file: Path) -> Sequence[str]:
    for base_command in _compose_commands():
        completed = subprocess.run(
            list(base_command)
            + ["-f", compose_file.name, "config", "--format", "json"],
            cwd=str(compose_file.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            check=False,
        )
        if completed.returncode == 0:
            return base_command
    if not _compose_commands():
        raise GateError("Docker Compose is unavailable")
    # Compose stderr can contain interpolated deployment data. Do not echo it.
    raise GateError(
        "Docker Compose config failed; a Compose implementation supporting "
        "'config --format json' is required"
    )


def _render_compose(compose_file: Path) -> Mapping[str, Any]:
    base_command = _select_compose_command(compose_file)
    completed = subprocess.run(
        list(base_command) + ["-f", compose_file.name, "config", "--format", "json"],
        cwd=str(compose_file.parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        check=False,
    )

    try:
        rendered = json.loads(completed.stdout)
    except (json.JSONDecodeError, TypeError) as exc:
        raise GateError("Docker Compose config did not return valid JSON") from exc
    if not isinstance(rendered, dict):
        raise GateError("Docker Compose config returned an unexpected JSON root")
    return rendered


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, dict) else {}


def _mounts(service: Mapping[str, Any], target: str) -> List[Mapping[str, Any]]:
    volumes = service.get("volumes", [])
    if not isinstance(volumes, list):
        return []
    return [
        volume
        for volume in volumes
        if isinstance(volume, dict) and volume.get("target") == target
    ]


def _safe_token(value: Any, minimum: int, maximum: int) -> bool:
    return (
        isinstance(value, str)
        and minimum <= len(value) <= maximum
        and re.fullmatch(r"[A-Za-z0-9._~-]+", value) is not None
    )


def validate_contract(config: Mapping[str, Any]) -> List[str]:
    """Return field-only contract errors without including configured values."""

    errors: List[str] = []
    services = _mapping(config.get("services"))
    volumes = _mapping(config.get("volumes"))

    for service_name in SERVICES:
        if not isinstance(services.get(service_name), dict):
            errors.append(f"services.{service_name}: missing")
    for service_name in (INTERNAL_CREDENTIAL_INIT,) + INTERNAL_CREDENTIAL_CONSUMERS:
        if not isinstance(services.get(service_name), dict):
            errors.append(f"services.{service_name}: missing")

    for credential in CREDENTIALS:
        volume_name = credential["volume"]
        if not isinstance(volumes.get(volume_name), dict):
            errors.append(f"volumes.{volume_name}: missing named volume")
    for credential in GENERATED_CREDENTIALS:
        volume_name = credential["volume"]
        if not isinstance(volumes.get(volume_name), dict):
            errors.append(f"volumes.{volume_name}: missing named volume")

    resolved_volume_names: List[str] = []
    for credential in CREDENTIALS + GENERATED_CREDENTIALS:
        volume_name = credential["volume"]
        definition = volumes.get(volume_name)
        if isinstance(definition, dict):
            resolved_name = definition.get("name", volume_name)
            if isinstance(resolved_name, str) and resolved_name:
                resolved_volume_names.append(resolved_name)
    if len(resolved_volume_names) == len(CREDENTIALS + GENERATED_CREDENTIALS) and len(
        set(resolved_volume_names)
    ) != len(CREDENTIALS + GENERATED_CREDENTIALS):
        errors.append("volumes.*.name: credential volumes must be independent")

    init_service = _mapping(services.get(INTERNAL_CREDENTIAL_INIT))
    init_environment = _mapping(init_service.get("environment"))
    if init_service.get("network_mode") != "none":
        errors.append(
            f"services.{INTERNAL_CREDENTIAL_INIT}.network_mode: expected none"
        )
    if str(init_service.get("restart", "")).lower() != "no":
        errors.append(f"services.{INTERNAL_CREDENTIAL_INIT}.restart: expected no")

    configured_workflow_key = init_environment.get(
        "CONFIGURED_WORKFLOW_INTERNAL_API_KEY", ""
    )
    if configured_workflow_key and configured_workflow_key != WORKFLOW_PLACEHOLDER:
        if not _safe_token(configured_workflow_key, 32, 128):
            errors.append(
                f"services.{INTERNAL_CREDENTIAL_INIT}.environment."
                "CONFIGURED_WORKFLOW_INTERNAL_API_KEY: invalid"
            )

    configured_tenant_key = init_environment.get("CONFIGURED_TENANT_KEY", "")
    configured_tenant_secret = init_environment.get("CONFIGURED_TENANT_SECRET", "")
    is_exact_legacy_pair = (
        configured_tenant_key == LEGACY_TENANT_KEY
        and configured_tenant_secret == LEGACY_TENANT_SECRET
    )
    if (configured_tenant_key or configured_tenant_secret) and not is_exact_legacy_pair:
        if not (
            _safe_token(configured_tenant_key, 32, 50)
            and _safe_token(configured_tenant_secret, 32, 50)
            and configured_tenant_key != configured_tenant_secret
            and configured_tenant_key != LEGACY_TENANT_KEY
            and configured_tenant_secret != LEGACY_TENANT_SECRET
        ):
            errors.append(
                f"services.{INTERNAL_CREDENTIAL_INIT}.environment."
                "CONFIGURED_TENANT_KEY/CONFIGURED_TENANT_SECRET: invalid pair"
            )

    command = init_service.get("command")
    command_text = (
        "\n".join(command) if isinstance(command, list) else str(command or "")
    )
    for required_fragment in (
        "umask 077",
        "/dev/urandom",
        "workflow-internal-api-key",
        "runtime-internal-api-key",
        "tenant-bootstrap.properties",
        "api.url.apiKey=%s",
        "api.url.apiSecret=%s",
    ):
        if required_fragment not in command_text:
            errors.append(
                f"services.{INTERNAL_CREDENTIAL_INIT}.command: missing security primitive"
            )
            break

    for credential in GENERATED_CREDENTIALS:
        volume_name = credential["volume"]
        init_target = credential["init_target"]
        init_mounts = _mounts(init_service, init_target)
        init_mount_field = f"services.{INTERNAL_CREDENTIAL_INIT}.volumes[{init_target}]"
        if len(init_mounts) != 1:
            errors.append(f"{init_mount_field}: missing or duplicated")
        else:
            mount = init_mounts[0]
            if mount.get("type") != "volume" or mount.get("source") != volume_name:
                errors.append(
                    f"{init_mount_field}.source/type: unexpected named volume"
                )
            if mount.get("read_only", False) is True:
                errors.append(f"{init_mount_field}.mode: expected rw")

        consumer_target = credential["consumer_target"]
        credential_consumers = _mapping(credential["consumers"])
        for service_name, expected_environment_value in credential_consumers.items():
            service = _mapping(services.get(service_name))
            environment = _mapping(service.get("environment"))
            matching_mounts = _mounts(service, consumer_target)
            mount_field = f"services.{service_name}.volumes[{consumer_target}]"
            if len(matching_mounts) != 1:
                errors.append(f"{mount_field}: missing or duplicated")
            else:
                mount = matching_mounts[0]
                if mount.get("type") != "volume" or mount.get("source") != volume_name:
                    errors.append(f"{mount_field}.source/type: unexpected named volume")
                if mount.get("read_only", False) is not True:
                    errors.append(f"{mount_field}.mode: expected ro")

            expected_environment = _mapping(expected_environment_value)
            for env_name, expected_path in expected_environment.items():
                if environment.get(env_name) != expected_path:
                    errors.append(
                        f"services.{service_name}.environment.{env_name}: "
                        "missing or unexpected"
                    )

    for service_name in INTERNAL_CREDENTIAL_CONSUMERS:
        service = _mapping(services.get(service_name))
        environment = _mapping(service.get("environment"))
        for env_name in FORBIDDEN_INLINE_CREDENTIALS[service_name]:
            if env_name in environment:
                errors.append(
                    f"services.{service_name}.environment.{env_name}: "
                    "must use generated Secret file/property binding"
                )

        init_dependency = _mapping(
            _mapping(service.get("depends_on")).get(INTERNAL_CREDENTIAL_INIT)
        )
        if init_dependency.get("condition") != "service_completed_successfully":
            errors.append(
                f"services.{service_name}.depends_on.{INTERNAL_CREDENTIAL_INIT}: "
                "expected service_completed_successfully"
            )
        if init_dependency.get("required") is False:
            errors.append(
                f"services.{service_name}.depends_on.{INTERNAL_CREDENTIAL_INIT}."
                "required: must not be false"
            )

    for service_name in SERVICES:
        service = _mapping(services.get(service_name))
        environment = _mapping(service.get("environment"))

        for credential in CREDENTIALS:
            env_name = credential["file_env"]
            if environment.get(env_name) != credential["file_path"]:
                errors.append(
                    f"services.{service_name}.environment.{env_name}: "
                    "missing or unexpected"
                )

            target = credential["target"]
            matching_mounts = _mounts(service, target)
            mount_field = f"services.{service_name}.volumes[{target}]"
            if len(matching_mounts) != 1:
                errors.append(f"{mount_field}: missing or duplicated")
                continue

            mount = matching_mounts[0]
            if (
                mount.get("type") != "volume"
                or mount.get("source") != credential["volume"]
            ):
                errors.append(f"{mount_field}.source/type: unexpected named volume")

            expected_read_only = service_name in CONSUMERS
            actual_read_only = mount.get("read_only", False) is True
            if actual_read_only != expected_read_only:
                expected_mode = "ro" if expected_read_only else "rw"
                errors.append(f"{mount_field}.mode: expected {expected_mode}")

    for service_name in CONSUMERS:
        service = _mapping(services.get(service_name))
        environment = _mapping(service.get("environment"))
        for env_name, expected_url in INTERNAL_URLS.items():
            if environment.get(env_name) != expected_url:
                errors.append(
                    f"services.{service_name}.environment.{env_name}: "
                    "missing or unexpected"
                )

        hub_dependency = _mapping(
            _mapping(service.get("depends_on")).get("console-hub")
        )
        if hub_dependency.get("condition") != "service_healthy":
            errors.append(
                f"services.{service_name}.depends_on.console-hub: "
                "expected service_healthy"
            )
        if hub_dependency.get("required") is False:
            errors.append(
                f"services.{service_name}.depends_on.console-hub.required: "
                "must not be false"
            )

    hub = _mapping(services.get("console-hub"))
    healthcheck = hub.get("healthcheck")
    healthcheck_field = "services.console-hub.healthcheck"
    if not isinstance(healthcheck, dict):
        errors.append(f"{healthcheck_field}: missing")
    else:
        test = healthcheck.get("test")
        test_is_disabled = (
            isinstance(test, str) and test.strip().upper() == "NONE"
        ) or (
            isinstance(test, list)
            and bool(test)
            and str(test[0]).strip().upper() == "NONE"
        )
        if healthcheck.get("disable") is True or test_is_disabled:
            errors.append(f"{healthcheck_field}: disabled")
        elif test != HUB_HEALTHCHECK_TEST:
            errors.append(f"{healthcheck_field}.test: unexpected command or endpoint")

    return errors


def _set_mount_mode(
    config: MutableMapping[str, Any], service_name: str, target: str, read_only: bool
) -> None:
    service = config["services"][service_name]
    for mount in service["volumes"]:
        if isinstance(mount, dict) and mount.get("target") == target:
            mount["read_only"] = read_only
            return
    raise GateError("negative self-test fixture is incomplete")


def _negative_cases() -> (
    Sequence[Tuple[str, Callable[[MutableMapping[str, Any], str], None], str]]
):
    def wrong_token_path(config: MutableMapping[str, Any], marker: str) -> None:
        config["services"]["core-agent"]["environment"][
            "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN_FILE"
        ] = marker

    def missing_token_file(config: MutableMapping[str, Any], _marker: str) -> None:
        config["services"]["core-workflow"]["environment"].pop(
            "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN_FILE", None
        )

    def writable_consumer(config: MutableMapping[str, Any], _marker: str) -> None:
        _set_mount_mode(config, "core-workflow", "/app/secrets/artifact", False)

    def readonly_producer(config: MutableMapping[str, Any], _marker: str) -> None:
        _set_mount_mode(config, "console-hub", "/app/secrets/runtime", True)

    def wrong_internal_url(config: MutableMapping[str, Any], marker: str) -> None:
        config["services"]["core-agent"]["environment"][
            "SKILL_SANDBOX_RUNTIME_CONFIG_URL"
        ] = marker

    def merged_volumes(config: MutableMapping[str, Any], _marker: str) -> None:
        artifact_name = config["volumes"]["artifact_upload_secrets"].get(
            "name", "artifact_upload_secrets"
        )
        config["volumes"]["sandbox_runtime_credential_secrets"]["name"] = artifact_name

    def missing_credential_init(config: MutableMapping[str, Any], _marker: str) -> None:
        config["services"].pop(INTERNAL_CREDENTIAL_INIT, None)

    def networked_credential_init(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        config["services"][INTERNAL_CREDENTIAL_INIT]["network_mode"] = "default"

    def readonly_credential_init_volume(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        _set_mount_mode(config, INTERNAL_CREDENTIAL_INIT, "/secrets/workflow", True)

    def writable_generated_consumer(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        _set_mount_mode(config, "core-agent", "/app/secrets/tenant", False)

    def wrong_generated_file_path(
        config: MutableMapping[str, Any], marker: str
    ) -> None:
        config["services"]["core-workflow"]["environment"][
            "APP_MANAGE_PLAT_SECRET_FILE"
        ] = marker

    def inline_generated_credential(
        config: MutableMapping[str, Any], marker: str
    ) -> None:
        config["services"]["core-agent"]["environment"]["APP_AUTH_SECRET"] = marker

    def missing_credential_init_dependency(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        config["services"]["core-tenant"]["depends_on"].pop(
            INTERNAL_CREDENTIAL_INIT, None
        )

    def wrong_credential_init_dependency(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        config["services"]["console-hub"]["depends_on"][INTERNAL_CREDENTIAL_INIT][
            "condition"
        ] = "service_started"

    def merged_generated_volumes(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        workflow_name = config["volumes"]["workflow_internal_secrets"].get(
            "name", "workflow_internal_secrets"
        )
        config["volumes"]["tenant_bootstrap_secrets"]["name"] = workflow_name

    def missing_hub_app_api_binding(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        command = config["services"][INTERNAL_CREDENTIAL_INIT]["command"]
        command[-1] = command[-1].replace("api.url.apiKey=%s", "api.url.otherKey=%s")

    def disabled_healthcheck(config: MutableMapping[str, Any], _marker: str) -> None:
        config["services"]["console-hub"]["healthcheck"] = {"disable": True}

    def missing_hub_dependency(config: MutableMapping[str, Any], _marker: str) -> None:
        config["services"]["core-workflow"]["depends_on"].pop("console-hub", None)

    def optional_hub_dependency(config: MutableMapping[str, Any], _marker: str) -> None:
        config["services"]["core-agent"]["depends_on"]["console-hub"][
            "required"
        ] = False

    def wrong_hub_healthcheck_endpoint(
        config: MutableMapping[str, Any], _marker: str
    ) -> None:
        config["services"]["console-hub"]["healthcheck"]["test"] = [
            "CMD-SHELL",
            "curl --fail --silent --show-error http://localhost:8080/not-health >/dev/null",
        ]

    def noop_hub_healthcheck(config: MutableMapping[str, Any], _marker: str) -> None:
        config["services"]["console-hub"]["healthcheck"]["test"] = [
            "CMD",
            "true",
        ]

    return (
        (
            "wrong-token-file-path",
            wrong_token_path,
            "services.core-agent.environment.SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN_FILE",
        ),
        (
            "missing-token-file",
            missing_token_file,
            "services.core-workflow.environment.SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN_FILE",
        ),
        (
            "writable-consumer-volume",
            writable_consumer,
            "services.core-workflow.volumes[/app/secrets/artifact].mode",
        ),
        (
            "readonly-producer-volume",
            readonly_producer,
            "services.console-hub.volumes[/app/secrets/runtime].mode",
        ),
        (
            "wrong-internal-url",
            wrong_internal_url,
            "services.core-agent.environment.SKILL_SANDBOX_RUNTIME_CONFIG_URL",
        ),
        ("merged-named-volumes", merged_volumes, "volumes.*.name"),
        (
            "missing-credential-init",
            missing_credential_init,
            f"services.{INTERNAL_CREDENTIAL_INIT}",
        ),
        (
            "networked-credential-init",
            networked_credential_init,
            f"services.{INTERNAL_CREDENTIAL_INIT}.network_mode",
        ),
        (
            "readonly-credential-init-volume",
            readonly_credential_init_volume,
            f"services.{INTERNAL_CREDENTIAL_INIT}.volumes[/secrets/workflow].mode",
        ),
        (
            "writable-generated-consumer",
            writable_generated_consumer,
            "services.core-agent.volumes[/app/secrets/tenant].mode",
        ),
        (
            "wrong-generated-file-path",
            wrong_generated_file_path,
            "services.core-workflow.environment.APP_MANAGE_PLAT_SECRET_FILE",
        ),
        (
            "inline-generated-credential",
            inline_generated_credential,
            "services.core-agent.environment.APP_AUTH_SECRET",
        ),
        (
            "missing-credential-init-dependency",
            missing_credential_init_dependency,
            f"services.core-tenant.depends_on.{INTERNAL_CREDENTIAL_INIT}",
        ),
        (
            "wrong-credential-init-dependency",
            wrong_credential_init_dependency,
            f"services.console-hub.depends_on.{INTERNAL_CREDENTIAL_INIT}",
        ),
        (
            "merged-generated-volumes",
            merged_generated_volumes,
            "volumes.*.name",
        ),
        (
            "missing-hub-app-api-binding",
            missing_hub_app_api_binding,
            f"services.{INTERNAL_CREDENTIAL_INIT}.command",
        ),
        (
            "disabled-hub-healthcheck",
            disabled_healthcheck,
            "services.console-hub.healthcheck",
        ),
        (
            "missing-healthy-hub-dependency",
            missing_hub_dependency,
            "services.core-workflow.depends_on.console-hub",
        ),
        (
            "optional-healthy-hub-dependency",
            optional_hub_dependency,
            "services.core-agent.depends_on.console-hub.required",
        ),
        (
            "wrong-hub-healthcheck-endpoint",
            wrong_hub_healthcheck_endpoint,
            "services.console-hub.healthcheck.test",
        ),
        (
            "noop-hub-healthcheck",
            noop_hub_healthcheck,
            "services.console-hub.healthcheck.test",
        ),
    )


def run_negative_self_tests(config: Mapping[str, Any]) -> None:
    marker = "negative-self-test-sensitive-marker"
    for case_name, mutate, expected_field in _negative_cases():
        candidate = copy.deepcopy(config)
        if not isinstance(candidate, dict):
            raise GateError("negative self-test fixture is incomplete")

        # A marker models unrelated sensitive environment data. Validation
        # diagnostics must never serialize it, even when the candidate fails.
        candidate["services"]["console-hub"]["environment"][
            "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN"
        ] = marker
        mutate(candidate, marker)
        errors = validate_contract(candidate)
        if not any(error.startswith(expected_field) for error in errors):
            raise GateError(f"negative self-test did not fail: {case_name}")
        if marker in "\n".join(errors):
            raise GateError(f"negative self-test diagnostics were unsafe: {case_name}")


def exercise_shell_credential_lifecycle(config: Mapping[str, Any]) -> None:
    """Run the rendered initializer logic against an isolated temporary directory."""

    service = _mapping(_mapping(config.get("services")).get(INTERNAL_CREDENTIAL_INIT))
    command = service.get("command")
    if (
        not isinstance(command, list)
        or len(command) < 3
        or not isinstance(command[2], str)
    ):
        raise GateError("credential lifecycle shell command is incomplete")

    with tempfile.TemporaryDirectory(prefix="astron-credential-") as temporary:
        root = Path(temporary)
        workflow_directory = root / "workflow"
        runtime_directory = root / "agent-runtime"
        tenant_directory = root / "tenant"
        script = command[2].replace("$$", "$")
        script = script.replace("/secrets/workflow", str(workflow_directory))
        script = script.replace("/secrets/agent-runtime", str(runtime_directory))
        script = script.replace("/secrets/tenant", str(tenant_directory))

        def run_initializer(
            environment: Mapping[str, str], should_succeed: bool
        ) -> None:
            completed = subprocess.run(
                ["/bin/sh", "-ec", script],
                cwd=temporary,
                env={**os.environ, **environment},
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                check=False,
            )
            if (completed.returncode == 0) != should_succeed:
                expectation = "succeed" if should_succeed else "fail"
                raise GateError(
                    f"credential shell lifecycle initializer did not {expectation}"
                )

        def read_single_line(path: Path) -> str:
            if not path.is_file() or path.is_symlink():
                raise GateError("credential shell lifecycle file is missing")
            if path.stat().st_mode & 0o777 != 0o444:
                raise GateError("credential shell lifecycle file mode is not read-only")
            lines = path.read_text().splitlines()
            if len(lines) != 1:
                raise GateError("credential shell lifecycle token file is malformed")
            return lines[0]

        def read_properties(path: Path) -> Mapping[str, str]:
            if not path.is_file() or path.is_symlink():
                raise GateError("credential shell lifecycle properties are missing")
            if path.stat().st_mode & 0o777 != 0o444:
                raise GateError("credential shell lifecycle properties are writable")
            result = {}
            for line in path.read_text().splitlines():
                if "=" not in line:
                    raise GateError(
                        "credential shell lifecycle properties are malformed"
                    )
                key, value = line.split("=", 1)
                if not key or key in result:
                    raise GateError(
                        "credential shell lifecycle properties are duplicated"
                    )
                result[key] = value
            return result

        def snapshot() -> Tuple[str, str, str]:
            workflow_key = read_single_line(
                workflow_directory / "workflow-internal-api-key"
            )
            runtime_key = read_single_line(
                runtime_directory / "runtime-internal-api-key"
            )
            tenant_key = read_single_line(tenant_directory / "tenant-key")
            tenant_secret = read_single_line(tenant_directory / "tenant-secret")
            if not _safe_token(workflow_key, 32, 128):
                raise GateError("credential shell lifecycle workflow key is invalid")
            if not _safe_token(runtime_key, 32, 128):
                raise GateError("credential shell lifecycle runtime key is invalid")
            if not (
                _safe_token(tenant_key, 32, 50)
                and _safe_token(tenant_secret, 32, 50)
                and tenant_key != tenant_secret
                and tenant_key != LEGACY_TENANT_KEY
                and tenant_secret != LEGACY_TENANT_SECRET
            ):
                raise GateError("credential shell lifecycle tenant pair is invalid")
            if workflow_key == WORKFLOW_PLACEHOLDER:
                raise GateError(
                    "credential shell lifecycle reused workflow placeholder"
                )

            workflow_properties = read_properties(
                workflow_directory / "workflow-internal.properties"
            )
            tenant_properties = read_properties(
                tenant_directory / "tenant-bootstrap.properties"
            )
            if workflow_properties != {"workflow.internal-api-key": workflow_key}:
                raise GateError("credential shell lifecycle workflow binding mismatch")
            expected_tenant_properties = {
                "api.url.tenantId": "680ab54f",
                "api.url.tenantKey": tenant_key,
                "api.url.tenantSecret": tenant_secret,
                "api.url.apiKey": tenant_key,
                "api.url.apiSecret": tenant_secret,
                "common.appid": "680ab54f",
                "common.apiKey": tenant_key,
                "common.apiSecret": tenant_secret,
                "maas.appId": "680ab54f",
                "maas.apiKey": tenant_key,
                "maas.apiSecret": tenant_secret,
                "maas.consumerId": "680ab54f",
                "maas.consumerKey": tenant_key,
                "maas.consumerSecret": tenant_secret,
            }
            if tenant_properties != expected_tenant_properties:
                raise GateError("credential shell lifecycle tenant binding mismatch")
            return (
                hashlib.sha256(workflow_key.encode()).hexdigest(),
                hashlib.sha256(tenant_key.encode()).hexdigest(),
                hashlib.sha256(tenant_secret.encode()).hexdigest(),
            )

        empty_environment = {
            "CONFIGURED_WORKFLOW_INTERNAL_API_KEY": "",
            "CONFIGURED_RUNTIME_INTERNAL_API_KEY": "",
            "CONFIGURED_TENANT_KEY": "",
            "CONFIGURED_TENANT_SECRET": "",
        }
        run_initializer(empty_environment, True)
        initial_snapshot = snapshot()
        run_initializer(empty_environment, True)
        if snapshot() != initial_snapshot:
            raise GateError("credential shell lifecycle did not reuse generated values")

        legacy_files = (
            (workflow_directory / "workflow-internal-api-key", WORKFLOW_PLACEHOLDER),
            (tenant_directory / "tenant-key", LEGACY_TENANT_KEY),
            (tenant_directory / "tenant-secret", LEGACY_TENANT_SECRET),
        )
        for path, value in legacy_files:
            path.chmod(0o600)
            path.write_text(f"{value}\n")
        legacy_environment = {
            "CONFIGURED_WORKFLOW_INTERNAL_API_KEY": WORKFLOW_PLACEHOLDER,
            "CONFIGURED_RUNTIME_INTERNAL_API_KEY": "",
            "CONFIGURED_TENANT_KEY": LEGACY_TENANT_KEY,
            "CONFIGURED_TENANT_SECRET": LEGACY_TENANT_SECRET,
        }
        run_initializer(legacy_environment, True)
        snapshot()

        workflow_override = "W" * 64
        tenant_key_override = "K" * 48
        tenant_secret_override = "S" * 48
        override_environment = {
            "CONFIGURED_WORKFLOW_INTERNAL_API_KEY": workflow_override,
            "CONFIGURED_RUNTIME_INTERNAL_API_KEY": "",
            "CONFIGURED_TENANT_KEY": tenant_key_override,
            "CONFIGURED_TENANT_SECRET": tenant_secret_override,
        }
        override_snapshot = (
            hashlib.sha256(workflow_override.encode()).hexdigest(),
            hashlib.sha256(tenant_key_override.encode()).hexdigest(),
            hashlib.sha256(tenant_secret_override.encode()).hexdigest(),
        )
        run_initializer(override_environment, True)
        if snapshot() != override_snapshot:
            raise GateError("credential shell lifecycle did not persist overrides")
        run_initializer(empty_environment, True)
        if snapshot() != override_snapshot:
            raise GateError("credential shell lifecycle did not reuse overrides")

        invalid_environment = {
            "CONFIGURED_WORKFLOW_INTERNAL_API_KEY": "",
            "CONFIGURED_RUNTIME_INTERNAL_API_KEY": "",
            "CONFIGURED_TENANT_KEY": tenant_key_override,
            "CONFIGURED_TENANT_SECRET": "",
        }
        run_initializer(invalid_environment, False)
        if snapshot() != override_snapshot:
            raise GateError("incomplete tenant pair changed persisted credentials")

        mixed_legacy_environment = {
            "CONFIGURED_WORKFLOW_INTERNAL_API_KEY": "",
            "CONFIGURED_RUNTIME_INTERNAL_API_KEY": "",
            "CONFIGURED_TENANT_KEY": LEGACY_TENANT_KEY,
            "CONFIGURED_TENANT_SECRET": tenant_secret_override,
        }
        run_initializer(mixed_legacy_environment, False)
        if snapshot() != override_snapshot:
            raise GateError("mixed legacy tenant pair changed persisted credentials")


def _run_quiet(
    command: Sequence[str],
    cwd: Path,
    environment: Optional[Mapping[str, str]] = None,
) -> subprocess.CompletedProcess[str]:
    merged_environment = os.environ.copy()
    if environment:
        merged_environment.update(environment)
    return subprocess.run(
        list(command),
        cwd=str(cwd),
        env=merged_environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        check=False,
        timeout=180,
    )


def _credential_environment(
    workflow_key: str = "", tenant_key: str = "", tenant_secret: str = ""
) -> Mapping[str, str]:
    return {
        "WORKFLOW_INTERNAL_API_KEY": workflow_key,
        "TENANT_KEY": tenant_key,
        "TENANT_SECRET": tenant_secret,
    }


_SNAPSHOT_SCRIPT = r"""
safe_token() {
  value="$1"
  min_length="$2"
  max_length="$3"
  [ "${#value}" -ge "$min_length" ] || return 1
  [ "${#value}" -le "$max_length" ] || return 1
  case "$value" in *[!A-Za-z0-9._~-]*) return 1 ;; esac
}

workflow_file=/secrets/workflow/workflow-internal-api-key
workflow_properties=/secrets/workflow/workflow-internal.properties
tenant_key_file=/secrets/tenant/tenant-key
tenant_secret_file=/secrets/tenant/tenant-secret
tenant_properties=/secrets/tenant/tenant-bootstrap.properties

for file in \
  "$workflow_file" "$workflow_properties" "$tenant_key_file" \
  "$tenant_secret_file" "$tenant_properties"
do
  [ -f "$file" ] && [ ! -L "$file" ] || exit 20
  [ "$(stat -c '%a' "$file")" = 444 ] || exit 21
done

workflow_key="$(sed -n '1p' "$workflow_file")"
tenant_key="$(sed -n '1p' "$tenant_key_file")"
tenant_secret="$(sed -n '1p' "$tenant_secret_file")"
safe_token "$workflow_key" 32 128 || exit 22
safe_token "$tenant_key" 32 50 || exit 23
safe_token "$tenant_secret" 32 50 || exit 24
[ "$tenant_key" != "$tenant_secret" ] || exit 25
[ "$workflow_key" != 'CHANGE_ME_WORKFLOW_INTERNAL_API_KEY' ] || exit 26
[ "$tenant_key" != '7b709739e8da44536127a333c7603a83' ] || exit 27
[ "$tenant_secret" != 'NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy' ] || exit 28

grep -Fqx "workflow.internal-api-key=$workflow_key" "$workflow_properties" || exit 29
grep -Fqx 'api.url.tenantId=680ab54f' "$tenant_properties" || exit 30
grep -Fqx "api.url.tenantKey=$tenant_key" "$tenant_properties" || exit 31
grep -Fqx "api.url.tenantSecret=$tenant_secret" "$tenant_properties" || exit 32
grep -Fqx "api.url.apiKey=$tenant_key" "$tenant_properties" || exit 33
grep -Fqx "api.url.apiSecret=$tenant_secret" "$tenant_properties" || exit 34
grep -Fqx 'common.appid=680ab54f' "$tenant_properties" || exit 35
grep -Fqx "common.apiKey=$tenant_key" "$tenant_properties" || exit 36
grep -Fqx "common.apiSecret=$tenant_secret" "$tenant_properties" || exit 37
grep -Fqx 'maas.appId=680ab54f' "$tenant_properties" || exit 38
grep -Fqx "maas.apiKey=$tenant_key" "$tenant_properties" || exit 39
grep -Fqx "maas.apiSecret=$tenant_secret" "$tenant_properties" || exit 40
grep -Fqx 'maas.consumerId=680ab54f' "$tenant_properties" || exit 41
grep -Fqx "maas.consumerKey=$tenant_key" "$tenant_properties" || exit 42
grep -Fqx "maas.consumerSecret=$tenant_secret" "$tenant_properties" || exit 43

token_hash() {
  printf '%s' "$1" | sha256sum | cut -d ' ' -f 1
}
token_hash "$workflow_key"
token_hash "$tenant_key"
token_hash "$tenant_secret"
"""


def exercise_credential_lifecycle(compose_file: Path) -> None:
    """Exercise generated credential volumes without starting the full stack."""

    compose_command = list(_select_compose_command(compose_file))
    project_name = f"astroncredentialtest{uuid.uuid4().hex[:12]}"
    prefix = compose_command + [
        "--project-name",
        project_name,
        "-f",
        compose_file.name,
    ]
    cwd = compose_file.parent

    def run_initializer(environment: Mapping[str, str], should_succeed: bool) -> None:
        completed = _run_quiet(
            prefix + ["run", "--rm", "--no-deps", INTERNAL_CREDENTIAL_INIT],
            cwd,
            environment,
        )
        if (completed.returncode == 0) != should_succeed:
            expectation = "succeed" if should_succeed else "fail"
            raise GateError(
                f"credential lifecycle initializer did not {expectation} as expected"
            )

    def run_volume_script(script: str) -> subprocess.CompletedProcess[str]:
        return _run_quiet(
            prefix
            + [
                "run",
                "--rm",
                "--no-deps",
                "--entrypoint",
                "/bin/sh",
                INTERNAL_CREDENTIAL_INIT,
                "-ec",
                script,
            ],
            cwd,
            _credential_environment(),
        )

    def snapshot() -> Tuple[str, str, str]:
        completed = run_volume_script(_SNAPSHOT_SCRIPT)
        if completed.returncode != 0:
            raise GateError("credential lifecycle volume validation failed")
        hashes = [
            line.strip()
            for line in completed.stdout.splitlines()
            if re.fullmatch(r"[0-9a-f]{64}", line.strip())
        ]
        if len(hashes) != 3:
            raise GateError("credential lifecycle snapshot was incomplete")
        return hashes[0], hashes[1], hashes[2]

    empty_environment = _credential_environment()
    try:
        run_initializer(empty_environment, True)
        first_snapshot = snapshot()
        run_initializer(empty_environment, True)
        if snapshot() != first_snapshot:
            raise GateError("generated credentials were not reused on restart")

        seed_legacy = f"""
umask 077
mkdir -p /secrets/workflow /secrets/tenant
printf '%s\\n' '{WORKFLOW_PLACEHOLDER}' > /secrets/workflow/workflow-internal-api-key
printf '%s\\n' '{LEGACY_TENANT_KEY}' > /secrets/tenant/tenant-key
printf '%s\\n' '{LEGACY_TENANT_SECRET}' > /secrets/tenant/tenant-secret
"""
        seeded = run_volume_script(seed_legacy)
        if seeded.returncode != 0:
            raise GateError("credential lifecycle legacy fixture setup failed")
        run_initializer(
            _credential_environment(
                WORKFLOW_PLACEHOLDER, LEGACY_TENANT_KEY, LEGACY_TENANT_SECRET
            ),
            True,
        )
        rotated_snapshot = snapshot()
        legacy_hashes = (
            hashlib.sha256(WORKFLOW_PLACEHOLDER.encode()).hexdigest(),
            hashlib.sha256(LEGACY_TENANT_KEY.encode()).hexdigest(),
            hashlib.sha256(LEGACY_TENANT_SECRET.encode()).hexdigest(),
        )
        if rotated_snapshot == legacy_hashes:
            raise GateError("published legacy credentials were not rotated")

        workflow_override = "W" * 64
        tenant_key_override = "K" * 48
        tenant_secret_override = "S" * 48
        override_environment = _credential_environment(
            workflow_override, tenant_key_override, tenant_secret_override
        )
        expected_override_hashes = (
            hashlib.sha256(workflow_override.encode()).hexdigest(),
            hashlib.sha256(tenant_key_override.encode()).hexdigest(),
            hashlib.sha256(tenant_secret_override.encode()).hexdigest(),
        )
        run_initializer(override_environment, True)
        if snapshot() != expected_override_hashes:
            raise GateError("explicit credential overrides were not persisted")
        run_initializer(empty_environment, True)
        if snapshot() != expected_override_hashes:
            raise GateError("persisted credential overrides were not reused")

        run_initializer(_credential_environment("", tenant_key_override, ""), False)
        if snapshot() != expected_override_hashes:
            raise GateError("an incomplete tenant override changed persisted data")

        run_initializer(
            _credential_environment("", LEGACY_TENANT_KEY, tenant_secret_override),
            False,
        )
        if snapshot() != expected_override_hashes:
            raise GateError("a mixed legacy tenant override changed persisted data")
    finally:
        _run_quiet(
            prefix + ["down", "--volumes", "--remove-orphans"],
            cwd,
            empty_environment,
        )


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    default_compose_file = (
        Path(__file__).resolve().parent.parent / "docker-compose-with-auth.yaml"
    )
    parser = argparse.ArgumentParser(
        description="Verify sandbox credential and health contracts in rendered Compose JSON."
    )
    parser.add_argument(
        "--compose-file",
        type=Path,
        default=default_compose_file,
        help="Compose entrypoint (default: docker-compose-with-auth.yaml next to scripts/)",
    )
    parser.add_argument(
        "--exercise-credential-lifecycle",
        action="store_true",
        help=(
            "Use a temporary Compose project to verify generation, reuse, "
            "legacy rotation, explicit overrides, and invalid-pair rejection"
        ),
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    compose_file = args.compose_file.expanduser().resolve()
    if not compose_file.is_file():
        print("security contract gate: FAIL: compose file is missing", file=sys.stderr)
        return 1

    try:
        config = _render_compose(compose_file)
        errors = validate_contract(config)
        if errors:
            for error in errors:
                print(f"security contract gate: FAIL: {error}", file=sys.stderr)
            return 1
        run_negative_self_tests(config)
        exercise_shell_credential_lifecycle(config)
        if args.exercise_credential_lifecycle:
            exercise_credential_lifecycle(compose_file)
    except GateError as exc:
        print(f"security contract gate: FAIL: {exc}", file=sys.stderr)
        return 1
    except Exception:
        # Never serialize an unexpected object which could include rendered env.
        print(
            "security contract gate: FAIL: internal validation error", file=sys.stderr
        )
        return 1

    print(
        "security contract gate: PASS "
        f"({len(set(SERVICES + INTERNAL_CREDENTIAL_CONSUMERS))} services, "
        f"{len(CREDENTIALS + GENERATED_CREDENTIALS)} independent credential volumes, "
        f"{len(_negative_cases())} negative cases, shell lifecycle exercised"
        + (
            ", credential lifecycle exercised"
            if args.exercise_credential_lifecycle
            else ""
        )
        + ")"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
