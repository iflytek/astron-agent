# Console 开发工作流程

本文档定义了 Console 项目的标准开发流程，确保文档与代码同步迭代。

## 流程选择指南

根据任务类型选择合适的开发流程，避免小功能走完整重流程。

### 大功能（完整链路）

**适用场景**：
- 新增数据表
- 新增前端页面
- 跨模块改动（涉及 2+ 模块）
- 多角色交互场景（管理员、普通用户、访客）

**流程**：
```
/context-check → /requirement → /stories → /spec → /tasks → /backend-design + /frontend-design → 实现 → /doc-module → /drift-check
```

**说明**：
- `/context-check`: 校验相关模块文档可信度
- `/stories`: 生成用户故事和验收标准
- `/backend-design` + `/frontend-design`: 两者都需要

---

### 小功能（快速链路）

**适用场景**：
- 单模块改动
- 明确需求（无歧义）
- 简单 CRUD
- 单角色场景

**流程**：
```
/context-check → /requirement（简版） → /spec → /tasks（轻量） → 实现 → /doc-module → /drift-check
```

**说明**：
- 跳过 `/stories`（单角色场景无需复杂验收标准）
- `/backend-design` 和 `/frontend-design` 按需生成：
  - 只改后端 → 只执行 `/backend-design`
  - 只改前端 → 只执行 `/frontend-design`
  - 简单修改 → 两者都跳过

---

### Bug 修复

#### 简单 Bug

**适用场景**：
- 单文件、单方法修复
- 不涉及数据模型变更
- 不涉及 API 变更

**流程**：
```
Issue 分析 → 定位代码 → 修复 → 验证 → /doc-module（如涉及业务逻辑变更）→ /drift-check（如需）
```

**说明**：
- 不需要走 skills 链路
- 如果修复涉及业务逻辑变更，需要更新 `module.md` 并执行 `/drift-check` 验证

#### 复杂 Bug

**适用场景**：
- 需要重构
- 涉及多个模块
- 需要修改数据模型或 API

**流程**：
- 走完整链路或快速链路（根据复杂度选择）

---

## 工作流程概览

```
新需求/Bug → 文档驱动开发 → 代码实现 → 文档更新 → 归档
```

---

## 一、新功能开发流程

### 阶段 0: 上下文校验 → `/context-check`（推荐）

**触发条件**: 开始新功能开发前

**执行**:
```bash
/context-check
```

**输出**: `console/.claude/docs/{module}/context-check-report.md`

**内容**:
- 后端 API 校验（文档 vs 代码）
- 数据模型校验（Entity 字段）
- 前端 Service 校验（函数名称）
- 修复建议（高/低优先级）

**验收标准**:
- ✅ 识别出文档与代码的不一致项
- ✅ 给出明确的修复建议
- ✅ 状态为 pass 或 warning 可继续开发

**说明**:
- 如果状态为 fail，建议先执行 `/doc-module` 修复文档
- 如果状态为 warning，可继续开发但建议后续修复
- 如果状态为 pass，可直接进入阶段 1

---

### 阶段 1: 需求分析 → `/requirement`

**触发条件**: 收到新功能需求

**执行**:
```bash
/requirement
```

**输出**: `console/.claude/docs/{feature-name}/requirement.md`

**内容**:
- 背景与动机
- 目标用户
- 核心需求 (R1, R2, R3...)
- 业务规则 (BR1, BR2...)
- 非功能需求

**验收标准**:
- ✅ 需求清晰，无歧义
- ✅ 业务规则完整
- ✅ 与产品/用户确认一致

---

### 阶段 2: 用户故事 → `/stories`（按需）

**前置条件**: `requirement.md` 已完成

**何时需要**：
- ✅ 多角色交互场景（管理员、普通用户、访客）
- ✅ 复杂验收标准（多个 Given-When-Then）
- ✅ 需要优先级排序的多个子功能

**何时跳过**：
- ❌ 单角色场景
- ❌ 简单 CRUD
- ❌ 明确的技术需求（如性能优化、Bug 修复）

**执行**:
```bash
/stories
```

**输出**: `console/.claude/docs/{feature-name}/stories.md`

**内容**:
- 用户故事地图 (US-1, US-2...)
- 每个故事的验收标准 (Given-When-Then)
- 优先级和复杂度估算

