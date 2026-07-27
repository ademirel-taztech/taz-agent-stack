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
OS_NAME="$(uname -s)"

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

install_unix_global_cli() {
  local cli_src="$SRC/templates/bin/taa"
  local cli_dest="/usr/local/bin/taa"

  if [[ -w "/usr/local/bin" ]]; then
    cp "$cli_src" "$cli_dest"
    chmod +x "$cli_dest"
    echo "✔ taa CLI installed at $cli_dest"
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo cp "$cli_src" "$cli_dest"
    sudo chmod +x "$cli_dest"
    echo "✔ taa CLI installed at $cli_dest"
    return
  fi

  echo "✖ Could not write $cli_dest automatically."
  echo "  Install manually:"
  echo "  sudo cp \"$cli_src\" \"$cli_dest\""
  echo "  sudo chmod +x \"$cli_dest\""
}

install_windows_global_cli() {
  local win_dir='C:\tools\taa'
  local win_ps1="$win_dir\\taa.ps1"
  local win_cmd="$win_dir\\taa.cmd"

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "\$dir = '$win_dir'; New-Item -ItemType Directory -Force -Path \$dir | Out-Null"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "[IO.File]::WriteAllText('$win_ps1', [IO.File]::ReadAllText('$(cygpath -w "$SRC/templates/bin/taa.ps1")'))"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "[IO.File]::WriteAllText('$win_cmd', [IO.File]::ReadAllText('$(cygpath -w "$SRC/templates/bin/taa.cmd")'))"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "\$path = [Environment]::GetEnvironmentVariable('Path', 'User'); if (-not ((\$path -split ';') -contains '$win_dir')) { [Environment]::SetEnvironmentVariable('Path', ((@(\$path, '$win_dir') | Where-Object { \$_ -and \$_.Trim() -ne '' }) -join ';'), 'User') }"
    echo "✔ taa CLI installed at $win_dir"
    echo "✔ Added $win_dir to the Windows user PATH"
    echo "  Open a new terminal window before running 'taa'."
    return
  fi

  echo "✖ Could not update Windows PATH automatically."
  echo "  Create $win_dir and copy these files into it:"
  echo "  - templates/bin/taa.ps1 -> C:\\tools\\taa\\taa.ps1"
  echo "  - templates/bin/taa.cmd -> C:\\tools\\taa\\taa.cmd"
  echo "  Then add C:\\tools\\taa to your Windows PATH."
}

if [[ "${ARGS[0]:-}" == "--global" ]]; then
  DEST="$HOME/.claude"
  mkdir -p "$DEST/agents" "$DEST/commands/taa" "$DEST/skills"
  cp "$SRC/.claude/agents/"taa-*.md "$DEST/agents/"
  cp "$SRC/.claude/commands/taa/"*.md "$DEST/commands/taa/"
  cp -R "$SRC/.claude/skills/." "$DEST/skills/"
  mkdir -p "$HOME/.taa/brain" && cp -rn "$SRC/templates/brain/." "$HOME/.taa/brain/" 2>/dev/null || true
  case "$OS_NAME" in
    Linux|Darwin)
      install_unix_global_cli
      ;;
    CYGWIN*|MINGW*|MSYS*)
      install_windows_global_cli
      ;;
    *)
      echo "• Unknown OS '$OS_NAME' — skipping global taa CLI install"
      ;;
  esac
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

mkdir -p "$TARGET/.claude/agents" "$TARGET/.claude/commands/taa" "$TARGET/.claude/skills" "$TARGET/templates/taa" "$TARGET/bin"
cp "$SRC/.claude/agents/"taa-*.md      "$TARGET/.claude/agents/"
cp "$SRC/.claude/commands/taa/"*.md    "$TARGET/.claude/commands/taa/"
cp -R "$SRC/.claude/skills/."          "$TARGET/.claude/skills/"
cp "$SRC/templates/taa/"*.md           "$TARGET/templates/taa/"
cp "$SRC/templates/bin/taa"            "$TARGET/bin/taa" && chmod +x "$TARGET/bin/taa"
cp "$SRC/templates/bin/taa.ps1"        "$TARGET/bin/taa.ps1"
cp "$SRC/templates/bin/taa.cmd"        "$TARGET/bin/taa.cmd"
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
echo "• CLI (macOS/Linux): run $TARGET/bin/taa directly, or install globally to /usr/local/bin/taa"
echo "• CLI (Windows): use $TARGET/bin/taa.ps1 or $TARGET/bin/taa.cmd"

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
