# =============================================================================
# Comment Language Check - English Comments Enforcement
# =============================================================================

# Comment check script path
COMMENT_CHECK_SCRIPT := makefiles/check-comments.sh

# =============================================================================
# Comment Language Check Commands
# =============================================================================

check-comments: ## Check that all comments are written in English
	@echo "$(BLUE)🔍 Checking comment language compliance...$(RESET)"
	@if [ -n "$(LOCALCI_CONFIG)" ]; then \
		echo "$(YELLOW)Using config: $(LOCALCI_CONFIG)$(RESET)"; \
		if [ -z "$(ACTIVE_PROJECTS)" ]; then \
			echo "$(RED)No active languages from config; nothing to check$(RESET)"; \
			exit 0; \
		fi; \
		for lang in $(ACTIVE_PROJECTS); do \
			case $$lang in \
				go) $(MAKE) --no-print-directory check-comments-go ;; \
				java) $(MAKE) --no-print-directory check-comments-java ;; \
				python) $(MAKE) --no-print-directory check-comments-python ;; \
				typescript) $(MAKE) --no-print-directory check-comments-typescript ;; \
			esac; \
		done; \
	else \
		if [ ! -f "$(COMMENT_CHECK_SCRIPT)" ]; then \
			echo "$(RED)Comment check script not found: $(COMMENT_CHECK_SCRIPT)$(RESET)"; \
			exit 1; \
		fi; \
		./$(COMMENT_CHECK_SCRIPT); \
	fi

check-comments-go: ## Check Go comments for English language
	@if [ -n "$(GO_DIRS)" ]; then \
		echo "$(YELLOW)Checking Go comments in: $(GO_DIRS)$(RESET)"; \
		for dir in $(GO_DIRS); do \
			if [ -d "$$dir" ]; then \
				echo "  Processing $$dir..."; \
				find $$dir -name "*.go" ! -path "*/vendor/*" -exec grep -l '//' {} \; 2>/dev/null | while read file; do \
					echo "    Checking: $$file"; \
					grep -n '//' "$$file" | while IFS=: read -r line_num comment; do \
						comment_text=$$(echo "$$comment" | sed 's|^\s*//\s*||'); \
						if [ "$$(uname)" = "Darwin" ]; then \
							if echo "$$comment_text" | grep -qE '[一-龯]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						else \
							if echo "$$comment_text" | grep -qP '[\x{4e00}-\x{9fff}]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						fi; \
					done; \
				done; \
			else \
				echo "  $(RED)Directory $$dir does not exist$(RESET)"; \
			fi; \
		done; \
	else \
		echo "$(BLUE)Skipping Go comment check (no Go projects configured)$(RESET)"; \
	fi

check-comments-java: ## Check Java comments for English language
	@if [ -n "$(JAVA_DIRS)" ]; then \
		echo "$(YELLOW)Checking Java comments in: $(JAVA_DIRS)$(RESET)"; \
		for dir in $(JAVA_DIRS); do \
			if [ -d "$$dir" ]; then \
				echo "  Processing $$dir..."; \
				find $$dir -name "*.java" ! -path "*/target/*" -exec grep -l '//' {} \; 2>/dev/null | while read file; do \
					echo "    Checking: $$file"; \
					grep -n '//' "$$file" | while IFS=: read -r line_num comment; do \
						comment_text=$$(echo "$$comment" | sed 's|^\s*//\s*||'); \
						if [ "$$(uname)" = "Darwin" ]; then \
							if echo "$$comment_text" | grep -qE '[一-龯]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						else \
							if echo "$$comment_text" | grep -qP '[\x{4e00}-\x{9fff}]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						fi; \
					done; \
				done; \
			else \
				echo "  $(RED)Directory $$dir does not exist$(RESET)"; \
			fi; \
		done; \
	else \
		echo "$(BLUE)Skipping Java comment check (no Java projects configured)$(RESET)"; \
	fi

