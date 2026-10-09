#!/usr/bin/env python3
"""Render-only positive and negative tests for tenant bootstrap credentials."""

import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Mapping, Sequence, Tuple

CHART = Path(__file__).resolve().parent.parent
LEGACY_KEY = "7b709739e8da44536127a333c7603a83"
LEGACY_SECRET = "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy"
MANAGED_SECRET = "astron-agent-tenant-bootstrap"
MANAGED_KEY = "tenant-key"
MANAGED_SECRET_KEY = "tenant-secret"
WORKFLOW_MANAGED_SECRET = "astron-agent-workflow-internal-auth"
WORKFLOW_MANAGED_KEY = "workflow-internal-api-key"
WORKFLOW_PLACEHOLDER = "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY"
RUNTIME_MANAGED_SECRET = "astron-agent-runtime-internal-auth"
RUNTIME_MANAGED_KEY = "runtime-internal-api-key"
WORKFLOW_CONSUMERS = (
    "astron-agent-core-agent",
    "astron-agent-core-workflow",
    "astron-agent-console-hub",
)

TENANT_ENV = {
    "TENANT_KEY": MANAGED_KEY,
    "TENANT_SECRET": MANAGED_SECRET_KEY,
}
EXPECTED_TENANT_ENV: Mapping[str, Mapping[str, str]] = {
    "astron-agent-core-tenant": TENANT_ENV,
    "astron-agent-core-agent": {
        **TENANT_ENV,
        "APP_AUTH_API_KEY": MANAGED_KEY,
        "APP_AUTH_SECRET": MANAGED_SECRET_KEY,
    },
    "astron-agent-core-workflow": {
        **TENANT_ENV,
        "APP_MANAGE_PLAT_KEY": MANAGED_KEY,
        "APP_MANAGE_PLAT_SECRET": MANAGED_SECRET_KEY,
    },
    "astron-agent-console-hub": {
        **TENANT_ENV,
        "APP_APIKEY": MANAGED_KEY,
        "APP_API_SECRET": MANAGED_SECRET_KEY,
        "COMMON_APIKEY": MANAGED_KEY,
        "COMMON_API_SECRET": MANAGED_SECRET_KEY,
        "MAAS_API_KEY": MANAGED_KEY,
        "MAAS_API_SECRET": MANAGED_SECRET_KEY,
        "MAAS_CONSUMER_KEY": MANAGED_KEY,
        "MAAS_CONSUMER_SECRET": MANAGED_SECRET_KEY,
    },
}

EXPECTED_ID_ENV: Mapping[str, Sequence[str]] = {
    "astron-agent-core-tenant": ("TENANT_ID",),
    "astron-agent-core-agent": ("TENANT_ID",),
    "astron-agent-core-workflow": ("TENANT_ID",),
    "astron-agent-console-hub": (
        "TENANT_ID",
        "COMMON_APPID",
        "MAAS_APP_ID",
        "MAAS_CONSUMER_ID",
    ),
}


class VerificationError(RuntimeError):
    """Safe-to-print error which does not contain rendered Secret values."""


