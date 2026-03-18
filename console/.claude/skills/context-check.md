# Skill: 上下文校验

在需求分析前校验相关模块文档的可信度，确保 AI coding 基于正确的上下文。

## 适用场景

- 开始新功能开发前（在 `/requirement` 前执行）
- 怀疑模块文档已漂移时
- 长时间未更新的模块文档

## 执行步骤

1. 根据用户需求，识别涉及的模块（bot/workflow/ai-tools/chat/space/enterprise/user/publish/model/knowledge）
2. 读取对应的 `console/.claude/docs/{module}/module.md`
3. 从实际代码中抽取关键信息：
   - 后端 API 端点（从 Controller 注解中提取）
   - Entity 字段（从 Entity 类中提取）
   - 前端 service 函数（从 services/*.ts 中提取）
4. 对比文档与代码，标记不一致项：
   - API 路径不一致
   - Entity 字段缺失或多余
   - Service 函数名称不一致
5. 生成校验报告，建议是否需要先修复文档

## 输出文件

`console/.claude/docs/{module}/context-check-report.md`（临时文件，校验后可删除）

## 输出模板

```markdown
---
module: {模块名}
checked: {YYYY-MM-DD HH:mm:ss}
status: {pass/warning/fail}
---

# {模块名} 上下文校验报告

## 校验结果

**状态**: {pass/warning/fail}

- pass: 文档与代码完全一致，可直接使用
- warning: 发现少量不一致，建议修复但不阻塞开发
- fail: 发现严重不一致，必须先修复文档再开发

## 后端 API 校验

### ✅ 一致的 API

| 方法 | 路径 | Controller |
|------|------|-----------|
| POST | /xxx/create | XxxController |

### ⚠️ 不一致的 API

| 文档中的路径 | 实际代码中的路径 | Controller | 建议 |
|------------|----------------|-----------|------|
| /tool/create | /tool/create-tool | ToolBoxController | 更新文档 |

### ❌ 文档中缺失的 API

| 方法 | 路径 | Controller | 建议 |
|------|------|-----------|------|
| POST | /xxx/new-api | XxxController | 补充到文档 |

## 数据模型校验

### ✅ 一致的 Entity

| Entity | 表名 | 关键字段 |
|--------|------|---------|

### ⚠️ 字段不一致的 Entity

| Entity | 文档中的字段 | 实际代码中的字段 | 建议 |
|--------|------------|----------------|------|

## 前端 Service 校验

### ✅ 一致的 Service 函数

| 函数名 | 文件 | 对应后端 API |
|--------|------|-------------|

### ⚠️ 不一致的 Service 函数

| 文档中的函数名 | 实际代码中的函数名 | 文件 | 建议 |
|--------------|------------------|------|------|

## 修复建议

### 高优先级（必须修复）

1. {具体修复建议}
2. {具体修复建议}

### 低优先级（建议修复）

1. {具体修复建议}
2. {具体修复建议}

## 下一步行动

- [ ] 如果状态为 fail，先执行 `/doc-module` 修复文档
- [ ] 如果状态为 warning，可继续开发，但建议后续修复
- [ ] 如果状态为 pass，可直接执行 `/requirement`
```

## 约束

- 必须读取实际代码，不要猜测
- API 路径必须从 Controller 注解中提取（@RequestMapping, @PostMapping, @GetMapping 等）
- Entity 字段必须从 Entity 类中提取（@TableField, @TableId 等）
- 前端 service 函数必须从 services/*.ts 中提取（export function xxx）
- 对比时忽略大小写和下划线/驼峰差异
- 中文为主，代码路径和技术术语保留英文
