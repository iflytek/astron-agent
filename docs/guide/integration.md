# Integrate Astron Agent into Your Application

Astron Agent can run workflows for another application through its published workflow API. Your application stays responsible for its own UI and business logic, while Astron Agent provides the workflow, model, knowledge, tool, and RPA orchestration behind an HTTP/SSE boundary.

> This is a service integration, not an in-process library integration. The supported consumer boundary is the public workflow API exposed by Astron Agent's gateway. Internal Python modules are implementation details and are not published as stable SDK packages.

## When to use this integration

Use the workflow API when you want to:

- add an AI workflow to an existing web, mobile, backend, or automation project;
- keep model and tool orchestration in Astron Agent instead of rebuilding it in every application;
- stream intermediate output to a user interface;
- reuse one published workflow from multiple services while keeping application credentials separate.

If you only want to evaluate or operate the full platform, start with [Quick Start](./quick-start.md) or [Deployment](./deploy.md) instead.

## Integration boundary

```text
Your application
    │  POST /workflow/v1/chat/completions
    │  Authorization: Bearer <application-key>:<application-secret>
    ▼
Astron Agent gateway (Nginx)
    │  forwards the application credentials to Python Console
    ▼
Python Console
    │  validates application permissions and freezes the published run
    ▼
Published workflow
    └─ models · knowledge · tools/MCP · RPA
```

Call the gateway address shown after publishing. Do not call `core-workflow:7880`, `/internal/gateway/auth/**`, or other container-only endpoints directly: those routes are internal, and direct calls bypass the supported gateway boundary.

## 1. Publish a workflow as an API

1. Create and debug a workflow in the Astron Agent console.
2. Select **Publish** in the workflow editor.
3. Choose **Publish as API** and open its configuration.
4. Create or select an application, then complete the publication flow.
5. Copy the generated values:
   - **Service URL**
   - **Flow ID**
   - **API Key**
   - **API Secret**

Keep the API Secret in a server-side secret store. Do not put it in browser code, mobile packages, source control, screenshots, or client-visible logs.

## 2. Call a published version

For workflows, use `POST /workflow/v1/chat/completions` with the Service URL and application credentials shown in Console:

```bash
export ASTRON_BASE_URL="https://astron.example.com"
export ASTRON_API_KEY="replace-me"
export ASTRON_API_SECRET="replace-me"

curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/chat/completions" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{
    "flow_id": "<FLOW_ID>",
    "uid": "user-123",
    "sessionId": "conversation-456",
    "stream": true,
    "parameters": {"query": "Summarize this support ticket"}
  }'
```

| Field | Meaning |
| --- | --- |
| `flow_id` | Workflow bound to the authenticated application. |
| `parameters` | Start-node inputs; replace `query` with the published workflow's actual input names. |
| `uid` | Nonempty business user identifier, at most 512 characters; defaults to `default`. `user` is also accepted. |
| `sessionId` | Optional session correlation identifier, at most 96 characters. |
| `stream` | Boolean, defaults to `true`; `false` waits for the execution result. |

Calls use the immutable release bound to the application. A later publication does not change an existing run. Clients cannot select an arbitrary draft through `version` or submit `history` as trusted server-side conversation state.

Independent Agents use `POST /agent/v1/chat/completions` with the same authorization and this request shape:

```json
{
  "bot_id": "<BOT_ID>",
  "user": "user-123",
  "sessionId": "conversation-456",
  "stream": true,
  "messages": [{"role": "user", "content": "Hello"}]
}
```

Send one user message per request. The same application, user and `sessionId` continue the server-side conversation. A session cannot start another run while its current run is still generating.

## 3. Handle execution events

Streaming responses use SSE. Handle both `event:` and `data:` lines, and ignore heartbeat comments beginning with `:`. Not every data frame is a text delta.

- Workflows start with `event: run`; its `data.runId` identifies the run for control requests. Content frames can contain `choices[0].delta.content`.
- Workflows end with `event: run-end`. Read `status` to distinguish `completed`, `paused`, `failed`, `cancelled` and `interrupted`. `finish_reason: interrupt` indicates a pause; retain the run ID and confirm the terminal state.
- Agents start with `event: run`, whose `data.id` is the control run ID, and emit text through `choices[0].delta.content`. Their terminal frame reports `code` and `finish_reason`, followed by `data: [DONE]`; do not parse `[DONE]` as JSON.
- A successful HTTP connection does not imply execution success. Preserve partial output and report failure or interruption for error codes, failed terminal states or disconnections without a terminal event.

