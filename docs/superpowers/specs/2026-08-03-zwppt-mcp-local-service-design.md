# Local ZWPPT MCP Service Design

**Date:** 2026-08-03

## Goal

Make the imported PPT workflow runnable without depending on the Xingchen hosted
MCP cold-start service. The local service must expose the six tools from
[`Alex-Smith-1234/zwppt-mcp`](https://github.com/Alex-Smith-1234/zwppt-mcp),
reuse the existing AstronAgent platform-account credentials, and be reachable by
the existing `core-link` MCP client.

Success means:

- `core-link` can list the six PPT tools through an internal SSE URL;
- a tool call reaches the real iFlytek Zhiwen PPT API with the configured
  credentials;
- the imported workflow can create one PPT task, wait between progress checks,
  and return the real download URL through the Pi runtime;
- no credential is committed, printed, or exposed through a host port.

## Chosen Approach

Add an AstronAgent-owned service under `core/plugin/ppt`. It will retain the
upstream tool behavior and API contracts, while adding only the integration
pieces that the upstream stdio-only package lacks:

1. FastMCP 1.6 SSE transport on port `3000`;
2. the endpoint `/ppt/sse` and message endpoint `/ppt/messages/`;
3. AstronAgent platform-account credential lookup;
4. a Docker image and Compose wiring on `astron-agent-network`;
5. focused automated tests and an end-to-end MCP tool discovery check.

This is preferred over a generic stdio-to-SSE proxy because it removes a second
runtime and keeps error handling in one Python service. It is preferred over
changing `core-link` because spawning arbitrary stdio MCP processes is a much
larger architectural change.

## Components

### PPT tool service

The service contains the six upstream tools:

- `get_theme_list`
- `create_ppt_task`
- `get_task_progress`
- `create_outline`
- `create_outline_by_doc`
- `create_ppt_by_outline`

The iFlytek request signing and request/response fields remain compatible with
the upstream repository. Vendored/adapted code retains MIT attribution and the
upstream commit is recorded for traceability.

The FastMCP server listens on `0.0.0.0:3000`. Only SSE is added because the
currently deployed `core-link` uses MCP SDK 1.6 and already exercises SSE in
production. Streamable HTTP for this particular service is outside this minimal
delivery; the Pi runtime and `core-link` transport-selection work remain
unchanged.

### Credential resolver

Credential resolution is deterministic:

1. use `AIPPT_APP_ID` and `AIPPT_API_SECRET` when both are explicitly set;
2. otherwise read Redis key
   `platform_account_text:iflytek_open_platform` from
   `REDIS_DATABASE_CONSOLE` (default `1`);
3. extract `platformAppId` and `platformApiSecret`;
4. fail startup with a clear configuration error if either value is missing.

The resolver never returns or logs the complete secret in errors. This reuses
the platform-account settings already configured in the local console and
avoids duplicating credentials in Compose files.

### Docker Compose

Compose adds `astron-agent-plugin-tool-ppt` with:

- no host port;
- the existing internal Docker network;
- Redis connection settings only;
- a process-level health check against port `3000`;
- restart policy consistent with the other internal services.

The workflow URL becomes:

`http://astron-agent-plugin-tool-ppt:3000/ppt/sse`

## Runtime Data Flow

1. The Workflow Agent builder sends the configured MCP URL to `core-link`.
2. `core-link` opens the SSE session and lists the six tools.
3. Pi receives their native JSON Schemas through the existing Python bridge.
4. Pi selects a PPT tool; `core-agent` asks `core-link` to call it.
5. The PPT service signs and calls the Zhiwen API.
6. After task creation, Pi uses its local `wait(30)` tool between
   `get_task_progress` calls.
7. The final Zhiwen download URL passes through the unchanged workflow output.

## Error Handling

- Missing credentials fail service startup rather than failing on the first
  paid API call.
- Non-200 Zhiwen responses become MCP tool errors with the upstream response
  body, but credential values are never included.
- Invalid JSON responses become explicit tool errors instead of fabricated
  success values.
- The existing Pi total deadline and repeated-call fuse remain the run-level
  safety boundaries.

## Testing

Implementation follows test-first development:

- unit tests for environment credential precedence, Redis fallback, missing
  credentials, and secret-safe errors;
- mocked HTTP tests for request signing and the six tool contracts;
- server configuration test for port and SSE/message paths;
- Docker build and health verification;
- real `core-link` `tools/list` against the running local container;
- one real three-page PPT workflow run, including observed wait/progress events
  and a non-placeholder download URL.

The real generation test may consume the configured iFlytek PPT quota and is run
only once after all non-billable checks pass.

## Out of Scope

- frontend changes;
- changes to the public workflow YAML schema;
- a general stdio MCP process manager;
- publishing a new upstream package or maintaining an unrelated fork;
- exposing the PPT MCP service outside the Docker network.
