# Tenant Python 迁移设计

- 使用 Pydantic 校验输入并映射旧版业务响应。业务接口保持 `sid`、`code`、`message` 与可选 `data`。应用创建返回 `app_id`，详情和验证继续返回 `appid`。内部鉴权先于请求体解析。请求与数据库日志省略凭据值。
- 保留版本 `20260326_0001` 和既有表定义。MySQL 的迁移锁与 DDL 使用同一个连接。仅在初始化成功后记录版本。已有两张业务表的数据库沿用原有数据。凭据接管、退休和写入在同一事务完成。
- 应用及凭据操作按所属应用加锁。API Key 删除同时按应用 ID 和密钥定位。应用详情仅提供当前有效的密钥，避免旧密钥轮换后被调用方重新选中。验证应用时同时检查应用和密钥状态。
- 配置继续接受 `DATABASE_URL=(host:port)/database` 及 `TENANT_KEY`、`TENANT_SECRET` 的环境变量和文件形式。仅在 Tenant 内迁移数据库与文件读取实现。通过 Python 镜像替换现有 Tenant 镜像构建入口。
- 本地使用 `cd core/tenant && uv sync --locked && uv run pytest`，设置 `TENANT_TEST_MYSQL_PORT` 在隔离 MySQL 上启用迁移与 HTTP 集成测试。部署检查沿用 `docker/astronAgent/scripts/verify_security_contract.py` 和 `helm/astron-agent/tests/verify_tenant_bootstrap.py`。Loop 的部署与验收阶段验证发布后的镜像和调用链。
