# 快速开始

本页用于承接首页的「开始阅读」入口，保留快速上手所需的最短路径；更完整的细节可以继续查看仓库内的中文部署文档。

## 适合谁先看

- 想先在本地快速体验完整链路的开发者
- 希望先拉起一套可登录、可访问的示例环境的团队
- 计划后续再切换到 Helm 或生产配置的使用者

## 两步完成本地体验

### 1. 克隆仓库并准备环境变量

```bash
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/docker/astronAgent
cp .env.example .env
```

完成复制后，按需补充模型、数据库、对象存储和鉴权相关配置。

### 可选：锁定稳定版本

默认的 `ASTRON_AGENT_VERSION=latest` 对应 `main` 分支的滚动构建，可能包含尚未发布的改动。用于长期运行、CI 或下游集成时，建议从 [Releases](https://github.com/iflytek/astron-agent/releases) 选一个 `vX.Y.Z`，让代码和镜像保持同一版本（在复制 `.env.example` 之前切换）：

```bash
git checkout vX.Y.Z
cp .env.example .env
# 然后在 .env 中设置 ASTRON_AGENT_VERSION=vX.Y.Z
```

镜像同时发布 `X.Y` 和 `X` 浮动标签，可用于自动跟进同一版本线的补丁或小版本。

### 2. 启动服务

```bash
docker compose -f docker-compose-with-auth.yaml up -d
```

启动完成后，默认可以访问以下地址：

- Astron Agent 前端：`http://localhost/`
- Casdoor 管理界面：`http://localhost:8000`

## 推荐阅读顺序

1. 先读 [部署指南](/zh/guide/deploy)
2. 再读 [配置说明](/zh/guide/config)
3. 遇到问题时查看 [FAQ](/zh/faq)

## 深入文档

- [中文 README](/zh/README)
- [带鉴权部署指南](/zh/DEPLOYMENT_GUIDE_WITH_AUTH)
- [标准部署指南](/zh/DEPLOYMENT_GUIDE)
