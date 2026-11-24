# 02 空间与资源管理技术设计

依据：[本阶段需求](requirements.md)、[父需求](../requirements.md)、[目标架构](../architecture.md)。本阶段只恢复空间和资源管理；Agent 定义/聊天、工作流编排和发布渠道留在各自子需求。工作树从账号测试提交 aaa92ae38acdb4c416cf7c52601519e830e64722 分出，账号认证继续使用 Django 会话和原 UID。

## 模块及依赖方向

React Console → 同源 /console-api → Django accounts + spaces + resources + knowledge → 原 Console MySQL 表与对应 core 服务。新增三个业务 app，使用官方 Django ORM、事务、迁移和权限异常机制；不存在 Java 代理或第二套认证。

- spaces 接管 agent_space、agent_enterprise、成员、权限、邀请、申请、通知等表。Console 管理这些组织数据；core/tenant 继续负责其应用身份与配额，不能把 Console 空间误迁成 tenant 租户。
- resources 接管 model/model_common、分类、config_info 平台账号配置、工具及工具版本、MCP、RPA、skill_sandbox_config。工具管理通过 core/plugin/link 的工具版本/调试 API 实际同步；模型供应商及本地模型服务继续使用实际协议，不以保存配置冒充连接成功。
- knowledge 接管 repo、file_info_v2、file_directory_tree、knowledge、preview_knowledge、extract_knowledge_task、Skill 文件、workflow_artifact、db_info。知识上传、切片、预览、向量化和检索继续由 core/knowledge 执行；数据库表/数据操作调用 core/memory/database，保留 db_info.db_id 的远端关联。
- 内部模型配置、沙箱凭据和产物上传由 core/workflow 或 core/agent → Console。只读取已有 workflow 的权威归属用于授权，不实现运行/发布。保留调用方的内部身份协议并拒绝缺失或错误凭据。

## 权限与数据保留

space-id / enterprise-id 仅选择上下文，不能声明权限。非空非法标识返回错误，不能回退个人范围。个人资源按登录 UID 隔离；空间资源必须校验有效空间、成员及现有权限位。保留角色 1 所有者、2 管理员、3 成员和数据库权限配置，不用固定角色覆盖历史配置。成员变更、邀请接受、申请批准、所有权转移使用事务，防止跨空间操作和最后所有者丢失。公共/官方资源只读与可管理个人资源明确区分。

Django 模型映射原表/列/主键；迁移使用历史模型与数据库 introspection 接管存在的表，为空库创建缺失表，不执行 Flyway 的 DROP 初始化。新增列只作非破坏性演进。保持 UID、space_id、工具远端 ID、知识库 dataset_id、数据库 db_id、文件 object_key/bucket 与既有业务配置。测试须覆盖已有表接管及重复迁移。资源删除遵循原软删约定；空间删除不得级联删除尚未迁移的 Agent、工作流或对象内容。

平台账号仍使用 config_info 的 PLATFORM_ACCOUNT JSON 契约，因为 knowledge/plugin/workflow 直接读取。Console 不读取 Java 对象缓存，保存配置时失效这些 core 消费的 platform_account_text:* 文本缓存；Redis 限流继续使用 Python 前缀。仅失效本次配置的缓存，不清空 Redis。Kafka 和 core/common 无需变更。

MinIO 使用官方客户端，复用现有对象标识和桶；产物继续进入私有桶并经授权下载。迁移不搬迁、不清空对象。只有用户明确删除相应资源时执行原有业务删除语义，失败不能伪装为成功。浏览器和日志不得得到模型/平台/沙箱密钥；已有密钥的存储、解码格式按实际源码处理，不能误把传输 RSA 当作数据库加密。保留加密配置和所需密钥，不重新生成导致旧数据不可读。

## 接口、前端及旧代码退出

复用有意义的现有前端业务契约，允许同步修改路由、请求和响应，禁止为旧 Java 保留适配服务。所有写操作采用带 CSRF 的非 GET 请求；文件上传解析 multipart，普通 API 解析 JSON。错误使用明确 HTTP 状态与 code/message/data，不返回模拟资源或模拟成功。第三方故障返回可诊断错误，关键写入/远端同步记录资源 ID 和结果，日志不记录敏感负载。

页面需覆盖空间/企业成员权限、邀请申请通知，以及模型、平台账号、工具市场与自建工具、MCP/RPA、知识文档、数据库、Skill/沙箱和文件的实际管理。导航默认进入本阶段可用页面；未迁移业务不成为资源页面初始化依赖。删除已被替代的 Java controller/service/mapper/DTO/test 与配置；仍被 03–05 使用的共享实体或工具仅在确认调用关系后处理，不为保持 Java 构建而保留第二套业务实现。

## 验证与部署边界

- 先运行账号测试，核对登录、旧 UID 保留、issue_password_reset 原用户名查找、一次性链接及登录链。
- Django 测试覆盖个人/空间越权、配置权限位、CSRF、成员和邀请状态转换、敏感字段隐藏、内部服务认证失败、资源 CRUD/归属及外部服务错误；持久层测试验证原表和业务配置接管，不以 mock 成功作为核心服务联调验收。
- `uv run python manage.py test --settings=astron_console.settings_test`、`makemigrations --check --dry-run`、ruff；前端 type-check、相关 lint 与 production build。
- 独立环境使用 MySQL/Redis/MinIO 和本阶段所需 core 服务，验证空库与保留旧数据的迁移、重启后资源保留、真实知识切片检索、工具同步、数据库及上传下载、内部调用方授权。
- 独立审查后按 CONFIG 执行测试部署→浏览器验收→生产部署阶段。中间交付仅用于 02 范围验证；生产阶段不得把分支合并主分支或当作全量迁移发布。环境/外部平台缺少必要能力时按 Loop 返回具体阻塞，不把未执行项记为通过。

官方依据：Django 5.2 迁移的 SeparateDatabaseAndState/历史模型、官方 test runner 与 call_command；React effect cleanup 防止切换空间后旧请求覆盖新状态。第三方 API 在实现前按 AGENTS.md 使用 Context7 核验。
