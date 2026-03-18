# Skill: 模块文档生成

从现有代码逆向生成模块级文档，供 Claude AI coding 时快速理解业务上下文。

## 适用场景

- 为已有代码生成文档（代码 → 文档）
- 新成员/AI 需要快速了解某个模块
- 模块重构前的现状梳理

## 执行步骤

1. 确定要生成文档的模块名称
2. 扫描后端代码（hub、toolkit、commons 三个模块）：
   - Hub 模块:
     - Controller: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/`
     - Service: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/`
     - Entity: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/entity/`
     - Mapper: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/mapper/`
     - DTO: `console/backend/hub/src/main/java/com/iflytek/astron/console/hub/dto/`
   - Toolkit 模块:
     - Controller: `console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/`
     - Service: `console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/`
   - Commons 模块:
     - 工具类: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/util/`
     - DTO: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/dto/`
     - Service: `console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/`
3. 扫描前端代码：
   - 页面: `console/frontend/src/pages/` 下相关文件
   - 服务: `console/frontend/src/services/` 下相关文件
   - Store: `console/frontend/src/store/` 下相关文件
   - 组件: `console/frontend/src/components/` 下相关文件
4. 提取 API 端点、数据模型、核心业务逻辑
5. 生成 `module.md`

## 输出文件

`console/.claude/docs/{module-name}/module.md`

## 输出模板

```markdown
---
module: {模块名}
generated: {YYYY-MM-DD}
---

# {模块名} 模块文档

## 1. 模块概述
{一段话描述模块职责}

## 2. 后端 API 清单
| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /path | XxxController | @SpacePreAuth | 说明 |

## 3. 数据模型

### 表结构
| 表名 | Entity 类 | 说明 |
|------|----------|------|

### 关键字段
{Entity 类的核心字段列表，用代码块展示}

## 4. 后端核心类
| 类名 | 路径 | 职责 |
|------|------|------|

### 关键业务逻辑
{核心 Service 方法的逻辑摘要，重点描述复杂的业务规则}

## 5. 前端页面
| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|

## 6. 前端状态管理
| Store | 路径 | 管理的状态 |
|-------|------|-----------|

## 7. 前端 API Service
| 函数 | 路径 | 对应后端 API |
|------|------|-------------|

## 8. 模块间依赖
- 依赖: {列出依赖的其他模块}
- 被依赖: {列出依赖本模块的其他模块}
```

## 约束

- 必须读取实际代码，不要猜测或编造
- API 清单必须从 Controller 注解中提取，确保路径准确
- 数据模型必须从 Entity 类和 Flyway 迁移脚本中提取
- 业务逻辑摘要只描述复杂的、非显而易见的逻辑
- 中文为主，代码路径和技术术语保留英文
