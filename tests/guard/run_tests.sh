#!/usr/bin/env bash
# Pure-bash test harness for scripts/taa-guard.sh and friends (no bats
# dependency — see TAA-IYILESTIRME-GOREVI.md WP-1 item 8). One block case +
# one pass case per rule, plus the two WP-1 acceptance-specific scenarios.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$REPO_ROOT/scripts/taa-guard.sh"
BASH_SCAN="$REPO_ROOT/scripts/taa-guard-bash-scan.sh"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

PASS=0
FAIL=0

# check_exit <description> <relative-path> <content> <expected-exit-code>
check_exit() {
  local desc="$1" rel="$2" content="$3" expected="$4"
  local f="$WORKDIR/$rel"
  mkdir -p "$(dirname "$f")"
  printf '%s\n' "$content" > "$f"
  "$GUARD" --single "$f" >/tmp/taa-guard-test-out.$$ 2>&1
  local actual=$?
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (expected exit $expected, got $actual)"
    sed 's/^/    /' /tmp/taa-guard-test-out.$$
    FAIL=$((FAIL + 1))
  fi
  rm -f /tmp/taa-guard-test-out.$$
}

# --- 1) Secrets ---------------------------------------------------------
check_exit "secret in .md is BLOCKED (was exempt before WP-1)" \
  "notes.md" 'password: "abc123def456ghi789"' 2
check_exit "secret in .cs is BLOCKED" \
  "Service.cs" 'var apiKey = "sk-abcdefghijklmnopqrst1234567890";' 2
check_exit "clean .md passes" \
  "notes.md" '# Notes\n\nJust ordinary text about the project.' 0
check_exit "new gitleaks-style pattern (ghp_ token) is BLOCKED" \
  "config.ts" 'const t = "ghp_abcdefghijklmnopqrstuvwxyz0123456789AB";' 2
check_exit "new gitleaks-style pattern (AIza key) is BLOCKED" \
  "config.ts" 'const key = "AIzaSyD-1234567890abcdefghijklmnopqrstuv";' 2

# --- Acceptance criterion 1: secret in .taa/SPEC.md is blocked ----------
check_exit "ACCEPTANCE: password in .taa/SPEC.md is BLOCKED" \
  ".taa/SPEC.md" 'password: "abc123def456ghi789"' 2

# --- 1b) PII warn (brain dir) — never blocks ----------------------------
f_brain="$WORKDIR/.taa-brain/entities/customer.md"
mkdir -p "$(dirname "$f_brain")"
printf '%s\n' "Contact: someone@example.com" > "$f_brain"
out="$("$GUARD" --single "$f_brain" 2>&1)"
rc=$?
if [[ "$rc" == "0" && "$out" == *"WARN [PII]"* ]]; then
  echo "PASS: PII in brain dir warns but does not block"
  PASS=$((PASS + 1))
else
  echo "FAIL: PII in brain dir warns but does not block (exit=$rc, out=$out)"
  FAIL=$((FAIL + 1))
fi

# --- 2) Lorem ipsum / sample data ---------------------------------------
check_exit "lorem ipsum is BLOCKED" \
  "component.ts" 'const copy = "Lorem ipsum dolor sit amet";' 2
check_exit "real copy passes" \
  "component.ts" 'const copy = "Your invoice is ready for review.";' 0

# --- 3) Hard-coded colors ------------------------------------------------
check_exit "hex color in .tsx is BLOCKED" \
  "Button.tsx" 'const style = { color: "#ffffff" };' 2
check_exit "rgb() color in .css is BLOCKED" \
  "styles.css" '.btn { color: rgb(255, 0, 0); }' 2
check_exit "hsl() color in .ts is BLOCKED (new in WP-1)" \
  "widget-styles.ts" 'const c = "hsl(120, 100%, 50%)";' 2
check_exit "hex color in .vue is BLOCKED (new in WP-1)" \
  "Widget.vue" '<template><div style="color:#abcdef"></div></template>' 2
check_exit "hex color in .svelte is BLOCKED (new in WP-1)" \
  "Widget.svelte" '<div style="color:#abcdef">hi</div>' 2
check_exit "design token var() passes" \
  "Button.tsx" 'const style = { color: "var(--color-primary)" };' 0
check_exit "tailwind.config.js is exempt from color check" \
  "tailwind.config.js" 'module.exports = { colors: { brand: "#ff00ff" } };' 0
