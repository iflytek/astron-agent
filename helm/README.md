# Astron Agent Helm 部署指南

Chart 默认部署 Python Console、核心服务、MySQL、PostgreSQL、Redis 和 MinIO。
Kafka 默认关闭，启用可选日志上报时由运维方提供外部 broker，并给相应服务设置 `env.kafkaEnable` 和 `env.kafkaServers`。知识库使用 RAGFlow 时，在平台账号管理中配置 RAGFlow 的 HTTP 接口。独立部署的 RAGFlow 可选择 Elasticsearch 等文档检索引擎。 [RAGFlow 部署说明](../docker/ragflow/README.md)

## 配置入口与安装

准备 Kubernetes 集群和 Helm 3。默认入口使用 ingress-nginx，同一个域名路由 Console 页面、`/console-api` 和已发布应用的执行接口。Chart 使用 ingress-nginx 的正则路由顺序保护内部接口。

在仓库根目录创建 Console 的持久签名 Secret。升级时继续使用原 Secret。

```bash
kubectl create namespace astron-agent
kubectl -n astron-agent create secret generic astron-console-auth \
  --from-literal=secret-key="$(openssl rand -hex 32)"
```

创建 `deployment-values.yaml`，将域名换成实际域名，并提前准备相应的 TLS Secret。

```yaml
global:
  hostBaseAddress: https://agent.example.com

ingress:
  hosts:
    - host: agent.example.com
  tls:
    - secretName: astron-agent-tls
      hosts:
        - agent.example.com
```

Console 默认允许 Ingress 声明的域名、内部服务名和本机探测地址。其他入口域名可加入 `consoleHub.auth.allowedHosts`。公开地址来自 `global.hostBaseAddress`，也可通过 `consoleHub.auth.publicOrigin` 单独指定。HTTPS 经可信代理终止时，将代理网段填入 `consoleHub.auth.trustedProxies`，让 Django 正确识别转发协议。使用 HTTP 时填入实际 HTTP origin，并将 `ingress.tls` 设为 `[]`。使用 cert-manager 时，在 `ingress.annotations` 中配置集群使用的 issuer。

```bash
helm upgrade --install astron-agent ./helm/astron-agent \
  --namespace astron-agent --values deployment-values.yaml
```

未启用 Ingress 时，由外部网关使用相同的公开路由和内部接口限制。单独转发前端 Service 只用于查看静态页面。

## 存储与升级

- 下载、预签名上传等功能需要浏览器能够访问对象存储。为内置 MinIO 配置可访问的 `minio.publicEndpoint`，或者使用外部 S3 兼容服务。外部存储需要现有凭证 Secret 和独立的内部及公开端点配置。 [外部 MinIO 示例](astron-agent/examples/external-minio-values.yaml)
- Helm 默认生成强 MinIO 凭证，并在再次执行 Helm 时复用已有的有效凭证。通过离线 GitOps 渲染时，请为 MinIO 和内部服务凭证引用预建 Secret。
- 禁用内置 MySQL、PostgreSQL 或 Redis 前，配置各使用方的目标地址，并准备惯用名称的连接 Secret。默认名称分别为 `astron-agent-mysql-secret`、`astron-agent-postgres-secret` 和 `astron-agent-redis-secret`，名称前缀随 `fullnameOverride` 变化。对应的键为 `mysql-root-password`、`postgres-password` 和 `redis-password`。
- 新 MySQL 数据卷只预建 Console、Agent 和 Workflow 的数据库。Console、Tenant、Workflow 和 Link 由各自的启动迁移管理表结构。Link 的迁移写入内置工具种子。PostgreSQL 初始化保留 Memory Database 的名称唯一约束。保留已有 PVC。Console 多副本启动前先由单个迁移任务完成数据库迁移和旧账号导入，再将 `consoleHub.runMigrations` 设为 `false`。 [Console 操作说明](../console/backend/README.md)

## 本地验证

```bash
helm lint --strict helm/astron-agent
helm template astron-agent helm/astron-agent --namespace astron-agent
python3 helm/astron-agent/tests/verify_tenant_bootstrap.py
```
