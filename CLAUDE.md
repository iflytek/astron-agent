# CLAUDE.md

## Project Overview

Astron Agent is an enterprise-grade Agentic Workflow development platform. It includes the console frontend and backend, multiple core microservices, a plugin system, and deployment and infrastructure configuration. The repository uses a multi-language, multi-module structure. The primary languages are TypeScript, Java, Python, and Go.

## Repository Structure

### Console

- `console/frontend`
  - React 18 + TypeScript + Vite frontend application
  - Responsible for the console UI, agent creation, chat interface, workflow visualization, model management, plugin marketplace, and related features
- `console/backend`
  - Java Spring Boot backend
  - Responsible for console REST APIs, SSE, authentication, management capabilities, and business aggregation
  - Main submodules:
    - `hub`
    - `toolkit`
    - `commons`

### Core Microservices

- `core/agent`
  - Python FastAPI service
  - Responsible for the agent execution engine, Chat/CoT/CoT Process Agent, plugin invocation, and session context handling
- `core/workflow`
  - Python FastAPI service
  - Responsible for workflow orchestration, execution, debugging, versioning, and event handling
- `core/knowledge`
  - Python FastAPI service
  - Responsible for the knowledge base, document processing, vectorization, retrieval, and RAG integration
- `core/memory`
  - Python module
  - Responsible for conversation history, short-term and long-term memory, and session persistence
- `core/tenant`
  - Go service
  - Responsible for multi-tenancy, space isolation, organization management, and resource quota management
- `core/plugin`
  - Plugin capability directory
  - Includes plugin services such as `aitools`, `rpa`, and `link`
- `core/common`
  - Python shared capability module
  - Responsible for abstractions around authentication, logging, observability, databases, cache, message queues, object storage, and other infrastructure concerns

### Other Directories

- `docs`
  - Project documentation, deployment, configuration, and module descriptions
  - For architectural understanding, refer first to `docs/zh/PROJECT_MODULES.md`
- `docker`
  - Docker Compose and related infrastructure configuration
- `helm`
  - Helm Charts and Kubernetes deployment configuration

## Typical Communication Flows

- Frontend -> Console Backend: HTTP/REST, SSE
- Console Backend -> Core Services: HTTP/REST
- Core Services -> Core Services: Kafka event-driven communication

## Behavioral Guidelines to Reduce Common LLM Coding Mistakes

Merge these with project-specific instructions as needed.

Tradeoff: These guidelines prioritize caution over speed. Use judgment for trivial tasks.

### 1. Think Before Coding

Do not assume. Do not hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them instead of choosing silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Identify what is confusing and ask.

### 2. Simplicity First

Write the minimum code that solves the problem. Nothing speculative.

- Do not add features beyond what was asked.
- Do not add abstractions for single-use code.
- Do not add "flexibility" or "configurability" that was not requested.
- Do not add error handling for impossible scenarios.
- If you write 200 lines and the same result could be achieved in 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match the existing style, even if you would normally do it differently.
- If you notice unrelated dead code, mention it. Do not delete it.

When your changes create orphans:

- Remove imports, variables, or functions that become unused because of your changes.
- Do not remove pre-existing dead code unless asked.
- Use this test: every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Iterate until verified.

Turn tasks into verifiable goals:

- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]

Strong success criteria allow you to work independently in a loop. Weak criteria such as "make it work" require constant clarification.

These guidelines are working if there are fewer unnecessary changes in diffs, fewer rewrites caused by overcomplication, and more clarifying questions before implementation rather than after mistakes.

## Modification Recommendations

- Before making changes, first identify the target module. Do not modify shared layers directly before understanding the call chain.
- If a change involves multiple services, make the call chain and dependency direction explicit.
- If Kafka, Redis, MinIO, or authentication is involved, evaluate the impact on other services first.

## Important Notes

- Before implementation, first confirm the target module, upstream and downstream dependencies, and the verification approach.
- **Always prioritize official frameworks, SDKs, and APIs.** When an official framework, SDK, or API exists for a task, you MUST use it instead of hand-rolling a custom implementation, reimplementing existing capabilities, or calling lower-level interfaces directly. Only fall back to a custom approach when no official option covers the need, and state explicitly why the official option was insufficient.
- If it is a complete feature request or a complex bug, add logs at key points as much as reasonably possible to help with troubleshooting, but do not add excessive logging.

## Key Workflow Expectations

Once feature development and testing are complete, run the following release-and-acceptance loop **autonomously, end to end, without asking the user to confirm any step**. Steps 1–3 each dispatch a new subagent to run the named skill under `.claude\skills\`. Step 4 is different: the main agent reads and runs the skill itself, then spawns its own testing subagent as the skill directs — do not hand the whole skill to a single subagent. Repeat the loop until acceptance passes.

1. **Publish and merge** — Dispatch a subagent to execute the `astron-agent-pr-publish` skill. It commits the eligible local changes, pushes the current branch to `origin`, opens a same-branch pull request into `iflytek/astron-agent`, and merges it once the PR has no conflicts.
2. **Wait for the image build** — Merging into the upstream branch triggers the image-build workflow `.github/workflows/build-push.yml` in `iflytek/astron-agent`, which builds and pushes all service images to GHCR and takes ~16 minutes. Do not deploy before it finishes. Poll the run with `gh run list` / `gh run watch -R iflytek/astron-agent` on the branch you merged into (rather than sleeping a fixed time), and proceed only when it concludes with `success`. If the build fails, fix the cause and restart from step 1.
3. **Deploy** — After the build succeeds, dispatch a subagent to execute the `astron-agent-server-deploy` skill, which pulls the new images, restarts the stack, and prunes dangling images on the server. Wait until the deployment completes and all services are up.
4. **Acceptance test** — Once all services are running, the **main agent itself** reads and runs the `astron-agent-e2e-acceptance` skill (do not delegate the whole skill to a subagent). Following the skill, the main agent selects the feature points to verify, dispatches a testing-only subagent (a full-tool type such as `general-purpose`) to drive the browser via the Playwright MCP tools, and uses the returned evidence to judge pass/fail.
   - **Pass** → the loop is complete; report the result and stop.
   - **Fail** → the main agent automatically diagnoses and fixes the issues surfaced by the subagent's evidence, then restarts from step 1. Keep iterating until acceptance passes.

Safety net: if the same failure persists across several full iterations with no progress, stop and report to the user instead of looping indefinitely.