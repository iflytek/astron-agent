# Helm 部署设计

主架构参见 [项目模块说明](../../../../docs/zh/PROJECT_MODULES.md)。Ingress 连接 Console 前端和 Python Console。Console 调用 Tenant、Agent、Workflow、Knowledge、Link、RPA 和 Memory Database。Agent 和 Workflow 通过 Console 的内部接口读取运行配置，Link 调用 AiTools。Knowledge、Workflow 和 AiTools 使用 Console 配置的 MySQL 数据库及 Redis DB 读取平台账号。RAGFlow 是通过 HTTP 访问的外部集成。

Chart 从 Service 名称和端口派生这些地址，并支持显式地址配置。运行端口可配置的核心镜像跟随 Service 设置，Console 镜像仍监听其固定端口。初始化容器等待实际使用的内置服务监听 TCP，运行探针由当前镜像提供。内置 MinIO 在一个渲染中共享生成的随机凭证和对应的滚动更新校验值，在线升级通过 Helm lookup 复用有效凭证。

Tenant 启动时初始化 MySQL schema 和应用凭证。Workflow 与 Link 使用 Alembic 初始化新表和升级现有数据，Link 在启动迁移中写入内置工具种子。Memory Database 继续使用 Chart 提供的 PostgreSQL 初始化 SQL，因为 Alembic 尚未包含数据库名称唯一约束。使用 Helm lint、Helm template 及现有凭证和路由回归脚本检查清单与本地配置契约。 [部署指南](../../../../helm/README.md)