check_exit "generated codex/agents/*.toml quoting the lorem-ipsum rule by name isn't blocked" \
  "codex/agents/taa_data.toml" 'instructions = """no lorem ipsum, no foo/bar, no dummy data"""' 0
check_exit "skill evals.json describing 'sample data' as a good recommendation isn't blocked" \
  ".claude/skills/onboarding/evals/evals.json" '{"expected_output": "Should recommend sample data to show what it looks like populated."}' 0

# --- 4) Interpolated SQL (C#) --------------------------------------------
check_exit "interpolated raw SQL is BLOCKED" \
  "UserRepository.cs" 'db.Database.ExecuteSqlRaw($"SELECT * FROM Users WHERE Id = {id}");' 2
check_exit "parameterized SQL passes" \
  "UserRepository.cs" 'db.Database.ExecuteSqlInterpolated($"SELECT * FROM Users WHERE Id = {id}");' 0

# --- 5) Orphan TODOs ------------------------------------------------------
check_exit "TODO without backlog ref is BLOCKED" \
  "Worker.cs" '// TODO clean this up later' 2
check_exit "TODO with TAA-### ref passes" \
  "Worker.cs" '// TODO TAA-042 clean this up later' 0

# --- Acceptance criterion 2: Bash-written .cs file caught by bash-scan ---
GIT_REPO="$WORKDIR/gitrepo"
mkdir -p "$GIT_REPO"
(
  cd "$GIT_REPO" && git init -q && git config user.email test@example.com && git config user.name "TAA Test"
  cat > UserRepository.cs << 'CS_EOF'
public class UserRepository {
    public void Find(string id) {
        db.Database.ExecuteSqlRaw($"SELECT * FROM Users WHERE Id = {id}");
    }
}
CS_EOF
)
( cd "$GIT_REPO" && "$BASH_SCAN" >/tmp/taa-bash-scan-out.$$ 2>&1 )
bash_scan_rc=$?
if [[ "$bash_scan_rc" == "2" ]]; then
  echo "PASS: ACCEPTANCE: heredoc-written .cs with interpolated SQL caught by taa-guard-bash-scan.sh"
  PASS=$((PASS + 1))
else
  echo "FAIL: ACCEPTANCE: bash-scan should have caught interpolated SQL (got exit $bash_scan_rc)"
  sed 's/^/    /' /tmp/taa-bash-scan-out.$$
  FAIL=$((FAIL + 1))
fi
rm -f /tmp/taa-bash-scan-out.$$

# --- jq fallback path (hook-mode JSON parsing without jq) ---------------
FAKE_BIN="$WORKDIR/fake-bin"
mkdir -p "$FAKE_BIN"
for tool in bash grep sed head cat printf mktemp rm dirname; do
  real="$(command -v "$tool")"
  [[ -n "$real" ]] && ln -sf "$real" "$FAKE_BIN/$tool"
done
clean_hook_file="$WORKDIR/hook-clean.ts"
printf 'const copy = "Your invoice is ready.";\n' > "$clean_hook_file"
hook_json="{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$clean_hook_file\"}}"
out="$(PATH="$FAKE_BIN" bash -c "printf '%s' '$hook_json' | \"$GUARD\"" 2>&1)"
rc=$?
if [[ "$rc" == "0" && "$out" == *"jq not found"* ]]; then
  echo "PASS: hook-mode JSON parsing falls back correctly when jq is absent"
  PASS=$((PASS + 1))
else
  echo "FAIL: hook-mode fallback parser (exit=$rc, out=$out)"
  FAIL=$((FAIL + 1))
fi

secret_hook_file="$WORKDIR/hook-secret.ts"
printf 'const t = "ghp_abcdefghijklmnopqrstuvwxyz0123456789AB";\n' > "$secret_hook_file"
hook_json2="{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$secret_hook_file\"}}"
printf '%s' "$hook_json2" | "$GUARD" >/dev/null 2>&1
rc2=$?
if [[ "$rc2" == "2" ]]; then
  echo "PASS: hook-mode JSON parsing (with jq) blocks a real secret"
  PASS=$((PASS + 1))
else
  echo "FAIL: hook-mode (with jq) should have blocked (got exit $rc2)"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "== $PASS passed, $FAIL failed =="
[[ "$FAIL" -eq 0 ]]
