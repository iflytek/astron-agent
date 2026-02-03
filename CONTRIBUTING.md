# Contributing to Astron Agent

Thank you for your interest in contributing to Astron Agent! We welcome contributions from the community and appreciate your help in making this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Release Process](#release-process)
- [Community Guidelines](#community-guidelines)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

Please read our [Code of Conduct](.github/code_of_conduct.md) for details on our commitment to providing a welcoming and inclusive environment for all contributors.

## Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Java 21+** (for backend services)
- **Maven 3.8+** (for Java project management)
- **Node.js 18+** (for frontend development)
- **Python 3.9+** (for core services)
- **Go 1.21+** (for tenant service)
- **Docker & Docker Compose** (for containerized services)
- **Git** (for version control)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/astron-agent.git
   cd astron-agent
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/iflytek/astron-agent.git
   ```

## Development Environment Setup

### One-time Setup

Run the automated setup script to install all required tools and configure your environment:

```bash
make dev-setup
```

This command will:
- Install language-specific development tools
- Configure Git hooks for code quality
- Set up branch naming conventions
- Install dependencies for all modules

### Manual Setup

If you prefer manual setup or need to install specific components:

```bash
# Install development tools
make install-tools

# Check tool installation status
make check-tools

# Install Git hooks
make hooks-install
```

### Pre-commit Setup (Recommended)

We use [pre-commit](https://pre-commit.com/) for automated code quality checks and secret scanning. This is the **recommended way** to ensure code quality before committing.

```bash
# Install pre-commit (if not already installed)
pip install pre-commit

# Install pre-commit hooks
pre-commit install
pre-commit install --hook-type commit-msg
```

Pre-commit will automatically run on every commit to:
- Check code formatting (Black, Prettier, gofmt, Spotless)
- Run linters (flake8, ESLint, golangci-lint, Checkstyle)
- Perform type checking (mypy, TypeScript)
- Scan for secrets (gitleaks)
- Validate commit message format

For detailed usage instructions, see the [Pre-commit Usage Guide](docs/PRE-COMMIT.md).

## Project Structure

Astron Agent is a microservices-based platform with the following structure:

```
astron-agent/
├── console/                    # Console subsystem
│   ├── backend/               # Java Spring Boot services
│   │   ├── auth/              # Authentication service
│   │   ├── commons/           # Shared utilities
│   │   ├── hub/               # Main business logic
│   │   ├── toolkit/           # Toolkit services
│   │   └── config/            # Quality configuration
│   └── frontend/              # React TypeScript SPA
├── core/                      # Core platform services
│   ├── agent/                 # Agent execution engine (Python)
│   ├── common/                # Shared Python libraries
│   ├── knowledge/             # Knowledge base service (Python)
│   ├── memory/                # Memory management
│   ├── plugin/                # Plugin system
│   ├── tenant/                # Multi-tenant service (Go)
│   └── workflow/              # Workflow orchestration (Python)
├── docs/                      # Documentation
├── makefiles/                 # Build system components
└── .github/                   # GitHub configuration
    └── quality-requirements/  # Code quality standards
```

## Development Workflow

### Branch Management

Follow our branch naming conventions:

| Branch Type | Format | Example | Purpose |
|-------------|--------|---------|---------|
| Feature | `feature/feature-name` | `feature/user-auth` | New features |
| Bugfix | `bugfix/issue-name` | `bugfix/login-error` | Bug fixes |
| Hotfix | `hotfix/patch-name` | `hotfix/security-patch` | Emergency fixes |
| Documentation | `doc/doc-name` | `doc/api-guide` | Documentation updates |

### Creating Branches

Use the Makefile commands for consistent branch creation:

```bash
# Create feature branch
make new-feature name=user-authentication

# Create bugfix branch
make new-bugfix name=login-timeout

# Create hotfix branch
make new-hotfix name=security-vulnerability
```

### Daily Development Commands

```bash
# Format all code
make format

# Run code quality checks with pre-commit (recommended)
pre-commit run --all-files

# Run tests
make test

# Build all projects
make build
```

## Code Quality Standards

### Multi-language Support

Astron Agent supports multiple programming languages with unified quality standards:

| Language | Formatting | Quality Tools | Standards |
|----------|------------|---------------|-----------|
| **Go** | gofmt + goimports + gofumpt | golangci-lint + staticcheck | Go standard format, complexity ≤10 |
| **Java** | Spotless (Google Java Format) | Checkstyle + PMD + SpotBugs | Google Java Style, complexity ≤10 |
| **Python** | black + isort | flake8 + mypy + pylint | PEP 8, complexity ≤10 |
| **TypeScript** | prettier | eslint + tsc | ESLint rules, strict typing |

### Code Quality Requirements

All code must pass the following checks:

- **Formatting**: Automatic code formatting applied
- **Linting**: No linting errors or warnings
- **Type Checking**: Strict type checking (TypeScript/Python)
- **Complexity**: Cyclomatic complexity ≤10
- **Testing**: Adequate test coverage
- **Documentation**: Clear code comments and documentation

### Code Quality Checks with Pre-commit

We use pre-commit as the unified code quality checking tool. It automatically runs on staged files during commit, or you can run it manually:

```bash
# Check only staged files (automatically runs on git commit)
pre-commit run

# Check all files in the repository
pre-commit run --all-files

# Run a specific hook
pre-commit run black --all-files
pre-commit run eslint-check --all-files
pre-commit run golangci-lint --all-files
```

For more details, see the [Pre-commit Usage Guide](docs/PRE-COMMIT.md).

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete user workflows

### Running Tests

```bash
# Run all tests
make test

# Run specific language tests
make test-go
make test-java
make test-python
make test-typescript

# Run with coverage
make test-coverage
```

### Test Requirements

- All new features must include tests
- Bug fixes must include regression tests
- Test coverage should not decrease
- Tests must be deterministic and fast

## Documentation

### Code Documentation

- Use clear, concise comments
- Document public APIs and interfaces
- Include usage examples where appropriate
- Follow language-specific documentation standards

### Project Documentation

- Update README files for significant changes
- Document new features and APIs
- Maintain up-to-date installation and setup guides
- Include troubleshooting information

## Submitting Changes

### Commit Message Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `style`: Code formatting
- `refactor`: Code refactoring
- `test`: Test-related changes
- `chore`: Build tools, dependency updates

**Examples:**
```bash
feat(auth): add OAuth2 authentication support
fix(api): resolve user info query endpoint
docs(guide): improve quick start guide
```

### Pre-commit Checklist

Before committing, ensure:

- [ ] Pre-commit hooks are installed (`pre-commit install && pre-commit install --hook-type commit-msg`)
- [ ] Code quality checks pass (`pre-commit run --all-files`)
- [ ] Tests pass (`make test`)
- [ ] Branch naming follows conventions
- [ ] Commit message follows [Conventional Commits](https://www.conventionalcommits.org/) format
- [ ] Documentation is updated if needed

> **Note**: If pre-commit hooks are installed, code quality and commit message format will be automatically checked on each commit.

## Issue Guidelines

### Reporting Bugs

When reporting bugs, include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, versions, etc.)
5. **Relevant logs** or error messages
6. **Screenshots** if applicable

### Feature Requests

For feature requests, include:

1. **Clear description** of the feature
2. **Use case** and motivation
3. **Proposed solution** or approach
4. **Alternative solutions** considered
5. **Additional context** or references

## Pull Request Guidelines

### Before Submitting

- [ ] Fork the repository and create a feature branch
- [ ] Make your changes following the coding standards
- [ ] Add tests for new functionality
- [ ] Update documentation as needed
- [ ] Ensure all checks pass locally
- [ ] Rebase on the latest main branch

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: All PRs must pass automated quality checks
2. **Code Review**: At least one maintainer must approve
3. **Testing**: All tests must pass
4. **Documentation**: Documentation must be updated if needed

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. Create release branch from main
2. Update version numbers and changelog
3. Run full test suite
4. Create release PR for review
5. Merge and tag release
6. Deploy to production

## Community Guidelines

### Communication

- Be respectful and inclusive
- Use clear, constructive language
- Provide helpful feedback
- Ask questions when needed

### Getting Help

- Check existing documentation first
- Search existing issues and discussions
- Ask questions in discussions or issues
- Join community channels if available

### Recognition

Contributors will be recognized in:
- Release notes
- Contributors list
- Community highlights

## Additional Resources

- [Pre-commit Usage Guide](docs/PRE-COMMIT.md)
- [Branch and Commit Standards](.github/quality-requirements/branch-commit-standards.md)
- [Code Quality Requirements](.github/quality-requirements/code-requirements.md)
- [Makefile Usage Guide](docs/Makefile-readme.md)
- [Project README](README.md)

## Questions?

If you have questions about contributing, please:

1. Check the documentation in the `docs/` directory
2. Review existing issues and discussions
3. Create a new issue with the "question" label
4. Contact the maintainers

Thank you for contributing to Astron Agent! 🚀
