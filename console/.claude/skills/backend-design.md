# Skill: 后端技术设计

为后端开发生成详细的技术设计文档，包含类设计、代码骨架、数据库迁移、集成方案，可直接指导 Claude 编写代码。

## 前置条件

读取以下文档：
- `console/.claude/docs/{feature-name}/spec.md`（必须）
- `console/.claude/docs/{feature-name}/tasks.md`（必须）

同时读取现有后端代码，参考 `console/backend/CLAUDE.md` 中的架构规范。

## 执行步骤

1. 读取规格说明和任务规划
2. 分析现有后端代码模式（扫描 hub、toolkit、commons 三个模块）：
   - Hub 模块:
     - Controller: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/`
     - Service: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/`
     - Entity: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/entity/`
     - Mapper: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/mapper/`
     - DTO: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/dto/`
     - 配置: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/config/`
   - Toolkit 模块:
     - Controller: `console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/`
     - Service: `console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/`
   - Commons 模块:
     - 工具类: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/util/`
     - DTO: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/dto/`
     - Service: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/`
     - 配置: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/config/`
3. 找到相似功能的现有实现作为参考（读取具体代码）
4. 设计新增/修改的类结构
5. 编写关键代码骨架
6. 设计数据库迁移脚本
7. 生成 `backend-design.md`

## 输出文件

`console/.claude/docs/{feature-name}/backend-design.md`

## 输出模板

```markdown
---
feature: {功能名称}
created: {YYYY-MM-DD}
upstream: spec.md, tasks.md
reference: {参考的现有相似功能实现路径}
---

# {功能名称} — 后端技术设计

## 1. 设计概述

{一段话说明技术方案选择及理由}

**参考实现**: `{现有相似功能的代码路径}`（本设计参考其模式）

## 2. 类设计

### 2.1 新增类

#### {ClassName}

- **包路径**: `com.iflytek.astron.console.hub.{module}.{type}`
- **文件**: `console/backend/hub/src/main/java/.../...java`
- **职责**: {一句话}
- **依赖注入**: {注入的 Service/Mapper 列表}

**关键方法**:
```java
public ReturnType methodName(ParamType param) {
    // 实现要点说明
}
```

#### {ClassName2}

...（同上格式）

### 2.2 修改类

#### {ExistingClassName}

- **文件**: `{具体文件路径}`
- **修改内容**: {新增/修改的方法}
- **修改原因**: {为什么需要改}

**新增方法**:
```java
public ReturnType newMethod(ParamType param) {
    // 实现要点说明
}
```

## 3. 数据库迁移

### Flyway 脚本

**文件**: `console/backend/hub/src/main/resources/db/migration/V{version}__{description}.sql`

```sql
-- {说明}
CREATE TABLE IF NOT EXISTS {table_name} (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '{说明}',
    -- 业务字段
    space_id VARCHAR(64) NOT NULL COMMENT '空间ID',
    created_by VARCHAR(64) COMMENT '创建人',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    INDEX idx_{field}({field})
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='{表说明}';
```

## 4. 关键代码骨架

### Controller

```java
@RestController
@RequestMapping("/{module}")
@RequiredArgsConstructor
public class {Controller} {

    private final {Service} service;

    @PostMapping("/{action}")
    @SpacePreAuth(role = SpaceRoleEnum.MEMBER)
    public Result<{ResponseDTO}> action(@RequestBody @Valid {RequestDTO} request) {
        return Result.success(service.action(request));
    }
}
```

### Service

```java
public interface {Service} {
    {ResponseDTO} action({RequestDTO} request);
}
```

```java
@Service
@RequiredArgsConstructor
public class {ServiceImpl} implements {Service} {

    private final {Mapper} mapper;

    @Override
    public {ResponseDTO} action({RequestDTO} request) {
        // 1. 参数校验
        // 2. 业务逻辑
        // 3. 数据持久化
        // 4. 返回结果
    }
}
```

### Entity

```java
@Data
@TableName("{table_name}")
public class {Entity} {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    // 业务字段
    private String spaceId;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

### DTO

```java
@Data
public class {RequestDTO} {
    @NotBlank(message = "{校验信息}")
    private String field;
}

@Data
public class {ResponseDTO} {
    private Long id;
    // 响应字段
}
```

## 5. 配置变更（如适用）

- `application.yml` 新增配置项:
```yaml
astron:
  {module}:
    {config-key}: {value}
```

- 新增枚举类:
```java
@Getter
@AllArgsConstructor
public enum {EnumName} {
    VALUE1("value1", "描述"),
    VALUE2("value2", "描述");

    private final String code;
    private final String desc;
}
```

## 6. 测试要点

**测试文件**: `console/backend/hub/src/test/java/.../...Test.java`

**需要 Mock 的依赖**:
- `{Mapper}`: 数据访问层
- `{OtherService}`: {说明}

**关键测试场景**:
| 场景 | 输入 | 预期结果 |
|------|------|----------|
| 正常创建 | 合法参数 | 返回成功 |
| 参数校验失败 | 空字段 | 抛出 ValidationException |
| 权限不足 | 无权限用户 | 返回 403 |
```

## 约束（必须遵循项目现有规范）

- Controller 层: 只做参数校验和转发，不含业务逻辑
- Service 层: 接口 + Impl 分离
- Entity: 使用 MyBatis Plus 注解（@TableName, @TableField, @TableId, @TableLogic）
- DTO: 使用 Lombok @Data，请求 DTO 使用 JSR 303 校验注解
- 对象转换: 使用 MapStruct
- 权限: 使用 @SpacePreAuth / @EnterprisePreAuth 注解
- 异常: 使用项目统一的 BusinessException
- 返回值: 使用项目统一的 Result<T> 包装
- 分页: 使用 MyBatis Plus 的 Page<T>
- 日志: 使用 @Slf4j + log.info/warn/error
- 必须找到现有相似功能作为参考，保持风格一致
- 中文为主，代码保留英文
