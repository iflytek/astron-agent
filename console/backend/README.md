# Python Console

控制台使用 Django 5.2 与 ASGI。当前迁移内部账号基础上的空间与资源管理；Agent、工作流和发布继续按 [迁移需求](../../loop/project-development/astron-agent-docs/python-console/requirements.md) 继续迁移，中间版本不代表全量功能可用。Python 不代理回 Java。

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

Compose 使用主 `docker/astronAgent/docker-compose.yaml`。RPA 资源管理使用所配置平台的开放 API 凭据，不恢复 Casdoor。先配置上述密钥、域名和 Cookie 设置，再构建当前 Console/前端镜像。Helm 使用 `consoleHub.auth.existingSecret` 指向已有 Secret，键默认为 `secret-key`；多副本迁移先单独完成。移除 Casdoor 定义不执行数据库删除。

`CONSOLE_ALLOWED_HOSTS`（Helm 为 `consoleHub.auth.allowedHosts`）保留配置的公网主机列表。Compose 自动追加内部 `console-hub`，Helm 自动追加与 core 调用 URL 相同的实际 Service 名；无需把内部主机手写到公网配置，也不使用 `*` 放开 Host 校验。直接运行 Python 时，应在允许列表中明确填写实际调用主机名。


## 空间与资源

浏览器入口为 `/resource/knowledge`，导航可选择默认个人资源或已有成员关系的空间。空间管理包含企业、成员、角色、邀请、申请与通知；授权按原权限表执行。默认个人资源的 `space_id` 为空且归当前 UID。切换空间会重新载入资源页面，避免将旧表单写到新空间。

迁移接管原空间/资源表和主键，不重新编号，不修改原 UID、不重建已有表或清理对象桶。原数据库中的 Agent、工作流、发布定义仍保留，但不属于本阶段可用能力。空间删除不级联删除这些定义。数据库操作须继续指向原 `db_info.db_id` 对应的 core 数据库；MinIO 对象保持原 key/bucket。

资源服务沿用 `KNOWLEDGE_URL`、`TOOL_URL`、`SPARK_DB_URL`、`SPARK_DB_TYPE`、`LOCAL_MODEL_URL`、`RPA_URL`、`MAAS_APP_ID`/`TENANT_ID` 配置。MinIO 沿用 `OSS_ENDPOINT`、`OSS_REMOTE_ENDPOINT`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`OSS_BUCKET_CONSOLE`；凭据支持 `_FILE`。MCP 外部目录、授权及短链服务分别由 `RESOURCE_MCP_CATALOG_URL`、`RESOURCE_MCP_AUTH_URL`、`RESOURCE_MCP_SHORT_URL` 明确指定，未配置时相关调用返回不可用，不返回模拟结果。

内部模型配置使用 `WORKFLOW_INTERNAL_API_KEY`，沙箱配置使用 `SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN`，产物上传使用 `SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN`，均支持 `_FILE`，并继续匹配调用方现有 header。这些凭据不是浏览器登录凭据，不能写入 Agent/工作流定义。`uv run python manage.py init_resource_storage` 仅创建缺失的 Console 和产物桶，保留现有对象和桶策略。容器在启用迁移且配置 OSS_ENDPOINT 时执行该初始化；多副本关闭迁移时应在部署任务中显式执行一次。新产物使用 `SKILL_SANDBOX_ARTIFACT_BUCKET` 私有桶；历史 bucket_name 为空的产物仍指向原 Console 桶。

Compose 的 `internal-credentials-init` 在 Console 启动前初始化两个沙箱凭据卷。空卷使用已配置的环境变量或生成独立凭据；旧卷保留文件内容，仅将目录设为 `root:10001 / 0750`、文件设为 `root:10001 / 0440`。Console 以 `10001:10001` 运行，Console、core-agent、core-workflow 通过共享只读组及只读卷读取；应用不创建或修改凭据。已有文件与显式环境变量冲突时初始化失败，不自动轮换；升级须使用 Compose 正常启动依赖，不能跳过初始化任务。Helm 沿用已有 Secret 或受管 Secret 的 `lookup` 复用，通过 `secretKeyRef` 注入，不依赖这些文件权限。运行 `python3 docker/astronAgent/scripts/verify_security_contract.py --exercise-credential-lifecycle` 可在独立临时 Compose 项目验证空卷、旧卷内容保留和非 root 读取，需要可用 Docker daemon。

平台账号管理仅向管理员开放：沿用 `ADMIN_UID` 指定的原 UID，也接受 Django 超级用户；不会将首个注册用户自动设为管理员。平台账号保留 `config_info` 内原 JSON 配置以及 core 服务的读取契约；更新时定向失效共享文本缓存。Python 不依赖 Java 序列化缓存。空间配额可通过 `SPACE_LIMIT_{FREE|PRO|TEAM|ENTERPRISE}_{SPACE_COUNT|USER_COUNT}` 覆盖，默认值与旧 Console 相同。
