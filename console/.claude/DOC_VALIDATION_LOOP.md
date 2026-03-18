# 文档校验闭环设计

## 问题背景

在引入 `/doc-module` 后，虽然解决了"代码 → 文档"的生成问题，但缺少**后置校验**，导致：

1. ✅ 前置校验：`/context-check` 检查旧文档是否可信
2. ✅ 文档生成：`/doc-module` 更新文档
3. ❌ 后置校验：缺少验证机制，无法确保文档更新的准确性

这会导致"文档再次漂移"的风险：
- 文档生成时可能遗漏某些 API 或字段
- 文档记录的信息可能与代码不一致
- 没有机制验证文档更新的质量

## 解决方案

引入 `/drift-check` skill，构建完整的**文档校验闭环**：

```
┌─────────────────────────────────────────────────────────┐
│                    文档校验闭环                          │
└─────────────────────────────────────────────────────────┘

开发前（输入风险控制）
    ↓
/context-check
    ├─ 检查旧文档是否与代码一致
    ├─ 发现文档漂移
    └─ 决定是否需要更新文档
    ↓
开发中
    ├─ 实现代码
    └─ 修改业务逻辑
    ↓
开发后（输出质量保证）
    ↓
/doc-module
    ├─ 从代码逆向生成文档
    ├─ 更新 module.md
    └─ 记录 API、Entity、Service
    ↓
/drift-check
    ├─ 验证文档与代码的一致性
    ├─ 检查是否有遗漏或错误
    ├─ 生成验证报告
    └─ 决定是否需要重新生成文档
    ↓
提交代码和文档
```

## 三个 Skill 的职责对比

| 维度 | `/context-check` | `/doc-module` | `/drift-check` |
|------|-----------------|---------------|---------------|
| **执行时机** | 开发前（前置校验） | 开发后（文档生成） | 文档生成后（后置校验） |
| **校验对象** | 旧文档 vs 代码 | - | 新文档 vs 代码 |
| **主要目的** | 检查旧文档是否可信 | 从代码生成文档 | 验证新文档是否准确 |
| **重点关注** | 发现文档漂移 | 提取代码信息 | 发现文档遗漏或错误 |
| **输出文件** | `context-check-report.md` | `module.md` | `drift-check-report.md` |
| **后续动作** | 决定是否需要更新文档 | - | 决定是否需要重新生成文档 |

## 工作流集成

### 大功能开发（完整链路）

```bash
# 0. 前置校验
/context-check
# 检查旧文档是否可信

# 1-6. 需求分析 → 设计 → 实现
/requirement → /stories → /spec → /tasks → /backend-design → 实现代码

# 7. 文档生成
/doc-module
# 从代码逆向生成文档

# 8. 后置校验（新增）
/drift-check
# 验证文档与代码的一致性

# 9. 提交
git commit
```

### 小功能开发（快速链路）

```bash
# 0. 前置校验
/context-check

# 1-4. 需求分析 → 实现
/requirement → /spec → /tasks → 实现代码

# 5. 文档生成
/doc-module

# 6. 后置校验（新增）
/drift-check

# 7. 提交
git commit
```

## 实现细节

### `/drift-check` Skill

**文件位置**: `console/.claude/skills/drift-check.md`

**核心功能**:
1. 读取刚更新的 `module.md`
2. 从实际代码中重新抽取关键信息
3. 对比文档与代码，标记不一致项
4. 生成验证报告

**输出模板**:
```markdown
---
module: {模块名}
checked: {YYYY-MM-DD HH:mm:ss}
status: {pass/warning/fail}
---

# {模块名} 文档漂移校验报告

## 校验结果
- pass: 文档与代码完全一致
- warning: 发现少量不一致，建议修复
- fail: 发现严重不一致，必须重新执行 `/doc-module`

## 后端 API 校验
### ✅ 文档中正确记录的 API
### ❌ 文档中遗漏的 API
### ⚠️ 文档中记录错误的 API

## 数据模型校验
### ✅ 文档中正确记录的 Entity
### ❌ 文档中遗漏的 Entity
### ⚠️ 文档中字段不完整的 Entity

## 前端 Service 校验
### ✅ 文档中正确记录的 Service 函数
### ❌ 文档中遗漏的 Service 函数
### ⚠️ 文档中记录错误的 Service 函数

## 修复建议
### 高优先级（必须修复）
### 低优先级（建议修复）

## 下一步行动
- [ ] 如果状态为 fail，重新执行 `/doc-module`
- [ ] 如果状态为 warning，手动修正文档
- [ ] 如果状态为 pass，提交代码和文档
```

## 收益

### 1. 输入风险控制（前置校验）
- `/context-check` 确保开发前使用的文档是可信的
- 避免基于错误的文档进行开发

### 2. 输出质量保证（后置校验）
- `/drift-check` 确保文档更新后与代码一致
- 避免文档再次漂移

### 3. 完整闭环
```
输入 → 前置校验 → 开发 → 文档生成 → 后置校验 → 输出
  ↑                                              ↓
  └──────────────── 反馈循环 ────────────────────┘
```

### 4. 质量保证
- 文档准确性：确保文档与代码一致
- 文档完整性：检查是否有遗漏
- 文档可信度：提供验证报告

## 最佳实践

### 1. 始终执行完整闭环

❌ 不要跳过校验步骤：
```bash
/doc-module → 提交  # 缺少后置校验
```

✅ 执行完整闭环：
```bash
/context-check → 开发 → /doc-module → /drift-check → 提交
```

### 2. 根据校验结果采取行动

- **pass**: 文档准确，可以提交
- **warning**: 手动修正文档中的错误
- **fail**: 重新执行 `/doc-module`

### 3. 保留校验报告（可选）

校验报告是临时文件，验证通过后可以删除：
```bash
# 验证通过后清理
rm console/.claude/docs/{module}/context-check-report.md
rm console/.claude/docs/{module}/drift-check-report.md
```

## 文件结构

```
console/
├── .claude/
│   ├── DOC_VALIDATION_LOOP.md    # 本文件
│   ├── QUICK_REFERENCE.md        # 已更新，包含 /drift-check
│   ├── skills/
│   │   ├── context-check.md      # 前置校验
│   │   ├── doc-module.md         # 文档生成
│   │   └── drift-check.md        # 后置校验（新增）
│   └── docs/
│       └── {module}/
│           ├── module.md                    # 模块文档
│           ├── context-check-report.md      # 前置校验报告（临时）
│           └── drift-check-report.md        # 后置校验报告（临时）
```

## 总结

通过引入 `/drift-check`，我们构建了完整的**文档校验闭环**：

1. **前置校验**（`/context-check`）：确保输入可信
2. **文档生成**（`/doc-module`）：从代码生成文档
3. **后置校验**（`/drift-check`）：确保输出准确

这个闭环解决了"文档再次漂移"的风险，确保文档始终与代码保持一致。

---

**创建时间**: 2026-03-03
**相关文档**:
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [skills/context-check.md](skills/context-check.md)
- [skills/doc-module.md](skills/doc-module.md)
- [skills/drift-check.md](skills/drift-check.md)
