# Langfuse Observability

Astron Agent can export its existing OpenTelemetry traces to Langfuse through a
raw OTLP/HTTP bridge. The bridge does not require the Langfuse Python SDK. It
preserves Astron's workflow and agent span hierarchy while adding the semantic
attributes Langfuse uses for generations, tools, token usage, latency, and
trace filtering.

> Langfuse export is disabled by default. Enabling it sends telemetry to the
> configured Langfuse deployment, so review the privacy settings before using
> production traffic.

## How the bridge works

- Workflow and agent services keep using their existing OpenTelemetry tracer
  providers and nested spans.
- Langfuse uses a dedicated batched OTLP/HTTP exporter. The exporter runs in
  parallel with Astron's existing OTLP exporter and local span logging.
- `OTLP_ENABLE` continues to control the existing general-purpose OTLP path.
  `LANGFUSE_ENABLED` controls the Langfuse path independently.
- Astron derives the Langfuse v4-compatible traces endpoint from
  `LANGFUSE_HOST` as
  `<LANGFUSE_HOST>/api/public/otel/v1/traces`. Configure the deployment base URL,
  not the full OTLP endpoint.
- Astron authenticates the generated request in memory with the Langfuse
  project public and secret keys. Credentials are not added to span
  attributes.
- Workflow-to-agent and nested-workflow calls propagate the standard W3C
  `traceparent`/`tracestate` context. Astron does not trust inbound
  `langfuse.*` baggage for trace names, user/session identity, tags, release,
  or environment; each service derives those fields from locally handled
  request state while preserving unrelated W3C baggage.

If both exporters are enabled, one execution can therefore be sent to both
your existing collector and Langfuse. Do not point both exporter paths at the
same Langfuse project unless duplicate delivery is intentional.

## Configuration

The same settings apply to the workflow and agent services.

| Variable | Default | Description |
| --- | --- | --- |
| `LANGFUSE_ENABLED` | `false` | Enables the independent Langfuse exporter. |
| `LANGFUSE_PUBLIC_KEY` | empty | Langfuse project public key. Required when enabled. |
| `LANGFUSE_SECRET_KEY` | empty | Langfuse project secret key. Required when enabled. |
| `LANGFUSE_HOST` | `https://cloud.langfuse.com` | Cloud or self-hosted Langfuse base URL. |
| `LANGFUSE_CAPTURE_INPUT_OUTPUT` | `false` | Allows prompt/input and response/output content to leave Astron. |
| `LANGFUSE_MAX_ATTRIBUTE_LENGTH` | `8192` | Maximum length of an exported string attribute. |
| `LANGFUSE_ENVIRONMENT` | `default` | Environment label used to filter traces in Langfuse. |
| `LANGFUSE_RELEASE` | empty | Optional application release or deployment label. |

Both project keys must be configured before export can be enabled. Treat the
secret key like any other production credential: inject it at runtime with a
secret manager, never put it in source control, screenshots, or command logs.

### Docker Compose

Create the local deployment environment file and set project-specific values:

```bash
cd docker/astronAgent
cp .env.example .env
```

```dotenv
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-your-project
LANGFUSE_SECRET_KEY=sk-lf-your-project
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_CAPTURE_INPUT_OUTPUT=false
LANGFUSE_MAX_ATTRIBUTE_LENGTH=8192
LANGFUSE_ENVIRONMENT=development
LANGFUSE_RELEASE=local-observability-demo
```

Start the normal Astron deployment, or recreate the two already-running
services so they receive the changed environment:

```bash
docker compose up -d
# For an existing deployment:
docker compose up -d --force-recreate core-workflow core-agent
```

The Compose file passes all eight settings to both services. For a self-hosted
Langfuse instance on the same Docker network, use its service name, for example
`http://langfuse-web:3000`. `localhost` inside an Astron container refers to
that container, not to the Docker host.

### Source and Helm deployments

For a source deployment, export the variables in the service environment or
set them in both `core/workflow/config.env` and `core/agent/config.env`. Restart
both services after a configuration change.

The Helm defaults are present in the workflow and agent configuration files.
Override the values through the deployment's existing secret/configuration
mechanism. Do not place real Langfuse keys in the chart's tracked defaults.

## Privacy defaults

With `LANGFUSE_CAPTURE_INPUT_OUTPUT=false`, the Langfuse exporter retains
structural telemetry such as span names, parent-child relationships, status,
latency, node and tool identity, model identity, and token counts. Before a
span leaves the process, it also:

- removes legacy span events, because existing events can contain complete
  workflow definitions, prompts, model responses, request bodies, or tool
  results;
- removes known payload-bearing or sensitive input/output attributes; and
- truncates retained string attributes to `LANGFUSE_MAX_ATTRIBUTE_LENGTH`.

