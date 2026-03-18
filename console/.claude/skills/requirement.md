# Skill: 需求文档生成

将用户的原始需求描述转化为结构化需求文档，供后续 Skills 链路消费。

## 执行步骤

1. 理解用户描述的需求，必要时追问澄清模糊点
2. 确定功能名称（英文短横线命名，如 `bot-tag-management`），创建目录 `console/.claude/docs/{feature-name}/`
3. 读取项目代码，分析需求涉及的现有业务模块：
   - 后端: 查找相关的 Controller、Service、Entity
     - Hub 模块: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/`
     - Toolkit 模块: `console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/`
     - Commons 模块: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/`
   - 前端: 查找相关的页面、组件、服务（`console/frontend/src/`）
4. 生成 `requirement.md`

## 输出文件

`console/.claude/docs/{feature-name}/requirement.md`

## 输出模板

```markdown
---
feature: {功能名称}
module: {所属模块: bot/chat/workflow/space/enterprise/user/publish/model/knowledge/tool}
priority: {P0/P1/P2}
created: {YYYY-MM-DD}
---

# {功能名称} — 需求文档

## 1. 背景与动机

{为什么需要这个功能，2-3 句话}

## 2. 目标用户

- {角色1}: {使用场景}
- {角色2}: {使用场景}

## 3. 核心需求

- R1: {需求描述}
- R2: {需求描述}
- R3: {需求描述}

## 4. 业务规则

- BR1: {约束条件/边界情况}
- BR2: {约束条件/边界情况}

## 5. 非功能需求

- 性能: {要求}
- 安全: {要求}
- 兼容性: {要求}

## 6. 涉及现有模块

### 后端
- `{文件路径}`: {影响说明}

### 前端
- `{文件路径}`: {影响说明}

## 7. 开放问题

- [ ] {待确认事项1}
- [ ] {待确认事项2}
```

## 约束

- 不要编造需求，不确定的标记为"开放问题"
- 必须读取现有代码确认涉及的模块，给出具体文件路径
- 保持简洁，每个章节不超过 10 行
- 中文为主，代码路径和技术术语保留英文
