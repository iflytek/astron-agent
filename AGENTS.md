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

# Context7 Usage Rules

In the following scenarios, you **must** use the Context7 MCP tools (`resolve-library-id` + `query-docs`) first to retrieve the latest official documentation before answering or writing code. Do not answer solely from training data:

1. **Library/framework/SDK API usage** - Querying the syntax, component APIs, method signatures, parameter details, or usage patterns of any library, framework, or official SDK. This includes widely used libraries such as React, Next.js, Vue, Django, Spring Boot, and Tailwind, as well as vendor SDKs such as Anthropic, OpenAI, AWS, Azure, Google Cloud, Stripe, WeChat Open Platform, Alipay Open Platform, and similar official SDKs.
2. **Version migrations** - Any framework or SDK upgrade or breaking-change question, such as Next.js 14 to 15, AWS SDK v2 to v3, or Pydantic v1 to v2.
3. **Configuration and installation** - Configuration-file syntax, CLI flags, environment setup, or installation steps for a specific tool or library.
4. **Library-specific error debugging** - When an error message is related to behavior specific to a third-party library, check that library's documentation before drawing conclusions.
5. **New or niche libraries** - For libraries that may have little or no coverage in training data, Context7 documentation must be treated as authoritative.

Exceptions where Context7 is not required:

- General programming concepts such as closures, data structures, and design patterns.
- Refactoring, code review, or debugging of the user's own business logic.
- Writing scripts from scratch when no specific library documentation is involved.

Note: Even if you believe you already know the answer, if the request matches any scenario above, verify it with Context7 first to avoid giving outdated API guidance.