def _run_helm(arguments: Sequence[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["helm", *arguments],
        cwd=str(CHART.parent.parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        check=False,
    )


def _render(extra_arguments: Sequence[str] = ()) -> str:
    completed = _run_helm(
        [
            "template",
            "astron-agent",
            str(CHART),
            "--namespace",
            "astron-agent",
            *extra_arguments,
        ]
    )
    if completed.returncode != 0:
        raise VerificationError("positive Helm render failed")
    return completed.stdout


def _documents(rendered: str) -> List[str]:
    return [
        document
        for document in re.split(r"^---\s*$", rendered, flags=re.M)
        if document.strip()
    ]


def _kind(document: str) -> str:
    match = re.search(r"^kind:\s*(\S+)\s*$", document, flags=re.M)
    return match.group(1) if match else ""


def _name(document: str) -> str:
    match = re.search(r"^metadata:\s*\n\s{2}name:\s*([^\s]+)\s*$", document, flags=re.M)
    return match.group(1) if match else ""


def _find_document(rendered: str, kind: str, name: str) -> str:
    for document in _documents(rendered):
        if _kind(document) == kind and _name(document) == name:
            return document
    raise VerificationError(f"missing rendered {kind}: {name}")


def _main_container_environment(
    document: str,
) -> Tuple[List[str], Dict[str, Dict[str, str]]]:
    lines = document.splitlines()
    try:
        containers_index = lines.index("      containers:")
        environment_index = lines.index("        env:", containers_index)
    except ValueError as exc:
        raise VerificationError(
            "deployment main-container environment is missing"
        ) from exc

    names: List[str] = []
    entries: Dict[str, Dict[str, str]] = {}
    environment_indent = len(lines[environment_index]) - len(
        lines[environment_index].lstrip()
    )
    index = environment_index + 1
    while index < len(lines):
        line = lines[index]
        item = re.fullmatch(r"\s+- name: ([A-Z0-9_]+)", line)
        if not item:
            indent = len(line) - len(line.lstrip())
            if line.strip() and indent <= environment_indent:
                break
            index += 1
            continue
        item_indent = len(line) - len(line.lstrip())
        env_name = item.group(1)
        names.append(env_name)
        block: List[str] = []
        index += 1
        while index < len(lines):
            next_line = lines[index]
            next_indent = len(next_line) - len(next_line.lstrip())
            if re.fullmatch(rf"\s{{{item_indent}}}- name: [A-Z0-9_]+", next_line):
                break
            if next_line.strip() and next_indent <= environment_indent:
                break
            block.append(next_line)
            index += 1
        value_match = next(
            (
                re.fullmatch(r"\s+value:\s*[\"']?([^\"']*)[\"']?", item_line)
                for item_line in block
                if item_line.lstrip().startswith("value:")
            ),
            None,
        )
        secret_name_match = next(
            (
                re.fullmatch(r"\s+name:\s*[\"']?([^\"']*)[\"']?", item_line)
                for item_line in block
                if item_line.lstrip().startswith("name:")
            ),
            None,
        )
        secret_key_match = next(
            (
                re.fullmatch(r"\s+key:\s*[\"']?([^\"']*)[\"']?", item_line)
                for item_line in block
                if item_line.lstrip().startswith("key:")
            ),
            None,
        )
        entries[env_name] = {
            "value": value_match.group(1) if value_match else "",
            "secret_name": secret_name_match.group(1) if secret_name_match else "",
            "secret_key": secret_key_match.group(1) if secret_key_match else "",
        }
    return names, entries


def _secret_string_data(document: str) -> Mapping[str, str]:
    lines = document.splitlines()
    try:
        start = lines.index("stringData:") + 1
    except ValueError as exc:
        raise VerificationError("tenant bootstrap Secret has no stringData") from exc
    values: Dict[str, str] = {}
    for line in lines[start:]:
        match = re.fullmatch(r"  ([A-Za-z0-9._-]+):\s*[\"']([^\"']*)[\"']", line)
        if not match:
            if line and not line.startswith("  "):
                break
            continue
        values[match.group(1)] = match.group(2)
    return values


def _verify_consumers(
    rendered: str,
    expected_secret_name: str,
    expected_key_name: str,
    expected_secret_key_name: str,
) -> None:
    for deployment_name, credential_environment in EXPECTED_TENANT_ENV.items():
        deployment = _find_document(rendered, "Deployment", deployment_name)
        names, environment = _main_container_environment(deployment)
        if len(names) != len(set(names)):
            raise VerificationError(
                f"duplicate environment variable: {deployment_name}"
            )
        if (
            f'internal-secret-name/tenant-bootstrap: "{expected_secret_name}"'
            not in deployment
        ):
            raise VerificationError(
                f"tenant rollout annotation mismatch: {deployment_name}"
            )
        for env_name in EXPECTED_ID_ENV[deployment_name]:
            if environment.get(env_name, {}).get("value") != "680ab54f":
                raise VerificationError(
                    f"tenant ID binding mismatch: {deployment_name}.{env_name}"
                )
        for env_name, secret_key in credential_environment.items():
            entry = environment.get(env_name, {})
            expected = (
                expected_key_name
                if secret_key == MANAGED_KEY
                else expected_secret_key_name
            )
            if (
                entry.get("secret_name") != expected_secret_name
                or entry.get("secret_key") != expected
            ):
                raise VerificationError(
                    f"tenant Secret binding mismatch: {deployment_name}.{env_name}"
                )


def _verify_workflow_ingress_gateway_headers(rendered: str) -> None:
    ingress = _find_document(rendered, "Ingress", "astron-agent-workflow-api")
    expected = (
        "nginx.ingress.kubernetes.io/auth-response-headers: "
        '"X-Consumer-Username,X-Workflow-Gateway-Timestamp,'
        'X-Workflow-Gateway-Signature"'
    )
    if expected not in ingress:
        raise VerificationError(
            "workflow Ingress signed identity headers are incomplete"
        )
    if "X-Workflow-Internal-Key" in ingress:
        raise VerificationError("workflow Ingress exposes the raw internal key")


def _verify_workflow_internal_auth_bindings(
    rendered: str, secret_name: str, secret_key: str
) -> None:
    for deployment_name in WORKFLOW_CONSUMERS:
        deployment = _find_document(rendered, "Deployment", deployment_name)
        names, environment = _main_container_environment(deployment)
        if len(names) != len(set(names)):
            raise VerificationError(
                f"duplicate environment variable: {deployment_name}"
            )
        entry = environment.get("WORKFLOW_INTERNAL_API_KEY", {})
        if (
            entry.get("secret_name") != secret_name
            or entry.get("secret_key") != secret_key
        ):
            raise VerificationError(
                f"workflow internal Secret binding mismatch: {deployment_name}"
            )
        if (
            f'internal-secret-name/workflow-internal-auth: "{secret_name}"'
            not in deployment
        ):
            raise VerificationError(
                f"workflow internal rollout name mismatch: {deployment_name}"
            )
        if not re.search(
            r'checksum/workflow-internal-auth-secret: "[0-9a-f]{64}"',
            deployment,
        ):
            raise VerificationError(
                f"workflow internal rollout checksum is missing: {deployment_name}"
            )


def _verify_managed_workflow_internal_auth(rendered: str) -> None:
    secret = _find_document(rendered, "Secret", WORKFLOW_MANAGED_SECRET)
    value = _secret_string_data(secret).get(WORKFLOW_MANAGED_KEY, "")
    if not re.fullmatch(r"[A-Za-z0-9]{64}", value):
        raise VerificationError("managed workflow internal key is not strong")
    if value == WORKFLOW_PLACEHOLDER:
        raise VerificationError("managed workflow internal key uses the placeholder")
    _verify_workflow_internal_auth_bindings(
        rendered, WORKFLOW_MANAGED_SECRET, WORKFLOW_MANAGED_KEY
    )


def _verify_runtime_internal_auth_bindings(
    rendered: str,
    runtime_secret_name: str,
    runtime_secret_key: str,
    workflow_secret_name: str = WORKFLOW_MANAGED_SECRET,
    workflow_secret_key: str = WORKFLOW_MANAGED_KEY,
) -> None:
    expected = {
        "astron-agent-console-hub": {
            "AGENT_RUNTIME_INTERNAL_API_KEY": (
                runtime_secret_name,
                runtime_secret_key,
            ),
        },
        "astron-agent-core-runtime": {
            "RUNTIME_INTERNAL_API_KEY": (runtime_secret_name, runtime_secret_key),
            "RUNTIME_GATEWAY_IDENTITY_SECRET": (
                workflow_secret_name,
                workflow_secret_key,
            ),
        },
        "astron-agent-core-runtime-worker": {
            "RUNTIME_INTERNAL_API_KEY": (runtime_secret_name, runtime_secret_key),
            "RUNTIME_WORKFLOW_INTERNAL_API_KEY": (
                workflow_secret_name,
                workflow_secret_key,
            ),
        },
    }
    for deployment_name, bindings in expected.items():
        deployment = _find_document(rendered, "Deployment", deployment_name)
        names, environment = _main_container_environment(deployment)
        if len(names) != len(set(names)):
            raise VerificationError(
                f"duplicate environment variable: {deployment_name}"
            )
        for env_name, (secret_name, secret_key) in bindings.items():
            entry = environment.get(env_name, {})
            if (
                entry.get("secret_name") != secret_name
                or entry.get("secret_key") != secret_key
            ):
                raise VerificationError(
                    f"runtime Secret binding mismatch: {deployment_name}.{env_name}"
                )

    dispatcher = _find_document(
        rendered, "Deployment", "astron-agent-core-runtime-dispatcher"
    )
    _names, dispatcher_environment = _main_container_environment(dispatcher)
    forbidden = {
        "RUNTIME_INTERNAL_API_KEY",
        "RUNTIME_GATEWAY_IDENTITY_SECRET",
        "RUNTIME_WORKFLOW_INTERNAL_API_KEY",
    }
    if forbidden.intersection(dispatcher_environment):
        raise VerificationError("runtime dispatcher received execution credentials")


def _verify_managed_runtime_internal_auth(rendered: str) -> None:
    runtime_secret = _find_document(rendered, "Secret", RUNTIME_MANAGED_SECRET)
    runtime_value = _secret_string_data(runtime_secret).get(RUNTIME_MANAGED_KEY, "")
    if not re.fullmatch(r"[A-Za-z0-9]{64}", runtime_value):
        raise VerificationError("managed runtime internal key is not strong")
    workflow_secret = _find_document(rendered, "Secret", WORKFLOW_MANAGED_SECRET)
    workflow_value = _secret_string_data(workflow_secret).get(WORKFLOW_MANAGED_KEY, "")
    if runtime_value == workflow_value:
        raise VerificationError(
            "runtime and workflow internal keys are not independent"
        )
    _verify_runtime_internal_auth_bindings(
        rendered, RUNTIME_MANAGED_SECRET, RUNTIME_MANAGED_KEY
    )


def _verify_default_render() -> None:
    rendered = _render()
    if LEGACY_KEY in rendered or LEGACY_SECRET in rendered:
        raise VerificationError(
            "published tenant credential is present in rendered manifests"
        )
    if "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY" in rendered:
        raise VerificationError(
            "workflow internal placeholder is present in rendered manifests"
        )

    secret = _find_document(rendered, "Secret", MANAGED_SECRET)
    values = _secret_string_data(secret)
    tenant_key = values.get(MANAGED_KEY, "")
    tenant_secret = values.get(MANAGED_SECRET_KEY, "")
    if not re.fullmatch(r"[A-Za-z0-9]{48}", tenant_key):
        raise VerificationError("managed tenant key is not a strong generated value")
    if not re.fullmatch(r"[A-Za-z0-9]{48}", tenant_secret):
        raise VerificationError("managed tenant secret is not a strong generated value")
    if tenant_key == tenant_secret:
        raise VerificationError("managed tenant credentials are not independent")
    _verify_consumers(rendered, MANAGED_SECRET, MANAGED_KEY, MANAGED_SECRET_KEY)
    _verify_managed_workflow_internal_auth(rendered)
    _verify_managed_runtime_internal_auth(rendered)
    _verify_workflow_ingress_gateway_headers(rendered)


def _verify_explicit_render() -> None:
    explicit_key = "K" * 48
    explicit_secret = "S" * 48
    rendered = _render(
        (
            "--set-string",
            f"tenantBootstrap.key={explicit_key}",
            "--set-string",
            f"tenantBootstrap.secret={explicit_secret}",
        )
    )
    values = _secret_string_data(_find_document(rendered, "Secret", MANAGED_SECRET))
    if (
        values.get(MANAGED_KEY) != explicit_key
        or values.get(MANAGED_SECRET_KEY) != explicit_secret
    ):
        raise VerificationError("explicit tenant credentials were not rendered exactly")
    _verify_consumers(rendered, MANAGED_SECRET, MANAGED_KEY, MANAGED_SECRET_KEY)


def _verify_external_secret_render() -> None:
    external_name = "external-tenant-bootstrap"
    external_key = "external-key"
    external_secret_key = "external-secret"
    rendered = _render(
        (
            "--set-string",
            f"tenantBootstrap.existingSecret.name={external_name}",
            "--set-string",
            f"tenantBootstrap.existingSecret.keyKey={external_key}",
            "--set-string",
            f"tenantBootstrap.existingSecret.secretKey={external_secret_key}",
        )
    )
    try:
        _find_document(rendered, "Secret", MANAGED_SECRET)
    except VerificationError:
        pass
    else:
        raise VerificationError("managed tenant Secret was emitted in external mode")
    _verify_consumers(rendered, external_name, external_key, external_secret_key)


def _verify_workflow_external_secret_render() -> None:
    external_name = "external-workflow-internal-auth"
    external_key = "external-workflow-key"
    rendered = _render(
        (
            "--set-string",
            f"workflowInternalAuth.existingSecret.name={external_name}",
            "--set-string",
            f"workflowInternalAuth.existingSecret.key={external_key}",
            "--set-string",
            "workflowInternalAuth.existingSecret.checksum=rotation-v2",
        )
    )
    try:
        _find_document(rendered, "Secret", WORKFLOW_MANAGED_SECRET)
    except VerificationError:
        pass
    else:
        raise VerificationError(
            "managed workflow Secret was emitted while using an external Secret"
        )
    _verify_workflow_internal_auth_bindings(rendered, external_name, external_key)


def _verify_runtime_external_secret_render() -> None:
    external_name = "external-runtime-internal-auth"
    external_key = "external-runtime-key"
    rendered = _render(
        (
            "--set-string",
            f"runtimeInternalAuth.existingSecret.name={external_name}",
            "--set-string",
            f"runtimeInternalAuth.existingSecret.key={external_key}",
            "--set-string",
            "runtimeInternalAuth.existingSecret.checksum=rotation-v2",
        )
    )
    try:
        _find_document(rendered, "Secret", RUNTIME_MANAGED_SECRET)
    except VerificationError:
        pass
    else:
        raise VerificationError(
            "managed runtime Secret was emitted while using an external Secret"
        )
    _verify_runtime_internal_auth_bindings(rendered, external_name, external_key)


def _verify_workflow_managed_upgrade_render() -> None:
    rendered = _render(("--is-upgrade",))
    _verify_managed_workflow_internal_auth(rendered)


def _verify_legacy_compatibility_overrides_are_ignored() -> None:
    override_paths = (
        "coreTenant.env.tenantKey",
        "coreTenant.env.tenantSecret",
        "coreAgent.env.tenantKey",
        "coreAgent.env.tenantSecret",
        "coreAgent.env.appAuthApiKey",
        "coreAgent.env.appAuthSecret",
        "coreWorkflow.env.tenantKey",
        "coreWorkflow.env.tenantSecret",
        "coreWorkflow.env.appManagePlatKey",
        "coreWorkflow.env.appManagePlatSecret",
        "consoleHub.env.tenantKey",
        "consoleHub.env.tenantSecret",
        "consoleHub.env.appApikey",
        "consoleHub.env.appApiSecret",
    )
    arguments: List[str] = []
    for index, path in enumerate(override_paths):
        arguments.extend(
            (
                "--set-string",
                f"{path}={LEGACY_KEY if index % 2 == 0 else LEGACY_SECRET}",
            )
        )
    rendered = _render(arguments)
    if LEGACY_KEY in rendered or LEGACY_SECRET in rendered:
        raise VerificationError(
            "legacy compatibility values bypassed tenant Secret binding"
        )
    _verify_consumers(rendered, MANAGED_SECRET, MANAGED_KEY, MANAGED_SECRET_KEY)


def _verify_legacy_custom_pair_is_preserved() -> None:
    """Keep strong credentials configured through pre-tenantBootstrap values."""
    custom_key = "U" * 48
    custom_secret = "V" * 48
    rendered = _render(
        (
            "--set-string",
            f"consoleHub.env.tenantKey={custom_key}",
            "--set-string",
            f"consoleHub.env.tenantSecret={custom_secret}",
        )
    )
    values = _secret_string_data(_find_document(rendered, "Secret", MANAGED_SECRET))
    if (
        values.get(MANAGED_KEY) != custom_key
        or values.get(MANAGED_SECRET_KEY) != custom_secret
    ):
        raise VerificationError("legacy custom tenant pair was not preserved")
    _verify_consumers(rendered, MANAGED_SECRET, MANAGED_KEY, MANAGED_SECRET_KEY)


def _verify_negative_renders() -> int:
    strong_key = "K" * 48
    strong_secret = "S" * 48
    cases: Sequence[Sequence[str]] = (
        ("--set-string", f"tenantBootstrap.key={strong_key}"),
        ("--set-string", f"tenantBootstrap.secret={strong_secret}"),
        (
            "--set-string",
            "tenantBootstrap.key=short",
            "--set-string",
            f"tenantBootstrap.secret={strong_secret}",
        ),
        (
            "--set-string",
            f"tenantBootstrap.key={'K' * 31}/",
            "--set-string",
            f"tenantBootstrap.secret={strong_secret}",
        ),
        (
            "--set-string",
            f"tenantBootstrap.key={strong_key}",
            "--set-string",
            f"tenantBootstrap.secret={strong_key}",
        ),
        (
            "--set-string",
            f"tenantBootstrap.key={LEGACY_KEY}",
            "--set-string",
            f"tenantBootstrap.secret={LEGACY_SECRET}",
        ),
        (
            "--set-string",
            f"tenantBootstrap.key={LEGACY_KEY}",
            "--set-string",
            f"tenantBootstrap.secret={strong_secret}",
        ),
        (
            "--set-string",
            f"consoleHub.env.tenantKey={strong_key}",
        ),
        ("--set-string", "tenantBootstrap.tenantId=changed"),
        (
            "--set-string",
            "tenantBootstrap.existingSecret.name=external",
            "--set-string",
            "tenantBootstrap.existingSecret.keyKey=same",
            "--set-string",
            "tenantBootstrap.existingSecret.secretKey=same",
        ),
        (
            "--set-string",
            "tenantBootstrap.existingSecret.name=external",
            "--set-string",
            "tenantBootstrap.existingSecret.keyKey=bad/key",
        ),
        (
            "--set-string",
            "workflowInternalAuth.existingSecret.name=external",
            "--set-string",
            "workflowInternalAuth.existingSecret.key=",
        ),
        (
            "--set-string",
            "workflowInternalAuth.existingSecret.name=external",
            "--set-string",
            "workflowInternalAuth.existingSecret.key=bad/key",
        ),
        (
            "--set-string",
            "runtimeInternalAuth.existingSecret.name=external",
            "--set-string",
            "runtimeInternalAuth.existingSecret.key=",
        ),
        (
            "--set-string",
            "runtimeInternalAuth.existingSecret.name=external",
            "--set-string",
            "runtimeInternalAuth.existingSecret.key=bad/key",
        ),
        (
            "--set-string",
            "workflowInternalAuth.existingSecret.name=shared-internal",
            "--set-string",
            "workflowInternalAuth.existingSecret.key=shared-key",
            "--set-string",
            "runtimeInternalAuth.existingSecret.name=shared-internal",
            "--set-string",
            "runtimeInternalAuth.existingSecret.key=shared-key",
        ),
    )
    for arguments in cases:
        completed = _run_helm(
            [
                "template",
                "astron-agent",
                str(CHART),
                "--namespace",
                "astron-agent",
                *arguments,
            ]
        )
        if completed.returncode == 0:
            raise VerificationError("negative Helm render unexpectedly succeeded")
    return len(cases)


def _verify_lookup_and_seed_sources() -> None:
    helper_source = (CHART / "templates" / "_helpers.tpl").read_text()
    secret_source = (CHART / "templates" / "tenant-bootstrap-secret.yaml").read_text()
    for source in (helper_source, secret_source):
        if 'lookup "v1" "Secret"' not in source:
            raise VerificationError("managed tenant Secret lookup/reuse is missing")
        if LEGACY_KEY not in source or LEGACY_SECRET not in source:
            raise VerificationError(
                "managed tenant Secret legacy rotation guard is missing"
            )

    workflow_secret_source = (CHART / "templates" / "secrets.yaml").read_text()
    workflow_helper_start = helper_source.index(
        'define "astron-agent.workflowInternalAuthSecretChecksum"'
    )
    workflow_helper_end = helper_source.index(
        'define "astron-agent.tenantBootstrapValidate"', workflow_helper_start
    )
    workflow_helper_source = helper_source[workflow_helper_start:workflow_helper_end]
    for source in (workflow_helper_source, workflow_secret_source):
        required_fragments = (
            'lookup "v1" "Secret"',
            WORKFLOW_PLACEHOLDER,
            "(ge (len $candidate",
            "(le (len $candidate",
            '(not (contains "\\r" $candidate',
            '(not (contains "\\n" $candidate',
        )
        if not all(fragment in source for fragment in required_fragments):
            raise VerificationError(
                "managed workflow Secret upgrade validation is incomplete"
            )
    for sql_path in (
        CHART / "files" / "mysql" / "tenant.sql",
        CHART / "files" / "mysql" / "workflow.sql",
    ):
        sql = sql_path.read_text()
        if LEGACY_KEY in sql or LEGACY_SECRET in sql:
            raise VerificationError(
                "published tenant credential remains in Helm SQL seed"
            )


def main() -> int:
    if not shutil.which("helm"):
        print("tenant bootstrap Helm gate: FAIL: Helm is unavailable", file=sys.stderr)
        return 1
    try:
        lint = _run_helm(["lint", str(CHART)])
        if lint.returncode != 0:
            raise VerificationError("Helm lint failed")
        _verify_lookup_and_seed_sources()
        _verify_default_render()
        _verify_explicit_render()
        _verify_external_secret_render()
        _verify_workflow_external_secret_render()
        _verify_runtime_external_secret_render()
        _verify_workflow_managed_upgrade_render()
        _verify_legacy_compatibility_overrides_are_ignored()
        _verify_legacy_custom_pair_is_preserved()
        negative_count = _verify_negative_renders()
    except VerificationError as exc:
        print(f"tenant bootstrap Helm gate: FAIL: {exc}", file=sys.stderr)
        return 1
    except Exception:
        print(
            "tenant bootstrap Helm gate: FAIL: internal validation error",
            file=sys.stderr,
        )
        return 1
    print(
        "tenant bootstrap Helm gate: PASS "
        f"(8 positive modes, 4 tenant consumers, 3 workflow consumers, "
        f"{negative_count} negative cases)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
