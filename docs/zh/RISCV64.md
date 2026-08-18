# RISC-V（`linux/riscv64`）支持状态

## 当前范围

RISC-V 支持按组件逐步推进。`core-tenant` 与 `core-agent` 已完成 `linux/riscv64` 构建和运行验证；Astron Agent 完整 Docker Compose 栈目前**尚未支持** RISC-V。

| 组件 | `linux/riscv64` 状态 | 说明 |
| --- | --- | --- |
| `core-tenant` | 已验证 | Go 静态二进制 + `scratch` 镜像；CI 与发布清单包含 `linux/riscv64`。 |
| `core-database` | 尚未验证 | 需要审计 Python 依赖和目标运行镜像。 |
| `core-rpa` | 尚未验证 | 可选组件；需要审计 Python 与外部 RPA 依赖。 |
| `core-link` | 尚未验证 | 需要审计 Python 依赖。 |
| `core-aitools` | 尚未验证 | 需要审计 Python、对象存储和数据库依赖。 |
| `core-agent` | 已验证，原生构建 | `Dockerfile.riscv64` 在真实 RISC-V 主机构建；239 项测试和两个健康端点均通过。尚未加入公开镜像工作流。 |
| `core-knowledge` | 尚未验证 | 需要审计 Python/RAG 依赖。 |
| `core-workflow` | 尚未验证 | 需要修复 `pyproject.toml` 架构条件并审计 Python 原生依赖。 |
| 控制台前端与 Hub | 尚未验证 | 需要审计 Node/Nginx 与 Java 运行镜像。 |
| 可选 RAGFlow/RPA 栈 | 不支持 | 在镜像、原生库和写死的 x86 路径完成替换或验证前保持禁用。 |

不要在 RISC-V 上原样部署 `docker/astronAgent/docker-compose.yaml`，其中仍引用没有发布或没有验证 `linux/riscv64` 产物的组件。

## `core-tenant` 构建设计

构建阶段固定运行在 Buildx 的构建平台，通过 `TARGETOS` 和 `TARGETARCH` 交叉编译静态目标二进制；运行阶段使用 `scratch`，不依赖目标架构的 Debian 基础镜像。

在 AMD64 或 ARM64 Buildx 主机上构建单架构 RISC-V 镜像：

```bash
docker buildx build \
  --platform linux/riscv64 \
  --file core/tenant/Dockerfile \
  --tag astron-agent/core-tenant:riscv64 \
  --load \
  .
```

发布工作流只为 `core-tenant` 增加 `linux/riscv64`，其余服务继续保持现有 AMD64/ARM64 平台范围。

## 在原生 RISC-V 上构建 `core-agent`

Python 服务当前需要真实 RISC-V 主机。构建前先准备兼容的 Bianbu 基础镜像和经哈希校验的资产：

```bash
./docker/riscv64/import-bianbu-base.sh
./docker/riscv64/prepare-core-agent-assets.sh
docker build --file core/agent/Dockerfile.riscv64 --tag astron-agent/core-agent:riscv64 .
```

资产缓存位于已被 Git 忽略的 `docker/riscv64/.cache/`。不要在 SpacemiT X60 上替换为 `harbor.spacemit.com/bianbu/bianbu:latest`：验证时该镜像要求测试主机不具备的 RISC-V 向量扩展。导入脚本改用兼容且固定 SHA-256 的官方 Bianbu rootfs。

## 真机验证

首轮真机验证环境：

- Astron Agent 基线提交：`327eee28a8407d5450a1e5c5aa44705f6adbda85`
- 操作系统：Bianbu 2.3，Linux 6.6.63
- CPU：8 核 SpacemiT X60
- 架构：`riscv64`
- Go：1.23.1（`linux/riscv64`）
- Python：3.12.3（`riscv64`）
- Docker：26.1.3（`linux/riscv64`）
- MySQL：8.0.40（`riscv64`）
- uv：0.12.5（`riscv64gc-unknown-linux-gnu`）
- librdkafka：2.11.1，从已校验源码原生构建

在 `core/tenant` 目录复现原生编译检查：

```bash
go test ./...
CGO_ENABLED=0 GOOS=linux GOARCH=riscv64 \
  go build -trimpath -o core-tenant-linux-riscv64 .
file core-tenant-linux-riscv64
```

已验证的运行闭环为：使用临时 MySQL 测试库启动 `scratch` 镜像；`GET /ping` 返回 `{"message":"pong"}`；成功应用迁移 `20260326_0001` 并创建 `schema_migrations`、`tb_app`、`tb_auth`；收到 `SIGTERM` 后优雅退出，退出码为 0。

已验证的 `core-agent` 镜像报告 `linux/riscv64`，按锁定版本导入 5 个原生依赖，通过全部 239 项测试；`GET /health/live` 与 `GET /health/ready` 均返回 `UP`，停止后退出码为 0。

## CI 防回归

Go 测试任务会执行 `CGO_ENABLED=0 GOOS=linux GOARCH=riscv64` 交叉编译。`core-agent` 暂时保持原生 RISC-V 构建，直到具备合适的原生 runner 或受控 wheelhouse 产物。每扩展一个新组件，仍必须补充真实 RISC-V 环境 smoke test；在完成前不得声称整套平台兼容。
