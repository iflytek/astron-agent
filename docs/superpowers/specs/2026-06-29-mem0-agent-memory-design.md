# Mem0 Agent Memory Design

## Goal

Add cloud memory to standalone Agent conversations with Mem0 as the first provider. The feature covers normal Agent chat and the Agent configuration debug chat shown in the workbench. Workflow Agent nodes and `core/agent` workflow execution are out of scope for this iteration.

The implementation should let an Agent remember useful user preferences and facts across sessions while keeping the provider replaceable for future memory frameworks.

## Scope

In scope:

- Normal Agent chat through `/chat-message/chat`.
- Normal Agent re-answer through `/chat-message/re-answer`, with memory retrieval enabled but memory writing disabled in the first version.
- Agent workbench debug chat through `/chat-message/bot-debug`.
- A memory management UI in the Agent configuration page.
- Page-based Mem0 API key configuration for each Agent.
- A provider abstraction with Mem0 and no-op implementations.

Out of scope:

- Workflow Agent nodes.
- `core/agent` prompt assembly.
- Workflow bot memory injection.
- Sharing memories between users.
- A full audit console for all users and all Agents.

## Current Project Context

The Agent workbench debug panel uses `PromptTry` in `console/frontend/src/components/prompt-try/index.tsx`. It posts form data to `/chat-message/bot-debug`. The configuration page already manages debug sessions through `/agent-debug/sessions` and persists debug messages in `agent_debug_session` and `agent_debug_message`.

The Java backend receives debug chat in `ChatMessageController.botDebug`, builds `DebugChatBotReqDto`, then calls `BotChatServiceImpl.debugChatMessageBot`. Normal standalone Agent chat enters `BotChatServiceImpl.chatMessageBot`. Both non-workflow paths eventually call `SpringAiAgentChatService.chat`, which streams through Spring AI.

This makes `console/backend` the right integration point for the first version. The existing `core/memory` module is a database operation service, not the Agent long-term memory layer.

## Architecture

Introduce a memory abstraction under the Console backend:

- `AgentMemoryService`
  - `search(MemorySearchRequest)`
  - `add(MemoryAddRequest)`
  - `list(MemoryListRequest)`
  - `delete(MemoryDeleteRequest)`
  - `clear(MemoryClearRequest)`
- `AgentMemoryProvider`
  - `Mem0AgentMemoryProvider`
  - `NoopAgentMemoryProvider`

Business code depends on `AgentMemoryService`, not on Mem0 directly. `AgentMemoryService` handles provider selection, enablement checks, request shaping, error logging, and fallback behavior. `Mem0AgentMemoryProvider` owns Mem0 HTTP calls.

Provider-neutral DTOs should use Astron concepts:

- `spaceId`
- `uid`
- `botId`
- `chatId`
- `debugSessionId`
- `source`, either `chat` or `debug`
- `query`
- `messages`

Mem0-specific mapping stays inside the provider:

- `user_id`: stable hash of `spaceId + uid`.
- `agent_id`: `bot:{botId}`.
- `app_id`: `astron-agent`.
- `run_id`: `chat:{chatId}` for normal chat, `debug:{debugSessionId}` for debug chat.
- `metadata`: `space_id`, `uid_hash`, `bot_id`, `source`, `chat_id` or `debug_session_id`.

Do not send raw UID to Mem0. Use a deterministic hash so the backend can query the same memory scope without exposing internal user identifiers to the memory vendor.

The Mem0 API key is not read from application configuration. It is configured from the Agent page, stored per `spaceId + botId`, and decrypted only on the backend when the provider makes Mem0 calls.

## Prompt Flow

For normal standalone Agent chat:

1. Validate request and bot access as today.
2. Create the local chat request record.
3. Search memory before building the final message list.
4. Format retrieved memory as a compact system prompt supplement.
5. Build messages with the existing prompt, memory supplement, local history, knowledge content, and current question.
6. Stream the model response.
7. Persist the local response as today.
8. After completion, enqueue an asynchronous memory write.

For debug chat:

