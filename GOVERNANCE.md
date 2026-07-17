# Technical Governance and Stewardship

Astron Agent is an enterprise-grade, commercial-friendly agentic workflow platform. We follow a governance model designed to foster community collaboration while ensuring enterprise-level stability and reliability.

## Core Values

- **Enterprise-Grade**: We prioritize system stability, high availability, and security to meet the rigorous demands of enterprise deployment.
- **Open & Inclusive**: We embrace the open-source spirit, integrating diverse large models (MaaS) and tools (iFLYTEK Open Platform) to build a boundless ecosystem.
- **Ready-to-Use**: We focus on developer experience, providing plug-and-play capabilities for rapid agent construction and validation.

## Roles and Responsibilities

### 1. Governance Roles

| Role Level | Responsibilities | Module / Domain | Path | GitHub ID |
| :--- | :--- | :--- | :--- | :--- |
| **BDFL (Benevolent Dictator For Life)** | - Holds ultimate decision-making authority over all project matters.<br>- Confirms or dismisses Core Maintainers.<br>- Acts as admin for all infrastructure (GitHub, community groups, etc.).<br>- Publicly clarifies decision-making processes with clear reasoning. | Entire Project | - | yjlu12 |
| **BDFL** | Ditto | Entire Project | - | dongjiang1989 |
| **Core Maintainer** | - Designs, reviews, and guides Astron Agent specifications and project evolution.<br>- Articulates a coherent long-term vision for the project.<br>- Mediates and resolves controversial issues fairly and transparently.<br>- Appoints or dismisses Module Maintainers.<br>- Handles cross-module technical decisions and architecture reviews. | Overall Architecture | - | hygao1024 |
| **Core Maintainer** | Ditto | Backend Services | `console/backend/` | vsxd |
| **Core Maintainer** | Ditto | Core Services | `core/` | cumthxy |
| **Core Maintainer** | Ditto | Frontend Architecture | `console/frontend/` | slqcode |
| **Community Moderator** | - Enforces the Community Code of Conduct (CoC).<br>- Maintains a healthy community atmosphere.<br>- Promotes the prosperity of the community ecosystem. | Entire Project | - | FenjuFu |

### 2. Module Maintainers and Contributors

| Role Level | Responsibilities | Module / Domain | Path | GitHub ID |
| :--- | :--- | :--- | :--- | :--- |
| **Module Maintainer** | - Module development<br>- Code review<br>- Issue handling | Frontend Modules (Frontend Arch, Component Lib, UI/UX, Page Dev) | `console/frontend/` | - |
| **Module Maintainer** | Ditto | Console Backend (Backend Arch, API Design, Service Dev, Tool Integration) | `console/backend/` | - |
| **Module Maintainer** | Ditto | Agent Service (Agent Engine, Scheduling, Agent API, Integration) | `core/agent/` | cumthxy |
| **Module Maintainer** | Ditto | Workflow Service (Workflow Engine, Orchestration, Workflow API) | `core/workflow/` | cumthxy |
| **Module Maintainer** | Ditto | Knowledge Service (RAG, Vector Retrieval, Knowledge Base Mgmt) | `core/knowledge/` | cumthxy |
| **Module Maintainer** | Ditto | Memory Service (Memory Mgmt, Cache) | `core/memory/` | cumthxy |
| **Module Maintainer** | Ditto | Tenant Service (Tenant Mgmt, Permissions) | `core/tenant/` | cumthxy |
| **Module Maintainer** | Ditto | Common Modules (Infrastructure, Common Libs) | `core/common/` | cumthxy |
| **Module Maintainer** | Ditto | AI Tools Plugins (AI Tool Integration) | `core/plugin/aitools/` | cumthxy |
| **Module Maintainer** | Ditto | RPA Plugins (RPA Automation) | `core/plugin/rpa/` | cumthxy |
| **Module Maintainer** | Ditto | Link Plugins (External System Integration) | `core/plugin/link/` | cumthxy |
| **Module Maintainer** | Ditto | Docker Config (Docker Images, Orchestration) | `docker/` | yjlu12 |
| **Module Maintainer** | Ditto | Kubernetes/Helm (K8s Deployment, Helm Charts) | `helm/` | yjlu12 |
| **Module Maintainer** | Ditto | Documentation (Tech Docs, User Guides) | `docs/` | yjlu12 |
| **Contributor** | - Submit Issues/PRs<br>- Participate in code reviews<br>- Follow coding standards | All Modules | - | - |
