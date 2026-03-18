---
project: Astron Agent Console
generated: 2026-03-04
last_updated: 2026-03-04
---

# Console 项目全局概览

## 项目简介

Astron Agent Console 是 Astron Agent 平台的控制台子系统，提供 AI Agent 管理、工作流编排、模型管理、知识库、AI 工具集成等功能。前后端分离架构，后端 Java 21 + Spring Boot 3.5.4，前端 React 18 + TypeScript + Vite。

## 模块索引

| 模块 | 文档路径 | 后端模块 | 说明 |
|------|---------|---------|------|
| [Bot 管理](bot-management/module.md) | `bot-management/` | Hub | 助手创建、配置、收藏、人设、语音 |
| [聊天](chat/module.md) | `chat/` | Hub | SSE 流式聊天、历史、文件、重启 |
| [工作流](workflow/module.md) | `workflow/` | **Toolkit** | 工作流模板、编排、流式执行 |
| [空间管理](space-management/module.md) | `space-management/` | Hub | 个人/企业空间、成员、权限 |
| [企业管理](enterprise-management/module.md) | `enterprise-management/` | Hub | 团队创建、成员管理、邀请 |
| [用户管理](user-management/module.md) | `user-management/` | Hub | 用户信息、我的助手 |
| [发布管理](publish/module.md) | `publish/` | Hub | 多渠道发布、API 管理、版本 |
| [模型管理](model-management/module.md) | `model-management/` | **Toolkit** | 模型配置、参数、供应商 |
| [知识库](knowledge/module.md) | `knowledge/` | **Toolkit** | 数据集、文档、向量检索 |
| [AI 工具](ai-tools/module.md) | `ai-tools/` | **Toolkit** | 工具创建、调试、MCP、工具广场 |

**说明**：加粗的 **Toolkit** 表示该模块的 Controller 和 Service 主要在 `console/backend/toolkit/` 中。

## 技术架构

### 后端架构（微服务模块化）

```
前端 (React + TypeScript + Vite)
    ↓ Axios (Bearer Token + space-id/enterprise-id headers)
后端 Controller (Spring Boot + Spring Security OAuth2)
    ├── Hub 模块 (console/backend/hub/)
    │   ├── Controller: 核心业务接口（Bot、Chat、Space、Enterprise、User、Publish）
    │   ├── Service: 业务逻辑层
    │   ├── Entity: 数据模型
    │   └── Mapper: 数据访问层
    ├── Toolkit 模块 (console/backend/toolkit/)
    │   ├── Controller: 工具类接口（Workflow、AI Tools、Knowledge、Model、RPA）
    │   └── Service: 工具服务层
    └── Commons 模块 (console/backend/commons/)
        ├── DTO: 通用数据传输对象
        ├── Util: 工具类
        └── Service: 公共服务（认证、多租户、缓存）
    ↓
MySQL + Redis (Redisson) + Kafka + MinIO
```

## 认证与多租户

- 认证: Casdoor SSO → OAuth2 JWT Bearer Token
- 多租户: 请求头 `space-id` + `enterprise-id`，后端拦截器自动注入上下文
- 权限: `@SpacePreAuth` / `@EnterprisePreAuth` 注解控制

## 关键代码路径

### 后端模块分布

| 模块 | 路径 | 职责 |
|------|------|------|
| Hub | `console/backend/hub/src/main/java/.../` | 核心业务（Bot、Chat、Space、Enterprise、User、Publish） |
| Toolkit | `console/backend/toolkit/src/main/java/.../` | 工具服务（Workflow、AI Tools、Knowledge、Model、RPA） |
| Commons | `console/backend/commons/src/main/java/.../` | 公共模块（DTO、Util、认证、多租户） |

### 前后端对应关系

| 层级 | 后端路径（Hub/Toolkit） | 前端路径 |
|------|------------------------|---------|
| 入口 | `*/controller/` | `console/frontend/src/pages/` |
| 业务逻辑 | `*/service/` | `console/frontend/src/store/` |
| 数据访问 | `hub/mapper/` | `console/frontend/src/services/` |
| 实体/类型 | `hub/entity/` | `console/frontend/src/types/` |
| 公共模块 | `commons/` | `console/frontend/src/components/` |
| 配置 | `hub/resources/` | `console/frontend/src/config/` |
| 国际化 | - | `console/frontend/src/locales/` |

