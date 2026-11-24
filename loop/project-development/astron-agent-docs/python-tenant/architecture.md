# Tenant Python 服务架构

Console publishing 通过 Tenant 创建应用、查询详情并校验发布凭据。Agent auth 通过 Tenant 按应用 ID 或 API Key 查询应用。Workflow 的应用服务查询列表和详情，鉴权中间件校验应用凭据。调用方向为 Console、Agent、Workflow → Tenant HTTP → MySQL。调用方读取同一部署管理的内部凭据，并通过 `X-Tenant-Internal-Key` 校验每个业务请求。Tenant 独立启动，健康检查使用 `/ping`。

Tenant 使用 FastAPI、Uvicorn、SQLAlchemy Core 和 PyMySQL，沿用仓库 Python 服务的运行工具。SQLAlchemy 负责连接池、事务和绑定参数。启动时通过 MySQL 锁串行应用已有版本的幂等建表步骤，保留旧库迁移记录。随后在事务中锁定保留应用并协调启动凭据，HTTP 服务在初始化成功后接收流量。

Compose 挂载 Tenant 的 TOML 配置和凭据。Helm 通过环境变量注入数据库、日志及凭据配置。Tenant 单独持有其 MySQL 数据访问逻辑。空间授权由 Console 管理，Redis、Kafka、MinIO 和其他核心服务沿用现有调用方式。
