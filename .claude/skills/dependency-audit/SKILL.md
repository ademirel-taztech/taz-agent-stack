---
name: dependency-audit
description: When the user wants dependencies scanned for known vulnerabilities or license compliance issues. Also use when taa-security runs its dependency/secret scan step, or taa-compliance runs its GPL/AGPL license-leak check. Trigger phrases - "check for vulnerable dependencies," "npm audit," "dotnet list package vulnerable," "license audit," "are we using any GPL packages," "supply chain check." For the actual secret-shape detection (API keys, tokens in code), see scripts/taa-guard-secrets.sh - this skill is about the dependency graph, not string patterns in files.
metadata:
  version: 1.0.0
---

# Dependency Audit

Mechanical dependency-graph scanning — known-vulnerability lookup and
license classification are table lookups, not judgment calls; the judgment
is deciding what to do about what's found.

## Process

1. **Detect the ecosystem(s) in the repo:** `*.csproj`/`*.sln` → .NET,
   `package.json` → npm, `requirements.txt`/`pyproject.toml` → pip, etc. A
   repo can have more than one (e.g. a .NET backend + a Next.js frontend).
2. **Run whichever scanners are available, per ecosystem:**
   - .NET: `dotnet list package --vulnerable --include-transitive`
   - npm: `npm audit --omit=dev` (dev-only vulns are lower priority; still
     note them, don't hide them)
   - Python: `pip-audit` if installed
   - Secrets (repo-wide, not just deps): `gitleaks detect` if installed
   - Static analysis: `semgrep --config auto` if installed
   For each tool that isn't installed: report "could not be scanned —
   `<tool>` not installed" explicitly. **Never claim a scan happened that
   didn't.**
3. **Blend vulnerability results into severity-ranked findings** (same
   Critical/High/Medium/Low/Info scale as `taa-security`'s review.md) — a
   raw tool dump pasted into a report is not a finding, it's noise. Group by
   actual exploitability in this project's context (a vulnerable dev-only
   tool is not the same severity as a vulnerable runtime dependency exposed
   to untrusted input).
4. **License classification** (for `taa-compliance`): for each direct and
   transitive dependency, note its license. Flag any **copyleft license
   (GPL, AGPL, LGPL with static linking, etc.)** in a codebase intended to
   be closed-source as a blocking finding — same severity language as a
   Critical security finding, since it's a genuine legal exposure, not a
   style preference. MIT/Apache-2.0/BSD are the common safe defaults; flag
   anything else for explicit human review rather than silently approving
   or silently blocking an unfamiliar license.
5. **Report** which tools ran, which didn't (and why), and the findings.

## Rules
- No severity without checking actual exploitability context (is this
  dependency on a path that processes untrusted input, or is it a build-time
  tool never shipped to production).
- License findings and security findings are reported separately — this
  mirrors the SEC/COMPLIANCE split (SEC = "is it safe", COMPLIANCE = "is it
  lawful"); don't conflate them into one severity scale.
- Never silently upgrade a dependency to "fix" a finding — report it; `taa-dev`
  or a human decides, and a major-version bump may need `/taa:upgrade`'s
  full breaking-change research rather than a silent patch bump.

## Output
Which scanners ran (and which were skipped, with why), severity-ranked
vulnerability findings, and a separate license-compliance findings section.
