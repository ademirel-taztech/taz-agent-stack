#!/usr/bin/env bash
# TAA Check Backlog — mechanical pre-DREAM / SEC gate: never LLM-judged.
# Verifies (1) every backlog item is Status: DONE, and (2) no code TODO/FIXME
# cites a TAA-### item the backlog claims is DONE (a scoreboard/code mismatch
# — the orphan-TODO guard in taa-guard.sh only checks that a TODO references
# *some* TAA-### id, never whether that id is still open).
#
# Portable on purpose: bash 3.2 (macOS system bash, no associative arrays)
# and BSD awk (no gawk-only 3-arg match()) both work — only POSIX awk
# (match/substr/gsub/sub, 2-arg match + RSTART/RLENGTH) is used.
#
# Usage: taa-check-backlog.sh <run-dir> [repo-root]
#   run-dir    absolute path to .taa/runs/<run-id>/ (must contain backlog.md)
#   repo-root  where to scan for TODO/FIXME comments (default: .)
#
# Exit 0: clean — all DONE, no mismatches. Exit 1: open items and/or
# mismatches found (see stdout). Exit 2: usage/setup error.
set -uo pipefail

RUN_DIR="${1:?Usage: taa-check-backlog.sh <run-dir> [repo-root]}"
REPO_ROOT="${2:-.}"
BACKLOG="$RUN_DIR/backlog.md"

[[ -f "$BACKLOG" ]] || { echo "TAA-CHECK-BACKLOG: no backlog.md at $BACKLOG" >&2; exit 2; }

STATUS_FILE="$(mktemp)"
LATEST_FILE="$(mktemp)"
OPEN_FILE="$(mktemp)"
trap 'rm -f "$STATUS_FILE" "$LATEST_FILE" "$OPEN_FILE"' EXIT

# id<TAB>status pairs, one per line, in file order.
awk '
  {
    line = $0
    if (match(line, /\*\*TAA-[0-9]+\*\*/)) {
      idtok = substr(line, RSTART, RLENGTH)
      gsub(/\*/, "", idtok)
      id = idtok
    }
    if (id != "" && match(line, /Status:[ \t]*[A-Z_]+/)) {
      stok = substr(line, RSTART, RLENGTH)
      sub(/Status:[ \t]*/, "", stok)
      print id "\t" stok
    }
  }
' "$BACKLOG" > "$STATUS_FILE"

if [[ ! -s "$STATUS_FILE" ]]; then
  echo "TAA-CHECK-BACKLOG: no 'Status:' fields found in $BACKLOG — is it using the current backlog.template.md format?" >&2
  exit 2
fi

# Last Status: line per id wins (a task edited more than once in the file).
awk -F'\t' '{a[$1]=$2} END{for (k in a) print k"\t"a[k]}' "$STATUS_FILE" | sort > "$LATEST_FILE"

TOTAL=$(wc -l < "$LATEST_FILE" | tr -d ' ')
awk -F'\t' '$2 != "DONE" { print }' "$LATEST_FILE" > "$OPEN_FILE"
OPEN_COUNT=$(wc -l < "$OPEN_FILE" | tr -d ' ')

echo "=== Backlog status ($TOTAL items) ==="
if [[ "$OPEN_COUNT" -eq 0 ]]; then
  echo "OK — all items DONE"
else
  echo "OPEN — $OPEN_COUNT item(s) not DONE:"
  sed 's/^/  /' "$OPEN_FILE"
fi

echo
echo "=== Code TODO/FIXME referencing a DONE backlog item (scoreboard mismatch) ==="
MISMATCH=0
while IFS=: read -r file lineno content; do
  id=$(grep -oE 'TAA-[0-9]+' <<<"$content" | head -1)
  [[ -z "$id" ]] && continue
  status=$(awk -F'\t' -v id="$id" '$1 == id { print $2 }' "$LATEST_FILE")
  if [[ "$status" == "DONE" ]]; then
    echo "MISMATCH — $file:$lineno references $id (backlog says DONE): $content"
    MISMATCH=1
  fi
done < <(grep -rnE '(TODO|FIXME).*TAA-[0-9]+' \
            --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='.taa' \
            "$REPO_ROOT" 2>/dev/null)

[[ $MISMATCH -eq 0 ]] && echo "OK — none found"

if [[ "$OPEN_COUNT" -gt 0 || $MISMATCH -eq 1 ]]; then
  exit 1
fi
exit 0
