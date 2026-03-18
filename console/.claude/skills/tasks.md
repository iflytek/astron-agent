# Skill: 任务规划

将需求规格说明拆解为可执行的开发任务，带依赖关系、执行顺序和文件路径，可直接用于指导 Claude 逐步实现。

## 前置条件

读取 `console/.claude/docs/{feature-name}/spec.md`。如不存在，提示用户先执行 `/spec`。

## 执行步骤

1. 读取规格说明文档
2. 按 数据层 → 后端 API → 前端页面 → 联调测试 的顺序拆解任务
3. 标注任务间的依赖关系
4. 为每个任务指定具体的文件路径
5. 估算复杂度
6. 生成 `tasks.md`

## 输出文件

`console/.claude/docs/{feature-name}/tasks.md`

## 输出模板

```markdown
---
feature: {功能名称}
total_tasks: {任务总数}
estimated_effort: {总估算工时}
created: {YYYY-MM-DD}
upstream: spec.md
---

# {功能名称} — 任务规划

## 任务概览

| 编号 | 阶段 | 任务 | 复杂度 | 依赖 |
|------|------|------|--------|------|
| T1 | 数据层 | {描述} | S | - |
| T2 | 后端 | {描述} | M | T1 |
| T3 | 前端 | {描述} | L | T2 |
| T4 | 测试 | {描述} | M | T2,T3 |

---

## 阶段 1: 数据层

### T1: {任务标题} [S]

**依赖**: 无
**文件**:
- 新建: `console/backend/hub/src/main/resources/db/migration/V{version}__{description}.sql`
- 新建: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/entity/{Entity}.java`
- 新建: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/mapper/{Mapper}.java`

**具体内容**:
1. 创建 Flyway 迁移脚本，建表/改表
2. 创建 Entity 类，使用 MyBatis Plus 注解
3. 创建 Mapper 接口，继承 BaseMapper

---

## 阶段 2: 后端 API

### T2: {任务标题} [M]

**依赖**: T1
**文件**:
- 新建: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/{Service}.java`
- 新建: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/impl/{ServiceImpl}.java`
- 新建: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/{Controller}.java`
- 新建/修改: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/dto/{DTO}.java`

**具体内容**:
1. 创建 Service 接口和实现类
2. 创建 Controller，定义 REST 端点
3. 创建请求/响应 DTO

---

## 阶段 3: 前端页面

### T3: {任务标题} [M]

**依赖**: T2
**文件**:
- 新建: `console/frontend/src/services/{service}.ts`
- 新建: `console/frontend/src/pages/{module}/{Page}.tsx`
- 修改: `console/frontend/src/router/index.tsx`（添加路由）
- 新建: `console/frontend/src/types/{types}.ts`

**具体内容**:
1. 创建 API Service 函数
2. 创建页面组件
3. 注册路由
4. 定义 TypeScript 类型

### T4: {任务标题} [S]

**依赖**: T3
**文件**:
- 修改: `console/frontend/src/locales/zh/...`
- 修改: `console/frontend/src/locales/en/...`

**具体内容**:
1. 添加中英文国际化文案

---

## 阶段 4: 联调与测试

### T5: {任务标题} [M]

**依赖**: T2, T3
**文件**:
- 新建: `console/backend/hub/src/test/java/com/iflytek/astron/console/hub/service/{ServiceTest}.java`

**具体内容**:
1. 编写后端单元测试
2. 前后端联调验证
3. 验收标准逐条验证（对照 stories.md）

---

## 依赖关系

```
T1 (数据层)
 └── T2 (后端 API)
      ├── T3 (前端页面) ── T4 (国际化)
      └── T5 (测试，依赖 T2 + T3)
```
```

## 约束

- 每个任务必须在 2 小时内可完成，超过 L 的必须继续拆分
- 文件路径必须是具体的，不能是模糊描述
- 必须包含 Flyway 数据库迁移任务（如涉及数据模型变更）
- 必须包含测试任务
- 必须包含国际化任务（如涉及前端页面）
- 任务顺序必须考虑依赖关系，不能出现循环依赖
- 中文为主，文件路径和代码保留英文
