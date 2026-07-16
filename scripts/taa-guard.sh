#!/usr/bin/env bash
# TAA Guard — deterministic gate, runs as a Claude Code PostToolUse hook on Write|Edit.
# Philosophy (via gbrain): when a check is mechanical, use code, not an LLM.
# Reads hook JSON on stdin, extracts the file path, exits 2 to BLOCK with a reason.
set -uo pipefail

# Two modes: (1) hook mode - JSON on stdin; (2) --files f1 f2... - e.g. git pre-commit
if [[ "${1:-}" == "--files" ]]; then
  shift; RC=0
  for f in "$@"; do "$0" --single "$f" || RC=2; done
  exit $RC
fi
if [[ "${1:-}" == "--single" ]]; then
  FILE="$2"
else
  INPUT="$(cat)"
  FILE="$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//')"
fi
[[ -z "${FILE:-}" || ! -f "$FILE" ]] && exit 0

fail() { echo "TAA-GUARD BLOCK [$1] $FILE: $2" >&2; exit 2; }

case "$FILE" in
  *.md|*.lock|*node_modules*|*.min.*|*/.taa-brain/*) exit 0 ;;
esac

# 1) Secrets — hard block everywhere, including tests and .taa artifacts
grep -nEI '(api[_-]?key|secret|password|passwd|token)[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9+/_\-]{16,}' "$FILE" \
  | grep -vEi '(placeholder|example|your[_-]|<|\$\{|\{\{|env|config)' | head -1 \
  && fail "SECRET" "possible hard-coded credential (use configuration/user-secrets)"
grep -nE 'AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}' "$FILE" | head -1 \
  && fail "SECRET" "credential-shaped string detected"

# 2) Lorem ipsum / sample-data — violates the Must-Use-Real-Data rule
grep -niE 'lorem ipsum|dolor sit amet|(sample|dummy|fake)[ _-]?(data|text|user)\b' "$FILE" | head -1 \
  && fail "REAL-DATA" "placeholder content forbidden by DESIGN.md anti-patterns"

# 3) Hard-coded colors in UI code (tokens only) — skip token/theme definition files
case "$FILE" in
  *tokens*|*theme*|*tailwind.config*|*globals.css|*design*) : ;;
  *.tsx|*.jsx|*.css|*.scss)
    grep -nE '#[0-9a-fA-F]{3,8}\b|rgb\(' "$FILE" | grep -v 'var(--' | head -1 \
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
