# Workflow model execution

The workflow model node (`spark-llm` in the graph format) calls
`POST /agent/v1/llm/chat/completions`. Workflow owns variable substitution,
history selection, output parsing and downstream streaming; Agent owns the
single model invocation. Agent nodes continue to use the separate Deep Agents
endpoint. Decision and parameter extraction use provider-independent prompts.

Configure models in Console with the `openai`, `anthropic` or `google` protocol,
an HTTP(S) endpoint, model identifier and API key. Model names and brands do not
select the protocol. Console resolves the authorized model configuration for
execution; platform service credentials are separate from model credentials.
Model node parameters persist only a `modelId` reference, never `apiKey` or
`apiSecret`. Immediately before each model invocation, Workflow fetches the
current model settings from Console with the authorized workflow group ID.
The response is used only for that inference request; keys are not cached in
the workflow graph or engine. This also applies to single-node debugging,
subflows and nodes that run after a pause. Rotated or revoked model access is
therefore checked again on the next invocation.

Knowledge retrieval has a separate internal helper model for adaptive search.
It continues to use the deployment-managed `KNOWLEDGE_NODE_LLM_*` OpenAI-compatible
configuration; the knowledge UI does not select a registered model. Its key is
read only when creating the temporary inference client, never copied into the
node or graph. Direct retrieval does not invoke a model.

Set `MODEL_RUNTIME_CONFIG_URL` to the Console internal endpoint, for example
`http://console-hub:8080/model/internal-runtime-config`. Console, Workflow and
Agent share `WORKFLOW_INTERNAL_API_KEY`; the broker accepts authenticated GET
requests with `flowId` and `modelId` and returns the current authorized model.
Broker failures stop inference without falling back to graph credentials.

Workflow must be able to reach `AGENT_BASE_URL`. Both services must share the
existing `WORKFLOW_INTERNAL_API_KEY` (or its `_FILE` alternative). Signed trace
configuration is shared with the existing Agent-node integration. Deploy Agent,
Workflow and Console together so the new inference endpoint and model settings
are available before executing workflows.

The model node has one remote path. It does not retry through a direct provider
connection. The node timeout bounds the Agent generation; Workflow allows a
short transport margin for the final response. Completion requires a terminal
frame and `[DONE]`. Cancellation closes the upstream connection. Workflow
records the node/client observation; Agent records the generation and usage.

Provider streams are handled by the official model integrations in Agent;
Workflow consumes platform SSE using `httpx-sse`. Native model WebSocket
clients, model-specific signing and frame formats are not part of this runtime.
Platform canvas WebSockets and independent tool services have separate roles.

From the repository root, run the module tests using its installed environment:

```sh
PYTHONPATH=core core/workflow/.venv/bin/python -m pytest core/workflow/tests
```

The Agent endpoint contract and supported generation parameters are described
in [Agent](../agent/README.md). Tests with controlled models verify the transport
and node contract; real model capability and deployment checks still require
the configured target services.
