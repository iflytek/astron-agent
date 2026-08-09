# Langfuse observability for Astron Agent

Forwards Astron Agent's existing OpenTelemetry workflow traces to
[Langfuse](https://langfuse.com) so you can inspect every agent run, node, and
LLM call in a nested trace view.

## 1. Run Langfuse (self-hosted, free)

```bash
docker run -d --name langfuse -p 3000:3000 ghcr.io/langfuse/langfuse:latest
# open http://localhost:3000, create an account and a project
# copy the project's public key (pk-lf-...) and secret key (sk-lf-...)
```

> Langfuse is MIT-licensed and self-hostable. Cloud is available at
> langfuse.com if you prefer a managed instance.

## 2. Enable the bridge in Astron Agent

```bash
export LANGFUSE_ENABLED=1
export LANGFUSE_PUBLIC_KEY=pk-lf-...
export LANGFUSE_SECRET_KEY=sk-lf-...
export LANGFUSE_HOST=http://localhost:3000
```

That's it. The workflow service registers an extra OpenTelemetry span
processor that exports the same spans it already emits to Langfuse's OTLP
endpoint (`/api/public/otel`). Disable it anytime by unsetting
`LANGFUSE_ENABLED` — the bridge is off by default and adds no dependency.

## 3. Run a workflow

Run any workflow through the console. In Langfuse, open **Traces** and you'll
see each workflow run with its nested node/LLM spans, duration, and status.
LLM provider spans that record model + token usage surface as generation
observations.

## How it works

- `core/workflow/extensions/otlp/trace/langfuse_exporter.py` builds an OTLP
  HTTP span exporter pointed at Langfuse's ingestion endpoint with Basic auth
  and the `x-langfuse-ingestion-version: 4` header (real-time ingestion).
- `init_trace()` in `trace.py` attaches it to the tracer provider only when
  `LANGFUSE_ENABLED` is truthy.
- Transport is OTLP over HTTP (JSON/protobuf), which Langfuse supports.
