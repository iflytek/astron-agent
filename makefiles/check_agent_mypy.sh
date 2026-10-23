#!/usr/bin/env bash
# Resolve AgentState and other typed SDK bases from the Agent's locked dependencies.
set -euo pipefail

checker_python=${1:?Usage: check_agent_mypy.sh CHECKER_PYTHON [mypy arguments...]}
shift
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cd -- "$script_dir/../core/agent"

# Keep third-party source outside the repository's recursive quality checks.
# A fresh temporary environment also leaves developer and system environments intact.
type_environment=$(mktemp -d "${TMPDIR:-/tmp}/astron-agent-mypy.XXXXXX")
trap 'rm -rf -- "$type_environment"' EXIT
UV_PROJECT_ENVIRONMENT="$type_environment" \
    uv sync --frozen --no-install-project --python "$checker_python"

# Keep the checker's pinned version and strict flags; use the official PEP 561 lookup.
"$checker_python" -m mypy --python-executable "$type_environment/bin/python" "$@"
