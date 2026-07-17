# Pre-commit 使用指南

本指南说明如何在 Astron Agent 项目中使用 pre-commit 进行本地代码质量检查和密钥扫描。

## 目录

- [概述](#概述)
- [安装](#安装)
- [基本用法](#基本用法)
- [可用钩子](#可用钩子)
- [修复问题](#修复问题)
- [配置](#配置)
- [故障排除](#故障排除)

## 概述

Pre-commit 是一个用于管理和维护多语言 pre-commit 钩子的框架。在本项目中，我们使用它来：

- **代码格式化**：确保所有语言的代码风格一致
- **代码检查**：检测代码质量问题和潜在 bug
- **类型检查**：验证类型注解（Python、TypeScript）
- **密钥扫描**：防止意外提交敏感信息（gitleaks）
- **提交消息验证**：强制执行 Conventional Commits 格式

## 安装

### 前置要求

确保已安装以下工具：

- Python 3.9+
- Node.js 18+（用于 TypeScript/JavaScript 检查）
- Go 1.21+（用于 Go 检查）
- Java 21+ 和 Maven 3.8+（用于 Java 检查）

### 安装 pre-commit

```bash
# 使用 pip 安装
pip install pre-commit

# 或使用 pipx（推荐，隔离安装）
pipx install pre-commit

# 或使用 Homebrew（macOS）
brew install pre-commit
```

### 安装 Git 钩子

```bash
# 安装 pre-commit 钩子
pre-commit install

# 安装 commit-msg 钩子用于提交消息验证
pre-commit install --hook-type commit-msg
```

安装后，pre-commit 将在每次 `git commit` 时自动运行。

## 基本用法

### 提交时自动检查

安装后，pre-commit 在提交时自动运行：

```bash
git add .
git commit -m "feat: add new feature"
# Pre-commit 钩子自动运行
```

如果任何检查失败，提交将被阻止。修复问题后重试即可。

### 手动执行

```bash
# 仅检查暂存的文件
pre-commit run

# 检查仓库中的所有文件
pre-commit run --all-files

# 运行特定钩子
pre-commit run <hook-id>

# 示例
pre-commit run black --all-files
pre-commit run eslint-check --all-files
pre-commit run gitleaks --all-files
```

### 更新钩子

```bash
# 更新所有钩子到最新版本
pre-commit autoupdate
```

## 可用钩子

### 通用检查

| 钩子 | 描述 |
|------|------|
| `check-yaml` | 验证 YAML 文件语法 |
| `check-json` | 验证 JSON 文件语法 |
| `check-added-large-files` | 阻止大文件（>1MB）被提交 |
| `check-merge-conflict` | 检查合并冲突标记 |

### Python 检查

| 钩子 | 描述 | 范围 |
|------|------|------|
| `black` | 检查代码格式 | core/agent, core/workflow, core/knowledge, core/plugin |
| `isort-*` | 检查导入排序 | 按模块（knowledge, workflow, agent, plugin） |
| `flake8-*` | 代码问题检查 | 按模块 |
| `mypy-*` | 类型检查 | 按模块 |
| `pylint-*` | 代码分析 | 按模块 |

### TypeScript/JavaScript 检查

| 钩子 | 描述 | 范围 |
|------|------|------|
| `prettier-check` | 检查代码格式 | console/frontend/src |
| `eslint-check` | 代码问题检查 | console/frontend/src |

### Go 检查

| 钩子 | 描述 | 范围 |
|------|------|------|
| `golangci-lint` | 综合代码检查 | core/tenant |
| `go-fmt-check` | 检查 gofmt 格式 | core/tenant |
| `go-imports-check` | 检查 goimports 格式 | core/tenant |
| `go-vet` | 检查可疑代码 | core/tenant |

### Java 检查

| 钩子 | 描述 | 范围 |
|------|------|------|
| `spotless-check` | 检查 Google Java 格式 | console/backend |
| `checkstyle` | 检查代码风格 | console/backend |

### 安全扫描

| 钩子 | 描述 |
|------|------|
| `gitleaks` | 扫描密钥和凭据 |

### 提交消息

| 钩子 | 描述 |
|------|------|
| `conventional-pre-commit` | 验证 Conventional Commits 格式 |

## 修复问题

Pre-commit 以**仅检查模式**运行 - 它报告问题但不自动修复。以下是各语言修复问题的方法：

### Python

```bash
# 使用 Black 修复格式
black .

# 使用 isort 修复导入排序
isort .

# 或修复特定目录
cd core/knowledge && black . && isort .
```

### TypeScript/JavaScript

```bash
cd console/frontend

# 使用 Prettier 修复格式
npm run format
# 或
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"

# 修复 linting 问题（仅可自动修复的）
npx eslint "src/**/*.{ts,tsx}" --fix
```

### Go

```bash
cd core/tenant

# 修复格式
gofmt -w .
goimports -w .

# 或使用 gofumpt 进行更严格的格式化
gofumpt -w .
```

### Java

```bash
cd console/backend

# 使用 Spotless 修复格式
mvn spotless:apply
```

## 配置

Pre-commit 配置位于项目根目录的 `.pre-commit-config.yaml` 文件中。

### 跳过特定钩子

```bash
# 单次提交跳过特定钩子
SKIP=black,eslint-check git commit -m "feat: urgent fix"

# 跳过所有 pre-commit 钩子
git commit --no-verify -m "feat: emergency commit"
```

> **警告**：请谨慎使用 `--no-verify`。它会绕过所有质量检查。

### 仅运行特定文件类型

Pre-commit 自动检测哪些文件发生了变化，并仅运行相关钩子。例如：
- 仅更改 `.py` 文件时只触发 Python 钩子
- 仅更改 `.ts` 文件时只触发 TypeScript 钩子

## 故障排除

### 钩子安装问题

```bash
# 重新安装钩子
pre-commit uninstall
pre-commit install
pre-commit install --hook-type commit-msg
```

### 清除缓存

```bash
# 清除 pre-commit 缓存
pre-commit clean
```

### 详细输出

```bash
# 以详细模式运行用于调试
pre-commit run --all-files --verbose
```

### 常见问题

#### 1. "command not found" 错误

确保所需工具已安装并在 PATH 中：

```bash
# 检查 Python 工具
python3 -m black --version
python3 -m isort --version
python3 -m flake8 --version

# 检查 Node 工具
npx prettier --version
npx eslint --version

# 检查 Go 工具
golangci-lint --version
gofmt -help

# 检查 Java 工具
mvn --version
```

#### 2. 钩子运行时间过长

某些钩子（如 Java 检查）可能较慢。它们仅在相关文件发生变化时运行。

#### 3. gitleaks 误报

如果 gitleaks 标记了误报（例如文档中的示例 API 密钥），你可以：

1. 将文件添加到 `.gitleaksignore`
2. 使用内联注释排除特定行

### 获取帮助

如果遇到问题：

1. 查看 [pre-commit 文档](https://pre-commit.com/)
2. 查看 `.pre-commit-config.yaml` 配置
3. 在项目仓库中提交 issue

## 最佳实践

1. **推送前运行 pre-commit**：虽然钩子在提交时运行，但在推送前运行 `pre-commit run --all-files` 可确保所有文件都已检查。

2. **保持钩子更新**：定期运行 `pre-commit autoupdate` 获取最新版本的钩子。

3. **不要跳过钩子**：除非绝对必要，否则避免使用 `--no-verify`。如果某个检查持续出现问题，请与团队讨论。

4. **立即修复问题**：不要积累技术债务。发现格式和 linting 问题时立即修复。

5. **CI 作为备份**：我们的 CI 流水线也运行这些检查，因此任何遗漏的问题都会在合并前被捕获。
