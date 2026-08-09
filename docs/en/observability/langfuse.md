# Langfuse tracing for workflows

The workflow service already emits OpenTelemetry spans for HTTP requests, nodes,
and workflow execution. Langfuse can ingest those spans directly through OTLP,
so no Langfuse SDK is added to the execution path.

## Configuration

Set the following environment variables for the workflow service:

```dotenv
LANGFUSE_ENABLED=true
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

For a self-hosted Langfuse deployment, set `LANGFUSE_HOST` to its public URL.
Keep both keys in the deployment secret store; do not add them to `config.env`.

When enabled, Astron sends traces to
`$LANGFUSE_HOST/api/public/otel/v1/traces` with OTLP/HTTP Basic authentication.
When disabled, the existing `OTLP_ENABLE` gRPC exporter remains unchanged.

## Verify a trace

1. Start the workflow service with `LANGFUSE_ENABLED=true` and the two keys.
2. Run any workflow or call a workflow HTTP endpoint.
3. Open the Langfuse project and inspect the new trace. It should include the
   workflow request span and child spans produced by workflow nodes.

The included unit tests verify endpoint construction, credential encoding, and
the disabled default:

```sh
cd core/workflow
uv run pytest tests/extensions/otlp/trace/test_langfuse_config.py
```
