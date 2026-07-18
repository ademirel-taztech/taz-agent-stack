#!/usr/bin/env bash
# TAA — Taz Architectural Agent Stack installer
# Usage:
#   ./install.sh /path/to/your/project [--with-docs]   # install into a project (recommended, goes into git)
#   ./install.sh --global [--with-docs]                # install agents/commands for ALL your projects (~/.claude)
#   --with-docs: also installs requirements-doc.txt (pip) for the doc-ingest/
#                doc-export skills, and checks for pandoc/soffice/mmdc,
#                printing a one-line install suggestion for anything missing.
#                Without this flag the skills still install (they're just
#                Markdown) but degrade honestly until dependencies exist.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WITH_DOCS=0
ARGS=()
for a in "$@"; do
  if [[ "$a" == "--with-docs" ]]; then
    WITH_DOCS=1
  else
    ARGS+=("$a")
  fi
done

check_docs_binaries() {
  echo "• Checking optional doc-I/O binaries (docx/pdf/pptx/diagram export)..."
  command -v pandoc >/dev/null 2>&1 \
    && echo "  ✔ pandoc found" \
    || echo "  ✖ pandoc missing — install: https://pandoc.org/installing.html"
  command -v soffice >/dev/null 2>&1 \
    && echo "  ✔ soffice (LibreOffice) found" \
    || echo "  ✖ soffice missing — install: https://www.libreoffice.org/download/ (legacy .doc/.xls/.ppt conversion + doc-export render-verification)"
  command -v mmdc >/dev/null 2>&1 \
    && echo "  ✔ mmdc (mermaid-cli) found" \
    || echo "  ✖ mmdc missing — install: npm install -g @mermaid-js/mermaid-cli"
}

install_pip_docs() {
  local req_file="$1"
  if command -v pip3 >/dev/null 2>&1; then
    echo "• Installing Python doc dependencies from $req_file ..."
    pip3 install -r "$req_file" || echo "  ✖ pip install failed — see output above; skills will degrade honestly until fixed"
  else
    echo "  ✖ pip3 not found — can't install $req_file automatically. Install Python 3 + pip, then run: pip3 install -r $req_file"
  fi
  check_docs_binaries
}

if [[ "${ARGS[0]:-}" == "--global" ]]; then
  DEST="$HOME/.claude"
  mkdir -p "$DEST/agents" "$DEST/commands/taa" "$DEST/skills"
  cp "$SRC/.claude/agents/"taa-*.md "$DEST/agents/"
  cp "$SRC/.claude/commands/taa/"*.md "$DEST/commands/taa/"
  cp -R "$SRC/.claude/skills/." "$DEST/skills/"
mkdir -p "$HOME/.taa/brain" && cp -rn "$SRC/templates/brain/." "$HOME/.taa/brain/" 2>/dev/null || true
echo "✔ Global TAA Brain initialized at ~/.taa/brain"
  echo "✔ TAA agents & commands installed globally to $DEST"
  echo "  Note: CLAUDE.md and templates are per-project; run './install.sh <project>' inside repos too."
  if [[ "$WITH_DOCS" == "1" ]]; then
    cp "$SRC/requirements-doc.txt" "$HOME/.taa/requirements-doc.txt"
    install_pip_docs "$HOME/.taa/requirements-doc.txt"
  fi
  exit 0
fi

TARGET="${ARGS[0]:?Usage: ./install.sh /path/to/project [--with-docs] | --global [--with-docs]}"
[[ -d "$TARGET" ]] || { echo "✖ '$TARGET' is not a directory"; exit 1; }

mkdir -p "$TARGET/.claude/agents" "$TARGET/.claude/commands/taa" "$TARGET/.claude/skills" "$TARGET/templates/taa"
cp "$SRC/.claude/agents/"taa-*.md      "$TARGET/.claude/agents/"
cp "$SRC/.claude/commands/taa/"*.md    "$TARGET/.claude/commands/taa/"
cp -R "$SRC/.claude/skills/."          "$TARGET/.claude/skills/"
cp "$SRC/templates/taa/"*.md           "$TARGET/templates/taa/"
mkdir -p "$TARGET/templates/brain" "$TARGET/scripts" "$TARGET/hooks"
cp -r "$SRC/templates/brain/." "$TARGET/templates/brain/"
cp "$SRC/scripts/"taa-guard*.sh "$TARGET/scripts/" && chmod +x "$TARGET/scripts/"taa-guard*.sh
cp "$SRC/hooks/settings.example.json" "$TARGET/hooks/"
cp "$SRC/scripts/install-precommit.sh" "$TARGET/scripts/" && chmod +x "$TARGET/scripts/install-precommit.sh"
[[ -f "$TARGET/.mcp.json" ]] || cp "$SRC/.mcp.json.example" "$TARGET/.mcp.json.example"
mkdir -p "$TARGET/codex" && cp -r "$SRC/codex/." "$TARGET/codex/"
echo "• MCP: copy .mcp.json.example -> .mcp.json and keep only servers you use"
echo "• Codex users: see codex/README.md"
echo "• Hooks: merge hooks/settings.example.json into $TARGET/.claude/settings.json to enable TAA Guard (PreToolUse + PostToolUse)"
echo "• Recommended second line of defense: $TARGET/scripts/install-precommit.sh $TARGET  (git pre-commit backstop)"

cp "$SRC/requirements-doc.txt" "$TARGET/requirements-doc.txt"
if [[ "$WITH_DOCS" == "1" ]]; then
  install_pip_docs "$TARGET/requirements-doc.txt"
else
  echo "• Doc-ingest/doc-export skills installed but their pip/binary dependencies were not. Re-run with --with-docs to install them, or see requirements-doc.txt."
fi

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

# .taa/*.md (state, SPEC, backlog, review, etc.) is meant to be committed as
# the project's audit trail — but generated binary/regenerable output from
# doc-ingest/doc-export/the eval harness is noise, not source of truth.
touch "$TARGET/.gitignore"
for pattern in ".taa/inputs/" ".taa/reports/" "**/evals/results-*"; do
  grep -qxF "$pattern" "$TARGET/.gitignore" 2>/dev/null || echo "$pattern" >> "$TARGET/.gitignore"
done

echo "✔ TAA installed into $TARGET"
echo "  Next: open the project in Claude Code and run:  /taa:start <your request>"
echo "  (restart your Claude Code session if it was already open — agents load at session start)"
