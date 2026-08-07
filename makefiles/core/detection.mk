# =============================================================================
# Intelligent Project Detection Mechanism - Core Detection Module
# =============================================================================

# Intelligent color detection - respects user preference and terminal capability
# Priority: Environment variables > Terminal capability > Fallback
TPUT_COLORS := $(shell tput colors 2>/dev/null || echo 0)

# Allow user to explicitly control color behavior
ifdef FORCE_COLOR
	SUPPORTS_COLOR := true
else ifdef NO_COLOR
	SUPPORTS_COLOR := false
else
	# Auto-detect based on terminal capability
	SUPPORTS_COLOR := $(shell \
		if [ "$$TERM" = "dumb" ]; then \
			echo "false"; \
		elif [ "$(TPUT_COLORS)" -ge 8 ]; then \
			echo "true"; \
		elif echo "$$TERM" | grep -E "(color|xterm|screen|tmux)" >/dev/null; then \
			echo "true"; \
		else \
			echo "false"; \
		fi)
endif

# Optional debug info (can be disabled by setting DEBUG_COLOR=0)
ifndef DEBUG_COLOR
	DEBUG_COLOR := 0
endif
ifeq ($(DEBUG_COLOR),1)
	$(info [DEBUG] Color detection: SUPPORTS_COLOR=$(SUPPORTS_COLOR), TERM=$(TERM), TPUT_COLORS=$(TPUT_COLORS), FORCE_COLOR=$(FORCE_COLOR), NO_COLOR=$(NO_COLOR))
endif

# Define colors based on detection result
ifeq ($(SUPPORTS_COLOR),true)
	RED := \033[31m
	GREEN := \033[32m
	YELLOW := \033[33m
	BLUE := \033[34m
	RESET := \033[0m
else
	RED :=
	GREEN :=
	YELLOW :=
	BLUE :=
	RESET :=
endif

# LocalCI config path (local override, then default template)
LOCALCI_CONFIG := $(shell if [ -f .localci.toml ]; then echo .localci.toml; elif [ -f makefiles/localci.toml ]; then echo makefiles/localci.toml; fi)

# Detect active project types (based on actual file existence)
define detect_active_projects
	$(shell \
		if [ -n "$(LOCALCI_CONFIG)" ] && [ -f "$(LOCALCI_CONFIG)" ]; then \
			makefiles/parse_localci.sh langs $(LOCALCI_CONFIG); \
		else \
			PROJECTS=""; \
			[ -f "demo-apps/backends/go/go.mod" ] && [ -d "demo-apps/backends/go/cmd" ] && PROJECTS="$$PROJECTS go"; \
			[ -f "demo-apps/backends/java/pom.xml" ] && [ -d "demo-apps/backends/java/user-web" ] && PROJECTS="$$PROJECTS java"; \
			[ -f "demo-apps/backends/python/main.py" ] && [ -f "demo-apps/backends/python/requirements.txt" ] && PROJECTS="$$PROJECTS python"; \
			[ -f "demo-apps/frontends/ts/package.json" ] && [ -f "demo-apps/frontends/ts/tsconfig.json" ] && PROJECTS="$$PROJECTS typescript"; \
			echo $$PROJECTS | sed 's/^ //'; \
		fi \
	)
endef

# Detect current working directory context (for intelligent dev commands)
define detect_current_context
	$(shell \
		CURRENT_DIR=$$(basename "$(PWD)"); \
		if [ -f "./go.mod" ] || [ "$$CURRENT_DIR" = "go" ]; then echo "go"; \
		elif [ -f "./pom.xml" ] || [ "$$CURRENT_DIR" = "java" ]; then echo "java"; \
		elif [ -f "./main.py" ] && [ -f "./requirements.txt" ] || [ "$$CURRENT_DIR" = "python" ]; then echo "python"; \
		elif [ -f "./package.json" ] && [ -f "./tsconfig.json" ] || [ "$$CURRENT_DIR" = "ts" ]; then echo "typescript"; \
		else echo "all"; fi \
	)
endef

# Intelligent variables (use localci config if exists)
ifeq ($(strip $(LOCALCI_CONFIG)),)
  ACTIVE_PROJECTS := $(detect_active_projects)
  PROJECT_COUNT := $(shell echo $(ACTIVE_PROJECTS) | wc -w | tr -d ' ')
else
  ACTIVE_PROJECTS := $(shell makefiles/parse_localci.sh langs $(LOCALCI_CONFIG))
  PROJECT_COUNT := $(shell makefiles/parse_localci.sh all $(LOCALCI_CONFIG) | grep -c "true" | tr -d ' ')
endif

# Check if this is a multi-project environment
IS_MULTI_PROJECT := $(shell [ "$(PROJECT_COUNT)" -gt 1 ] && echo "true" || echo "false")

# Project status display function
define show_project_status
	@echo "$(BLUE)Detected Active Projects:$(RESET)"
	@if echo "$(ACTIVE_PROJECTS)" | grep -q "go"; then \
		if [ -n "$(GO_DIRS)" ]; then \
			for dir in $(GO_DIRS); do \
				if [ -d "$$dir" ]; then echo "  $(GREEN)✓ Go Backend$(RESET)         ($$dir)"; else echo "  $(RED)✗ Go Backend$(RESET)         ($$dir)"; fi; \
			done; \
		else \
			echo "  $(RED)✗ Go Backend$(RESET)         (no directories configured)"; \
		fi; \
	fi
	@if echo "$(ACTIVE_PROJECTS)" | grep -q "typescript"; then \
		if [ -n "$(TS_DIRS)" ]; then \
			for dir in $(TS_DIRS); do \
				if [ -d "$$dir" ]; then echo "  $(GREEN)✓ TypeScript Frontend$(RESET) ($$dir)"; else echo "  $(RED)✗ TypeScript Frontend$(RESET) ($$dir)"; fi; \
			done; \
		else \
			echo "  $(RED)✗ TypeScript Frontend$(RESET) (no directories configured)"; \
		fi; \
	fi
	@if echo "$(ACTIVE_PROJECTS)" | grep -q "java"; then \
		if [ -n "$(JAVA_DIRS)" ]; then \
			for dir in $(JAVA_DIRS); do \
				if [ -d "$$dir" ]; then echo "  $(GREEN)✓ Java Backend$(RESET)        ($$dir)"; else echo "  $(RED)✗ Java Backend$(RESET)        ($$dir)"; fi; \
			done; \
		else \
			echo "  $(RED)✗ Java Backend$(RESET)         (no directories configured)"; \
		fi; \
	fi
	@if echo "$(ACTIVE_PROJECTS)" | grep -q "python"; then \
		if [ -n "$(PYTHON_DIRS)" ]; then \
			for dir in $(PYTHON_DIRS); do \
				if [ -d "$$dir" ]; then echo "  $(GREEN)✓ Python Backend$(RESET)      ($$dir)"; else echo "  $(RED)✗ Python Backend$(RESET)      ($$dir)"; fi; \
			done; \
		else \
			echo "  $(RED)✗ Python Backend$(RESET)       (no directories configured)"; \
		fi; \
	fi
	@echo "$(BLUE)Current Context:$(RESET) $(YELLOW)$(CURRENT_CONTEXT)$(RESET)"
	@echo "$(BLUE)Intelligent Operation Target:$(RESET) $(GREEN)$(ACTIVE_PROJECTS)$(RESET)"
endef

# Project detection variables and function definitions complete
# _debug target defined in main Makefile to avoid duplicate definition warnings