1. Frontend sends `botId` and `debugSessionId` with `/chat-message/bot-debug`.
2. Backend validates user and bot access.
3. Search memory before building the debug message list.
4. Inject the memory supplement into the debug prompt.
5. Stream the model response.
6. After completion, enqueue an asynchronous memory write.

Memory supplement format:

```text
用户长期记忆参考：
1. ...
2. ...

使用规则：
- 仅在与当前问题相关时参考这些记忆。
- 不要向用户暴露记忆系统、检索过程或记忆编号。
- 如果记忆和当前问题冲突，以当前问题为准。
```

The supplement should be omitted when there are no memories or when memory search fails. Limit retrieved memories to a configurable `topK` and a maximum formatted length.

## Search Policy

Use default pre-retrieval for enabled Agents instead of exposing memory as a model-called tool.

Rationale:

- Memory is context infrastructure, not an optional capability the model may or may not invoke.
- Default retrieval is easier to reason about, test, observe, and explain.
- Tool-based retrieval can silently skip memory and produce inconsistent behavior.

Add simple skip rules:

- Skip when memory is disabled.
- Skip when the user input is blank.
- Skip for short acknowledgement-only utterances such as "好的", "谢谢", "继续", "ok".
- Skip when the current Agent has no configured Mem0 API key.

All other user turns search memory. Search timeouts degrade to empty results and never block chat.

## Write Policy

Write memory after successful full response generation.

Write asynchronously after local persistence and stream completion. Memory write failure should not alter the chat response. Log failures with `streamId`, `botId`, `source`, and a sanitized reason.

Do not write when:

- The model response is empty.
- The stream is interrupted or stopped.
- The request failed.
- The turn is `/chat-message/re-answer` in the first version.
- Memory is disabled.

For each write, send the original user question and final assistant answer to Mem0. Let Mem0 extract durable memories. The local service can additionally skip obviously low-value turns where both messages are very short.

## Configuration

Backend properties provide only feature defaults and provider runtime tuning:

```yaml
agent:
  memory:
    provider: mem0
    base-url: https://api.mem0.ai
    timeout-ms: 1200
    top-k: 5
    max-context-chars: 1500
```

No Mem0 API key is configured in application files. Use a no-op provider when the Agent-level memory config is disabled or when the Agent-level API key is missing.

Agent-level enablement and provider credentials should be persisted per bot, preferably in a new table instead of overloading the existing bot prompt/config fields:

```text
agent_memory_config
- id
- bot_id
- space_id
- provider
- enabled
- api_key_ciphertext
- api_key_mask
- api_key_configured
- create_time
- update_time
```

API key handling:

- The Agent configuration UI lets an authorized Agent editor enter or replace the Mem0 API key.
- The frontend must encrypt the key before submission, reusing the existing model-management RSA public key and `encryptApiKey` flow where possible.
- The backend decrypts the submitted key, validates that it is non-empty, then stores it encrypted or otherwise protected at rest following the existing model API key pattern.
- Config read APIs return only `apiKeyConfigured` and `apiKeyMask`, never the raw key.
- If the user saves config without changing the masked key, the backend keeps the existing stored key.
- A dedicated clear-key action can remove the stored key and automatically disable memory for that Agent.

## Management API

Add Console backend endpoints:

```text
GET    /agent-memory/config?botId=
PUT    /agent-memory/config
DELETE /agent-memory/config/api-key?botId=
GET    /agent-memory/memories?botId=&keyword=
DELETE /agent-memory/memories/{memoryId}?botId=
DELETE /agent-memory/memories?botId=
```

Access rules:

- The current user must have permission for the bot in the current space.
- Only users allowed to edit the Agent can save, replace, or clear the Mem0 API key.
- List/delete/clear only operate on the current `spaceId + uid + botId` memory scope.
- Single-memory deletion requires `botId` so the backend can verify the current Agent scope before calling the provider.
- API responses should not include provider secrets.

Config response fields:

- `botId`
- `provider`
- `enabled`
- `apiKeyConfigured`
- `apiKeyMask`
- `providerStatus`, such as `ready`, `missing_api_key`, or `disabled`

Config save request fields:

- `botId`
- `provider`
- `enabled`
- `encryptedApiKey`, optional
- `apiKeyMasked`, optional, indicating that the submitted value is the existing mask and should not replace the stored key.

