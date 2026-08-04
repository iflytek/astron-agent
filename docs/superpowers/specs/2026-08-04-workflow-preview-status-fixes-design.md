# Workflow Preview and Node Status Fixes Design

## Goal

Fix two workflow debugging regressions without changing the Agent Event Protocol:

1. A successfully completed workflow must not display a still-running node as cancelled.
2. The user-dialogue preview for an unpublished workflow draft must execute the draft instead of requiring a published workflow version.

## Scope

The change is limited to console workflow-debug state handling, chat-preview routing and request parameters, and console-backend workflow version selection. It does not change Pi runtime events, workflow execution semantics, publishing, or historical-version playback.

## Chosen Approach

Use a coordinated frontend/backend fix.

- The frontend uses the existing route contract `/chat/:botId/:version?` consistently and forwards the resolved version or preview mode with every initial, resumed, and option-based chat request.
- The backend treats `debugger` as a preview-mode sentinel rather than a published version name. Preview mode selects the workflow debug endpoint before published-version resolution and sends no published version for the current draft.
- Explicit historical version names retain the existing published-version validation and fallback behavior.
- Workflow completion maps leftover `running` nodes according to the overall result: success becomes `success`; abnormal termination becomes `cancel` with the existing termination reason.
- The chat UI keeps a friendly fallback message but records the server-provided reason for diagnostics instead of discarding it.

## Alternatives Considered

### Frontend-only repair

Correcting the URL and forwarding `debugger` would still fail because the backend currently validates it as if it were a published version. This does not solve the root cause.

### Backend-only inference

Inferring debug mode solely from marketplace status would leave the route mismatch, omit version information from resumed requests, and fail for an already-published bot whose current draft is being previewed.

### Coordinated repair (selected)

Making preview mode explicit at both boundaries preserves historical-version behavior and works for both unpublished and already-published bots.

## Data Flow

### Current draft preview

1. The workflow editor opens `/chat/{botId}/debugger`.
2. The chat page resolves `version` to `debugger`.
3. Every chat action submits `workflowVersion=debugger`.
4. The backend recognizes preview mode, selects the debug endpoint, and builds the workflow request without a published version.
5. The current draft protocol, already synchronized by the workflow editor, is executed.

### Historical version preview

1. The workflow editor opens `/chat/{botId}/{versionName}`.
2. Every chat action submits the version name.
3. The backend validates that version and executes it with existing version semantics.

### Workflow completion

1. The frontend receives the terminal workflow message.
2. It derives the overall result from the terminal code.
3. Remaining `running` nodes become `success` when the workflow succeeded.
4. Remaining `running` nodes become `cancel` with a termination reason when the workflow failed or stopped abnormally.

## Error Handling

- Missing or invalid published versions continue to produce the existing backend business error.
- `debugger` never enters published-version lookup.
- The user sees a concise failure response; the structured message state retains the backend error text for logging and troubleshooting.
- A successful terminal message clears any stale cancellation reason from nodes finalized as successful.

## Tests

### Frontend

- A successful terminal message changes a leftover running node to `success`, not `cancel`.
- A failed terminal message keeps the existing cancellation behavior for leftover running nodes.
- The preview launcher generates the route shape consumed by the router.
- Initial and workflow-option messages forward the active preview/version value.

### Backend

- `workflowVersion=debugger` with no successful published version selects the debug endpoint and does not query for a published version.
- A named published version still uses that version.
- A blank or stale version on a normal published chat retains the latest-successful fallback behavior.

### Acceptance

- Run a PPT workflow to completion and confirm the end node displays success.
- Open the current draft in the user-dialogue preview, submit a prompt, and confirm execution reaches the workflow/Pi runtime rather than returning `未查询到对应的工作流版本`.
- Confirm the generated PPT answer and download link remain visible.

## Non-goals

- Redesigning the chat error component.
- Changing workflow publishing rules.
- Modifying Agent Event Protocol v1 or Pi Adapter event mappings.
- Refactoring unrelated workflow store code.
