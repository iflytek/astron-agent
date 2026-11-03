#!/bin/bash
# Copyright 2026 iFlytek Co., Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# =============================================================================
# Boilerplate Checker - License Header Enforcement
# =============================================================================
#
# Usage:
#   ./makefiles/check-boilerplate.sh                 Check files added in this
#                                                    branch (default)
#   ./makefiles/check-boilerplate.sh --all           Check every tracked file
#   ./makefiles/check-boilerplate.sh --fix [--all]   Insert missing headers
#   ./makefiles/check-boilerplate.sh path/to/file    Check the given files only
#
# The default mode only looks at files ADDED relative to the base branch, so
# existing files without a header never fail the build. Run with --all to see
# the full backlog.
#
# Base branch for the added-files diff can be overridden with BASE_REF.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOILERPLATE_DIR="$REPO_ROOT/makefiles/boilerplate"
BASE_REF="${BASE_REF:-origin/main}"

MODE="changed"
FIX=false
EXPLICIT_FILES=()

usage() {
    cat <<'USAGE'
Boilerplate Checker - License Header Enforcement

Usage:
  ./makefiles/check-boilerplate.sh                 Check files added in this
                                                   branch (default)
  ./makefiles/check-boilerplate.sh --all           Check every tracked file
  ./makefiles/check-boilerplate.sh --fix [--all]   Insert missing headers
  ./makefiles/check-boilerplate.sh path/to/file    Check the given files only

The default mode only looks at files ADDED relative to the base branch, so
existing files without a header never fail the build. Run with --all to see
the full backlog. Override the diff base with BASE_REF.
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all) MODE="all"; shift ;;
        --fix) FIX=true; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) echo -e "${RED}Unknown option: $1${RESET}" >&2; exit 2 ;;
        *) EXPLICIT_FILES+=("$1"); shift ;;
    esac
done

