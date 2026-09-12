# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

**Marketing track now auto-pairs social copy with a visual:**
- `marketing.md` § 1a (new): after `social` writes Instagram/LinkedIn copy,
  the orchestrator automatically invokes the `design` skill (Claude Design
  canvas) to produce a brand-consistent visual — grounded in `DESIGN.md`'s
  palette/typography when available, no API key or extra setup required.
  Mandatory for Instagram and LinkedIn carousels/quote graphics; asked once
  for plain-text LinkedIn/Twitter posts. Honest limit stated: it produces
  typography-driven brand graphics, not photorealistic/lifestyle images —
  those still route to the (unwired, API-key-requiring) `image` skill on
  explicit request only.
- `.taa/marketing/` draft files gain a `## Görsel` section (Artifact URL +
  visual brief) when a visual was produced.

**Backlog as executable prompts + a mechanical pre-DREAM completion gate:**
- `backlog.template.md`: every task now carries a `Status`
  (`TODO|IN_PROGRESS|BLOCKED: reason|DONE`) and a `Prompt` — one imperative,
  self-contained instruction PO writes so DEV (or another subagent) can
  execute the task without re-reading the whole run.
- `taa-po` must fill both fields; `taa-dev` may only set `Status: DONE` once
  the DoD is actually met and tests pass — a stalled task is `BLOCKED:
  <reason>`, never silently marked done.
- `scripts/taa-check-backlog.sh` (new, portable — bash 3.2/BSD awk safe): a
  deterministic pre-DREAM gate that fails the run if any backlog item isn't
  `DONE`, or if a code `TODO`/`FIXME` still cites a `TAA-###` id the backlog
  claims is `DONE`. Wired into `start.md` § Completion (blocks DREAM/archive
  until clean or the user explicitly descopes) and into `taa-security`'s
  audit checklist (same check, reported as a finding).
- `state.template.md`: stage board gained a `Started at` column alongside
  `Approved at`, for spotting which stage is eating the run's time budget.

**Pipeline speed guidance:**
- `start.md` § 0.4: `Chief: light` and skipping PM are now actively
  suggested (not just available) for small-to-medium, internal-facing work —
  these plus the existing opt-in DES+ARCH parallelization (§ 1a) are the
  biggest no-risk time savers for a mid-size run. No gate behavior changed:
  every stage still stops and asks regardless of the Chief flag.

**QA-kit test-engineering track (standalone, outside the pipeline gates):**
- 4 skills: `test-discovery` → `test-plan` (approval) → `test-automate` → `test-run`.
- 5 subagents: `test-strategist` (risk-based strategy, no code), `e2e-engineer`
  (Playwright UI/E2E/smoke/a11y), `api-test-engineer` (API/contract/authz),
  `perf-engineer` (k6 load/stress/soak + Lighthouse), `test-triager` (root-causes
  a red test: app bug vs test bug vs flaky vs env).
- `templates/qa-kit/` — scenario/test-plan templates plus Playwright/k6/
  docker-compose/GitHub Actions examples.
- `CLAUDE.md` § QA / Test Kuralları — invariant test rules (no prod runs, no
  `waitForTimeout`/sleep, no threshold-less load tests, no loosening assertions
  to force green) shipped to every project via `install.sh` / the plugin.

**Code comprehension track:**
- `taa-explainer` agent (16th role) — explains how existing code works: traces one
  execution path end to end across layers (entrypoint → application → domain →
  infrastructure → external boundary) with a `file:line` citation at every hop,
  resolves the dynamic seams a grep stops at (DI registrations, mediator handlers +
  pipeline behavior order, middleware/decorators, queue hand-offs, config-driven
  dispatch), and closes with a mandatory honesty ledger of what could not be
  established from code. Read-only on source; its only write is its own report.
- `/taa:explain <target>` — the command. Modes: `trace` (default), `map:` (subsystem
  components + dependency direction), `impact:` (blast radius of a change). No gate,
  no state consumption; findings route to `/taa:review`, `/taa:fix` or `/taa:refactor`
  instead of being fixed in place. Reports land in `.taa/explain/<slug>.md`.
- Codex parity: `codex/agents/taa_explainer.toml` (regenerated via
  `scripts/convert-to-codex.py`), plus the command entry in `codex/AGENTS.md`.

## [2.1.0] — 2026-07-18

Findings from an external audit (`TAA-IYILESTIRME-GOREVI.md`), all 8 work
packages (WP-1 through WP-8), plus a follow-up guard fix found via dogfooding.

### Added

**Doc I/O (WP-3):**
- `doc-ingest` skill — reads xls(x)/doc(x)/pdf/ppt(x)/vsd(x)/csv into
  `.taa/inputs/<slug>.md` with a frontmatter evidence contract (source,
  sha256, tool, page/sheet/slide count, `lossy`/`lossy_notes`). Visio (`.vsdx`)
  converts to a Mermaid flowchart via `scripts/vsdx_to_mermaid.py`, listing
  unmappable shapes rather than dropping them.
- `doc-export` skill — compiles `.taa/` Markdown to docx/pdf (pandoc), xlsx
  (`scripts/md_tables_to_xlsx.py`), pptx (`scripts/md_deck_to_pptx.py`).
  Visio *writing* is explicitly unsupported (draw.io XML offered instead).
  `scripts/ensure_templates.py` generates `reference.docx`/`deck-theme.pptx`
  from a project's `DESIGN.md` palette on first use.
- `/taa:ingest`, `/taa:report` commands; `requirements-doc.txt` +
  `install.sh --with-docs` (pip install + pandoc/soffice/mmdc presence check).

