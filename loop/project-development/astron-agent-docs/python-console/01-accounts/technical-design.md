# 01 内部账号技术设计

依据：[需求](requirements.md)、[父架构](../architecture.md)。只实现账号范围。

## 服务与持久层

在 `console/backend` 建立独立 Python 包 `astron_console`、manage.py、pyproject/uv.lock、ASGI 入口、Dockerfile 与启动脚本。Django 5.2 负责认证、数据库会话、CSRF、密码表单校验及迁移。生产使用 MySQL 与 Redis；本地测试可使用 SQLite 和独立测试缓存。凭据从环境或文件读取，生产配置缺失即拒绝启动。

认证用户继承 AbstractUser，UID 使用字符串主键，与原 user_info.uid 一致；新用户生成 UUID 字符串。认证表与已有 user_info 分离，不修改其他业务表。Profile 映射原字段及表名；迁移通过历史模型与 schema_editor 接管既有表或为新库创建表，不执行破坏性重建。

提供幂等 `import_legacy_users` 命令，按 UID 导入无可用密码的身份，保留删除/冻结状态；名称冲突明确失败，支持管理员提供 UID 到新登录名映射。全量预检后事务写入；重复导入不改密码。注册对尚未导入的历史账号拒绝开放，避免抢占旧用户名。

`issue_password_reset --username`（重名时使用 `--uid`） 仅在可信命令行生成官方 PasswordResetTokenGenerator 的 token 和编码 UID，输出实际登录用户名与前端重设链接；不查询/打印旧密码。重设端点在行锁事务中校验 token 并通过 SetPasswordForm 保存，新密码使 token 与旧会话失效。没有公开的凭用户名发放重设 token 接口。

## API 与浏览器

同源 `/console-api` 网关转发，Python 路径不带该前缀：

| 路径 | 行为 |
|---|---|
| GET /auth/csrf | 获取请求 CSRF token，禁止缓存 |
| POST /auth/register | username/password/passwordConfirm；创建普通用户并登录 |
| POST /auth/login | 验证密码、状态，轮换会话 |
| POST /auth/logout | 销毁当前会话 |
| POST /auth/reset-password | uid/token/password/passwordConfirm；重设成功后回登录 |
| POST /auth/change-password | 已登录且校验原密码，修改后保留当前会话、撤销其他旧会话 |
| GET /user-info/me | 返回当前资料，无密码/会话值 |
| POST /user-info/update | 只改当前用户昵称/头像 |
| POST /user-info/agreement | 当前用户同意协议 |
| GET /health | 进程存活；不暴露配置 |

业务 JSON 保留 code/message/data 结构以复用现有前端响应处理，不维护第二套旧认证协议。未登录接口返回 401；校验 400；CSRF 403；速率限制 429。内核状态变更统一 CSRF；认证响应带 no-store。

登录页、注册页、重设页及账号页在主业务布局外可用，避免依赖尚未迁移资源接口。HTTP、上传和 SSE 公共层改为同源 Cookie/CSRF；删除 Casdoor SDK、callback、tokenStorage 及所有旧 bearer 拼装。前端不依据本地缓存 token 判断登录，使用 /user-info/me。

限流使用共享 Django 缓存，以来源地址和操作限制请求；不信任任意外部 X-Forwarded-For。反向代理部署时只由可信网关设置真实地址或使用明确代理配置，避免客户端伪造绕过；不自行实现密码哈希、会话签名或 token 算法。

## 部署与清理

Compose/Helm 删除 Casdoor 服务、配置、SDK 环境变量和对 Casdoor 数据库的运行依赖，不删除实际历史卷。Python 替换 console-hub 镜像启动；启动先迁移、导入旧用户，再开放 HTTP。没有 Java 回退。剩余 Java 业务在所属后续子需求迁移，本范围替代的认证入口立即移除。

更新 CI 的 Console 检查和镜像路径，删除 Casdoor 专用 CI。本阶段不合并主分支、不发布全量生产版本；验证部署必须与正式环境隔离。操作手册写在 console/backend/README.md，包含已有数据导入、冲突处理和一次性重设命令。

## 验证

- Django 内建测试覆盖真实密码哈希、注册唯一性及提权拒绝、正确/错误密码、冻结/删除状态、CSRF、会话轮换/退出、旧 UID 保留、导入幂等/冲突、重设 token 过期/重复使用/错误用户、改密撤销旧会话、资料权限和限流。
- 迁移测试使用预先存在的 user_info 和资源归属样本，验证接管不删除/改写 UID；空库可初始化。MySQL 验证使用独立数据库，不能对真实业务库清空运行测试。
- `uv run python manage.py test --settings=astron_console.settings_test`、迁移一致性检查、Python 静态检查；前端 type-check、涉及文件 lint 和生产构建。
- 实际浏览器验收注册、登录、刷新、退出、设置旧账号密码、账号资料及改密；明确记录构建和隔离验证地址。未运行的 MySQL/部署检查不得记为通过。
