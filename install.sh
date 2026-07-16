#!/usr/bin/env bash
# TAA — Taz Architectural Agent Stack installer
# Usage:
#   ./install.sh /path/to/your/project    # install into a project (recommended, goes into git)
#   ./install.sh --global                 # install agents/commands for ALL your projects (~/.claude)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "--global" ]]; then
  DEST="$HOME/.claude"
  mkdir -p "$DEST/agents" "$DEST/commands/taa"
  cp "$SRC/.claude/agents/"taa-*.md "$DEST/agents/"
  cp "$SRC/.claude/commands/taa/"*.md "$DEST/commands/taa/"
mkdir -p "$HOME/.taa/brain" && cp -rn "$SRC/templates/brain/." "$HOME/.taa/brain/" 2>/dev/null || true
echo "✔ Global TAA Brain initialized at ~/.taa/brain"
  echo "✔ TAA agents & commands installed globally to $DEST"
  echo "  Note: CLAUDE.md and templates are per-project; run './install.sh <project>' inside repos too."
  exit 0
fi

TARGET="${1:?Usage: ./install.sh /path/to/project | --global}"
[[ -d "$TARGET" ]] || { echo "✖ '$TARGET' is not a directory"; exit 1; }

mkdir -p "$TARGET/.claude/agents" "$TARGET/.claude/commands/taa" "$TARGET/templates/taa"
cp "$SRC/.claude/agents/"taa-*.md      "$TARGET/.claude/agents/"
cp "$SRC/.claude/commands/taa/"*.md    "$TARGET/.claude/commands/taa/"
cp "$SRC/templates/taa/"*.md           "$TARGET/templates/taa/"
mkdir -p "$TARGET/templates/brain" "$TARGET/scripts" "$TARGET/hooks"
cp -r "$SRC/templates/brain/." "$TARGET/templates/brain/"
cp "$SRC/scripts/taa-guard.sh" "$TARGET/scripts/" && chmod +x "$TARGET/scripts/taa-guard.sh"
cp "$SRC/hooks/settings.example.json" "$TARGET/hooks/"
cp "$SRC/scripts/install-precommit.sh" "$TARGET/scripts/" && chmod +x "$TARGET/scripts/install-precommit.sh"
[[ -f "$TARGET/.mcp.json" ]] || cp "$SRC/.mcp.json.example" "$TARGET/.mcp.json.example"
mkdir -p "$TARGET/codex" && cp -r "$SRC/codex/." "$TARGET/codex/"
echo "• MCP: copy .mcp.json.example -> .mcp.json and keep only servers you use"
echo "• Codex users: see codex/README.md"
echo "• Hook: merge hooks/settings.example.json into $TARGET/.claude/settings.json to enable TAA Guard"

if [[ -f "$TARGET/CLAUDE.md" ]]; then
  if ! grep -q "TAA pipeline" "$TARGET/CLAUDE.md"; then
    { echo; echo "<!-- ==== TAA (Taz Architectural Agent Stack) ==== -->"; cat "$SRC/CLAUDE.md"; } >> "$TARGET/CLAUDE.md"
    echo "✔ Appended TAA rules to existing CLAUDE.md"
  else
    echo "• CLAUDE.md already contains TAA rules — skipped"
  fi
else
  cp "$SRC/CLAUDE.md" "$TARGET/CLAUDE.md"
  echo "✔ Created CLAUDE.md"
fi

# .taa working directory is generated at runtime; keep artifacts out of accidental noise
grep -qxF ".taa/tests/bin/" "$TARGET/.gitignore" 2>/dev/null || true

echo "✔ TAA installed into $TARGET"
echo "  Next: open the project in Claude Code and run:  /taa:start <your request>"
echo "  (restart your Claude Code session if it was already open — agents load at session start)"
