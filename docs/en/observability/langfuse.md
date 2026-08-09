# Langfuse Integration

Author: RawNuke
Copyright (c) 2026 RawNuke. All rights reserved.

Astron Agent supports Langfuse for LLM observability. Langfuse provides
hierarchical tracing, cost monitoring, evaluation, and prompt management.

## How it works

The integration uses the OpenTelemetry (OTLP) protocol to send traces to
Langfuse. Langfuse ingests OTLP/HTTP data at its public OTel endpoint.
The integration adds:

- An OTLP/HTTP exporter that sends spans to the Langfuse OTel endpoint.
- Semantic convention attributes on spans for LLM tracing.
- Trace-level attributes for user, session, and trace name.

## Enable Langfuse

Set these environment variables in the service config file:

```
LANGFUSE_ENABLED=1
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

For a self-hosted Langfuse instance, set `LANGFUSE_HOST` to your instance URL.

## Supported services

Both the agent service and the workflow service support Langfuse export.
Configure the env vars in each service's `config.env` file:

- Agent: `core/agent/config.env`
- Workflow: `core/workflow/config.env`

## What is traced

When Langfuse is enabled, every span receives these attributes:

| Attribute | Value |
| --- | --- |
| `langfuse.user.id` | User identifier from the request |
| `langfuse.session.id` | Chat session identifier |
| `langfuse.trace.name` | Function name for the span |

LLM generation spans additionally receive:

| Attribute | Value |
| --- | --- |
| `langfuse.observation.type` | `generation` |
| `gen_ai.request.model` | Model name |
| `gen_ai.usage.input_tokens` | Prompt token count |
| `gen_ai.usage.output_tokens` | Completion token count |

These attributes let Langfuse calculate cost per model and show
token usage over time.

## Verification

After you enable Langfuse and run a workflow or agent:

1. Open your Langfuse dashboard.
2. Look for a new trace with the service name.
3. Expand the trace to see the nested span hierarchy.
4. Check the generation spans for model name and token usage.
5. Confirm that the cost panel shows per-model spend.

## Technical details

The exporter sends to `{LANGFUSE_HOST}/api/public/otel/v1/traces`.
Authentication uses HTTP Basic Auth with the public key as username
and the secret key as password. The `x-langfuse-ingestion-version: 4`
header enables real-time ingestion.

The Langfuse exporter runs alongside the existing gRPC OTLP exporter
and the file exporter. You can enable Langfuse independently of the
gRPC OTLP exporter.

## Requirements

- Langfuse server version 3.22.0 or later.
- Langfuse project with a valid public key and secret key.
- Network access from the Astron Agent services to the Langfuse host.
