# Pre-commit Usage Guide

This guide explains how to use pre-commit for local code quality checks and secret scanning in the Astron Agent project.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Available Hooks](#available-hooks)
- [Fixing Issues](#fixing-issues)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

Pre-commit is a framework for managing and maintaining multi-language pre-commit hooks. In this project, we use it to:

- **Code Formatting**: Ensure consistent code style across all languages
- **Linting**: Detect code quality issues and potential bugs
- **Type Checking**: Verify type annotations (Python, TypeScript)
- **Secret Scanning**: Prevent accidental commit of secrets (gitleaks)
- **Commit Message Validation**: Enforce Conventional Commits format

## Installation

### Prerequisites

Ensure you have the following installed:

- Python 3.9+
- Node.js 18+ (for TypeScript/JavaScript checks)
- Go 1.21+ (for Go checks)
- Java 21+ and Maven 3.8+ (for Java checks)

### Install pre-commit

```bash
# Install pre-commit using pip
pip install pre-commit

# Or using pipx (recommended for isolated installation)
pipx install pre-commit

# Or using Homebrew (macOS)
brew install pre-commit
```

### Install Git Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Install commit-msg hook for commit message validation
pre-commit install --hook-type commit-msg
```

After installation, pre-commit will automatically run on every `git commit`.

## Basic Usage

### Automatic Check on Commit

Once installed, pre-commit runs automatically when you commit:

```bash
git add .
git commit -m "feat: add new feature"
# Pre-commit hooks run automatically
```

If any check fails, the commit will be blocked. Fix the issues and try again.

### Manual Execution

```bash
# Check only staged files
pre-commit run

# Check all files in the repository
pre-commit run --all-files

# Run a specific hook
pre-commit run <hook-id>

# Examples
pre-commit run black --all-files
pre-commit run eslint-check --all-files
pre-commit run gitleaks --all-files
```

### Update Hooks

```bash
# Update all hooks to latest versions
pre-commit autoupdate
```

## Available Hooks

### Common Checks

| Hook | Description |
|------|-------------|
| `check-yaml` | Validate YAML file syntax |
| `check-json` | Validate JSON file syntax |
| `check-added-large-files` | Prevent large files (>1MB) from being committed |
| `check-merge-conflict` | Check for merge conflict markers |

### Python Checks

| Hook | Description | Scope |
|------|-------------|-------|
| `black` | Check code formatting | core/agent, core/workflow, core/knowledge, core/plugin |
| `isort-*` | Check import sorting | Per-module (knowledge, workflow, agent, plugin) |
| `flake8-*` | Lint for code issues | Per-module |
| `mypy-*` | Type checking | Per-module |
| `pylint-*` | Code analysis | Per-module |

### TypeScript/JavaScript Checks

| Hook | Description | Scope |
|------|-------------|-------|
| `prettier-check` | Check code formatting | console/frontend/src |
| `eslint-check` | Lint for code issues | console/frontend/src |

### Go Checks

| Hook | Description | Scope |
|------|-------------|-------|
| `golangci-lint` | Comprehensive linting | core/tenant |
| `go-fmt-check` | Check gofmt formatting | core/tenant |
| `go-imports-check` | Check goimports formatting | core/tenant |
| `go-vet` | Check for suspicious code | core/tenant |

### Java Checks

| Hook | Description | Scope |
|------|-------------|-------|
| `spotless-check` | Check Google Java Format | console/backend |
| `checkstyle` | Check code style | console/backend |

### Security

| Hook | Description |
|------|-------------|
| `gitleaks` | Scan for secrets and credentials |

### Commit Message

| Hook | Description |
|------|-------------|
| `conventional-pre-commit` | Validate Conventional Commits format |

## Fixing Issues

Pre-commit runs in **check-only mode** - it reports issues but does not auto-fix them. Here's how to fix issues for each language:

### Python

```bash
# Fix formatting with Black
black .

# Fix import sorting with isort
isort .

# Or fix specific directories
cd core/knowledge && black . && isort .
```

### TypeScript/JavaScript

```bash
cd console/frontend

# Fix formatting with Prettier
npm run format
# Or
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"

# Fix linting issues (auto-fixable only)
npx eslint "src/**/*.{ts,tsx}" --fix
```

### Go

```bash
cd core/tenant

# Fix formatting
gofmt -w .
goimports -w .

# Or use gofumpt for stricter formatting
gofumpt -w .
```

### Java

```bash
cd console/backend

# Fix formatting with Spotless
mvn spotless:apply
```

## Configuration

The pre-commit configuration is in `.pre-commit-config.yaml` at the project root.

### Skip Specific Hooks

```bash
# Skip specific hooks for a single commit
SKIP=black,eslint-check git commit -m "feat: urgent fix"

# Skip all pre-commit hooks
git commit --no-verify -m "feat: emergency commit"
```

> **Warning**: Use `--no-verify` sparingly. It bypasses all quality checks.

### Run Only Specific File Types

Pre-commit automatically detects which files changed and runs only relevant hooks. For example:
- Changing `.py` files only triggers Python hooks
- Changing `.ts` files only triggers TypeScript hooks

## Troubleshooting

### Hook Installation Issues

```bash
# Reinstall hooks
pre-commit uninstall
pre-commit install
pre-commit install --hook-type commit-msg
```

### Clear Cache

```bash
# Clear pre-commit cache
pre-commit clean
```

### Verbose Output

```bash
# Run with verbose output for debugging
pre-commit run --all-files --verbose
```

### Common Issues

#### 1. "command not found" errors

Ensure the required tools are installed and in your PATH:

```bash
# Check Python tools
python3 -m black --version
python3 -m isort --version
python3 -m flake8 --version

# Check Node tools
npx prettier --version
npx eslint --version

# Check Go tools
golangci-lint --version
gofmt -help

# Check Java tools
mvn --version
```

#### 2. Hook takes too long

Some hooks (like Java checks) can be slow. They run only when relevant files change.

#### 3. False positives in gitleaks

If gitleaks flags a false positive (e.g., example API keys in documentation), you can:

1. Add the file to `.gitleaksignore`
2. Use inline comments to exclude specific lines

### Getting Help

If you encounter issues:

1. Check the [pre-commit documentation](https://pre-commit.com/)
2. Review the `.pre-commit-config.yaml` configuration
3. Open an issue in the project repository

## Best Practices

1. **Run pre-commit before pushing**: Even though hooks run on commit, running `pre-commit run --all-files` before pushing ensures all files are checked.

2. **Keep hooks updated**: Run `pre-commit autoupdate` periodically to get the latest hook versions.

3. **Don't skip hooks**: Avoid using `--no-verify` unless absolutely necessary. If a check is consistently problematic, discuss with the team.

4. **Fix issues immediately**: Don't accumulate technical debt. Fix formatting and linting issues as they arise.

5. **Use CI as backup**: Our CI pipeline also runs these checks, so any missed issues will be caught before merge.
