# Python Console

控制台使用 Django 5.2 与 ASGI。当前交付内部账号、用户资料和旧身份接管；空间、资源、Agent、工作流和发布按 [迁移需求](../../loop/project-development/astron-agent-docs/python-console/requirements.md) 继续迁移，中间版本不代表全量功能可用。Python 不代理回 Java。

## 账号

打开 `/register` 注册用户名和密码，`/login` 登录，`/account` 管理资料、修改密码或退出。用户名按 Unicode NFKC 和大小写归一化，密码至少 12 位，使用 Django Argon2 哈希。浏览器采用同源 HttpOnly 会话 Cookie，写请求带 CSRF；无 Casdoor、SSO 或邮箱/短信依赖。

对外由同源网关把 `/console-api/` 转发到本服务；Vite 开发/预览也提供该代理。没有单独的认证服务或浏览器令牌刷新。内部服务鉴权不等同于账号登录，后续业务域迁移时继续保留。

## 配置

| 变量 | 用途 |
|---|---|
| `CONSOLE_SECRET_KEY` 或 `_FILE` | 必需，至少 50 字符的随机 Django 密钥；各实例共享且持久保存 |
| `CONSOLE_ALLOWED_HOSTS` | 允许的公开主机名/IP，逗号分隔，无协议和端口；本机健康检查地址 localhost、127.0.0.1 始终保留 |
| `CONSOLE_PUBLIC_ORIGIN` | 用户访问的完整 origin，用于生成重设链接 |
| `CONSOLE_CSRF_TRUSTED_ORIGINS` | HTTPS 网关的公开 origin，逗号分隔 |
| `CONSOLE_COOKIE_SECURE` | 默认 true；仅本地/隔离 HTTP 验证设 false |
| `MYSQL_HOST/PORT/USER/PASSWORD` | Console 数据库连接，密码支持 `_FILE` |
| `CONSOLE_MYSQL_DB` | 默认 astron_console |
| `CONSOLE_REDIS_URL` 或 `_FILE` | Redis 缓存/限流 URL；也支持现有 REDIS_HOST/PORT/PASSWORD 配置 |
| `CONSOLE_TRUSTED_PROXIES` | 可信代理 IP/CIDR；仅这些来源允许使用代理覆写的 X-Real-IP |
| `CONSOLE_USERNAME_MAP` | 可选，容器内旧 UID→登录名 JSON 映射文件路径 |
| `CONSOLE_RUN_MIGRATIONS` | 默认 true，启动时迁移并导入；多副本部署由单个部署任务完成后设 false |

生产使用 MySQL（官方 mysqlclient 驱动）和 Redis。数据库会话在多个进程/实例间共享。Redis 使用独立 Python 键前缀，不消费 Java 序列化缓存。

## 已有用户启用

停止旧 Console 写入，并保留所有业务表。**不要运行旧 Flyway 初始化 SQL**。新迁移接管已存在的 `user_info`，只新增认证/会话相关表；Casdoor 数据库不再需要在线，但无需删除旧数据卷。

```sh
uv sync --locked --extra mysql
uv run python manage.py migrate --noinput
uv run python manage.py import_legacy_users
```

导入保持 UID、用户资料和所有业务资源引用，初始密码不可用。重复执行不覆盖已设置密码。如果旧名重复或不合法，导入会整体失败；使用 JSON 文件显式指定冲突账号的新登录名，再执行 `import_legacy_users --username-map /path/to/names.json`。映射键是旧 UID，值是新登录名。不会静默合并用户；所有旧身份导入前公开注册返回初始化未完成。

运维核实账号所有者后，通过受信任终端生成重设链接：

```sh
uv run python manage.py issue_password_reset --username '原用户名'
```

命令会显示迁移后的登录用户名和重设链接。打开链接设置一次新密码后，即可继续使用原账号及其资源；不读取或迁移 Casdoor 旧密码。Docker 部署可在 `docker/astronAgent` 目录执行：

```sh
docker compose exec console-hub python manage.py issue_password_reset --username '原用户名'
```

若历史用户名有重名或账号名映射冲突，使用 `--uid '原用户UID'` 明确选择，避免选错账号。

链接有效期一小时，成功设置密码后不可复用；冻结和删除账号不能借此登录。token 放在 URL fragment，避免进入 HTTP 访问日志；只通过可信渠道交给本人，不放入工单/公共日志。后续忘记密码也使用同一命令。系统不会通过公开接口仅凭用户名发出可用重设凭据。

## 开发与检查

```sh
uv sync --locked
uv run python manage.py test --settings=astron_console.settings_test
uv run python manage.py makemigrations --check --dry-run --settings=astron_console.settings_test
uv run ruff check astron_console manage.py
uv run ruff format --check astron_console manage.py
```

测试使用隔离 SQLite 和测试缓存；生产 MySQL/Redis 与浏览器验证需单独执行，不以 SQLite 测试替代。开发可设置 `CONSOLE_DATABASE_ENGINE=sqlite`、`CONSOLE_SQLITE_PATH` 指向临时数据库，配置独立 Redis 后运行 `uv run python manage.py runserver 127.0.0.1:8080`。前端 `npm run dev` 默认代理到本机 8080，可用 `CONSOLE_DEV_BACKEND` 指定其他地址。

Compose 使用主 `docker/astronAgent/docker-compose.yaml`。RPA 外部应用仍依赖旧身份系统，本阶段暂停联合部署，后续渠道集成阶段处理。先配置上述密钥、域名和 Cookie 设置，再构建当前 Console/前端镜像。Helm 使用 `consoleHub.auth.existingSecret` 指向已有 Secret，键默认为 `secret-key`；多副本迁移先单独完成。移除 Casdoor 定义不执行数据库删除。
