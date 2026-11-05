#!/usr/bin/env python3
"""Render-only positive and negative tests for tenant bootstrap credentials."""

import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit
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
    index = environment_index + 1
    while index < len(lines):
        line = lines[index]
        item = re.fullmatch(r"        - name: ([A-Z0-9_]+)", line)
        if not item:
            if re.match(r"^        [A-Za-z]", line):
                break
            index += 1
            continue
        env_name = item.group(1)
        names.append(env_name)
        block: List[str] = []
        index += 1
        while index < len(lines):
            next_line = lines[index]
            if re.fullmatch(r"        - name: [A-Z0-9_]+", next_line):
                break
            if re.match(r"^        [A-Za-z]", next_line):
                break
            block.append(next_line)
            index += 1
        value_match = next(
            (
                re.fullmatch(r"          value:\s*[\"']?([^\"']*)[\"']?", item_line)
                for item_line in block
                if item_line.startswith("          value:")
            ),
            None,
        )
        secret_name_match = next(
            (
                re.fullmatch(r"              name:\s*[\"']?([^\"']*)[\"']?", item_line)
                for item_line in block
                if item_line.startswith("              name:")
            ),
            None,
        )
        secret_key_match = next(
            (
                re.fullmatch(r"              key:\s*[\"']?([^\"']*)[\"']?", item_line)
                for item_line in block
                if item_line.startswith("              key:")
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
        'X-Workflow-Gateway-Signature,X-Workflow-Internal-Key"'
    )
    if expected not in ingress:
        raise VerificationError(
            "workflow Ingress signed identity headers are incomplete"
        )
    if "-core-workflow" in ingress:
        raise VerificationError("public API must resolve execution through Console")
    expected_paths = {
        "/workflow/v1/chat/completions$", "/workflow/v1/resume$",
        "/workflow/v1/stop$", "/agent/v1/chat/completions$",
    }
    routes = re.findall(
        r"^\s+- path:\s*([^\n]+)\n\s+pathType:\s*(\S+)\n"
        r"\s+backend:\n\s+service:\n\s+name:\s*(\S+)", ingress, re.M
    )
    if {path.strip('"') for path, _, _ in routes} != expected_paths:
        raise VerificationError("public API allowlist must contain only anchored documented paths")
    if any(kind != "ImplementationSpecific" or backend != "astron-agent-console-hub"
           for _, kind, backend in routes):
        raise VerificationError("public API routes must all target Console through anchored regexes")
    if 'nginx.ingress.kubernetes.io/auth-method: "GET"' not in ingress or not re.search(
        r'nginx.ingress.kubernetes.io/auth-url: "http://astron-agent-console-hub\.[^/]+/internal/gateway/auth/workflow"',
        ingress,
    ):
        raise VerificationError("public API routes require Console gateway authentication")
    for path in PUBLIC_API_DENIED_PATHS:
        if any(re.match("^" + pattern.strip('"'), path, re.I) for pattern, _, _ in routes):
            raise VerificationError("public API Ingress exposes a private or suffixed route: " + path)


PUBLIC_API_DENIED_PATHS = (
    "/workflow/v1/console/run", "/workflow/v1/console/events/run/cancel",
    "/workflow/v1/debug/resume", "/agent/v1/custom/chat/completions",
    "/workflow/v1/stop/", "/workflow/v1/stop/extra", "/workflow/v1/stopping",
    "/workflow/v1/resume/extra", "/agent/v1/stop", "/agent/v1/resume",
    "/workflow/v1/chat/completions/extra", "/agent/v1/chat/completions/extra",
)


CONSOLE_INTERNAL_PATHS = (
    "/console-api/internal/gateway/auth/workflow",
    "/console-api/workflow/artifacts/internal-upload",
    "/console-api/skill-sandbox/internal-runtime-config",
    "/console-api/agents/internal/resolve",
    "/console-api/agents/artifacts/internal-upload",
)
AGENT_STREAM_PATH = "/console-api/agents/147/sessions/test-session/stream"


def _verify_docker_agent_proxy(source: str) -> None:
    # These locations have no nested blocks. Model exact-match priority and
    # proxy_pass's implicit slash redirect before selecting a longest prefix.
    locations = re.findall(
        r"location\s+(?:(\^~|=)\s+)?(/[^\s{]*)\s*\{([^{}]*)\}", source
    )

    def selected(uri: str) -> Tuple[str, str, str]:
        path = urlsplit(uri).path
        exact = next((row for row in locations if row[0] == "=" and row[1] == path), None)
        if exact:
            return exact
        # Official ngx_http_core_module: a slash-ending proxied prefix returns
        # 301 for the slashless URI unless an exact location handles it first.
        if any(
            row[0] != "=" and row[1] == path + "/" and "proxy_pass " in row[2]
            for row in locations
        ):
            raise VerificationError("Docker Agent collection would receive Nginx's implicit 301")
        matches = [
            row for row in locations if path.startswith(row[1]) and row[0] != "="
        ]
        if not matches:
            raise VerificationError("Docker console API route is missing")
        return max(matches, key=lambda row: len(row[1]))

    for api_path in ("/workflow/v1/chat/completions", "/workflow/v1/resume",
                     "/agent/v1/chat/completions", "/workflow/v1/stop"):
        modifier, prefix, block = selected(api_path)
        required = (
            "proxy_pass http://console-hub:8080" + api_path + ";",
            "auth_request /_gateway_auth/workflow;",
            "proxy_set_header Authorization $http_authorization;",
            'proxy_set_header X-Consumer-Username "";',
            'proxy_set_header X-Workflow-Internal-Key "";',
            'proxy_set_header X-Workflow-Gateway-Timestamp "";',
            'proxy_set_header X-Workflow-Gateway-Signature "";',
            "proxy_buffering off;",
            "proxy_read_timeout 30s;" if api_path.endswith("/stop") else "proxy_read_timeout 1800s;",
        )
        if modifier != "=" or prefix != api_path or any(v not in block for v in required):
            raise VerificationError("public API must authenticate through Console and strip service identity: " + api_path)
    for api_path in PUBLIC_API_DENIED_PATHS:
        _, _, block = selected(api_path)
        if "return 404;" not in block:
            raise VerificationError("private Core execution route is exposed: " + api_path)

    for method in ("GET", "POST"):
        for query in ("", "?page=1&name=test%20agent", "?source=create"):
            uri = "/console-api/agents" + query
            modifier, prefix, block = selected(uri)
            expected = (
                "proxy_pass http://console-hub:8080/agents;",
                "proxy_set_header Host $host;",
                "proxy_set_header X-Real-IP $remote_addr;",
                "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
                "proxy_set_header X-Forwarded-Proto $scheme;",
                "proxy_connect_timeout 30s;",
                "proxy_send_timeout 30s;",
                "proxy_read_timeout 30s;",
            )
            if (
                modifier != "=" or prefix != "/console-api/agents"
                or any(value not in block for value in expected)
            ):
                raise VerificationError(f"Docker {method} {uri} must proxy directly to /agents")
            # A literal proxy_pass URI without '?' preserves the query; default
            # method/body forwarding must not be overridden for POST creation.
            if re.search(
                r"\b(?:return|rewrite|proxy_method|proxy_set_body)\b"
                r"|proxy_pass_request_body\s+off\b", block
            ):
                raise VerificationError("Docker Agent collection must preserve method/body/query without redirect")

    modifier, prefix, block = selected(AGENT_STREAM_PATH)
    expected = (
        "proxy_pass http://console-hub:8080/agents/;",
        "proxy_buffering off;",
        "proxy_cache off;",
        "proxy_http_version 1.1;",
        "proxy_send_timeout 1800s;",
        "proxy_read_timeout 1800s;",
        "add_header X-Accel-Buffering 'no';",
    )
    if (
        modifier != "^~" or prefix != "/console-api/agents/"
        or any(x not in block for x in expected)
    ):
        raise VerificationError(
            "Docker Agent SSE route must rewrite to /agents/ with unbuffered 1800s timeouts"
        )
    modifier, prefix, block = selected("/console-api/published/42/stream")
    if (
        modifier != "^~" or prefix != "/console-api/published/"
        or any(value not in block for value in (
            "proxy_pass http://console-hub:8080/published/;",
            "proxy_buffering off;", "proxy_cache off;",
            "proxy_http_version 1.1;", "proxy_send_timeout 1800s;",
            "proxy_read_timeout 1800s;", "add_header X-Accel-Buffering 'no';",
        ))
    ):
        raise VerificationError("Docker published chat must preserve the unbuffered 1800s SSE contract")
    if "/console-api/chat-message/" in source:
        raise VerificationError("obsolete direct core chat-message route remains")
    _, generic_prefix, generic_block = selected("/console-api/models")
    if generic_prefix != "/console-api/" or any(
        f"proxy_{kind}_timeout 30s;" not in generic_block
        for kind in ("connect", "send", "read")
    ):
        raise VerificationError("ordinary Docker console API timeouts must remain 30s")
    for path in CONSOLE_INTERNAL_PATHS:
        for suffix in ("", "/", "/extra.css"):
            modifier, prefix, block = selected(path + suffix)
            if (
                modifier != "^~" or prefix != path
                or "return 404;" not in block or "proxy_pass" in block
            ):
                raise VerificationError(
                    "Docker internal console API is not denied before proxy/static routing"
                )


def _verify_agent_ingress_routes(rendered: str) -> None:
    routes = []
    for document in _documents(rendered):
        if _kind(document) != "Ingress":
            continue
        for path, path_type, backend in re.findall(
            r"^\s+- path:\s*([^\n]+)\n\s+pathType:\s*(\S+)\n"
            r"\s+backend:\n\s+service:\n\s+name:\s*(\S+)", document, re.M
        ):
            routes.append((path.strip('"'), path_type, backend, document))
    # ingress-nginx orders regex locations by descending path length, first match wins.
    routes.sort(key=lambda row: len(row[0]), reverse=True)

    def selected(path: str) -> Tuple[str, str, str, str]:
        for route in routes:
            if re.match("^" + route[0], path, re.I):
                return route
        raise VerificationError("rendered console Ingress route is missing")

    path, path_type, backend, document = selected(AGENT_STREAM_PATH)
    expected = (
        'nginx.ingress.kubernetes.io/use-regex: "true"',
        'nginx.ingress.kubernetes.io/proxy-buffering: "off"',
        'nginx.ingress.kubernetes.io/proxy-read-timeout: "1800"',
        'nginx.ingress.kubernetes.io/proxy-send-timeout: "1800"',
    )
    if (
        path_type != "ImplementationSpecific" or backend != "astron-agent-console-hub"
        or any(x not in document for x in expected)
    ):
        raise VerificationError(
            "Agent Ingress must select the unbuffered 1800s /agents/ rewrite"
        )
    rewrite = re.search(
        r"nginx.ingress.kubernetes.io/rewrite-target:\s*([^\n]+)", document
    )
    if not rewrite:
        raise VerificationError("Agent Ingress rewrite-target is missing")
    target = rewrite.group(1).strip('"')
    # Match the public GET/POST URLs used by the Console against the rendered
    # ingress capture groups. Django's collection is /agents without a slash.
    cases = (
        ("GET", "/console-api/agents", "/agents"),
        ("POST", "/console-api/agents", "/agents"),
        ("GET", "/console-api/agents?page=1", "/agents"),
        ("GET", "/console-api/agents/147", "/agents/147"),
        ("POST", "/console-api/agents/147/sessions", "/agents/147/sessions"),
        ("POST", AGENT_STREAM_PATH, "/agents/147/sessions/test-session/stream"),
        ("GET", "/console-api/agents/", "/agents/"),
    )
    for method, uri, expected_path in cases:
        request_path = urlsplit(uri).path
        chosen_path, _, chosen_backend, chosen_document = selected(request_path)
        if chosen_document != document or chosen_backend != "astron-agent-console-hub":
            raise VerificationError(f"Agent Ingress does not handle {method} {uri}")
        match = re.match("^" + chosen_path, request_path, re.I)
        rewritten = re.sub(
            r"\$(\d+)", lambda group: match.group(int(group.group(1))) or "", target
        )
        if rewritten != expected_path:
            raise VerificationError(f"Agent Ingress rewrite changes {method} {uri}")
    for unrelated in ("/console-api/agents-extra", "/console-api/agentsX", "/console-api/agents.json"):
        if selected(unrelated)[3] == document:
            raise VerificationError("Agent Ingress regex must retain the slash/end boundary")
    published_path = "/console-api/published/42/stream"
    chosen_path, chosen_type, chosen_backend, chosen_document = selected(published_path)
    if (
        chosen_type != "ImplementationSpecific"
        or chosen_backend != "astron-agent-console-hub"
        or any(value not in chosen_document for value in expected)
    ):
        raise VerificationError("published chat Ingress must preserve the unbuffered 1800s SSE contract")
    published_rewrite = re.search(
        r"nginx.ingress.kubernetes.io/rewrite-target:\s*([^\n]+)", chosen_document
    )
    if not published_rewrite:
        raise VerificationError("published chat Ingress rewrite-target is missing")
    published_match = re.match("^" + chosen_path, published_path, re.I)
    rewritten = re.sub(
        r"\$(\d+)",
        lambda group: published_match.group(int(group.group(1))) or "",
        published_rewrite.group(1).strip('"'),
    )
    if rewritten != "/published/42/stream":
        raise VerificationError("published chat Ingress must preserve the upstream stream path")
    if "/console-api/chat-message" in rendered:
        raise VerificationError("obsolete direct core chat-message route remains")
    for internal in CONSOLE_INTERNAL_PATHS:
        for suffix in ("", "/", "/extra.css"):
            _, path_type, backend, _ = selected(internal + suffix)
            if (
                path_type != "ImplementationSpecific"
                or backend != "astron-agent-console-api-deny"
            ):
                raise VerificationError(
                    "internal console Ingress must select deny before Agent/generic routes"
                )
    deny = _find_document(rendered, "Service", "astron-agent-console-api-deny")
    if re.search(r"^\s+selector:", deny, re.M):
        raise VerificationError("internal console deny Service must have no selected upstream")


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
            or "WORKFLOW_INTERNAL_API_KEY_FILE" in environment
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
    _verify_workflow_ingress_gateway_headers(rendered)
    _verify_agent_ingress_routes(rendered)
    _verify_sandbox_bindings(
        rendered,
        "astron-agent-console-hub-artifact-upload",
        "astron-agent-console-hub-sandbox-runtime-credential",
    )


def _verify_sandbox_bindings(rendered: str, artifact_secret: str, runtime_secret: str) -> None:
    for deployment_name in WORKFLOW_CONSUMERS:
        deployment = _find_document(rendered, "Deployment", deployment_name)
        _, environment = _main_container_environment(deployment)
        for name, secret, key in (
            ("SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN", artifact_secret, "artifact-upload-token"),
            (
                "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN",
                runtime_secret,
                "sandbox-runtime-credential-token",
            ),
        ):
            binding = environment.get(name, {})
            if (
                binding.get("secret_name") != secret
                or binding.get("secret_key") != key
                or name + "_FILE" in environment
            ):
                raise VerificationError(
                    "sandbox credentials must use the same Secret environment bindings"
                )
    console = _find_document(rendered, "Deployment", "astron-agent-console-hub")
    for setting in ("runAsNonRoot: true", "runAsUser: 10001", "runAsGroup: 10001"):
        if setting not in console:
            raise VerificationError("Console non-root identity is missing")


def _verify_sandbox_external_secrets() -> None:
    rendered = _render(
        (
            "--set-string",
            "consoleHub.artifactUpload.existingSecret=retained-artifact",
            "--set-string",
            "consoleHub.sandboxRuntimeCredential.existingSecret=retained-runtime",
        )
    )
    _verify_sandbox_bindings(rendered, "retained-artifact", "retained-runtime")
    for name in (
        "astron-agent-console-hub-artifact-upload",
        "astron-agent-console-hub-sandbox-runtime-credential",
    ):
        try:
            _find_document(rendered, "Secret", name)
        except VerificationError:
            continue
        raise VerificationError("existing sandbox Secret must not be replaced")


def _verify_console_internal_hosts() -> None:
    public_hosts = "public.example.org,198.51.100.8"
    for fullname in ("astron-agent", "custom-release"):
        rendered = _render((
            "--set-string", "consoleHub.auth.allowedHosts=public.example.org\\,198.51.100.8",
            "--set-string", f"fullnameOverride={fullname}",
        ))
        service_host = fullname + "-console-hub"
        _find_document(rendered, "Service", service_host)
        console = _find_document(rendered, "Deployment", service_host)
        _, environment = _main_container_environment(console)
        if environment["CONSOLE_ALLOWED_HOSTS"]["value"] != public_hosts + "," + service_host:
            raise VerificationError("Console must preserve public hosts and add its actual internal service host")
        for consumer in ("core-agent", "core-workflow"):
            deployment = _find_document(rendered, "Deployment", fullname + "-" + consumer)
            _, environment = _main_container_environment(deployment)
            keys = ["SKILL_SANDBOX_RUNTIME_CONFIG_URL", "SKILL_SANDBOX_ARTIFACT_UPLOAD_URL"]
            if consumer == "core-workflow":
                keys.append("MODEL_RUNTIME_CONFIG_URL")
            for key in keys:
                if urlsplit(environment[key]["value"]).hostname != service_host:
                    raise VerificationError("internal caller URL is inconsistent with Console allowed hosts")


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
        _verify_docker_agent_proxy(
            (CHART.parent.parent / "docker/astronAgent/nginx/nginx.conf").read_text()
        )
        _verify_default_render()
        _verify_console_internal_hosts()
        _verify_sandbox_external_secrets()
        _verify_explicit_render()
        _verify_external_secret_render()
        _verify_workflow_external_secret_render()
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
        f"(10 positive modes, 4 tenant consumers, 3 workflow consumers, "
        f"{negative_count} negative cases, Docker/Helm Agent SSE and internal-route contracts)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
