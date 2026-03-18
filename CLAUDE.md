# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Astron Agent 是一个企业级 Agentic Workflow 开发平台,采用微服务架构,整合了 AI 工作流编排、模型管理、AI 工具、RPA 自动化和团队协作功能。

### 技术栈概览

- **前端**: TypeScript + React 18 + Vite + Ant Design (位于 `console/frontend/`)
- **控制台后端**: Java 21 + Spring Boot 3.5.4 (位于 `console/backend/`)
- **核心微服务**: Python 3.11+ + FastAPI (位于 `core/` 目录)
- **租户服务**: Go 1.23 + Gin (位于 `core/tenant/`)
- **基础设施**: MySQL, Redis, Kafka, MinIO

## 常用开发命令

### 统一构建工具 (Makefile)

项目使用统一的 Makefile 管理所有语言的构建、测试和质量检查:

```bash
# 一次性环境设置
make setup              # 安装所有工具,配置 Git 钩子

# 日常开发命令
make format             # 格式化所有代码 (Go/Java/Python/TypeScript)
make check              # 运行所有质量检查 (lint)
make test               # 运行所有测试
make build              # 构建所有项目
make ci                 # 完整 CI 流程: format + check + test + build

# 代码推送
make push               # 安全推送 (带预检查)

# 项目状态
make status             # 显示项目信息
make info               # 显示工具版本
```

### 本地开发配置

为提高开发效率,可创建 `.localci.toml` 文件只启用正在开发的模块:

```bash
cp makefiles/localci.toml .localci.toml
# 编辑 .localci.toml,设置 enabled = true/false 来启用/禁用模块
```

### 运行各服务

```bash
# Go 服务 (租户服务)
cd core/tenant && go run cmd/main.go

# Java 服务 (控制台后端)
cd console/backend && mvn spring-boot:run

# Python 服务 (Agent 服务)
cd core/agent && python main.py

# Python 服务 (Workflow 服务)
cd core/workflow && python main.py

# Python 服务 (Knowledge 服务)
cd core/knowledge && python main.py

# TypeScript 前端
cd console/frontend && npm run dev
```

### Python 模块测试

```bash
# 在各 Python 模块目录下运行
pytest                          # 运行所有测试
pytest tests/test_xxx.py        # 运行单个测试文件
pytest -v --cov                 # 运行测试并生成覆盖率报告
```

### Java 模块测试

```bash
cd console/backend
mvn test                        # 运行所有测试
mvn test -Dtest=ClassName       # 运行单个测试类
```

### 前端开发

```bash
cd console/frontend
npm run dev                     # 启动开发服务器 (端口 3000)
npm run build                   # 生产构建
npm run lint                    # ESLint 检查
npm run format                  # Prettier 格式化
npm run type-check              # TypeScript 类型检查
npm run quality                 # 运行所有检查
```

## 项目架构

### 目录结构

```
astron-agent/
├── console/                    # 控制台模块
│   ├── frontend/              # React 前端 (TypeScript)
│   └── backend/               # Spring Boot 后端 (Java)
│       ├── hub/               # 主 API 服务
│       ├── toolkit/           # 工具模块
│       └── commons/           # 公共模块
├── core/                      # 核心微服务
│   ├── agent/                 # Agent 服务 (Python FastAPI)
│   ├── workflow/              # 工作流服务 (Python FastAPI)
│   ├── knowledge/             # 知识库服务 (Python FastAPI)
│   ├── memory/                # 内存数据库服务 (Python)
│   ├── tenant/                # 租户服务 (Go Gin)
│   ├── common/                # 公共模块 (Python)
│   └── plugin/                # 插件系统
│       ├── aitools/           # AI 工具插件
│       ├── rpa/               # RPA 插件
│       └── link/              # 链接插件
├── docker/                    # Docker 配置
├── docs/                      # 文档
├── helm/                      # Kubernetes Helm Charts
└── makefiles/                 # Makefile 工具链
```

### 核心架构模式

#### 1. 微服务通信

- **Frontend → Backend**: HTTP/REST + SSE (服务端推送)
- **Backend → Core Services**: HTTP/REST API
- **Core Services ↔ Core Services**: Kafka 事件驱动 (异步)
- **数据持久化**: MySQL (关系数据) + Redis (缓存/会话)
- **文件存储**: MinIO (对象存储)

#### 2. Kafka 事件主题

- `workflow-events`: 工作流事件
- `knowledge-events`: 知识库事件
- `agent-events`: Agent 事件

#### 3. Python 服务架构 (DDD)

所有 Python 微服务遵循领域驱动设计 (DDD):

```
service/
├── api/                       # API 层 (FastAPI 路由)
├── service/                   # 服务层 (业务逻辑)
├── domain/                    # 领域层 (领域模型)
├── repository/                # 仓储层 (数据访问)
└── main.py                    # 服务入口
```