Consequently, the default Langfuse trace can be used for execution topology,
errors, latency, and usage analysis without exporting raw prompt or response
content. This is a data-minimization boundary, not a substitute for checking
your own node labels, model identifiers, tenant metadata, and deployment
policies.

Set `LANGFUSE_CAPTURE_INPUT_OUTPUT=true` only for synthetic, de-identified, or
otherwise approved data. This setting is also required when a Langfuse
evaluator needs the root observation's input and output. Authentication
credentials must never be placed in workflow inputs, prompts, labels, or test
payloads regardless of this setting.

## Generate a trace

1. Configure Langfuse and start Astron.
2. In the Astron UI, import a workflow containing at least an LLM node. A
   workflow with a tool, retrieval, or agent node produces a more useful nested
   trace.
3. Note the imported flow ID and the test application's ID.
4. Send a synthetic request through the real debug route:

```bash
DEMO_FLOW_ID="<imported-flow-id>"
DEMO_APP_ID="<test-application-id>"

curl --no-buffer \
  --header "Content-Type: application/json" \
  --header "x-consumer-username: ${DEMO_APP_ID}" \
  --data "{\"flow_id\":\"${DEMO_FLOW_ID}\",\"uid\":\"langfuse-demo-user\",\"chat_id\":\"langfuse-demo-1\",\"stream\":true,\"parameters\":{\"AGENT_USER_INPUT\":\"Synthetic request: summarize why tracing helps debugging.\"},\"ext\":{},\"history\":[]}" \
  http://127.0.0.1:7880/workflow/v1/debug/chat/completions
```

Replace `AGENT_USER_INPUT` if the imported workflow declares a different input
variable. Use only synthetic content in a reproducibility artifact.

After the batch exporter flushes, open the Langfuse project and filter by
`LANGFUSE_ENVIRONMENT` or `LANGFUSE_RELEASE`. Depending on the imported
workflow, a representative trace contains:

```text
HTTP request / chat
└── workflow.run                         (chain; root input/output)
    └── engine_async_run
        ├── workflow.node:<llm-name>      (chain)
        │   └── llm.generate:<model>     (generation, model, tokens, TTFT)
        ├── workflow.node:<tool-name>     (tool)
        ├── workflow.node:<retriever>     (retriever)
        └── workflow.node:<agent-name>    (agent)
            └── agent.run                  (same W3C trace)
                ├── MakingStep             (generation)
                ├── RunPlugin              (tool)
                └── RunWorkflowPlugin      (nested workflow handoff)
```

An agent node can add nested model steps, reasoning steps, retrieval, MCP,
plugin, and workflow-tool observations. Langfuse can calculate cost when the
exported model identifier matches a model with pricing configured in Langfuse
and the provider returns token usage.

### Verified end-to-end result

The following redacted screenshot was generated with this bridge against a
local, loopback-only Langfuse v4.6.0 deployment and synthetic data. The trace
was exported through the production `add_langfuse_span_processor` path and
contains 11 observations across `CHAIN`, `AGENT`, `GENERATION`, `RETRIEVER`,
and `TOOL` types. Langfuse attributed 29 tokens and `$0.000255` to the two
generations, and an API-ingested `observability-e2e` score of `1.00`
demonstrates the evaluation feedback path.

![Verified Langfuse trace showing the Astron workflow, LLM, agent, retrieval, tool, token, cost, and score hierarchy](../imgs/langfuse-observability-trace.png)

Input/output capture was enabled only for this synthetic evidence run. With
the default `LANGFUSE_CAPTURE_INPUT_OUTPUT=false`, the same topology, usage,
latency, and cost remain visible while the green input/output payload panels
are omitted.

### Verified managed LLM-as-a-judge result

A second synthetic run exercised real OpenAI-compatible model calls for both
the application generation and an explicit judge observation. Trace
`f59a874fd9ceb00f6e9a384438bb9e04` contains 10 Astron observations across
`CHAIN`, `AGENT`, `GENERATION`, `RETRIEVER`, `TOOL`, and `EVALUATOR` types.
The application generation reported 75 input and 471 output tokens, while the
explicit judge reported 613 input and 97 output tokens (1,256 in the trace).

A live Langfuse root-observation evaluator independently wrote
`astron-root-answer-relevance-live: 1` with source `EVAL`. The separately
ingested `llm-judge-answer-relevance: 1` score confirms the documented
trace-level API feedback path. Both scores appear on the same root trace view,
alongside the complete parent/child hierarchy, in the screenshot below. The
run used only synthetic content on a loopback-only Langfuse v4.6.0 deployment;
provider credentials, endpoints, and concrete model configuration are not
included in the trace evidence or repository.

![Verified Langfuse managed LLM-as-a-judge score and Astron workflow, agent, generation, retrieval, tool, and evaluator hierarchy](../imgs/langfuse-managed-llm-judge.png)