check-comments-python: ## Check Python comments for English language
	@if [ -n "$(PYTHON_DIRS)" ]; then \
		echo "$(YELLOW)Checking Python comments in: $(PYTHON_DIRS)$(RESET)"; \
		for dir in $(PYTHON_DIRS); do \
			if [ -d "$$dir" ]; then \
				echo "  Processing $$dir..."; \
				find $$dir -name "*.py" ! -path "*/.venv/*" ! -path "*/venv/*" ! -path "*/__pycache__/*" ! -path "*.egg-info/*" -exec grep -l '#' {} \; 2>/dev/null | while read file; do \
					echo "    Checking: $$file"; \
					grep -n '#' "$$file" | while IFS=: read -r line_num comment; do \
						comment_text=$$(echo "$$comment" | sed 's|^\s*#\s*||'); \
						if [ "$$(uname)" = "Darwin" ]; then \
							if echo "$$comment_text" | grep -qE '[一-龯]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						else \
							if echo "$$comment_text" | grep -qP '[\x{4e00}-\x{9fff}]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						fi; \
					done; \
				done; \
			else \
				echo "  $(RED)Directory $$dir does not exist$(RESET)"; \
			fi; \
		done; \
	else \
		echo "$(BLUE)Skipping Python comment check (no Python projects configured)$(RESET)"; \
	fi

check-comments-typescript: ## Check TypeScript comments for English language
	@if [ -n "$(TS_DIRS)" ]; then \
		echo "$(YELLOW)Checking TypeScript comments in: $(TS_DIRS)$(RESET)"; \
		for dir in $(TS_DIRS); do \
			if [ -d "$$dir" ]; then \
				echo "  Processing $$dir..."; \
				find $$dir \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*" | while read file; do \
					echo "    Checking: $$file"; \
					grep -n '//' "$$file" 2>/dev/null | while IFS=: read -r line_num comment; do \
						comment_text=$$(echo "$$comment" | sed 's|^\s*//\s*||'); \
						if [ "$$(uname)" = "Darwin" ]; then \
							if echo "$$comment_text" | grep -qE '[一-龯]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						else \
							if echo "$$comment_text" | grep -qP '[\x{4e00}-\x{9fff}]' 2>/dev/null; then \
								echo "      $(RED)Line $$line_num: Contains Chinese characters$(RESET)"; \
								echo "      Content: $$comment_text"; \
							fi; \
						fi; \
					done; \
				done; \
			else \
				echo "  $(RED)Directory $$dir does not exist$(RESET)"; \
			fi; \
		done; \
	else \
		echo "$(BLUE)Skipping TypeScript comment check (no TypeScript projects configured)$(RESET)"; \
	fi

# =============================================================================
# Integration with existing workflows
# =============================================================================

# Add comment check to smart check workflow
smart_check_with_comments: smart_check check-comments ## Smart check including comment language verification

# Add comment check to CI workflow
smart_ci_with_comments: smart_check check-comments smart_test smart_build ## Full CI with comment checks

# =============================================================================
# Help and Info
# =============================================================================

info-comment-check: ## Show comment checking information
	@echo "$(BLUE)Comment Language Check Information:$(RESET)"
	@echo "  Script location: $(COMMENT_CHECK_SCRIPT)"
	@if [ -f "$(COMMENT_CHECK_SCRIPT)" ]; then \
		echo "  Status: $(GREEN)Available$(RESET)"; \
	else \
		echo "  Status: $(RED)Missing$(RESET)"; \
	fi
	@echo "  Supported languages: Go, Java, Python, TypeScript"
	@echo "  Rule: All comments must be written in English"
	@echo ""
	@echo "$(YELLOW)Available commands:$(RESET)"
	@echo "  make check-comments           - Check all supported files"
	@echo "  make check-comments-go        - Check only Go files"
	@echo "  make check-comments-java      - Check only Java files"
	@echo "  make check-comments-python    - Check only Python files"
	@echo "  make check-comments-typescript - Check only TypeScript files"