#### 4. 公共模块 (core/common)

为所有 Python 服务提供统一的基础设施:

- 认证和审计系统 (MetrologyAuth)
- 可观测性支持 (OpenTelemetry)
- 数据库、缓存、消息队列连接管理
- 统一日志系统
- OSS 对象存储集成

## 代码质量标准

### Python 代码规范

- **格式化**: Black + isort
- **类型检查**: MyPy
- **代码分析**: Pylint + Flake8
- **测试覆盖率**: ≥ 70% (使用 pytest)
- **架构**: DDD (领域驱动设计)

### Java 代码规范

- **格式化**: Maven Spotless
- **代码分析**: Checkstyle + PMD + SpotBugs
- **测试**: JUnit
- **架构**: Spring Boot 分层架构

### TypeScript 代码规范

- **格式化**: Prettier
- **代码检查**: ESLint
- **类型检查**: TypeScript 严格模式
- **测试**: Jest + React Testing Library

### Go 代码规范

- **格式化**: gofmt + goimports + gofumpt + golines
- **代码分析**: staticcheck + golangci-lint
- **测试**: go test with coverage

## Git 工作流

### 分支命名规范

```bash
feature/功能名              # 新功能开发
bugfix/问题名               # Bug 修复
hotfix/补丁名               # 紧急修复
refactor/重构名             # 代码重构
test/测试名                 # 测试开发
doc/文档名                  # 文档更新
```

### 提交消息规范

使用 Conventional Commits 格式:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**类型 (type)**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统
- `ci`: CI/CD 配置
- `chore`: 杂项任务

**示例**:
```bash
feat(auth): 添加 OAuth2 登录支持
fix(api): 修复用户信息查询接口
docs(guide): 完善快速开始指南
```

### Git 钩子

```bash
make hooks-install              # 安装完整钩子 (格式化+检查)
make hooks-install-basic        # 安装轻量级钩子 (仅格式化)
make hooks-uninstall            # 卸载钩子
```

## 部署

### Docker Compose 部署 (推荐快速开始)

```bash
cd docker/astronAgent
cp .env.example .env
vim .env                        # 配置环境变量

# 启动所有服务 (包括 Casdoor 认证)
docker compose -f docker-compose-with-auth.yaml up -d

# 访问地址
# - 前端: http://localhost/
# - Casdoor 管理: http://localhost:8000 (admin/123)
```

### 必须配置的环境变量

在 `.env` 文件中必须配置:

1. **讯飞开放平台凭证** (需要申请):
   - `PLATFORM_APP_ID`, `PLATFORM_API_KEY`, `PLATFORM_API_SECRET`
   - `SPARK_API_PASSWORD`, `SPARK_RTASR_API_KEY`

2. **Casdoor 认证配置**:
   - `CONSOLE_CASDOOR_URL`, `CONSOLE_CASDOOR_ID`
   - `CONSOLE_CASDOOR_APP`, `CONSOLE_CASDOOR_ORG`

3. **RAGFlow 知识库配置** (如使用):
   - `RAGFLOW_BASE_URL`, `RAGFLOW_API_TOKEN`

4. **主机地址**:
   - `HOST_BASE_ADDRESS` - 服务器地址或域名

详细配置说明见 `docs/CONFIGURATION_zh.md`

## 重要注意事项

### 开发约定

1. **禁止直接推送到 main/develop 分支** - 必须通过分支开发 + PR 流程
2. **提交前必须通过所有质量检查** - 运行 `make format && make check`
3. **使用规范的分支命名和提交消息** - 遵循上述规范
4. **大功能拆分为小 commit** - 便于代码审查

### 模块间依赖

- **Common Module** 被所有 Python 服务依赖,修改时需谨慎
- **Agent Service** 被 Workflow 服务调用
- **Knowledge Service** 为 Agent 和 Workflow 提供 RAG 能力
- **Tenant Service** 为所有服务提供租户上下文

### 数据库迁移

Python 服务使用 Alembic 进行数据库迁移:

```bash
# 在各服务目录下
alembic upgrade head            # 应用迁移
alembic revision -m "描述"      # 创建新迁移
```

## 相关文档

- [项目模块说明](docs/PROJECT_MODULES_zh.md) - 详细架构说明
- [部署指南](docs/DEPLOYMENT_GUIDE_WITH_AUTH_zh.md) - 完整部署步骤
- [配置说明](docs/CONFIGURATION_zh.md) - 环境变量配置
- [Makefile 使用指南](docs/Makefile-readme-zh.md) - 构建工具详解
- [代码质量要求](.github/quality-requirements/code-requirements-zh.md) - 质量标准
- [分支提交规范](.github/quality-requirements/branch-commit-standards-zh.md) - Git 规范
- [前端开发指南](console/frontend/CLAUDE.md) - 前端特定指南