**Five new roles (WP-4):**
- `taa-ops` — Stage 7 RELEASE (new pipeline stage, between DEV and SEC):
  Dockerfile/CI, config matrix, migration apply+rollback plan, feature-flag
  strategy, runbook.
- `taa-data` — mandatory migration reviewer (reversibility/lock
  duration/index impact/data-loss risk) + seed data + analytics event schema.
- `taa-compliance` — KVKK/GDPR data inventory + dependency-license audit,
  reporting alongside SEC at the same gate ("is it safe" vs "is it lawful").
- `taa-support` — troubleshooting KB / FAQ / ticket-triage template.
- `taa-l10n` — i18n audit, TR/EN terminology glossary, locale correctness.
- (Deferred, noted in README roadmap only: UX-researcher, FinOps, independent
  accessibility-auditor.)

**Six new commands (WP-5):** `/taa:fix`, `/taa:release`, `/taa:incident`,
`/taa:refactor` (with a new `.taa/invariants.md` contract), `/taa:upgrade`,
`/taa:onboard`.

**Pipeline quality depth (WP-6):**
- Mandatory STRIDE Threat Model section in `architecture.template.md`,
  cross-checked by `taa-security`.
- Dependency/secret scan blended into SEC's findings (`dotnet list package
  --vulnerable`, `npm audit`, `gitleaks`, `semgrep` — honest "could not be
  scanned" when a tool is absent).
- `templates/taa/loadtest.template.js` (k6) + `metrics.template.md`'s
  Tool/Command columns, so QA-B proves P95 with real command output.
- Optional parallel DES+ARCH after the PO gate (`start.md` §1a); `Run ID` +
  git-worktree-per-run guidance for concurrent pipelines.

**Engineering skills, eval harness, CI (WP-7):**
- Six skills: `threat-modeling`, `db-migration-review`, `load-testing`,
  `dependency-audit`, `observability-instrumentation`, `api-design-review`.
- `scripts/run-skill-evals.py` — LLM-judge + keyword-heuristic hybrid scoring
  against a skill's `evals/evals.json`; degrades honestly without
  `ANTHROPIC_API_KEY`.
- `.github/workflows/ci.yml` — guard test suite, shellcheck, convert-to-codex
  drift check, doc-ingest/doc-export smoke test (+ honest-degrade check),
  markdown lint (`.markdownlint-cli2.jsonc`).

### Fixed

**Guard contradictions (WP-1), verified via repeated full-repo dogfooding:**
- Secrets are no longer exempted for `.md`/`.taa-brain` paths (was
  contradicting CLAUDE.md rules 7–8); only content-quality checks (lorem-ipsum,
  colors, SQL, orphan TODOs) remain skipped there.
- New `PreToolUse` deny hook (`taa-guard-pretooluse.sh`) blocks secret shapes
  before the write; new `PostToolUse`/`Bash` hook (`taa-guard-bash-scan.sh`)
  closes the Bash-write bypass by re-scanning files `git status` shows changed.
- `scripts/taa-guard-secrets.sh` centralizes secret/PII patterns (gitleaks
  when installed, extended regex bank otherwise); warn-only PII check for
  brain-directory writes.
- Widened color check (`hsl`/`hsla`, `.ts`/`.vue`/`.svelte`) and hook matchers
  (`Write|Edit` → `+MultiEdit|NotebookEdit`).
- Three self-referential false positives found via dogfooding, all fixed:
  generated `codex/agents/*.toml` and the guard's own script comments tripping
  on rule-describing prose, and two pre-existing marketing-skill
  `evals/evals.json` files describing "sample data" as a *good* recommendation.
  `tests/guard/run_tests.sh`'s own fixtures are now exempt by design (their
  job is to contain violation-shaped strings).
- `tests/guard/run_tests.sh` — pure-bash suite (no `bats` dependency), 25
  cases, all green; full repo (229 tracked files) scans clean.

**Single source of truth (WP-2):**
- Deleted the stale, unreferenced root `agents/`/`commands/` mirror.
- Regenerated `codex/agents/*.toml` from `.claude/agents/` (verified
  idempotent) — several were stale, missing edits already merged upstream.
- Fixed `install.sh`'s dead `.gitignore`-append line (WP-8) — it grepped a
  target's `.gitignore` but never wrote to it; now actually appends
  `.taa/inputs/`, `.taa/reports/`, `**/evals/results-*` (idempotently). Also
  fixed `install.sh` only copying `taa-guard.sh` instead of all 4 guard
  scripts (gap introduced by WP-1's script split).

### Changed

- `install-precommit.sh` repositioned in the README as a **recommended**
  second line of defense, not "optional."
- `<you>` placeholders replaced with `ademirel-taztech/taz-agent-stack`.
- Role count 10 → 15; pipeline stages renumbered (OPS inserted as Stage 7;
  SEC/QA-B/DREAM shift to 8/9/10).
- README comparison table gained "Ofis dosyası I/O" and "Release hattı" rows;
  `docs/MCP.md` cross-references `doc-ingest`'s identical external-content-is-data
  rule; `codex/README.md`/`codex/AGENTS.md` honestly document that Codex has
  no skill mechanism (`/taa:marketing`, `/taa:ingest`, `/taa:report` don't
  exist there, though the underlying scripts still run if invoked directly).
- `CONTRIBUTING.md` added; plugin version bumped to `2.1.0`.

## [2.0.0] — prior

Baseline before this audit pass: 10-role adversarial pipeline, brain memory
system, deterministic guard hook, Claude Code + Codex dual support, 46
bundled marketing skills.