# Paths that are vendored, generated or otherwise not ours to license.
# Each directory is listed twice so it matches at the repository root as well
# as nested, because '*/name/*' cannot match a path that starts with 'name/'.
is_excluded() {
    case "$1" in
        node_modules/*|*/node_modules/*) return 0 ;;
        dist/*|*/dist/*|build/*|*/build/*|target/*|*/target/*) return 0 ;;
        .venv/*|*/.venv/*|venv/*|*/venv/*) return 0 ;;
        __pycache__/*|*/__pycache__/*) return 0 ;;
        migrations/*|*/migrations/*|generated/*|*/generated/*) return 0 ;;
        helm/*|*.min.js) return 0 ;;
        *) return 1 ;;
    esac
}

# Map a file to its boilerplate template, empty when the type is not covered
template_for() {
    case "$1" in
        *.go) echo "$BOILERPLATE_DIR/boilerplate.go.txt" ;;
        *.java) echo "$BOILERPLATE_DIR/boilerplate.java.txt" ;;
        *.py) echo "$BOILERPLATE_DIR/boilerplate.py.txt" ;;
        *.sh) echo "$BOILERPLATE_DIR/boilerplate.sh.txt" ;;
        *.ts|*.tsx|*.js|*.jsx) echo "$BOILERPLATE_DIR/boilerplate.ts.txt" ;;
        *) echo "" ;;
    esac
}

# Collect the files to inspect
collect_files() {
    if [[ ${#EXPLICIT_FILES[@]} -gt 0 ]]; then
        printf '%s\n' "${EXPLICIT_FILES[@]}"
    elif [[ "$MODE" == "all" ]]; then
        git -C "$REPO_ROOT" ls-files
    else
        local merge_base
        if ! merge_base="$(git -C "$REPO_ROOT" merge-base "$BASE_REF" HEAD 2>/dev/null)"; then
            # Failing closed matters: a shallow clone would otherwise check
            # nothing and report success, silently disabling the CI gate
            echo -e "${RED}❌ Cannot resolve a merge base with $BASE_REF.${RESET}" >&2
            echo -e "${YELLOW}   Fetch the base branch first (fetch-depth: 0 in GitHub Actions),${RESET}" >&2
            echo -e "${YELLOW}   or pass --all to scan every tracked file instead.${RESET}" >&2
            return 1
        fi
        git -C "$REPO_ROOT" diff --diff-filter=A --name-only "$merge_base" HEAD
    fi
}

# Compare the head of a file against its template, ignoring the copyright year
has_boilerplate() {
    local file="$1" template="$2"
    python3 - "$file" "$template" <<'PYTHON'
import re
import sys

file_path, template_path = sys.argv[1], sys.argv[2]

with open(template_path, encoding="utf-8") as handle:
    template = handle.read().strip().splitlines()

try:
    with open(file_path, encoding="utf-8") as handle:
        content = handle.read()
except (UnicodeDecodeError, FileNotFoundError):
    # Unreadable files are reported as compliant; other tooling owns them
    sys.exit(0)

lines = content.splitlines()

# A shebang and any encoding cookie legally precede the header
while lines and (lines[0].startswith("#!") or "coding" in lines[0][:40]):
    lines.pop(0)
while lines and not lines[0].strip():
    lines.pop(0)

if len(lines) < len(template):
    sys.exit(1)

for expected, actual in zip(template, lines):
    pattern = re.escape(expected).replace("YEAR", r"\d{4}(-\d{4})?")
    if not re.fullmatch(pattern, actual.rstrip()):
        sys.exit(1)

sys.exit(0)
PYTHON
}

# Insert the rendered template above the existing content
insert_boilerplate() {
    local file="$1" template="$2"
    python3 - "$file" "$template" <<'PYTHON'
import datetime
import os
import shutil
import sys

file_path, template_path = sys.argv[1], sys.argv[2]

with open(template_path, encoding="utf-8") as handle:
    header = handle.read().strip()
header = header.replace("YEAR", str(datetime.date.today().year))

with open(file_path, encoding="utf-8") as handle:
    lines = handle.read().splitlines(keepends=True)

prefix = []
while lines and (lines[0].startswith("#!") or "coding" in lines[0][:40]):
    prefix.append(lines.pop(0))

body = "".join(lines).lstrip("\n")

# Write through a temp file and rename, so rewriting a script that is
# currently executing cannot corrupt the running interpreter's read
temp_path = file_path + ".boilerplate.tmp"
with open(temp_path, "w", encoding="utf-8") as handle:
    handle.write("".join(prefix))
    handle.write(header + "\n\n")
    handle.write(body)
shutil.copymode(file_path, temp_path)
os.replace(temp_path, file_path)
PYTHON
}

echo -e "${BLUE}📜 Checking license headers...${RESET}"
[[ "$MODE" == "all" ]] && echo -e "${BLUE}   Scope: all tracked files${RESET}" \
    || echo -e "${BLUE}   Scope: files added against $BASE_REF${RESET}"

missing=0
checked=0
fixed=0

# Collect first rather than piping through process substitution: a subshell
# would swallow a non-zero exit from collect_files and report a false pass
if ! files_list="$(collect_files)"; then
    exit 1
fi

while IFS= read -r file; do
    [[ -z "$file" || ! -f "$REPO_ROOT/$file" ]] && continue
    is_excluded "$file" && continue

    template="$(template_for "$file")"
    [[ -z "$template" ]] && continue

    checked=$((checked + 1))
    if has_boilerplate "$REPO_ROOT/$file" "$template"; then
        continue
    fi

    if [[ "$FIX" == true ]]; then
        insert_boilerplate "$REPO_ROOT/$file" "$template"
        echo -e "${GREEN}  ✚ added header: $file${RESET}"
        fixed=$((fixed + 1))
    else
        echo -e "${RED}  ✗ missing header: $file${RESET}"
        missing=$((missing + 1))
    fi
done <<< "$files_list"

echo ""
echo -e "${BLUE}   Files inspected: $checked${RESET}"

if [[ "$FIX" == true ]]; then
    echo -e "${GREEN}✅ Added headers to $fixed file(s)${RESET}"
    exit 0
fi

if [[ $missing -gt 0 ]]; then
    echo -e "${RED}❌ $missing file(s) are missing the license header${RESET}"
    echo -e "${YELLOW}   Run './makefiles/check-boilerplate.sh --fix' to add them${RESET}"
    exit 1
fi

echo -e "${GREEN}✅ All inspected files carry the license header${RESET}"
