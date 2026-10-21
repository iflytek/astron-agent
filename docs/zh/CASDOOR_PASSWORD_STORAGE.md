# Casdoor 密码存储与按需维护

普通 Docker Compose 部署不再使用 `astron-agent-casdoor-passwords:local`，无需构建辅助镜像，
CI 也不构建或发布该镜像。`casdoor-gateway` 直接依赖 Casdoor 启动，保留现有代理和端口。
默认部署不执行密码存储检查或数据库迁移，也不会因历史密码格式阻止认证网关启动。

Casdoor 原生登录与组织模板中的密码策略保持不变。Casdoor 2.67 先创建内置组织再读取
初始化模板，因此模板策略不能保证已有组织和历史账户都已使用哈希存储；移除启动检查
不会自动解决这些历史数据问题。需要检查或转换已有数据时，可按需使用保留的 Python 脚本。

## 普通部署

在 `docker/astronAgent` 配置 `.env` 后，按部署指南执行：

```bash
docker compose -f docker-compose-with-auth.yaml pull
docker compose -f docker-compose-with-auth.yaml up -d
```

独立认证与 RPA 联合部署分别使用 `docker-compose-auth.yml` 和
`docker-compose-with-auth-rpa.yaml`。不需要额外的密码检查服务或本地镜像构建步骤。

## 可选的历史密码检查与迁移

`casdoor/password-storage/passwords.py` 仅供管理员显式运行，不属于启动依赖。
在能访问 Casdoor MySQL 的受信任运维环境中准备 Python 3.12 和脚本依赖：

```bash
# 从 docker/astronAgent 运行；不创建 Docker 镜像。
python3 -m venv .venv-casdoor
.venv-casdoor/bin/python -m pip install -r casdoor/password-storage/requirements.txt
```

通过部署的凭据管理方式设置 `CASDOOR_MIGRATION_DB_PASSWORD`；可通过
`CASDOOR_MIGRATION_DB_HOST`、`CASDOOR_MIGRATION_DB_PORT`、`CASDOOR_MIGRATION_DB_USER`、
`CASDOOR_MIGRATION_DB_NAME` 指定实际数据库。脚本默认的主机名 `casdoor-mysql` 只在对应
Compose 网络可解析；应在运维环境配置实际可达地址，无需为普通部署新增公开数据库端口。

```bash
# 只读检查：不修改账户或策略。
.venv-casdoor/bin/python casdoor/password-storage/passwords.py --check
# 默认仅预览变更计数，不输出密码或哈希。
.venv-casdoor/bin/python casdoor/password-storage/passwords.py
```

需要应用迁移时，先备份 Casdoor 数据库并验证可恢复，安排维护窗口，停止公开认证访问，
再停止共享此数据库的所有 Casdoor 实例。保持 MySQL 运行后执行：

```bash
docker compose -f docker-compose-with-auth.yaml stop casdoor-gateway casdoor
.venv-casdoor/bin/python casdoor/password-storage/passwords.py --apply
.venv-casdoor/bin/python casdoor/password-storage/passwords.py --check
docker compose -f docker-compose-with-auth.yaml up -d casdoor casdoor-gateway
```

第二次预览应显示账户与策略变更计数均为零。恢复访问前，用测试账户验证正确和错误密码，
并保留管理员恢复途径。迁移不由日常部署自动执行；哈希无法反向恢复为明文。

工具针对 Casdoor v2.67.0 默认表名的 MySQL 数据库，事务性地将明文转换为 Argon2id，
保留账户 ID、原登录密码及已有合法 bcrypt/Argon2id 哈希。它会拒绝无效哈希、元数据不明、
含本地密码的 LDAP 账户、组织级主密码或默认密码等需要人工核实的状态。
`initDataNewOnly = true` 应保持不变，避免重启覆盖组织与账户。

单测与真实 Casdoor/MySQL 集成测试仍验证按需迁移、登录、回滚、重复迁移和重启。
CI 使用官方服务镜像和测试运行器中的 Python，不构建自定义密码辅助镜像。
