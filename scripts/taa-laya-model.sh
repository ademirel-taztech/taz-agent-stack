#!/usr/bin/env bash
# Install the Laya multilingual ONNX model used by the scenario runner's judge
# (runner/laya-judge) and verify it against the committed SHA256SUMS.
#
#   scripts/taa-laya-model.sh [--from DIR] [--to DIR]
#
#   --from  a directory holding model.onnx, onnx_config.json, rl_agent_config.json
#           and tokenizer/ (default: $LAYA_SOURCE_DIR, else
#           ~/Projects/Taz.SaaS/Taz.SaaS.Backend/models/guardrail/v4)
#   --to    install target (default: models/laya/v4 in this checkout)
#
# The binaries (650 MB model.onnx, 34 MB tokenizer.json) are gitignored; only
# the configs, README and SHA256SUMS are committed. `install.sh --with-laya`
# calls this with --to ~/.taa/models/laya/v4 so every project shares one copy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUMS="$REPO_ROOT/models/laya/v4/SHA256SUMS"
FROM="${LAYA_SOURCE_DIR:-$HOME/Projects/Taz.SaaS/Taz.SaaS.Backend/models/guardrail/v4}"
TO="$REPO_ROOT/models/laya/v4"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="${2:?--from needs a directory}"; shift 2 ;;
    --to) TO="${2:?--to needs a directory}"; shift 2 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "✖ unknown argument: $1" >&2; exit 2 ;;
  esac
done

sha256() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$@"; else sha256sum "$@"; fi
}

verify() {
  local dir="$1"
  [[ -f "$SUMS" ]] || { echo "✖ $SUMS missing — cannot verify" >&2; return 1; }
  (cd "$dir" && sha256 -c "$SUMS" >/dev/null 2>&1)
}

if [[ -f "$TO/model.onnx" ]] && verify "$TO"; then
  echo "✔ Laya model already installed and verified at $TO"
  exit 0
fi

for f in model.onnx onnx_config.json rl_agent_config.json tokenizer/tokenizer.json tokenizer/tokenizer_config.json; do
  [[ -f "$FROM/$f" ]] || { echo "✖ $FROM/$f not found — pass --from <dir> or set LAYA_SOURCE_DIR" >&2; exit 1; }
done
if ! verify "$FROM"; then
  echo "✖ $FROM does not match $SUMS (different or corrupted model) — refusing to install" >&2
  exit 1
fi

mkdir -p "$TO/tokenizer"
for f in model.onnx onnx_config.json rl_agent_config.json tokenizer/tokenizer.json tokenizer/tokenizer_config.json; do
  [[ "$(cd "$FROM" && pwd)/$f" -ef "$TO/$f" ]] || cp "$FROM/$f" "$TO/$f"
done
[[ -f "$FROM/README.md" && ! -f "$TO/README.md" ]] && cp "$FROM/README.md" "$TO/README.md"
[[ -f "$TO/SHA256SUMS" ]] || cp "$SUMS" "$TO/SHA256SUMS"

verify "$TO" || { echo "✖ copy at $TO failed verification" >&2; exit 1; }
echo "✔ Laya model installed and verified at $TO"
