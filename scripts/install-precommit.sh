#!/usr/bin/env bash
# Installs taa-guard as a git pre-commit hook (engine-agnostic: works with Claude Code, Codex, or bare git).
set -euo pipefail
REPO="${1:-.}"
HOOK="$REPO/.git/hooks/pre-commit"
[[ -d "$REPO/.git" ]] || { echo "✖ $REPO is not a git repo"; exit 1; }
cat > "$HOOK" << 'HOOKEOF'
#!/usr/bin/env bash
FILES=$(git diff --cached --name-only --diff-filter=ACM)
[[ -z "$FILES" ]] && exit 0
bash "$(git rev-parse --show-toplevel)/scripts/taa-guard.sh" --files $FILES
HOOKEOF
chmod +x "$HOOK"
echo "✔ TAA Guard installed as pre-commit hook in $REPO"
