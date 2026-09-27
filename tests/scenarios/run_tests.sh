#!/usr/bin/env bash
# Pure-bash test harness for scripts/taa-scenarios.py (same style as
# tests/guard/run_tests.sh). The shipped example set
# (templates/taa/test-scenarios/example/) must validate and render cleanly;
# each mutation below breaks exactly one rule and must be rejected (exit 1).
# Broken fixtures are generated at runtime into a temp dir on purpose, so no
# credential-shaped or literal-host test data is ever committed.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOL="$REPO_ROOT/scripts/taa-scenarios.py"
EXAMPLE="$REPO_ROOT/templates/taa/test-scenarios/example"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

PASS=0
FAIL=0

fresh_copy() {
  rm -rf "$WORKDIR/set"
  cp -R "$EXAMPLE" "$WORKDIR/set"
}

# mutate <relative-json-file> <python statement operating on `d`>
mutate() {
  python3 - "$WORKDIR/set/$1" "$2" << 'PY'
import json, sys
path, stmt = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as fh:
    d = json.load(fh)
exec(stmt)
with open(path, "w", encoding="utf-8") as fh:
    json.dump(d, fh, ensure_ascii=False, indent=2)
PY
}

# expect <description> <expected-exit> <expected-substring-or-empty>
expect() {
  local desc="$1" expected="$2" needle="$3" out rc
  out="$(python3 "$TOOL" validate "$WORKDIR/set" 2>&1)"
  rc=$?
  if [[ "$rc" == "$expected" && ( -z "$needle" || "$out" == *"$needle"* ) ]]; then
    echo "PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (expected exit $expected${needle:+ with '$needle'}, got $rc)"
    printf '%s\n' "$out" | sed 's/^/    /'
    FAIL=$((FAIL + 1))
  fi
}

# --- the shipped example is valid and renders ---------------------------
fresh_copy
expect "shipped example set validates" 0 "5 scenario(s) valid"

out="$(python3 "$TOOL" render "$WORKDIR/set" 2>&1)"
rc=$?
if [[ "$rc" == "0" ]] && grep -q "## TC-NEG-001" "$WORKDIR/set/README.md" \
   && grep -q "aksiyonlardan ÖNCE sorun" "$WORKDIR/set/README.md"; then
  echo "PASS: render writes the human checklist README.md"
  PASS=$((PASS + 1))
else
  echo "FAIL: render (exit $rc)"
  printf '%s\n' "$out" | sed 's/^/    /'
  FAIL=$((FAIL + 1))
fi

# --- each mutation must be rejected -------------------------------------
fresh_copy; mutate scenarios/TC-SMOKE-001.json 'd["target_url"] = "http://localhost:3001/login"'
expect "literal host in target_url is rejected" 1 "target_url"

fresh_copy; mutate scenarios/TC-NEG-001.json 'd["steps"][1]["expected"]["answer"] = "formu_gonder"'
expect "choice answer outside options is rejected" 1 "is not one of options"

fresh_copy; mutate scenarios/TC-NEG-001.json 'd["steps"][2]["automation"]["assertions"] = []'
expect "noul step without any deterministic assertion is rejected" 1 "must be verifiable headless"

fresh_copy; mutate scenarios/TC-NEG-001.json 'd["steps"][3]["expected"] = {"gte": 7}'
expect "score expectation outside its scale is rejected" 1 "outside scale"

fresh_copy; mutate scenarios/TC-UI-001.json 'd["layer"] = "E2E"'
expect "test_id layer segment != layer is rejected" 1 "layer segment"

fresh_copy; mutate scenarios/TC-API-001.json 'd["level"] = "normal"'
expect "API layer below hard level is rejected" 1 "belongs to level hard"

fresh_copy; mutate scenarios/TC-UI-001.json 'd["test_data"]["password"] = "Gizli!Sifre2026"'
expect "literal credential in test_data is rejected" 1 "literal credential"

fresh_copy; mutate scenarios/TC-NEG-001.json 'd["steps"][1]["automation"]["actions"][1]["value"] = "{{test_data.yok}}"'
expect "reference to an undefined test_data key is rejected" 1 "no such key in test_data"

fresh_copy; mutate scenarios/TC-UI-001.json 'd["test_data"]["email"] = "{{env.QA_ADMIN_EMAIL}}"'
expect "env var not declared in index.json is rejected" 1 "missing QA_ADMIN_EMAIL"

fresh_copy; mutate scenarios/TC-SMOKE-001.json 'd["steps"][0]["automation"]["assertions"][0]["locator"] = {"by": "css", "value": "form > h1"}'
expect "CSS locator is rejected (QA rule 5)" 1 "is not one of"

fresh_copy; mutate scenarios/TC-SMOKE-001.json 'd["steps"][1]["step_id"] = 3'
expect "non-sequential step_id is rejected" 1 "step_id must run"

fresh_copy; mutate index.json 'd["scenarios"].reverse()'
expect "index execution order (level, priority) is enforced" 1 "breaks execution order"

fresh_copy; mutate index.json 'd["scenarios"].pop(); d["pages"][0]["scenarios"].pop()'
expect "scenario file missing from index.json is rejected" 1 "orphan file"

fresh_copy; mutate scenarios/TC-NEG-001.json 'd["steps"][0]["automation"]["actions"][0] = {"action": "wait_for", "locator": {"by": "label", "value": "E-posta"}}'
expect "wait_for without a state (fixed-sleep smell) is rejected" 1 "wait_for needs state"

fresh_copy; mutate scenarios/TC-UI-001.json 'd["test_name"] = "asdf qwerty ile giriş"'
expect "placeholder text is rejected" 1 "placeholder text"

fresh_copy
mkdir -p "$WORKDIR/set/results"
cat > "$WORKDIR/set/results/20260927-1000-human.json" << 'JSON'
{"schema_version": "1.0", "run_id": "x", "executed_at": "2026-09-27T10:00:00Z", "executor": "human",
 "environment": {"base_url": "{{BASE_URL}}", "kind": "production"}, "level": "normal",
 "results": [], "summary": {"total": 0, "pass": 0, "fail": 0}}
JSON
expect "result file targeting production is rejected" 1 "production"

echo ""
echo "== $PASS passed, $FAIL failed =="
[[ "$FAIL" -eq 0 ]]
