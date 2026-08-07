#!/usr/bin/env bash
set -euo pipefail

# Simple parser for localci TOML config.
# Supports sections like:
# [[python.apps]]
# name = "a"
# dir = "backend-python/a"
# enabled = true
#
# Usage:
#   makefiles/parse_localci.sh enabled <lang> <config_path>
#     -> prints: name|dir (only enabled apps; enabled defaults to true)
#   makefiles/parse_localci.sh langs <config_path>
#     -> prints: space-separated langs that have at least one enabled app
#   makefiles/parse_localci.sh all <config_path>
#     -> prints: lang|name|dir|enabled

cmd="${1:-}"
lang_filter=""
cfg=""
if [[ "$cmd" == "enabled" ]]; then
  lang_filter="${2:-}"
  cfg="${3:-}"
elif [[ "$cmd" == "langs" ]]; then
  cfg="${2:-}"
elif [[ "$cmd" == "all" ]]; then
  cfg="${2:-}"
else
  echo "Usage: $0 {enabled <lang> <config>|langs <config>|all <config>}" >&2
  exit 1
fi

if [[ -z "$cfg" || ! -f "$cfg" ]]; then
  exit 0
fi

awk -v mode="$cmd" -v want_lang="$lang_filter" '
function trim(s){ sub(/^\s+/,"",s); sub(/\s+$/,"",s); return s }
function flush(){
  if (current_lang != "" && dir != "") {
    e = tolower(enabled)
    if (e == "") e = "true"
    if (mode == "all") {
      printf "%s|%s|%s|%s\n", current_lang, name, dir, e
    } else if (mode == "enabled") {
      if (e == "true" && (want_lang == "" || want_lang == current_lang)) {
        printf "%s|%s\n", name, dir
      }
    }
    if (e == "true") langs[current_lang]=1
  }
  name=""; dir=""; enabled=""
}
BEGIN{ current_lang=""; name=""; dir=""; enabled=""; have=0 }
{
  line=$0
  sub(/#.*/,"",line)                   # strip comments
  if (line ~ /^\s*$/) next               # skip blanks
  if (line ~ /^[[:space:]]*\[\[[^]]+\]\][[:space:]]*$/){
    # new section
    flush()
    sect=line
    sub(/^\s*\[\[/, "", sect)
    sub(/\]\]\s*$/, "", sect)
    # sect like python.apps -> take part before dot
    split(sect, a, ".")
    current_lang=a[1]
    next
  }
  if (line ~ /^[[:space:]]*name[[:space:]]*=/){
    val=line; sub(/^[^=]*=/, "", val); gsub(/^[ \t]+/, "", val); gsub(/[ \t]+$/, "", val); sub(/^"/, "", val); sub(/"$/, "", val); name=val; next
  }
  if (line ~ /^[[:space:]]*dir[[:space:]]*=/){
    val=line; sub(/^[^=]*=/, "", val); gsub(/^[ \t]+/, "", val); gsub(/[ \t]+$/, "", val); sub(/^"/, "", val); sub(/"$/, "", val); dir=val; next
  }
  if (line ~ /^[[:space:]]*enabled[[:space:]]*=/){
    val=line; sub(/^[^=]*=/, "", val); gsub(/[ \t]+/, "", val); enabled=tolower(val); next
  }
}
END{
  flush()
  if (mode == "langs"){
    out=""
    for (k in langs){ if (out=="") out=k; else out=out" "k }
    print out
  }
}
' "$cfg"
