# Agent Runtime 运行与接入说明

## 定位与边界

`core/runtime` 是独立的 Agent 执行运行时。Console Hub 负责配置、发布和调试入口，Runtime 负责发布版本解析、鉴权、异步运行编排、事件持久化、审批与受治理工具执行。Runtime 不提供同步执行 API，也不保存模型密钥。

当前 MVP 约束如下：

- 每个 Agent 只能属于一个空间，应用绑定不得跨空间。
- 对外仅提供异步 Run API；运行结果通过查询或 SSE 事件读取。
- `chat`、`react` 和 `workflow` 模式不做步骤级恢复；只有 `plan_execute` 使用 LangGraph PostgreSQL checkpoint 做步骤级恢复。
- 发布版本禁用后，所有等待态运行会被取消，且禁止恢复。
- 工具必须由 Runtime 治理。MVP 只允许 `commerce_material_draft_save`，产物只能保存为 `PENDING_PUBLISH` 草稿。
- 高风险工具调用需要业务用户或空间管理员审批，审批绑定操作哈希与参数哈希。

## 调用链与依赖方向

发布链路：

```text
Console Frontend
  -> Console Hub PublishApiService
  -> Runtime /internal/v1/agent-releases
  -> Runtime /internal/v1/app-bindings
  -> PostgreSQL
```

运行链路：

```text
Client
  -> Nginx auth_request
  -> Console Hub gateway identity signing
  -> Runtime Run API
  -> PostgreSQL outbox
  -> Runtime dispatcher
  -> Redis/Celery
  -> Runtime worker
      -> core-agent (chat/react)
      -> core-workflow (workflow)
      -> LangGraph + governed tools (plan_execute)
```

依赖方向固定为 `Console Hub -> Runtime -> core-agent/core-workflow`。Runtime 使用独立数据库表和 Redis DB，不修改 `core/common` 共享层。Console 普通助手聊天也转发到 `core-agent`，Hub 不再承担 Agent 模型/工具循环。

## 对外 API

所有 `/openapi/v1` 请求都必须先通过现有应用 HMAC 网关认证，并携带 `X-End-User-Token`。创建运行还必须携带 `Idempotency-Key`。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/openapi/v1/agents/{agent_id}/runs` | 创建异步运行，返回 `202` |
| `GET` | `/openapi/v1/runs/{run_id}` | 查询状态和最终结果 |
| `GET` | `/openapi/v1/runs/{run_id}/events` | 读取持久化 SSE 事件，支持 `Last-Event-ID` |
| `POST` | `/openapi/v1/runs/{run_id}/resume` | 恢复允许恢复的等待态运行 |
| `POST` | `/openapi/v1/runs/{run_id}/cancel` | 请求取消运行 |
| `POST` | `/openapi/v1/approvals/{approval_id}/decision` | 审批或拒绝受治理操作 |

同一应用下的 `Idempotency-Key` 与请求哈希绑定。重复同一请求返回原运行；相同键但不同请求返回冲突。委托 JWT 的 `jti` 也只能创建一个新运行，幂等重试除外。

## 终端用户委托 JWT

Runtime 通过 `RUNTIME_DELEGATION_ISSUERS_JSON` 配置信任的签发方和公钥/密钥，并校验：

- `iss`、`aud`、`sub`、`app_id`、`space_id`
- `iat`、`exp`、`jti`
- 操作所需 `scope`

默认 audience 为 `astron-agent-runtime`。支持的操作 scope 包括 `runs:create`、`runs:read`、`runs:resume`、`runs:cancel` 和 `approvals:decide`。读取其他终端用户的运行还需要 `runs:read:any`。审批 token 的 `roles` 至少包含 `business_user` 或 `space_admin`。

## 内部发布 API

Console Hub 使用独立内部密钥调用：

- `POST /internal/v1/agent-releases`
- `POST /internal/v1/app-bindings`
- `POST /internal/v1/agent-releases/{release_id}/disable`

发布快照是不可变版本，不得内嵌 `api_key`、`api_secret`、`password`、`token` 等凭据。自定义模型只记录绑定发布空间的 `credential_ref`；Worker 执行时使用独立 Runtime 内部身份从 Console Hub 解析短期明文，并只放入本次到 `core-agent` 的内部请求，不写入快照、任务、事件或日志。工具凭据同样只能在执行时通过现有授权链解析。

## 数据、队列与恢复

PostgreSQL 是运行、事件、审批、工具操作与 outbox 的权威数据源。Redis 仅作为 Celery broker，不作为运行状态真相源。Dispatcher 从 outbox 投递任务，并周期性重建超过安全窗口仍处于 `QUEUED` 且没有待投递 outbox 的消息，恢复 Redis 丢失的 broker 投递；Worker 通过租约避免并发重复执行，并用业务幂等键约束受治理工具的副作用。

`plan_execute` 的检查点只允许由创建它的 Runtime 代码版本继续执行。镜像构建时会把 Git commit SHA 写入 `RUNTIME_CODE_VERSION`，发布时再将它固化到不可变快照；暂停任务恢复时如果当前版本与快照版本不一致，任务以 `RUN_NOT_RESUMABLE` 失败，禁止在升级后用新代码恢复旧执行状态。本地源码运行可显式覆盖该变量。

数据库变更由 Alembic 管理：

```bash
cd core/runtime
uv run alembic upgrade head
```

## 关键配置

配置使用 `RUNTIME_` 前缀。生产环境至少配置：

- `RUNTIME_POSTGRES_*` 或 `RUNTIME_DATABASE_URL`
- `RUNTIME_REDIS_*` 或 `RUNTIME_REDIS_URL`
- `RUNTIME_GATEWAY_IDENTITY_SECRET_FILE`
- `RUNTIME_INTERNAL_API_KEY_FILE`
- `RUNTIME_WORKFLOW_INTERNAL_API_KEY_FILE`
- `RUNTIME_DELEGATION_ISSUERS_JSON`
- `RUNTIME_CORE_AGENT_URL`
- `RUNTIME_CORE_WORKFLOW_URL`
- `RUNTIME_CONSOLE_HUB_URL`
- `RUNTIME_CODE_VERSION`（镜像默认使用构建 commit SHA，本地运行可覆盖）

密钥文件要求为普通文件且不超过 4 KiB。Docker Compose 会为 Runtime 内部管理密钥创建独立凭据卷。

## 本地验证

```bash
cd core/runtime
uv sync --frozen --dev
uv run black --check agent_runtime tests alembic
uv run isort --check-only agent_runtime tests alembic
uv run flake8 agent_runtime tests alembic
uv run mypy agent_runtime
uv run pytest
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic upgrade head
```

部署前还需验证根目录 CI、Compose 安全契约、Helm 渲染以及 Console Hub 的 JDK 21 测试。