**验收标准**:
- ✅ 每个故事独立可交付
- ✅ 验收标准可测试
- ✅ 关联到 requirement.md 的需求编号

---

### 阶段 3: 技术规格 → `/spec`

**前置条件**: `requirement.md` 已完成（`stories.md` 如存在也一并读取）

**执行**:
```bash
/spec
```

**输出**: `console/.claude/docs/{feature-name}/spec.md`

**内容**:
- API 接口设计 (RESTful)
- 数据模型设计 (Entity + 表结构)
- 前端页面规格 (路由、组件、交互)
- 状态流转图

**验收标准**:
- ✅ API 设计符合项目规范
- ✅ 数据模型考虑了扩展性
- ✅ 前端规格包含完整交互细节

---

### 阶段 4: 任务拆解 → `/tasks`

**前置条件**: `spec.md` 已完成

**执行**:
```bash
/tasks
```

**输出**: `console/.claude/docs/{feature-name}/tasks.md`

**内容**:
- 任务清单 (T1, T2, T3...)
- 依赖关系图
- 具体文件路径
- 复杂度估算 (S/M/L)

**验收标准**:
- ✅ 任务按 数据层 → 后端 → 前端 → 测试 顺序
- ✅ 每个任务 ≤ 2 小时
- ✅ 文件路径具体明确

---

### 阶段 5: 技术设计 → `/backend-design` + `/frontend-design`（按需）

**前置条件**: `spec.md` + `tasks.md` 已完成

**何时需要**：
- ✅ 后端：新增 Service 层、复杂业务逻辑、数据库迁移
- ✅ 前端：新增页面、复杂状态管理、多组件交互

**何时跳过**：
- ❌ 只改后端 → 只执行 `/backend-design`
- ❌ 只改前端 → 只执行 `/frontend-design`
- ❌ 简单修改（单文件、单方法）→ 两者都跳过

**执行**:
```bash
/backend-design  # 仅当涉及后端改动
/frontend-design # 仅当涉及前端改动
```

**输出**:
- `console/.claude/docs/{feature-name}/backend-design.md`
- `console/.claude/docs/{feature-name}/frontend-design.md`

**内容**:
- **后端**: 类设计、代码骨架、数据库迁移、测试要点
- **前端**: 组件树、状态管理、API 集成、国际化

**验收标准**:
- ✅ 找到现有相似功能作为参考
- ✅ 代码骨架可直接复制使用
- ✅ 遵循项目现有规范

---

### 阶段 6: 代码实现

**前置条件**: 设计文档已完成（如有）

**执行**: 按 `tasks.md` 中的顺序逐个实现

**流程**:
1. 读取 `backend-design.md` / `frontend-design.md`
2. 按任务顺序实现代码
3. 每完成一个任务，运行 `make check` 和 `make test`
4. 提交代码时引用任务编号 (如 `feat(bot): implement T1 - create bot tag entity`)

**验收标准**:
- ✅ 代码通过 `make check` (格式、Lint)
- ✅ 代码通过 `make test` (单元测试)
- ✅ 功能满足 `stories.md`（如存在）或 `requirement.md` 的验收目标

---

### 阶段 7: 模块文档更新 → `/doc-module`

**前置条件**: 代码实现完成

**执行**:
```bash
/doc-module
```

**输出**: 更新 `console/.claude/docs/{module-name}/module.md`

**内容**:
- 新增的 API 端点
- 新增的数据模型
- 新增的前端页面
- 更新模块间依赖关系

**验收标准**:
- ✅ 从实际代码中提取，不编造
- ✅ API 路径、Entity 字段准确
- ✅ 与现有 module.md 保持格式一致

---

### 阶段 8: 文档漂移校验 → `/drift-check`

**前置条件**: `/doc-module` 执行完成

**执行**:
```bash
/drift-check
```

**输出**: `console/.claude/docs/{module}/drift-check-report.md`（临时文件）

**内容**:
- 后端 API 校验（文档 vs 代码）
- 数据模型校验（Entity 字段完整性）
- 前端 Service 校验（函数名称准确性）
- 修复建议（高/低优先级）
- 状态判断（pass/warning/fail）

**验收标准**:
- ✅ 识别出文档与代码的不一致项
- ✅ 给出明确的修复建议
- ✅ 状态为 pass 可继续提交

**后续动作**:
- 如果状态为 fail，重新执行 `/doc-module` 修复文档
- 如果状态为 warning，手动修正文档中的错误
- 如果状态为 pass，文档更新完成，可以提交

