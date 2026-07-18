#!/usr/bin/env bash
# TAA Guard — deterministic gate, runs as a Claude Code PostToolUse hook on
# Write|Edit|MultiEdit|NotebookEdit (see hooks/hooks.json). A PreToolUse
# sibling (taa-guard-pretooluse.sh) blocks the same secret shapes before the
# write happens; a Bash-matcher sibling (taa-guard-bash-scan.sh) re-scans
# whatever `git status` shows changed after a Bash tool call, since Bash
# (`cat > file`, heredocs) bypasses the Write/Edit hooks entirely.
# Philosophy (via gbrain): when a check is mechanical, use code, not an LLM.
# Reads hook JSON on stdin, extracts the file path, exits 2 to BLOCK with a reason.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./taa-guard-secrets.sh
source "$SCRIPT_DIR/taa-guard-secrets.sh"

# Three modes: (1) hook mode - JSON on stdin; (2) --files f1 f2... - e.g.
# git pre-commit or the Bash post-scan; (3) --single <file> - one-off check.
if [[ "${1:-}" == "--files" ]]; then
  shift; RC=0
  for f in "$@"; do "$0" --single "$f" || RC=2; done
  exit $RC
fi
if [[ "${1:-}" == "--single" ]]; then
  FILE="$2"
else
  INPUT="$(cat)"
  if command -v jq >/dev/null 2>&1; then
    FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
  else
    echo "TAA-GUARD NOTE: jq not found, using fallback grep/sed parser (may break on escaped paths)" >&2
    FILE="$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//')"
  fi
fi
[[ -z "${FILE:-}" || ! -f "$FILE" ]] && exit 0

fail() { echo "TAA-GUARD BLOCK [$1] $FILE: $2" >&2; exit 2; }

# Files that are pure noise — skip every check, including secrets.
case "$FILE" in
  *.lock|*node_modules*|*.min.*) exit 0 ;;
esac

# .md files and the brain directory skip the *content-quality* checks below
# (lorem-ipsum/color/SQL/TODO don't apply to prose or memory pages), but they
# do NOT skip secrets or PII — CLAUDE.md rule 7 bans secrets in ".taa
# artefactları dahil" (which are all .md), and rule 8 bans PII in the brain.
SKIP_CONTENT_CHECKS=0
case "$FILE" in
  *.md|*/.taa-brain/*) SKIP_CONTENT_CHECKS=1 ;;
esac

# 1) Secrets — hard block everywhere, including .md/.taa artifacts and tests
if ! REASON="$(taa_guard_scan_file "$FILE")"; then
  fail "SECRET" "$REASON"
fi

# 1b) PII — warn-only, brain-directory writes only (never blocks)
case "$FILE" in
  */.taa-brain/*|*/.taa/brain/*|*/brain/entities/*|*/brain/patterns/*|*/brain/decisions/*|*/brain/findings/*|*/brain/lessons/*|*/brain/runs/*)
    taa_guard_check_pii "$FILE" ;;
esac

[[ "$SKIP_CONTENT_CHECKS" == "1" ]] && exit 0

# 2) Lorem ipsum / sample-data — violates the Must-Use-Real-Data rule
grep -niE 'lorem ipsum|dolor sit amet|(sample|dummy|fake)[ _-]?(data|text|user)\b' "$FILE" | head -1 \
  && fail "REAL-DATA" "placeholder content forbidden by DESIGN.md anti-patterns"

# 3) Hard-coded colors in UI code (tokens only) — skip token/theme definition files
case "$FILE" in
  *tokens*|*theme*|*tailwind.config*|*globals.css|*design*) : ;;
  *.tsx|*.jsx|*.ts|*.vue|*.svelte|*.css|*.scss)
    grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' "$FILE" | grep -v 'var(--' | head -1 \
      && fail "DESIGN-TOKEN" "hard-coded color; use design tokens from DESIGN.md" ;;
esac

# 4) Raw SQL string interpolation (C#) — classic injection smell
case "$FILE" in
  *.cs)
    grep -nE '(FromSqlRaw|ExecuteSqlRaw|SqlCommand)\s*\(\s*\$"' "$FILE" | head -1 \
      && fail "SQL-INJECTION" "interpolated raw SQL; use parameters / FromSqlInterpolated" ;;
esac

# 5) Orphan TODOs — every TODO must reference a backlog id
grep -nE '//[[:space:]]*TODO' "$FILE" | grep -vE 'TAA-[0-9]+' | head -1 \
  && fail "ORPHAN-TODO" "TODO without a TAA-### backlog reference"

exit 0
