# Workflow Preview and Node Status Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make successful workflow runs display successful terminal nodes and make the user-dialogue preview execute the current unpublished draft.

**Architecture:** Add small pure frontend helpers for terminal-node settlement and preview route/version normalization, then integrate them into the existing workflow store and chat hook. Treat `debugger` as an explicit draft-preview mode in the console backend so it selects the debug endpoint without published-version lookup, while keeping named and normal published-version behavior unchanged.

**Tech Stack:** React 18, TypeScript 5, Zustand, Node test runner, Java 21, Spring Boot 3.5, JUnit 5, Mockito, Maven.

## Global Constraints

- Do not change Agent Event Protocol v1 or Pi Adapter event mappings.
- Do not change workflow publishing rules or historical-version semantics.
- Keep changes surgical; do not refactor unrelated workflow or chat code.
- A successful terminal message must clear stale cancellation reasons from nodes finalized as successful.
- The user-facing error remains concise while the message state retains the server-provided diagnostic reason.
- Use `npm run build-prod`; do not use the development build for the live production-mounted frontend.

---

## File Structure

- `console/frontend/src/components/workflow/store/workflow-terminal-status.ts`: pure terminal-node settlement logic.
- `console/frontend/src/components/workflow/store/flow-chat-function.ts`: calls terminal settlement when a workflow terminal message arrives.
- `console/frontend/src/hooks/chat-preview-version.ts`: pure preview URL and request-version helpers.
- `console/frontend/src/hooks/use-chat.ts`: reads the active route version, includes it in every chat request, and preserves server error details.
- `console/frontend/src/types/chat.ts`: carries an optional diagnostic `errorMessage` on a chat message.
- `console/frontend/src/store/chat-store.ts`: stores `errorMessage` when settling an errored stream.
- `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/workflow/impl/WorkflowBotChatServiceImpl.java`: selects draft preview without published-version lookup.
- Frontend `_tests_` and existing backend unit tests: regression coverage.

### Task 1: Settle Remaining Running Nodes from the Workflow Result

**Files:**
- Create: `console/frontend/src/components/workflow/store/workflow-terminal-status.ts`
- Create: `console/frontend/_tests_/workflow-terminal-status.test.ts`
- Modify: `console/frontend/src/components/workflow/store/flow-chat-function.ts:528-581`

**Interfaces:**
- Consumes: terminal workflow success as `boolean`, translated cancellation reason as `string`, and nodes whose `data.status` may be `running`.
- Produces: `settleRunningNodes<T extends TerminalNode>(nodes: T[], succeeded: boolean, cancellationReason: string): T[]`.

- [ ] **Step 1: Write the failing terminal-node tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { settleRunningNodes } from '../src/components/workflow/store/workflow-terminal-status.ts';

test('successful workflow settles a leftover running node as success', () => {
  const nodes = [
    {
      id: 'end',
      data: {
        status: 'running',
        debuggerResult: { cancelReason: 'stale reason' },
      },
    },
  ];

  const settled = settleRunningNodes(nodes, true, 'workflow terminated');

  assert.equal(settled[0]?.data.status, 'success');
  assert.equal(settled[0]?.data.debuggerResult.cancelReason, undefined);
  assert.equal(nodes[0]?.data.status, 'running');
});

