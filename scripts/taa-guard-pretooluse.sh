#!/usr/bin/env bash
# TAA Guard — PreToolUse secret deny. Blocks Write/Edit/MultiEdit *before* the
# file is ever written, by scanning the content the tool is about to write.
# taa-guard.sh (PostToolUse) still re-checks after the fact as a backstop —
# e.g. for files this hook degrades on because jq is missing.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./taa-guard-secrets.sh
source "$SCRIPT_DIR/taa-guard-secrets.sh"

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  # No reliable structured parse of tool_input without jq — degrade honestly
  # rather than guessing with regex on raw JSON. PostToolUse still catches it.
  echo "TAA-GUARD NOTE: jq not found, PreToolUse secret pre-check skipped (PostToolUse will still catch it after the write)" >&2
  exit 0
fi

TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')"

CONTENT=""
case "$TOOL_NAME" in
  Write)
    CONTENT="$(printf '%s' "$INPUT" | jq -r '.tool_input.content // empty')" ;;
  Edit)
    CONTENT="$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // empty')" ;;
  MultiEdit)
    CONTENT="$(printf '%s' "$INPUT" | jq -r '[.tool_input.edits[]?.new_string // empty] | join("\n")')" ;;
  *)
    exit 0 ;;
esac

[[ -z "$CONTENT" ]] && exit 0

if ! REASON="$(taa_guard_scan_content "$CONTENT")"; then
  echo "TAA-GUARD DENY [SECRET] ${FILE:-<content>}: $REASON" >&2
  exit 2
fi

exit 0
