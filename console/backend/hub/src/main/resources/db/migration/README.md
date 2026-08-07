# Database Migration Guide / 数据库迁移指南

This project uses **Flyway** for database version control and migration. All migration scripts are located in this directory.
本项目使用 **Flyway** 进行数据库版本控制和迁移。所有迁移脚本均位于此目录下。

## 1. Naming Convention / 命名规范

Flyway follows a strict naming convention for migration files:
Flyway 对迁移文件遵循严格的命名规范：

`V<Version>__<Description>.sql`

*   **V**: Prefix for versioned migrations. (前缀，表示版本化迁移)
*   **Version**: Unique version number (e.g., `1.1`, `20230101`). Dots or underscores can be used as separators. (唯一的版本号，如 `1.1` 或 `20230101`。可以使用点或下划线作为分隔符。)
*   **__**: **Double underscore** separator. (双下划线分隔符)
*   **Description**: Meaningful description of the change (e.g., `init_core`, `add_user_table`). (对变更的有意义描述，如 `init_core`, `add_user_table`)
*   **.sql**: File extension. (文件扩展名)

**Examples / 示例:**
*   `V1.1__init_core.sql`
*   `V1.12__insert_other_data.sql`

## 2. Current Structure / 当前结构

The initial `schema.sql` has been split into multiple files based on functionality:
初始的 `schema.sql` 已根据功能拆分为多个文件：

*   **Schema Definition / 表结构定义**:
    *   `V1.1__init_core.sql`: Core system tables. (核心系统表)
    *   `V1.2__init_enterprise.sql`: Enterprise related tables. (企业相关表)
    *   `V1.3__init_space.sql`: Space/Group related tables. (空间/群组相关表)
    *   `V1.4__init_bot.sql`: Bot configuration tables. (机器人配置表)
    *   `V1.5__init_workflow.sql`: Workflow engine tables. (工作流引擎表)
    *   `V1.6__init_model.sql`: AI Model related tables. (AI模型相关表)
    *   `V1.7__init_knowledge.sql`: Knowledge base tables. (知识库表)
    *   `V1.9__init_toolbox.sql`: Tool/Plugin tables. (工具/插件表)

*   **Data Initialization / 数据初始化**:
    *   `V1.10__insert_permission_data.sql`: Permission data. (权限数据)
    *   `V1.11__insert_template_data.sql`: Template data. (模板数据)
    *   `V1.12__insert_other_data.sql`: Other initial data. (其他初始化数据)
    *   `V1.13__insert_config_data.sql`: Configuration data. (配置数据)
    *   `V1.14__insert_config_data2.sql`: Additional configuration data. (额外配置数据)

## 3. How to Add a New Migration / 如何添加新迁移

1.  **Create a new file** in this directory.
    在此目录下**创建一个新文件**。
2.  **Name it** with the next available version number. (e.g., if the latest is `V1.13`, use `V1.14`).
    使用下一个可用的版本号**命名**。（例如，如果最新的是 `V1.13`，请使用 `V1.14`）。
3.  **Write your SQL** statements (DDL or DML) in the file.
    在文件中**编写 SQL** 语句（DDL 或 DML）。
4.  **Restart the application**. Flyway will automatically detect and apply the new migration.
    **重启应用程序**。Flyway 将自动检测并应用新的迁移。

## 4. Important Notes / 注意事项

*   **Immutability**: Once a migration file has been applied to a database (e.g., Production), **NEVER modify it**. Create a new version to make changes or fixes.
    **不可变性**：一旦迁移文件已应用到数据库（例如生产环境），**切勿修改它**。请创建一个新版本来进行更改或修复。
*   **Idempotency**: It is good practice to write idempotent scripts (e.g., using `CREATE TABLE IF NOT EXISTS` or checking for existence), although Flyway tracks applied versions to prevent re-execution.
    **幂等性**：编写幂等脚本（例如使用 `CREATE TABLE IF NOT EXISTS` 或检查是否存在）是一个好习惯，尽管 Flyway 会跟踪已应用的版本以防止重复执行。
*   **No Inserts in Schema Files**: Keep schema definitions (`CREATE TABLE`) separate from data insertions (`INSERT`) for better maintainability.
    **Schema 文件中不包含插入语句**：为了更好的可维护性，请将表结构定义 (`CREATE TABLE`) 与数据插入 (`INSERT`) 分开。