With `stream: false`, the JSON response contains `runId`, `sessionId`, `status`, `code` and `choices[0].message.content`. Only `status: completed` means success; pauses, cancellation and failures are not completion.

## 4. Resume and stop runs

Resume a paused workflow with the original application's credentials:

```bash
curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/resume" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{"runId":"<RUN_ID>","content":"The user reply"}'
```

Resume always returns SSE and continues the original run and release without replaying completed nodes. Only a `paused` workflow can resume. Agents, nonpaused runs and runs whose access has been revoked are rejected. `event_id` remains accepted for legacy workflow callers; new clients should retain and use `runId`.

Stop either an Agent or workflow through the same control endpoint:

```bash
curl \
  --request POST "$ASTRON_BASE_URL/workflow/v1/stop" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{"runId":"<RUN_ID>"}'
```

The successful response's `data` contains `id`, `status` and `cancelRequested`. `cancelRequested: true` acknowledges the cancellation request; it does not establish that cancellation has finished. Use the actual returned `status` and the original SSE terminal event. Closing a browser or aborting HTTP is not a substitute for an explicit stop request.

Both controls revalidate application credentials, run ownership and current publication permissions. They only address runs created through the public API by that same application, excluding other applications and Console browser sessions. Undocumented `/workflow/v1/**` and `/agent/v1/**` control routes are not forwarded to core.

## Production checklist

- **Use HTTPS.** The default local deployment listens on HTTP; terminate TLS at Nginx or an upstream ingress before exposing the API outside a trusted network.
- **Keep credentials server-side.** If a browser or mobile app needs the capability, call your own backend first and let that backend call Astron Agent.
- **Separate applications and credentials.** Use different Astron applications for environments or consumers that need independent rotation and revocation.
- **Set streaming-aware timeouts.** The bundled gateway allows long-lived workflow streams, but every proxy and client in front of it must also disable buffering and allow suitable read timeouts.
- **Use stable IDs.** Generate `uid` and `sessionId` from your system; do not put secrets or sensitive personal data in either value.
- **Validate workflow inputs.** Treat `parameters` as untrusted input and constrain it before passing values to tools, databases, or RPA actions.
- **Record trace IDs safely.** The response `id` is useful for troubleshooting. Log it with the status and duration, but redact credentials and sensitive prompts.
- **Plan for workflow changes.** Start-node inputs and End-node outputs are the consumer contract. Review them before publishing a new version and test clients against the published workflow.

## What is not a supported dependency contract

The following can be useful when contributing to Astron Agent itself, but external applications should not depend on them as stable APIs:

- importing packages directly from `core/agent`, `core/workflow`, or `core/common`;
- calling container DNS names or internal service ports;
- sending `X-Consumer-Username` yourself;
- calling `/internal/gateway/auth/**` or unpublished `/workflow/v1/**` routes;
- reading or writing Astron Agent databases directly.

For repository-level extension work, see [Project Modules](../PROJECT_MODULES.md). For reusable workflow definitions, see [Workflow Examples](../examples.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `401` or a missing/malformed credential error | Header must be exactly `Authorization: Bearer <application-key>:<application-secret>`. Confirm neither value is empty. |
| `Failed to get application` | Confirm the API Key and Secret belong to the application selected at publication time. |
| Workflow not found or not authorized | Use the Flow ID shown for the published API, not the App ID or an editor-only ID. |
| Parameter validation error | Send a `parameters` object whose keys and value types match the Start node. |
| Output arrives all at once | Disable response buffering in every reverse proxy and use an SSE-capable HTTP client. |
| Stream stays open without text | Heartbeat frames are normal while a long-running node executes; enforce your own overall deadline. |
| Works inside Docker but not externally | Call the published gateway host and exposed port, then check DNS, firewall, TLS, and proxy routing. |

See the [FAQ](../faq.md), [Configuration Reference](../CONFIGURATION.md), and [Deployment Guide](./deploy.md) for additional operational guidance.