## 开发工作流程

**完整工作流程文档**: [WORKFLOW.md](../WORKFLOW.md)

### Agentic Coding 范式

Console 项目采用**文档驱动 + 校验闭环**的 Agentic Coding 范式，确保文档与代码同步迭代。

#### 核心特性

1. **扫描范围完整**：Skills 扫描 Hub + Toolkit + Commons 三个模块
2. **流程分层**：大功能、小功能、Bug 修复分别使用不同流程
3. **前置校验**：`/context-check` 确保基于正确的上下文开发
4. **后置校验**：`/drift-check` 确保文档更新准确无漏

#### 文档校验闭环

```
开发前: /context-check → 检查旧文档是否可信
开发中: 实现代码
开发后: /doc-module → 更新文档 → /drift-check → 验证新文档准确性
```

### Claude Code Skills

Console 项目提供了 **10 个** Claude Code Skills，用于文档驱动开发：

| # | Skill | 命令 | 说明 | 输出文件 |
|---|-------|------|------|----------|
| 0 | 上下文校验 | `/context-check` | 开发前校验模块文档与代码一致性 | `context-check-report.md` |
| 1 | 需求文档 | `/requirement` | 将用户需求转化为结构化需求文档 | `requirement.md` |
| 2 | 用户故事 | `/stories` | 从需求提取用户故事和验收标准（按需） | `stories.md` |
| 3 | 技术规格 | `/spec` | 设计 API、数据模型、前端规格 | `spec.md` |
| 4 | 任务规划 | `/tasks` | 拆解为可执行任务，带依赖关系 | `tasks.md` |
| 5 | 后端设计 | `/backend-design` | 生成后端类设计和代码骨架（按需） | `backend-design.md` |
| 6 | 前端设计 | `/frontend-design` | 生成前端组件树和状态管理方案（按需） | `frontend-design.md` |
| 7 | 模块文档 | `/doc-module` | 从代码逆向生成模块文档 | `module.md` |
| 8 | 文档漂移校验 | `/drift-check` | 文档更新后校验准确性 | `drift-check-report.md` |
| 9 | Bug 修复 | `/bugfix` | 记录 Bug 根因分析和修复方案 | `bugfix.md` |

### 开发流程

根据任务类型选择合适的流程：

#### 大功能（完整链路）

**适用场景**：新增数据表、新增前端页面、跨模块改动、多角色交互

```
/context-check → /requirement → /stories → /spec → /tasks → /backend-design + /frontend-design → 实现 → /doc-module → /drift-check
```

#### 小功能（快速链路）

**适用场景**：单模块改动、明确需求、简单 CRUD、单角色场景

```
/context-check → /requirement → /spec → /tasks → 实现 → /doc-module → /drift-check
```

#### Bug 修复

- **简单 Bug**（单文件、单方法）：直接修复 → 验证 → `/doc-module`（如需）→ `/drift-check`（如需）
- **复杂 Bug**（重构、多模块）：走完整链路或快速链路

详见：[WORKFLOW.md](../WORKFLOW.md)

## 文档生成状态

| 模块 | 状态 | 生成时间 | 备注 |
|------|------|---------|------|
| Bot 管理 | 🔄 待重新生成 | - | 基于新的扫描范围重新生成 |
| 聊天 | 🔄 待重新生成 | - | 基于新的扫描范围重新生成 |
| 工作流 | 🔄 待重新生成 | - | **Toolkit 模块，高优先级** |
| 空间管理 | 🔄 待重新生成 | - | 基于新的扫描范围重新生成 |
| 企业管理 | 🔄 待重新生成 | - | 基于新的扫描范围重新生成 |
| 用户管理 | 🔄 待重新生成 | - | 基于新的扫描范围重新生成 |
| 发布管理 | 🔄 待重新生成 | - | 基于新的扫描范围重新生成 |
| 模型管理 | 🔄 待重新生成 | - | **Toolkit 模块，高优先级** |
| 知识库 | 🔄 待重新生成 | - | **Toolkit 模块，高优先级** |
| AI 工具 | 🔄 待重新生成 | - | **Toolkit 模块，高优先级** |

**重新生成顺序建议**：
1. 第一批（Toolkit 模块）：workflow、ai-tools、knowledge、model-management
2. 第二批（核心模块）：bot-management、chat
3. 第三批（管理模块）：space-management、enterprise-management、user-management、publish
