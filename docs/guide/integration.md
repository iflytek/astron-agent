# Integrate Astron Agent into Your Application

Astron Agent can run workflows for another application through its published workflow API. Your application stays responsible for its own UI and business logic, while Astron Agent provides the workflow, model, knowledge, tool, and RPA orchestration behind an HTTP/SSE boundary.

> This is a service integration, not an in-process library integration. The supported consumer boundary is the public workflow API exposed by Astron Agent's gateway. Internal Python and Java modules are implementation details and are not published as stable SDK packages.

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
    │  validates the application and forwards its App ID
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

## 2. Call the published workflow

The public endpoint is:

```text
POST <ASTRON_BASE_URL>/workflow/v1/chat/completions
```

Use the exact Service URL displayed by the console when it differs from the path above. Authentication uses the application credentials in one header:

```http
Authorization: Bearer <application-key>:<application-secret>
Content-Type: application/json
```

A minimal request is:

```json
{
  "flow_id": "<FLOW_ID>",
  "uid": "user-123",
  "stream": true,
  "parameters": {
    "query": "Summarize this support request"
  }
}
```

`flow_id` and `parameters` are required. The available keys inside `parameters` come from the workflow's Start node, so replace `query` with the inputs defined by your published workflow.

Optional request fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `uid` | string | Your end-user identifier (up to 40 characters). |
| `stream` | boolean | `true` for SSE streaming; `false` for one JSON response. Defaults to `true`. |
| `chat_id` | string | Your conversation identifier (up to 128 characters). Reuse it when continuing a conversation. |
| `history` | array | Earlier messages as `{ "role": "user" | "assistant", "content": "...", "content_type": "text" }`. |
| `ext` | object | Integration-specific metadata forwarded with the request. |
| `version` | string | Published workflow version when your environment requires one. |

### cURL

```bash
export ASTRON_BASE_URL="https://astron.example.com"
export ASTRON_API_KEY="replace-me"
export ASTRON_API_SECRET="replace-me"
export ASTRON_FLOW_ID="replace-me"

curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/chat/completions" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data "{
    \"flow_id\": \"$ASTRON_FLOW_ID\",
    \"uid\": \"user-123\",
    \"chat_id\": \"conversation-456\",
    \"stream\": true,
    \"parameters\": {
      \"query\": \"Summarize this support request\"
    }
  }"
```

### Python

This example uses only the Python standard library. Run it in a backend service, not in browser-delivered code.

```python
import json
import os
import urllib.request

base_url = os.environ["ASTRON_BASE_URL"].rstrip("/")
credential = f'{os.environ["ASTRON_API_KEY"]}:{os.environ["ASTRON_API_SECRET"]}'
payload = {
    "flow_id": os.environ["ASTRON_FLOW_ID"],
    "uid": "user-123",
    "chat_id": "conversation-456",
    "stream": True,
    "parameters": {"query": "Summarize this support request"},
}

request = urllib.request.Request(
    f"{base_url}/workflow/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {credential}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    },
    method="POST",
)

with urllib.request.urlopen(request, timeout=1800) as response:
    for raw_line in response:
        line = raw_line.decode("utf-8").strip()
        if not line.startswith("data:"):
            continue
        event = json.loads(line.removeprefix("data:").strip())
        if event.get("code") != 0:
            raise RuntimeError(event.get("message", "workflow failed"))

        choice = (event.get("choices") or [{}])[0]
        delta = choice.get("delta") or {}
        if delta.get("content"):
            print(delta["content"], end="", flush=True)

        finish_reason = choice.get("finish_reason")
        if finish_reason == "stop":
            break
        if finish_reason == "interrupt":
            print("\nWorkflow paused and requires a reply.")
            break
```

### Node.js 18+

```js
const baseUrl = process.env.ASTRON_BASE_URL.replace(/\/$/, "");
const authorization = `Bearer ${process.env.ASTRON_API_KEY}:${process.env.ASTRON_API_SECRET}`;

const response = await fetch(`${baseUrl}/workflow/v1/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: authorization,
    "Content-Type": "application/json",
    Accept: "text/event-stream"
  },
  body: JSON.stringify({
    flow_id: process.env.ASTRON_FLOW_ID,
    uid: "user-123",
    chat_id: "conversation-456",
    stream: true,
    parameters: { query: "Summarize this support request" }
  })
});

if (!response.ok || !response.body) {
  throw new Error(`Astron request failed: ${response.status} ${await response.text()}`);
}

const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
let buffer = "";
let finished = false;

while (!finished) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += value;

  const frames = buffer.split("\n\n");
  buffer = frames.pop() ?? "";

  for (const frame of frames) {
    const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) continue;

    const event = JSON.parse(dataLine.slice(5).trim());
    if (event.code !== 0) throw new Error(event.message || "workflow failed");

    const choice = event.choices?.[0];
    if (choice?.delta?.content) process.stdout.write(choice.delta.content);
    if (choice?.finish_reason === "interrupt") {
      console.log("\nWorkflow paused and requires a reply.");
      finished = true;
    }
    if (choice?.finish_reason === "stop") finished = true;
  }
}
```

## 3. Handle the response

### Streaming mode

With `stream: true`, the response media type is `text/event-stream`. Each frame contains a `data:` line whose value is JSON. Useful fields include:

```json
{
  "code": 0,
  "message": "Success",
  "id": "request-or-session-id",
  "choices": [
    {
      "delta": {
        "role": "assistant",
        "content": "incremental output",
        "reasoning_content": ""
      },
      "finish_reason": null
    }
  ],
  "workflow_step": {
    "seq": 3,
    "progress": 0.5
  }
}
```

Consumer rules:

- append `choices[0].delta.content` when it is non-empty;
- treat `code != 0` as a workflow error even if the HTTP connection was established successfully;
- ignore heartbeat frames with `finish_reason: "ping"`;
- finish on `finish_reason: "stop"`;
- handle `finish_reason: "interrupt"` only if your workflow contains an interactive pause;
- do not depend on every intermediate `workflow_step` field as a stable business contract.

### Non-streaming mode

Set `stream` to `false` to receive one JSON response. The response uses the same top-level shape; inspect `code`, `message`, `choices`, and `usage` rather than assuming a plain text body.

## 4. Resume an interrupted workflow

If a frame has `finish_reason: "interrupt"`, save `event_data.event_id`. After collecting the user's answer, call:

```text
POST <ASTRON_BASE_URL>/workflow/v1/resume
```

Use the same Authorization header:

```bash
curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/resume" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{
    "event_id": "<EVENT_ID>",
    "event_type": "resume",
    "content": "The user reply"
  }'
```

The resume response follows the mode of the interrupted request. Event IDs are runtime state: resume promptly and handle an expired or already-resumed event as an error.

## Production checklist

- **Use HTTPS.** The default local deployment listens on HTTP; terminate TLS at Nginx or an upstream ingress before exposing the API outside a trusted network.
- **Keep credentials server-side.** If a browser or mobile app needs the capability, call your own backend first and let that backend call Astron Agent.
- **Separate applications and credentials.** Use different Astron applications for environments or consumers that need independent rotation and revocation.
- **Set streaming-aware timeouts.** The bundled gateway allows long-lived workflow streams, but every proxy and client in front of it must also disable buffering and allow suitable read timeouts.
- **Use stable IDs.** Generate `uid` and `chat_id` from your system; do not put secrets or sensitive personal data in either value.
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
