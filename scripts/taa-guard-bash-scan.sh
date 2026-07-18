#!/usr/bin/env bash
# TAA Guard — Bash-bypass closer. Runs as a PostToolUse hook on matcher "Bash".
# DEV's Bash access can write files (`cat > file`, heredocs) that never pass
# through the Write/Edit hooks. Parsing the Bash command/output to guess which
# files were touched is unreliable, so instead this scans whatever git sees as
# changed right after the Bash tool call, via `taa-guard.sh --files`.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Consume+discard the hook JSON on stdin if present; we don't need its
# contents, only that a Bash tool call just completed.
if [[ ! -t 0 ]]; then cat >/dev/null; fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT" || exit 0

CHANGED=()
while IFS= read -r line; do
  CHANGED+=("$line")
done < <(git status --porcelain --untracked-files=all | sed -E 's/^.{3}//')

[[ ${#CHANGED[@]} -eq 0 ]] && exit 0

"$SCRIPT_DIR/taa-guard.sh" --files "${CHANGED[@]}"