**说明**:
- 这是文档回写校验闭环的最后一步
- 与 `/context-check` 的区别：`/context-check` 是开发前的前置校验，`/drift-check` 是文档更新后的后置校验
- 验证通过后，`drift-check-report.md` 可以删除

---

### 阶段 9: 归档与清理

**执行**:
1. 将 `console/.claude/docs/{feature-name}/` 下的文档归档到 Git
2. 在 `console/.claude/docs/overview.md` 中添加该功能的索引
3. 删除临时文件（如有）

---

## 二、Bug 修复流程

### 快速修复流程 (适用于简单 Bug)

```
Issue 分析 → 定位代码 → 修复 → 测试 → 更新文档
```

**步骤**:

1. **分析 Issue**
   - 读取 GitHub Issue 或 Bug 报告
   - 理解问题现象、复现步骤、预期行为

2. **定位代码**
   - 使用 Explore agent 查找相关代码
   - 读取 `console/.claude/docs/{module}/module.md` 快速了解模块

3. **修复代码**
   - 直接修改代码
   - 运行 `make check` 和 `make test`

4. **更新文档**
   - 如果修复涉及业务逻辑变更，更新 `module.md`
   - 如果修复涉及 API 变更，更新 `spec.md`（如存在）

5. **提交代码**
   - 提交信息格式: `fix(module): resolve issue #123 - description`
   - 关联 Issue 编号

**示例**: Issue #941 - 非个人空间复制智能体报错
```bash
# 1. 分析 Issue
读取 Issue 内容 → 理解错误原因

# 2. 定位代码
Explore agent 查找 BotChainServiceImpl.java

# 3. 修复代码
修改 copyBot() 和 cloneWorkFlow() 方法

# 4. 验证
make check  # 代码格式检查
make test   # 运行测试

# 5. 提交
git commit -m "fix(bot): resolve issue #941 - set uid for non-personal space"
```

---

### 复杂 Bug 修复流程 (需要重构或大改)

如果 Bug 修复需要：
- 重构现有代码
- 修改数据模型
- 影响多个模块

**则使用新功能开发流程**:
1. 创建 `console/.claude/docs/bugfix-{issue-number}/`
2. 执行 `/requirement` → `/spec` → `/tasks` → 设计 → 实现
3. 完成后更新 `module.md`

---

## 三、文档与代码同步规则

### 规则 1: 代码变更必须更新文档

| 变更类型 | 需要更新的文档 |
|---------|---------------|
| 新增 API 端点 | `module.md` (API 清单) |
| 修改数据模型 | `module.md` (数据模型) |
| 新增前端页面 | `module.md` (前端页面) |
| 修改业务逻辑 | `module.md` (关键业务逻辑) |
| 新增模块依赖 | `module.md` (模块间依赖) |

### 规则 2: 文档更新时机

- **新功能**: 代码实现完成后，立即执行 `/doc-module` 更新
- **Bug 修复**: 如果涉及业务逻辑变更，修复后更新 `module.md`
- **重构**: 重构完成后，重新生成 `module.md`

### 规则 2.5: 文档验证时机

- **新功能**: `/doc-module` 执行后，立即执行 `/drift-check` 验证文档准确性
- **Bug 修复**: 如果更新了 `module.md`，执行 `/drift-check` 验证
- **重构**: 重新生成 `module.md` 后，执行 `/drift-check` 确保文档完整

### 规则 3: 文档版本控制

- 所有 `.claude/docs/` 下的文档都纳入 Git 版本控制
- 文档与代码在同一个 PR 中提交
- 文档变更在 PR 描述中说明

---

## 四、Skills 使用指南

### 调用方式

在 Claude Code 中使用 `/` 命令调用 skills:

```bash
/requirement    # 生成需求文档
/stories        # 生成用户故事
/spec           # 生成技术规格
/tasks          # 生成任务规划
/backend-design # 生成后端设计
/frontend-design# 生成前端设计
/doc-module     # 生成/更新模块文档
```

### Skills 链路

**完整链路** (新功能开发):
```
/requirement → /stories → /spec → /tasks → /backend-design + /frontend-design → 实现 → /doc-module → /drift-check
```

**快速链路** (简单功能):
```
/requirement → /spec → /tasks → 实现 → /doc-module → /drift-check
```

