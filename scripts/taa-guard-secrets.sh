#!/usr/bin/env bash
# TAA Guard — shared secret/PII detection, sourced by taa-guard.sh,
# taa-guard-pretooluse.sh and taa-guard-bash-scan.sh so the patterns live in
# exactly one place.
#
# taa_guard_scan_file <path>   -> prints a reason and returns 1 if a secret is
#                                  found in the file on disk, 0 if clean.
# taa_guard_scan_content <str> -> same check against an in-memory string (used
#                                  by the PreToolUse hook, before the write
#                                  happens).
# taa_guard_check_pii <path>   -> warn-only (stderr), never blocks; used for
#                                  brain-directory writes.

taa_guard_scan_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0

  if command -v gitleaks >/dev/null 2>&1; then
    local out
    if ! out="$(gitleaks detect --no-git --source "$f" --no-banner --exit-code 1 2>&1)"; then
      printf '%s\n' "gitleaks: $(printf '%s' "$out" | head -1)"
      return 1
    fi
    return 0
  fi

  # Fallback regex bank — used only when gitleaks isn't installed.
  local hit
  hit="$(grep -nEI '(api[_-]?key|secret|password|passwd|token)[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9+/_\-]{16,}' "$f" \
    | grep -vEi '(placeholder|example|your[_-]|<|\$\{|\{\{|env|config)' | head -1)"
  if [[ -n "$hit" ]]; then
    printf '%s\n' "possible hard-coded credential (use configuration/user-secrets): $hit"
    return 1
  fi

  hit="$(grep -nE 'AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{35}' "$f" | head -1)"
  if [[ -n "$hit" ]]; then
    printf '%s\n' "credential-shaped string detected: $hit"
    return 1
  fi

  return 0
}

taa_guard_scan_content() {
  local content="$1"
  local tmp reason rc
  tmp="$(mktemp)"
  printf '%s' "$content" > "$tmp"
  reason="$(taa_guard_scan_file "$tmp")"
  rc=$?
  rm -f "$tmp"
  [[ $rc -ne 0 ]] && printf '%s\n' "$reason"
  return $rc
}

taa_guard_check_pii() {
  # Warn-only — never blocks. CLAUDE.md rule 8: "never write secrets/PII into
  # the brain." Secrets are handled (and blocked) by taa_guard_scan_file above;
  # this is a soft heads-up for the PII shapes that aren't classic secrets.
  local f="$1"
  grep -nEo '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' "$f" 2>/dev/null | head -3 \
    | while IFS= read -r line; do
        echo "TAA-GUARD WARN [PII] $f: possible email address in brain content: $line" >&2
      done
  grep -nE '(^|[^0-9])0?5[0-9]{9}([^0-9]|$)|\+90[0-9]{10}' "$f" 2>/dev/null | head -3 \
    | while IFS= read -r line; do
        echo "TAA-GUARD WARN [PII] $f: possible TR phone number in brain content: $line" >&2
      done
  grep -nE '(^|[^0-9])[0-9]{11}([^0-9]|$)' "$f" 2>/dev/null | head -3 \
    | while IFS= read -r line; do
        echo "TAA-GUARD WARN [PII] $f: possible TR kimlik-shaped (11-digit) number in brain content: $line" >&2
      done
  return 0
}