Suggested response fields for memories:

- `id`
- `content`
- `source`
- `createdAt`
- `updatedAt`
- `metadata`

## Frontend UI

Add a "云端记忆" section to the Agent configuration page, under personalization settings or near the existing Agent capability configuration.

Controls:

- Enable/disable switch.
- Provider display: Mem0.
- API Key password input with save/replace behavior.
- Masked saved-key display, for example `sk-****abcd`.
- Clear key action.
- Status hint:
  - Enabled and key configured.
  - Enabled but missing API key.
  - Disabled.
- "管理记忆" button.

Management drawer:

- Search box.
- Memory list with content, source, and update time.
- Delete single memory.
- Clear all memories for the current Agent and current user.
- Empty, loading, and error states.

The UI must not expose the raw Mem0 API key after save. It should explain scope in product terms: the provider key is configured for the current Agent, while memories are scoped to the current user, current space, and current Agent.

The debug chat request should include `botId` and `debugSessionId` so backend memory scope can be precise. The current `PromptTry` request only sends prompt, model, current text, tools, datasets, and flattened history.

## Data Flow

Normal chat retrieval:

```text
Frontend -> /chat-message/chat
Backend validates chat and bot
Backend creates ChatReqRecords
AgentMemoryService.search
BotChatServiceImpl builds messages with memory supplement
SpringAiAgentChatService streams response
Local response is persisted
AgentMemoryService.add runs asynchronously
```

Debug chat retrieval:

```text
Frontend PromptTry -> /chat-message/bot-debug with botId/debugSessionId
Backend validates bot access
AgentMemoryService.search
BotChatServiceImpl builds debug messages with memory supplement
SpringAiAgentChatService streams response
AgentMemoryService.add runs asynchronously after completion
Frontend persists debug messages through existing agent-debug APIs
```

## Error Handling

Memory search failure:

- Log warning.
- Continue with no memory supplement.
- Do not surface an error in chat SSE.

Memory write failure:

- Log warning or error depending on failure type.
- Do not retry synchronously.
- First version can rely on one async attempt. A later version may add retry with a small queue.

Provider disabled or misconfigured:

- Runtime uses no-op provider.
- Management UI shows configuration status.
- Chat behavior is unchanged.

API key save failure:

- Return a normal API error to the configuration UI.
- Do not enable memory if the submitted key cannot be decrypted or stored.
- Never echo the submitted key in logs or responses.

Delete and clear failures:

- Return a normal API error to the management UI.
- The UI keeps the current list and shows an error message.

## Observability

Add logs around:

- Memory search start/end, with duration and count.
- Memory search timeout/failure.
- Memory write scheduled and completed.
- Memory write failure.
- Memory config changes.

Avoid logging raw memory content, full user messages, or API keys.

## Testing

Backend unit tests:

- Provider selection falls back to no-op when disabled.
- Provider selection falls back to no-op when the Agent has no configured key.
- Search maps Astron scope to Mem0 scope correctly.
- Search failures return empty memories.
- Memory supplement is injected when search returns memories.
- Memory supplement is omitted when disabled or empty.
- Write is skipped for empty/interrupted/re-answer turns.
- Config/list/delete/clear endpoints enforce bot permission.
- Config APIs never return raw API keys.
- Saving a masked existing key preserves the stored key.
- Clearing the key disables memory for that Agent.

Frontend tests:

- Cloud memory section renders states.
- API key input encrypts before submit and never displays the raw saved key.
- Enable switch calls config API.
- Management drawer lists, searches, deletes, and clears memories.
- Debug request includes `botId` and `debugSessionId`.

Manual acceptance:

- Enable memory for a standalone Agent.
- Tell it a durable preference in one chat.
- Start a new chat and ask a related question.
- Confirm the Agent uses the remembered preference.
- Open memory management UI and see/delete the memory.
- Disable memory and confirm no memory context is used.

## Rollout

Existing deployments remain unchanged because every Agent starts with memory disabled and no provider API key.

Memory becomes active only after an authorized user configures a Mem0 key on the Agent page and enables memory for that Agent.