**逆向链路** (已有代码生成文档):
```
/doc-module → /drift-check
```

---

## 五、最佳实践

### 1. 文档先行

- ❌ 不要直接写代码
- ✅ 先执行 skills 生成文档，理清思路后再实现

### 2. 参考现有实现

- ❌ 不要凭空设计
- ✅ 每个 skill 都要求找到现有相似功能作为参考

### 3. 保持文档简洁

- ❌ 不要写冗长的文档
- ✅ 文档只记录关键信息，代码是最好的文档

### 4. 及时更新文档

- ❌ 不要等到功能完成后再更新文档
- ✅ 代码实现完成后立即更新 `module.md`

### 5. 文档即规范

- ❌ 不要偏离文档设计
- ✅ 如果实现时发现设计不合理，先更新文档再改代码

---

## 六、示例：完整开发流程

### 场景: 新增 Bot 标签管理功能

```bash
# 1. 需求分析
/requirement
# 输出: console/.claude/docs/bot-tag-management/requirement.md

# 2. 用户故事
/stories
# 输出: console/.claude/docs/bot-tag-management/stories.md

# 3. 技术规格
/spec
# 输出: console/.claude/docs/bot-tag-management/spec.md

# 4. 任务拆解
/tasks
# 输出: console/.claude/docs/bot-tag-management/tasks.md

# 5. 技术设计
/backend-design
/frontend-design
# 输出: backend-design.md + frontend-design.md

# 6. 代码实现
# 按 tasks.md 顺序实现 T1 → T2 → T3 → T4

# 7. 更新模块文档
/doc-module
# 输出: 更新 console/.claude/docs/bot-management/module.md

# 8. 验证文档
/drift-check
# 输出: drift-check-report.md

# 9. 提交代码
git add .
git commit -m "feat(bot): add bot tag management feature"
git push
```

---

## 七、常见问题

### Q1: 什么时候需要完整的 skills 流程？

**需要**:
- 新功能开发
- 复杂 Bug 修复（需要重构）
- 模块重构

**不需要**:
- 简单 Bug 修复（单文件、单方法）
- 代码格式调整
- 文档更新

### Q2: 如何判断是否需要创建新的 feature 目录？

**创建新目录**:
- 新增 ≥3 个文件
- 新增数据表
- 新增前端页面

**不创建新目录**:
- 修改现有功能
- Bug 修复（除非需要重构）

### Q3: 文档和代码不一致怎么办？

**优先级**: 代码 > 文档

**处理方式**:
1. 如果代码是对的，更新文档
2. 如果文档是对的，修改代码
3. 如果都不对，先更新文档设计，再改代码

### Q4: 如何避免文档过时？

**强制规则**:
- PR 必须包含文档更新（如适用）
- Code Review 时检查文档是否同步
- 定期（每月）审查 `module.md` 与代码的一致性

---

## 八、工作流程检查清单

### 新功能开发

- [ ] 执行 `/requirement` 生成需求文档
- [ ] 执行 `/stories` 生成用户故事
- [ ] 执行 `/spec` 生成技术规格
- [ ] 执行 `/tasks` 生成任务规划
- [ ] 执行 `/backend-design` 和 `/frontend-design` 生成设计文档
- [ ] 按任务顺序实现代码
- [ ] 每个任务完成后运行 `make check` 和 `make test`
- [ ] 执行 `/doc-module` 更新模块文档
- [ ] 执行 `/drift-check` 验证文档准确性
- [ ] 提交代码和文档到 Git
- [ ] 在 `overview.md` 中添加功能索引

### Bug 修复

- [ ] 分析 Issue，理解问题
- [ ] 使用 Explore agent 定位代码
- [ ] 修复代码
- [ ] 运行 `make check` 和 `make test`
- [ ] 如果涉及业务逻辑变更，更新 `module.md`
- [ ] 如果更新了文档，执行 `/drift-check` 验证
- [ ] 提交代码，关联 Issue 编号

---

## 九、相关文档

- [Console Backend CLAUDE.md](../backend/CLAUDE.md) - 后端开发规范
- [Console Frontend CLAUDE.md](../frontend/CLAUDE.md) - 前端开发规范
- [项目 CLAUDE.md](../../CLAUDE.md) - 项目全局规范
- [Docs Overview](docs/overview.md) - 模块文档索引

---

**最后更新**: 2026-03-04
**维护者**: Console 开发团队