For a reproducible bug report or pull request, include the exact startup and
request commands, the selected environment/release, and a redacted screenshot
showing the trace hierarchy, model, tokens, and latency. Never include project
keys or real user content.

## Configure a Langfuse evaluator

Content-based evaluators need an input and output to evaluate. Astron's privacy
default deliberately omits those fields from the root observation.

1. Use a dedicated non-production environment and synthetic or approved data.
2. Set `LANGFUSE_CAPTURE_INPUT_OUTPUT=true` for both services and restart them.
3. Generate a new trace; changing the flag cannot restore content to an older
   trace.
4. Confirm in Langfuse that the root observation contains the expected input
   and output.
5. In Langfuse, create an evaluator, scope it with the environment/release or a
   trace filter, and map the root observation input and output into the
   evaluator prompt.
6. Test the evaluator on one trace before enabling continuous execution. Check
   that its score appears on the same trace.
7. Restore `LANGFUSE_CAPTURE_INPUT_OUTPUT=false` when content evaluation is no
   longer required.

An evaluator can instead target a specific generation or tool observation if
that is the intended boundary. Keep its filter narrow so workflow bookkeeping
spans are not evaluated as model outputs.

### Reproduce the score feedback path

Langfuse evaluators write their result back as a score. To verify the same
feedback path independently, attach a numeric score to a synthetic trace with
the official [Scores API](https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk).
The following example reads credentials from the environment, builds the Basic
authentication header in memory, and never places either key in a command-line
argument:

```bash
export LANGFUSE_TRACE_ID="<synthetic-trace-id>"
python - <<'PY'
import base64
import json
import os
import urllib.request
from urllib.parse import urlsplit

host = os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com").rstrip("/")
parts = urlsplit(host)
if parts.scheme not in {"http", "https"} or not parts.netloc or parts.username:
    raise SystemExit("LANGFUSE_HOST must be an HTTP(S) base URL without userinfo")

credentials = (
    f"{os.environ['LANGFUSE_PUBLIC_KEY']}:{os.environ['LANGFUSE_SECRET_KEY']}"
).encode()
payload = json.dumps(
    {
        "traceId": os.environ["LANGFUSE_TRACE_ID"],
        "name": "observability-e2e",
        "value": 1.0,
        "dataType": "NUMERIC",
        "comment": "Synthetic Astron observability verification",
    }
).encode()
request = urllib.request.Request(
    f"{host}/api/public/scores",
    data=payload,
    headers={
        "Authorization": "Basic " + base64.b64encode(credentials).decode(),
        "Content-Type": "application/json",
    },
    method="POST",
)
with urllib.request.urlopen(request, timeout=10) as response:
    print(f"Langfuse accepted the score (HTTP {response.status})")
PY
```

Use only a trace from your own project. This verifies score ingestion; use the
evaluator steps above when the score itself should be produced by an LLM judge.

## Troubleshooting and flushing

### No traces appear

- Confirm `LANGFUSE_ENABLED=true` and that both project keys are non-empty and
  belong to the configured host/project.
- Restart the workflow and agent services after changing environment variables.
- From containers, use a hostname reachable on their Docker or Kubernetes
  network. Do not use `127.0.0.1` for a collector in another container.
- Supply only the base URL in `LANGFUSE_HOST`. Astron appends
  `/api/public/otel/v1/traces` automatically.
- A `401` or `403` normally indicates mismatched keys, project, host, or cloud
  region. A `404` often indicates that a full endpoint was supplied as the
  host.

Inspect exporter errors without printing environment values:

```bash
cd docker/astronAgent
docker compose logs core-workflow core-agent | grep -Ei 'langfuse|otlp|export'
```

### Traces arrive late or are incomplete

Langfuse export is batched. Wait at least one trace scheduling interval after
the response completes. During shutdown, use Astron's graceful stop path so the
tracer provider can flush queued spans; an abrupt process kill can discard the
last batch.

```bash
cd docker/astronAgent
docker compose stop core-workflow core-agent
```

For a short-lived local harness, explicitly call the OpenTelemetry tracer
provider's `force_flush()` before the process exits. If spans are still
truncated, check `LANGFUSE_MAX_ATTRIBUTE_LENGTH`; if inputs and outputs are
absent, check `LANGFUSE_CAPTURE_INPUT_OUTPUT` and generate a new trace.

### Usage is visible but cost is not

Verify that the generation includes a stable model identifier and input/output
token counts. Cost additionally depends on Langfuse recognizing the model or
having matching pricing configured; Astron does not invent a price when the
provider supplies none.

For OpenAI-compatible Agent streams, Astron requests the standard final usage
chunk with `stream_options.include_usage`. If a provider explicitly rejects
that field with a `400` or `422` validation response, Astron retries once
without it and caches that capability for the model instance. A provider that
accepts the option but omits the final usage chunk cannot supply streaming
token counts, so latency and topology remain available but usage and cost do
not.
