# Skills 快速参考

## 🎯 流程选择指南

### 大功能（完整链路）

**适用场景**：新增数据表、新增前端页面、跨模块改动、多角色交互

```mermaid
graph LR
    A[收到需求] --> B[/context-check]
    B --> C[/requirement]
    C --> D[/stories]
    D --> E[/spec]
    E --> F[/tasks]
    F --> G[/backend-design<br/>/frontend-design]
    G --> H[实现代码]
    H --> I[/doc-module]
    I --> J[/drift-check]
```

### 小功能（快速链路）

**适用场景**：单模块改动、明确需求、简单 CRUD、单角色场景

```mermaid
graph LR
    A[收到需求] --> B[/context-check]
    B --> C[/requirement]
    C --> D[/spec]
    D --> E[/tasks]
    E --> F[实现代码]
    F --> G[/doc-module]
    G --> H[/drift-check]
```

### Bug 修复

```
简单 Bug (单文件) → 直接修复 → 验证 → /doc-module（如需）
复杂 Bug (多文件/重构) → 走完整链路或快速链路（根据复杂度选择）
```

### 文档生成

```
已有代码 → /doc-module → 生成 module.md
```

---

## 📋 Skills 清单

| # | Skill | 命令 | 输入 | 输出 | 耗时 |
|---|-------|------|------|------|------|
| 0 | 上下文校验 | `/context-check` | 模块名称 | `context-check-report.md` | 5-10min |
| 1 | 需求文档 | `/requirement` | 用户需求描述 | `requirement.md` | 5-10min |
| 2 | 用户故事 | `/stories` | `requirement.md` | `stories.md` | 5-10min |
| 3 | 技术规格 | `/spec` | `requirement.md` (+ `stories.md`) | `spec.md` | 10-15min |
| 4 | 任务规划 | `/tasks` | `spec.md` | `tasks.md` | 5-10min |
| 5 | 后端设计 | `/backend-design` | `spec.md` + `tasks.md` | `backend-design.md` | 10-20min |
| 6 | 前端设计 | `/frontend-design` | `spec.md` + `tasks.md` | `frontend-design.md` | 10-20min |
| 7 | 模块文档 | `/doc-module` | 现有代码 | `module.md` | 10-15min |
| 8 | 文档漂移校验 | `/drift-check` | `module.md` | `drift-check-report.md` | 5-10min |
| 9 | Bug 修复 | `/bugfix` | Issue 编号 | `bugfix.md` | 10-15min |

**说明**：
- `/stories`、`/backend-design`、`/frontend-design` 为按需执行，不是所有流程都需要
- `/context-check` 建议在开始新功能前执行，确保模块文档可信
- `/drift-check` 建议在 `/doc-module` 后执行，确保文档更新准确

**文档校验闭环**：
```
开发前: /context-check → 检查旧文档是否可信
开发中: 实现代码
开发后: /doc-module → 更新文档 → /drift-check → 验证新文档准确性
```

---

## 🚀 快速开始

### 场景 1: 大功能开发（完整链路）

```bash
# 0. 上下文校验（推荐）
/context-check
# 输入: 模块名称（如 bot-management）
# 输出: console/.claude/docs/{module}/context-check-report.md

# 1. 需求分析
/requirement
# 输入: 描述功能需求
# 输出: console/.claude/docs/{feature-name}/requirement.md

# 2. 用户故事
/stories
# 输出: console/.claude/docs/{feature-name}/stories.md

# 3. 技术规格
/spec
# 输出: console/.claude/docs/{feature-name}/spec.md

# 4. 任务拆解
/tasks
# 输出: console/.claude/docs/{feature-name}/tasks.md

# 5. 技术设计
/backend-design
/frontend-design
# 输出: backend-design.md + frontend-design.md

# 6. 实现代码
# 按 tasks.md 顺序实现

# 7. 更新文档
/doc-module
# 输出: 更新 module.md

# 8. 验证文档
/drift-check
# 输出: drift-check-report.md
```

### 场景 2: 小功能开发（快速链路）

```bash
# 0. 上下文校验（推荐）
/context-check

# 1. 需求分析
/requirement

# 2. 技术规格（跳过 /stories）
/spec

# 3. 任务拆解
/tasks

# 4. 实现代码（按需执行设计）
# 如需设计文档：/backend-design 或 /frontend-design

# 5. 更新文档
/doc-module

# 6. 验证文档
/drift-check
```

### 场景 3: 简单 Bug 修复

```bash
# 1. 分析 Issue
读取 GitHub Issue

# 2. 定位代码
使用 Explore agent

# 3. 修复代码
直接修改

# 4. 验证
make check && make test

# 5. 提交
git commit -m "fix(module): resolve issue #123"
```

### 场景 4: 复杂 Bug 修复

```bash
# 根据复杂度选择：
# - 简单 Bug：直接修复 → 验证 → /doc-module（如需）
# - 复杂 Bug：走完整链路或快速链路

# 1. 生成 Bug 修复文档
/bugfix
# 输入: Issue 编号
# 输出: console/.claude/docs/bugfix-{number}/bugfix.md

# 2. 按文档实现修复

# 3. 更新模块文档
/doc-module
```

### 场景 5: 为已有代码生成文档

