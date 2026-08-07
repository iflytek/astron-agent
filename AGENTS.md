# AGENTS.md

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

## Important Notes

- Before making any changes, clearly identify the target module along with its complete call chain and upstream/downstream dependencies. For cross‑service changes, explicitly document the invocation path and dependency direction. Direct modifications to shared layers are strictly prohibited without a thorough impact assessment.
- If Kafka, Redis, MinIO, or authentication is involved, evaluate the impact on other services first.
- **Always prioritize official frameworks, SDKs, and APIs.** When an official framework, SDK, or API exists for a task, you MUST use it instead of hand-rolling a custom implementation, reimplementing existing capabilities, or calling lower-level interfaces directly. Only fall back to a custom approach when no official option covers the need, and state explicitly why the official option was insufficient.
- If it is a complete feature request or a complex bug, add logs at key points as much as reasonably possible to help with troubleshooting, but do not add excessive logging.

## Key Workflow Expectations

Once the code review is completed and approved, run the following release-and-acceptance loop **autonomously, end to end, without asking the user to confirm any step**. Steps 1, 3, and 5 each dispatch a new subagent to run the named skill under `.codex\skills\` (step 2 is the main agent polling the image build). Step 4 is different: the main agent reads and runs the skill itself, then spawns its own testing subagent as the skill directs — do not hand the whole skill to a single subagent. Repeat the loop until acceptance passes, then run the final CI check as the closing step.

1. **Publish and merge** — Dispatch a subagent to execute the `astron-agent-pr-publish` skill. It commits the eligible local changes, pushes the current branch to `origin`, opens a same-branch pull request into `iflytek/astron-agent`, and merges it once the PR has no conflicts.
2. **Wait for the image build** — Merging into the upstream branch triggers the image-build workflow `.github/workflows/build-push.yml` in `iflytek/astron-agent`, which builds and pushes all service images to GHCR and takes ~16 minutes. Do not deploy before it finishes. Poll the run with `gh run list` / `gh run watch -R iflytek/astron-agent` on the branch you merged into (rather than sleeping a fixed time), and proceed only when it concludes with `success`. If the build fails, fix the cause and restart from step 1.
3. **Deploy** — After the build succeeds, dispatch a subagent to execute the `astron-agent-server-deploy` skill, which pulls the new images, restarts the stack, and prunes dangling images on the server. Wait until the deployment completes and all services are up.
4. **Acceptance test** — Once all services are running, the **main agent itself** reads and runs the `astron-agent-e2e-acceptance` skill (do not delegate the whole skill to a subagent). Following the skill, the main agent selects the feature points to verify, dispatches a testing-only subagent to drive the browser via the Chrome plugin, and uses the returned evidence to judge pass/fail.
   - **Pass** → proceed to step 5.
   - **Fail** → The main agent automatically diagnoses the root cause from the subagent's evidence and fixes the issue strictly following the development workflow. After the fix is complete, restart from step 1. Continue iterating until acceptance passes.
5. **Remote CI check** — After acceptance passes, dispatch a subagent to execute the `astron-agent-remote-ci-check` skill as the final closing step of the whole loop. This entire flow runs **completely within the subagent** — the main agent must not intervene. The subagent has full tool access. **The subagent's sole responsibility is to run CI checks and CI repairs exactly as the skill directs, and then return the result to the main agent — it must not concern itself with anything else** . Once the subagent returns its result, the loop is complete; report the result and stop.

Safety net: if the same failure persists across several full iterations with no progress, stop and report to the user instead of looping indefinitely.
