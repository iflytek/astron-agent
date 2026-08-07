# =============================================================================
# Multi-language CI/CD Toolchain - Optimized Main Makefile (Only 15 Core Commands)
# Streamlined from 95 commands to 15 core commands, providing intelligent project detection and automated workflows
# =============================================================================

# Include core modules
include makefiles/core/detection.mk
include makefiles/core/workflows.mk

# Include original language modules (for internal calls)
include makefiles/go.mk
include makefiles/typescript.mk
include makefiles/java.mk
include makefiles/python.mk
include makefiles/git.mk
include makefiles/common.mk
include makefiles/comment-check.mk

# =============================================================================
# Core command declarations
# =============================================================================
.PHONY: help setup check test build push clean status info lint ci hooks

# =============================================================================
# Tier 1: Daily Core Commands (7) - These are all you need to remember!
# =============================================================================

# Default target - Intelligent help
.DEFAULT_GOAL := help
help: ## 📚 Show help information and project status
	@echo "$(BLUE)🚀 Multi-language CI/CD Toolchain - Intelligent Version$(RESET)"
	@echo "$(YELLOW)Active Projects:$(RESET) $(GREEN)$(ACTIVE_PROJECTS)$(RESET) | $(YELLOW)Current Context:$(RESET) $(GREEN)$(CURRENT_CONTEXT)$(RESET)"
	@echo ""
	@echo "$(BLUE)📋 Core Commands (Daily Development):$(RESET)"
	@echo "  $(GREEN)make setup$(RESET)     🛠️  One-time environment setup (tools+hooks+branch strategy)"
	@echo "  $(GREEN)make check$(RESET)     🔍  Quality check including format (intelligent detection: $(ACTIVE_PROJECTS))"
	@echo "  $(GREEN)make test$(RESET)      🧪  Run tests (intelligent detection: $(ACTIVE_PROJECTS))"
	@echo "  $(GREEN)make build$(RESET)     📦  Build projects (intelligent detection: $(ACTIVE_PROJECTS))"
	@echo "  $(GREEN)make push$(RESET)      📤  Safe push to remote (with pre-checks)"
	@echo "  $(GREEN)make clean$(RESET)     🧹  Clean build artifacts"
	@echo ""
	@echo "$(BLUE)🔧 Professional Commands:$(RESET)"
	@echo "  $(GREEN)make status$(RESET)    📊  Show detailed project status"
	@echo "  $(GREEN)make info$(RESET)      ℹ️   Show tools and dependency information"
	@echo "  $(GREEN)make lint$(RESET)      🔧  Run code linting (alias for check)"
	@echo "  $(GREEN)make ci$(RESET)        🤖  Complete CI pipeline (check+test+build)"
	@echo "  $(GREEN)make hooks$(RESET)     ⚙️  Git hooks management menu"
	@echo ""
	@echo "$(YELLOW)⚠️  CI Philosophy: Check-only, no auto-fix$(RESET)"
	@echo "    CI systems detect issues, developers fix them manually"
	@echo ""
	@if [ "$(IS_MULTI_PROJECT)" = "true" ]; then \
		echo "$(YELLOW)💡 Multi-project environment detected, all commands will intelligently handle multiple projects$(RESET)"; \
	else \
		echo "$(YELLOW)💡 Single project environment, please run common commands in corresponding subdirectories (setup/check/test/build)$(RESET)"; \
	fi

# Core workflow commands - Direct calls to intelligent implementations
setup: smart_setup ## 🛠️ One-time environment setup (tools+hooks+branch strategy)

check: smart_check ## 🔍 Intelligent code quality check (detect active projects)

test: smart_test ## 🧪 Intelligent test execution (detect active projects)

build: smart_build ## 📦 Intelligent project build (detect active projects)

push: smart_push ## 📤 Intelligent safe push (branch check + quality check)

clean: smart_clean ## 🧹 Intelligent cleanup of build artifacts

# =============================================================================
# Tier 2: Professional Commands (5)
# =============================================================================

status: smart_status ## 📊 Show detailed project status

info: smart_info ## ℹ️ Show tools and dependency information

lint: smart_check ## 🔧 Run code linting (alias for check)

ci: smart_ci ## 🤖 Complete CI pipeline (check + test + build)

hooks: ## ⚙️ Git hooks management menu
	@echo "$(BLUE)⚙️ Git Hooks Management$(RESET)"
	@echo ""
	@echo "$(GREEN)Install Hooks:$(RESET)"
	@echo "  make hooks-install       📌 Install all hooks (recommended)"
	@echo "  make hooks-commit-msg    💬 Commit message hooks only"
	@echo "  make hooks-pre-push      🚀 Pre-push hooks only"
	@echo ""
	@echo "$(RED)Uninstall Hooks:$(RESET)"
	@echo "  make hooks-uninstall     ❌ Uninstall all hooks"
	@echo ""
	@echo "$(YELLOW)⚠️  Note: Hooks only check code, no auto-formatting$(RESET)"
	@echo ""
	@echo "$(YELLOW)Current Hook Status:$(RESET)"
	@ls -la .git/hooks/ | grep -E "(pre-commit|commit-msg|pre-push)" | head -3

# =============================================================================
# Hidden utility commands (for debugging and testing)
# =============================================================================
_debug: ## 🔍 [Debug] Test project detection and Makefile status
	@echo "$(YELLOW)Project Detection Test:$(RESET)"
	@echo "ACTIVE_PROJECTS: '$(ACTIVE_PROJECTS)'"
	@echo "CURRENT_CONTEXT: '$(CURRENT_CONTEXT)'"
	@echo "PROJECT_COUNT: $(PROJECT_COUNT)"
	@echo "IS_MULTI_PROJECT: $(IS_MULTI_PROJECT)"
	$(call show_project_status)
	@echo ""
	@echo "$(BLUE)Current Makefile Status:$(RESET)"
	@echo "Included modules: detection.mk workflows.mk + original language modules"
