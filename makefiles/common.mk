# =============================================================================
# Common Variables and Functions - Makefile Module
# =============================================================================

# Color output definitions - managed by detection.mk
# Only define if not already defined (to avoid overriding smart detection)
ifndef RED
	RED :=
endif
ifndef GREEN
	GREEN :=
endif
ifndef YELLOW
	YELLOW :=
endif
ifndef BLUE
	BLUE :=
endif
ifndef RESET
	RESET :=
endif

# Project status check
project-status: ## Show detected project status
	@echo "$(BLUE)Detected Projects:$(RESET)"
	@if [ -d "backend-go" ]; then echo "  $(GREEN)✓ Go Backend$(RESET)       (backend-go/)"; else echo "  $(RED)✗ Go Backend$(RESET)       (backend-go/)"; fi
	@if [ -d "frontend-ts" ]; then echo "  $(GREEN)✓ TypeScript Frontend$(RESET) (frontend-ts/)"; else echo "  $(RED)✗ TypeScript Frontend$(RESET) (frontend-ts/)"; fi
	@if [ -d "backend-java" ]; then echo "  $(GREEN)✓ Java Backend$(RESET)      (backend-java/)"; else echo "  $(RED)✗ Java Backend$(RESET)      (backend-java/)"; fi
	@if [ -d "backend-python" ]; then echo "  $(GREEN)✓ Python Backend$(RESET)    (backend-python/)"; else echo "  $(RED)✗ Python Backend$(RESET)    (backend-python/)"; fi

# Multi-language tool installation aggregate command
install-tools: ## Install development and checking tools for all languages
	@echo "$(YELLOW)Installing multi-language development tools...$(RESET)"
	@make --no-print-directory install-tools-go
	@make --no-print-directory install-tools-typescript
	@make --no-print-directory install-tools-java
	@make --no-print-directory install-tools-python
	@echo "$(GREEN)All multi-language tools installation completed!$(RESET)"

# Multi-language tool check aggregate command
check-tools: ## Check if development tools for all languages are installed
	@echo "$(YELLOW)Checking multi-language development tools...$(RESET)"
	@make --no-print-directory check-tools-go
	@make --no-print-directory check-tools-typescript  
	@make --no-print-directory check-tools-java
	@make --no-print-directory check-tools-python
	@echo "$(GREEN)Multi-language tools check completed!$(RESET)"

check-all: ## Check code quality for all language projects
	@echo "$(YELLOW)Running code quality checks for all projects...$(RESET)"
	@make --no-print-directory check-go
	@make --no-print-directory check-typescript
	@make --no-print-directory check-console-backend
	@make --no-print-directory check-python
	@echo "$(GREEN)All code quality checks completed!$(RESET)"

# Development environment setup
dev-setup: install-tools hooks-install branch-setup ## Setup complete development environment
	@echo "$(GREEN)Development environment setup completed!$(RESET)"
	@echo ""
	@echo "$(BLUE)Available code check commands:$(RESET)"
	@echo "  make check                       - Run all code quality checks"
	@echo "  make check-gocyclo               - Check cyclomatic complexity"
	@echo "  make check-staticcheck           - Run static analysis checks"
	@echo "  make explain-staticcheck code=XX - Explain staticcheck error codes"
	@echo "  make check-golangci-lint         - Run comprehensive lint checks"
	@echo ""
	@echo "$(BLUE)Available Git Hook commands:$(RESET)"
	@echo "  Installation commands:"
	@echo "    make hooks-install       - Install all hooks (check-only mode)"
	@echo "    make hooks-commit-msg    - Commit-msg validation only"
	@echo "    make hooks-pre-push      - Pre-push branch validation"
	@echo "  Uninstall commands:"
	@echo "    make hooks-uninstall     - Uninstall all hooks"
	@echo "    make hooks-uninstall-pre - Uninstall pre-commit hook"
	@echo "    make hooks-uninstall-msg - Uninstall commit-msg hook"
