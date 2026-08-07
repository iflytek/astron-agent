# 技术治理与管理

Astron Agent 是一个企业级、商业友好的智能体工作流平台。我们遵循一套治理模型，旨在促进社区协作，同时确立企业级的稳定性和可靠性。

## 核心价值观

- **企业级 (Enterprise-Grade)**：我们优先考虑系统稳定性、高可用性和安全性，以满足企业部署的严格需求。
- **开放包容 (Open & Inclusive)**：我们拥抱开源精神，集成多种大模型（MaaS）和工具（讯飞开放平台），构建无边界的生态系统。
- **开箱即用 (Ready-to-Use)**：我们通过提供即插即用的能力，专注于开发者体验，实现智能体的快速构建和验证。

## 角色与职责

### 1. 治理角色体系

| 角色层级 | 职责说明 | 模块/领域 | 模块路径 | GitHub ID |
| :--- | :--- | :--- | :--- | :--- |
| **首席维护者 (BDFL)** | - 对所有项目事务拥有最终决策权<br>- 确认或免职核心维护者<br>- 担任所有基础设施（GitHub、社区群 等）的管理员<br>- 公开阐明决策过程并提供清晰的理由 | 全项目 | - | yjlu12 |
| **首席维护者 (BDFL)** | 同上 | 全项目 | - | dongjiang1989 |
| **核心维护者** | - 设计、审查和指导 Astron Agent 规范及项目演变<br>- 阐明项目连贯的长期愿景<br>- 以公平和透明的方式调解和解决有争议的问题<br>- 任命或免职模块维护者<br>- 跨模块技术决策和架构评审 | 整体架构 | - | hygao1024 |
| **核心维护者** | 同上 | 后端服务 | `console/backend/` | vsxd |
| **核心维护者** | 同上 | 核心服务 | `core/` | cumthxy |
| **核心维护者** | 同上 | 前端架构 | `console/frontend/` | slqcode |
| **社区运营** | - 执行社区行为规范（CoC）<br>- 维护社区健康氛围<br>- 促进社区生态繁荣 | 全项目 | - | FenjuFu |

### 2. 模块维护者与贡献者

| 角色层级 | 职责说明 | 模块/领域 | 模块路径 | GitHub ID |
| :--- | :--- | :--- | :--- | :--- |
| **模块维护者** | - 模块开发<br>- 代码审查<br>- Issue 处理 | 前端模块 (前端架构、组件库、UI/UX、页面开发) | `console/frontend/` | - |
| **模块维护者** | 同上 | 控制台后端 (后端架构、API 设计、服务开发、工具集成) | `console/backend/` | - |
| **模块维护者** | 同上 | Agent 服务 (Agent 引擎、调度、Agent API、集成) | `core/agent/` | cumthxy |
| **模块维护者** | 同上 | Workflow 工作流服务 (工作流引擎、编排、工作流 API) | `core/workflow/` | cumthxy |
| **模块维护者** | 同上 | Knowledge 知识库服务 (RAG、向量检索、知识库管理) | `core/knowledge/` | cumthxy |
| **模块维护者** | 同上 | Memory 内存数据库服务 (内存管理、缓存) | `core/memory/` | cumthxy |
| **模块维护者** | 同上 | Tenant 租户服务 (租户管理、权限) | `core/tenant/` | cumthxy |
| **模块维护者** | 同上 | Common 公共模块 (基础设施、公共库) | `core/common/` | cumthxy |
| **模块维护者** | 同上 | AI Tools 插件 (AI 工具集成) | `core/plugin/aitools/` | cumthxy |
| **模块维护者** | 同上 | RPA 插件 (RPA 自动化) | `core/plugin/rpa/` | cumthxy |
| **模块维护者** | 同上 | Link 链接插件 (外部系统集成) | `core/plugin/link/` | cumthxy |
| **模块维护者** | 同上 | Docker 配置 (Docker 镜像、编排) | `docker/` | yjlu12 |
| **模块维护者** | 同上 | Kubernetes/Helm (K8s 部署、Helm Charts) | `helm/` | yjlu12 |
| **模块维护者** | 同上 | 文档 (技术文档、用户指南) | `docs/` | yjlu12 |
| **贡献者** | - 提交 Issue/PR<br>- 参与代码审查<br>- 遵循代码规范 | 各模块 | - | - |
