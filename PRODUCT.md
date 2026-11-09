# Astron Agent

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

主要用户是企业内的 Agent 与工作流开发者。控制台优先帮助他们提高开发与管理效率。

## Product Purpose

在同一工作空间中创建、配置、调试和发布 Agent 与工作流，并管理其依赖资源。

## Operating Context

日常任务包括切换个人或团队空间，查找应用与资源，编辑和测试 Agent，编排工作流，以及管理发布。当前重构先覆盖统一设计基础、导航和 Agent / 工作流列表，编辑器、资源管理、发布与账户空间按后续子需求推进。

## Capabilities and Constraints

- 控制台使用 React、TypeScript、Vite、Ant Design 和 ReactFlow。
- 保留现有接口、空间作用域、权限规则及业务操作；UI 重构不能扩大跨空间访问。
- Agent 与工作流是独立入口；发布与执行职责以现有项目架构为准。
- 页面必须区分加载、空内容、搜索无结果和请求失败，并提供明确的下一步。

## Brand Commitments

保留 Astron Agent 产品名称、现有标识和准确的业务术语。不添加无依据的使用量、客户或效果声明。

界面方向采用浅色科技风格；保留熟悉的企业开发工具操作结构，加强 Agent 与资源关联的辨识度。不采用深色工作面或深色侧栏。Agent 列表优先使用大卡片网格展示，卡片内突出名称、用途、关联资源与主要操作。用户选定 Vector 第三版双层导航与双列大卡片布局，颜色采用 Ion 第二版银白、电蓝与深蓝文字。

## Evidence on Hand

产品与架构说明见 `docs/zh/PROJECT_MODULES.md`；真实界面和业务契约位于 `console/frontend/src` 与 `console/backend/astron_console`。

## Product Principles

- 让当前空间和操作对象始终清楚。
- 高频动作优先，次要动作按需展开。
- 在相同任务之间维持一致的交互与反馈。
- 使用真实数据；失败不能伪装为空内容。