test('failed workflow cancels a leftover running node with the termination reason', () => {
  const settled = settleRunningNodes(
    [{ id: 'end', data: { status: 'running', debuggerResult: {} } }],
    false,
    'workflow terminated'
  );

  assert.equal(settled[0]?.data.status, 'cancel');
  assert.equal(
    settled[0]?.data.debuggerResult.cancelReason,
    'workflow terminated'
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `console/frontend`:

```bash
node --test --loader ts-node/esm _tests_/workflow-terminal-status.test.ts
```

Expected: FAIL because `workflow-terminal-status.ts` does not exist.

- [ ] **Step 3: Implement the pure settlement helper**

```ts
type TerminalDebuggerResult = {
  cancelReason?: string;
  [key: string]: unknown;
};

export type TerminalNode = {
  data: {
    status?: string;
    debuggerResult?: TerminalDebuggerResult;
    [key: string]: unknown;
  };
};

export const settleRunningNodes = <T extends TerminalNode>(
  nodes: T[],
  succeeded: boolean,
  cancellationReason: string
): T[] =>
  nodes.map(node => {
    if (node.data.status !== 'running') return node;

    const { cancelReason: _cancelReason, ...debuggerResult } =
      node.data.debuggerResult ?? {};
    return {
      ...node,
      data: {
        ...node.data,
        status: succeeded ? 'success' : 'cancel',
        debuggerResult: succeeded
          ? debuggerResult
          : { ...debuggerResult, cancelReason: cancellationReason },
      },
    } as T;
  });
```

- [ ] **Step 4: Integrate the helper into terminal message handling**

Replace unconditional cancellation with result-aware settlement:

```ts
const handleRunningNodeStatus = (succeeded: boolean): void => {
  const setNodes = useFlowStore.getState().setNodes;
  setNodes(nodes =>
    settleRunningNodes(
      nodes,
      succeeded,
      i18n.t('workflow.nodes.chatDebugger.workflowTerminated')
    )
  );
};

// In handleMessageEnd:
handleRunningNodeStatus(data.code === 0);
```

- [ ] **Step 5: Run focused and related frontend tests and verify GREEN**

Run from `console/frontend`:

```bash
node --test --loader ts-node/esm _tests_/workflow-terminal-status.test.ts
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add console/frontend/src/components/workflow/store/workflow-terminal-status.ts console/frontend/src/components/workflow/store/flow-chat-function.ts console/frontend/_tests_/workflow-terminal-status.test.ts
git commit -m "fix(workflow): settle terminal node status from result"
```

### Task 2: Preserve Preview Mode through Routing and Chat Requests

**Files:**
- Create: `console/frontend/src/hooks/chat-preview-version.ts`
- Create: `console/frontend/_tests_/chat-preview-version.test.ts`
- Modify: `console/frontend/src/hooks/use-chat.ts:1-46,313-350`

**Interfaces:**
- Consumes: browser origin, bot ID, optional preview/history version, optional per-request version override.
- Produces: `buildWorkflowChatUrl(origin: string, botId: number, version?: string): string` and `resolveWorkflowChatVersion(explicitVersion?: string, routeVersion?: string): string`.

- [ ] **Step 1: Write failing route and request-version tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkflowChatUrl,
  resolveWorkflowChatVersion,
} from '../src/hooks/chat-preview-version.ts';

test('draft preview URL uses the router version segment', () => {
  assert.equal(
    buildWorkflowChatUrl('http://localhost', 8, 'debugger'),
    'http://localhost/chat/8/debugger'
  );
});

test('named versions are encoded in the router version segment', () => {
  assert.equal(
    buildWorkflowChatUrl('http://localhost', 8, 'release 1'),
    'http://localhost/chat/8/release%201'
  );
});

test('request override wins and route version is the default', () => {
  assert.equal(resolveWorkflowChatVersion(undefined, 'debugger'), 'debugger');
  assert.equal(resolveWorkflowChatVersion('v2', 'debugger'), 'v2');
  assert.equal(resolveWorkflowChatVersion(undefined, undefined), '');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `console/frontend`:

```bash
node --test --loader ts-node/esm _tests_/chat-preview-version.test.ts
```

Expected: FAIL because `chat-preview-version.ts` does not exist.

- [ ] **Step 3: Implement the preview helpers**

```ts
export const buildWorkflowChatUrl = (
  origin: string,
  botId: number,
  version?: string
): string => {
  const base = `${origin}/chat/${botId}`;
  return version ? `${base}/${encodeURIComponent(version)}` : base;
};

export const resolveWorkflowChatVersion = (
  explicitVersion?: string,
  routeVersion?: string
): string => explicitVersion ?? routeVersion ?? '';
```

- [ ] **Step 4: Make `useChat` inherit the active route version**

Import `useParams` and the two helpers, then resolve the version inside the hook:

```ts
const { version: routeVersion } = useParams<{ version?: string }>();

// In onSendMsg:
form.append(
  'workflowVersion',
  resolveWorkflowChatVersion(version, routeVersion)
);

// In handleFlowToChat:
const url = buildWorkflowChatUrl(
  window.location.origin,
  item?.botId,
  item?.version
);
window.open(url, '_blank');
```

Because every initial, resumed, ignored, aborted, and option-based action calls the same `onSendMsg`, this change covers every chat action without prop drilling.

- [ ] **Step 5: Run focused and related frontend tests and verify GREEN**

Run from `console/frontend`:

```bash
node --test --loader ts-node/esm _tests_/chat-preview-version.test.ts
npm run test:unit
npm run type-check
```

Expected: all tests and type checking PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add console/frontend/src/hooks/chat-preview-version.ts console/frontend/src/hooks/use-chat.ts console/frontend/_tests_/chat-preview-version.test.ts
git commit -m "fix(chat): preserve workflow preview mode"
```

### Task 3: Execute Draft Preview without a Published Version

**Files:**
- Modify: `console/backend/commons/src/test/java/com/iflytek/astron/console/commons/service/workflow/impl/WorkflowBotChatServiceImplTest.java`
- Modify: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/workflow/impl/WorkflowBotChatServiceImpl.java:103-167,195-208`

**Interfaces:**
- Consumes: `workflowVersion` where the exact case-insensitive value `debugger` means current-draft preview.
- Produces: draft preview request sent to `debugUrl` with a null workflow request version and no `WorkflowVersionLookupService` call.

- [ ] **Step 1: Add the failing backend regression test**

Add a test that uses an on-shelf bot to prove that the explicit sentinel, not marketplace state, selects draft preview:

```java
@Test
void chatWorkflowBotShouldExecuteDebuggerDraftWithoutPublishedVersion() throws Exception {
    when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
    when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
    when(workflowBotParamService.handleMultiFileParam(
            anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

    List<ChatReqModelDto> reqList = new ArrayList<>();
    when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);
    ChatRequestDtoList history = new ChatRequestDtoList();
    history.setMessages(new LinkedList<>());
    when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(history);

    ChatBotMarket market = new ChatBotMarket();
    market.setBotStatus(ShelfStatusEnum.ON_SHELF.getCode());
    when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(market);

    List<List<?>> constructorArgs = new ArrayList<>();
    try (MockedConstruction<WorkflowClient> clients = mockConstruction(
            WorkflowClient.class,
            (mock, context) -> constructorArgs.add(context.arguments()))) {
        workflowBotChatService.chatWorkflowBot(
                chatBotReqDto, sseEmitter, sseId, workflowOperation, "debugger");

        assertEquals(1, clients.constructed().size());
        assertEquals("http://test-debug.com", constructorArgs.get(0).get(0));
        RequestBody body = (RequestBody) constructorArgs.get(0).get(4);
        Buffer buffer = new Buffer();
        body.writeTo(buffer);
        assertNull(JSON.parseObject(buffer.readUtf8()).getString("version"));
        verifyNoInteractions(workflowVersionLookupService);
    }
}
```

- [ ] **Step 2: Run the focused backend test and verify RED**

Run from `console/backend`:

```bash
mvn -pl commons -Dtest=WorkflowBotChatServiceImplTest#chatWorkflowBotShouldExecuteDebuggerDraftWithoutPublishedVersion test
```

Expected: FAIL with `WORKFLOW_VERSION_NOT_FOUND`, a version-lookup interaction, or construction using the non-debug endpoint.

- [ ] **Step 3: Implement explicit draft-preview selection**

Add the sentinel helper and branch before published-version resolution:

```java
private static final String DEBUGGER_VERSION = "debugger";

private boolean isDraftPreview(String workflowVersion) {
    return DEBUGGER_VERSION.equalsIgnoreCase(StrUtil.trim(workflowVersion));
}

// After resolving flowId:
boolean draftPreview = isDraftPreview(workflowVersion);
String effectiveWorkflowVersion = draftPreview
        ? null
        : resolveWorkflowVersion(botId, flowId, workflowVersion);

// When choosing the endpoint:
if (draftPreview || market == null || ShelfStatusEnum.isOffShelf(market.getBotStatus())) {
    apiUsedUrl = debugUrl;
    isDebug = true;
} else {
    apiUsedUrl = chatUrl;
}
```

- [ ] **Step 4: Run backend regression tests and verify GREEN**

Run from `console/backend`:

```bash
mvn -pl commons -Dtest=WorkflowBotChatServiceImplTest test
```

Expected: the new debugger test and existing blank, stale, named, debug-URL, and chat-URL tests all PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/workflow/impl/WorkflowBotChatServiceImpl.java console/backend/commons/src/test/java/com/iflytek/astron/console/commons/service/workflow/impl/WorkflowBotChatServiceImplTest.java
git commit -m "fix(workflow): allow unpublished draft preview"
```

### Task 4: Preserve the Server Error Reason on Failed Chat Messages

**Files:**
- Modify: `console/frontend/_tests_/chat-store-streaming.test.js`
- Modify: `console/frontend/src/types/chat.ts:167-183,289-295`
- Modify: `console/frontend/src/store/chat-store.ts:165-194`
- Modify: `console/frontend/src/hooks/use-chat.ts:245-268`

**Interfaces:**
- Consumes: optional server SSE `message` or string-valued `error`.
- Produces: `MessageListType.errorMessage?: string` and `finishStreamingMessage(sid?, reqId?, status?, errorMessage?)`.

- [ ] **Step 1: Write the failing store regression test**

Append to `chat-store-streaming.test.js`:

```js
test('failed chat stream preserves the server diagnostic reason', () => {
  const store = useChatStore.getState();
  store.initChatStore();
  store.startStreamingMessage({ message: '', reqType: 'BOT' });
  store.finishStreamingMessage(
    'sid-1',
    11,
    'error',
    '未查询到对应的工作流版本'
  );

  const failed = useChatStore.getState().messageList.at(-1);
  assert.equal(failed?.streamStatus, 'error');
  assert.equal(failed?.errorMessage, '未查询到对应的工作流版本');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `console/frontend`:

```bash
node --test --loader ts-node/esm _tests_/chat-store-streaming.test.js
```

Expected: FAIL because the settled message does not contain `errorMessage`.

- [ ] **Step 3: Extend the message and store interfaces**

Add the optional field and fourth settlement argument:

```ts
export interface MessageListType {
  id?: number;
  message: string;
  reasoning?: string;
  traceSource?: string;
  sourceType?: 'search' | 'web_search' | string;
  chatFileList?: UploadFileInfo[] | null;
  reqId?: number;
  reqType?: string;
  sid?: string;
  tools?: string[];
  updateTime?: string;
  workflowEventData?: WorkflowEventData;
  agentStream?: AgentStreamState;
  streamStatus?: ChatStreamStatus;
  errorMessage?: string;
}

finishStreamingMessage: (
  sid?: string,
  reqId?: number,
  status?: Exclude<ChatStreamStatus, 'streaming'>,
  errorMessage?: string
) => void;
```

Write `errorMessage` onto the settled message only when supplied:

```ts
finishStreamingMessage: (
  sid,
  reqId,
  status = 'completed',
  errorMessage
): void =>
  set(state => {
    if (state.messageList.length === 0) return state;

    const updatedMessageList = [...state.messageList];
    const lastIndex = updatedMessageList.length - 1;
    const lastMessage = updatedMessageList[lastIndex];
    if (lastMessage?.streamStatus !== 'streaming') {
      return {
        isLoading: false,
        answerPercent: 0,
        streamId: '',
      };
    }

    updatedMessageList[lastIndex] = {
      ...lastMessage,
      message: lastMessage.message || '',
      sid,
      reqId,
      streamStatus: status,
      ...(errorMessage ? { errorMessage } : {}),
      workflowEventData: {
        workflowOperation: state.workflowOperation,
        option: state.workflowOption?.option,
        content: state.workflowOption?.content,
      },
    };

    return {
      messageList: updatedMessageList,
      isLoading: false,
      answerPercent: 0,
      traceSource: '',
      sourceType: '',
      deepThinkText: '',
      currentToolName: '',
      streamId: '',
    };
  });
```

- [ ] **Step 4: Forward the SSE diagnostic reason without changing user copy**

In the error branch of `use-chat.ts`:

```ts
const errorMessage =
  typeof message === 'string'
    ? message
    : typeof error === 'string'
      ? error
      : undefined;

updateStreamingMessage(ans || ERROR_TEXT);
finishStreamingMessage(
  sidRef.current,
  reqIdRef.current,
  'error',
  errorMessage
);
```

- [ ] **Step 5: Run store, frontend unit, and type checks and verify GREEN**

Run from `console/frontend`:

```bash
node --test --loader ts-node/esm _tests_/chat-store-streaming.test.js
npm run test:unit
npm run type-check
```

Expected: all tests and type checking PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add console/frontend/src/types/chat.ts console/frontend/src/store/chat-store.ts console/frontend/src/hooks/use-chat.ts console/frontend/_tests_/chat-store-streaming.test.js
git commit -m "fix(chat): retain stream failure reason"
```

### Task 5: Build and End-to-End Acceptance

**Files:**
- Verify only; no production file changes expected.

**Interfaces:**
- Consumes: completed fixes from Tasks 1-4 and the running local Astron Agent stack.
- Produces: passing frontend/backend checks and browser evidence for both reported regressions.

- [ ] **Step 1: Run the complete targeted verification suite**

Run from the worktree root:

```bash
cd console/frontend && npm run test:unit && npm run type-check && npm run build-prod
cd ../backend && mvn -pl commons -Dtest=WorkflowBotChatServiceImplTest test
```

Expected: unit tests, type checking, production build, and backend tests all PASS.

- [ ] **Step 2: Verify the successful workflow terminal state in the browser**

Use the existing signed-in Chrome session to run the PPT workflow. Expected:

- Overall workflow status is successful.
- The end node displays success, never cancel.
- The Agent execution timeline and final answer remain visible.

- [ ] **Step 3: Verify unpublished draft user preview in the browser**

Open the workflow editor's user-dialogue preview and send a PPT request. Expected:

- URL is `/chat/{botId}/debugger`.
- The request reaches workflow/Pi execution.
- No `未查询到对应的工作流版本` response occurs.
- The generated answer retains the PPT download link.

- [ ] **Step 4: Inspect service logs for both runs**

Confirm the preview request uses the workflow debug endpoint and that neither run emits a new console-hub exception, frontend uncaught error, or Pi runtime protocol error.

- [ ] **Step 5: Run diff hygiene checks**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intentional committed changes.