```bash
# 直接生成模块文档
/doc-module
# 输入: 模块名称
# 输出: console/.claude/docs/{module}/module.md
```

---

## 🎨 Skills 链路图

### 完整链路 (新功能)

```
用户需求
    ↓
/context-check → context-check-report.md (推荐)
    ↓
/requirement → requirement.md
    ↓
/stories → stories.md
    ↓
/spec → spec.md
    ↓
/tasks → tasks.md
    ↓
/backend-design + /frontend-design
    ↓
backend-design.md + frontend-design.md
    ↓
代码实现
    ↓
/doc-module → module.md (更新)
    ↓
/drift-check → drift-check-report.md
```

### 快速链路 (简单功能)

```
用户需求
    ↓
/context-check → context-check-report.md (推荐)
    ↓
/requirement → requirement.md
    ↓
/spec → spec.md
    ↓
/tasks → tasks.md
    ↓
代码实现
    ↓
/doc-module → module.md (更新)
    ↓
/drift-check → drift-check-report.md
```

### 逆向链路 (已有代码)

```
现有代码
    ↓
/doc-module → module.md
```

---

## ✅ 检查清单

### 新功能开发

**大功能（完整链路）**:
- [ ] `/context-check` - 上下文校验（推荐）
- [ ] `/requirement` - 需求文档
- [ ] `/stories` - 用户故事
- [ ] `/spec` - 技术规格
- [ ] `/tasks` - 任务规划
- [ ] `/backend-design` + `/frontend-design` - 技术设计
- [ ] 实现代码
- [ ] `make check` - 代码检查
- [ ] `make test` - 运行测试
- [ ] `/doc-module` - 更新模块文档
- [ ] `/drift-check` - 验证文档准确性
- [ ] 提交代码和文档

**小功能（快速链路）**:
- [ ] `/context-check` - 上下文校验（推荐）
- [ ] `/requirement` - 需求文档
- [ ] `/spec` - 技术规格（跳过 /stories）
- [ ] `/tasks` - 任务规划
- [ ] 实现代码（按需执行设计）
- [ ] `make check && make test`
- [ ] `/doc-module` - 更新模块文档
- [ ] `/drift-check` - 验证文档准确性
- [ ] 提交代码和文档

### Bug 修复

**简单 Bug**:
- [ ] 分析 Issue
- [ ] 定位代码
- [ ] 修复代码
- [ ] `make check && make test`
- [ ] 提交代码

**复杂 Bug**:
- [ ] `/bugfix` - 生成修复文档
- [ ] 实现修复
- [ ] `make check && make test`
- [ ] `/doc-module` - 更新模块文档
- [ ] `/drift-check` - 验证文档准确性
- [ ] 提交代码和文档

---

## 📖 文档结构

```
console/
├── .claude/
│   ├── WORKFLOW.md              # 完整工作流程文档
│   ├── QUICK_REFERENCE.md       # 本文件
│   └── skills/
│       ├── context-check.md     # Skill 0: 上下文校验
│       ├── requirement.md       # Skill 1: 需求文档
│       ├── stories.md           # Skill 2: 用户故事（按需）
│       ├── spec.md              # Skill 3: 技术规格
│       ├── tasks.md             # Skill 4: 任务规划
│       ├── backend-design.md    # Skill 5: 后端设计（按需）
│       ├── frontend-design.md   # Skill 6: 前端设计（按需）
│       ├── doc-module.md        # Skill 7: 模块文档
│       ├── drift-check.md       # Skill 8: 文档漂移校验
│       └── bugfix.md            # Skill 9: Bug 修复
├── docs/
│   ├── overview.md              # 项目概览
│   ├── {module}/
│   │   ├── module.md            # 模块文档
│   │   ├── context-check-report.md  # 上下文校验报告（临时）
│   │   └── drift-check-report.md    # 文档漂移校验报告（临时）
│   ├── {feature-name}/          # 新功能文档
│   │   ├── requirement.md
│   │   ├── stories.md           # 按需生成
│   │   ├── spec.md
│   │   ├── tasks.md
│   │   ├── backend-design.md    # 按需生成
│   │   └── frontend-design.md   # 按需生成
    └── bugfix-{number}/         # Bug 修复文档
        └── bugfix.md
```

---

## 💡 最佳实践

### 1. 文档先行

❌ 不要直接写代码
✅ 先执行 skills 生成文档，理清思路后再实现

### 2. 参考现有实现

❌ 不要凭空设计
✅ 每个 skill 都要求找到现有相似功能作为参考

### 3. 保持文档简洁

❌ 不要写冗长的文档
✅ 文档只记录关键信息，代码是最好的文档

### 4. 及时更新和验证文档

❌ 不要等到功能完成后再更新文档
✅ 代码实现完成后立即更新 `module.md` 并执行 `/drift-check` 验证

### 5. 文档即规范

❌ 不要偏离文档设计
✅ 如果实现时发现设计不合理，先更新文档再改代码

---

## 🔗 相关链接

- [完整工作流程](WORKFLOW.md)
- [Console Backend CLAUDE.md](../backend/CLAUDE.md)
- [Console Frontend CLAUDE.md](../frontend/CLAUDE.md)
- [项目 CLAUDE.md](../../CLAUDE.md)
- [Docs Overview](docs/overview.md)

---

**最后更新**: 2026-03-03
