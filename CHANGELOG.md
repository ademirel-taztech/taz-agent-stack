# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0] — Unreleased

Findings from an external audit (`TAA-IYILESTIRME-GOREVI.md`), WP-1 and WP-2.

### Fixed

- **Guard secret/PII scope.** `scripts/taa-guard.sh` used to exempt every
  `.md` file and anything under `.taa-brain/` from the secret checks —
  contradicting CLAUDE.md's own rules that ".taa artefacts" (all `.md`) may
  never contain secrets and the brain may never contain PII. Secrets are now
  checked everywhere; only the content-quality checks (lorem-ipsum, colors,
  SQL, orphan TODOs) remain skipped for `.md`/brain paths.
- **Bash bypass.** `taa-dev`'s `Bash` tool access could write files
  (`cat > file`, heredocs) that never passed through the Write/Edit guard.
  A new `PostToolUse` hook on matcher `Bash` (`scripts/taa-guard-bash-scan.sh`)
  re-scans whatever `git status` reports as changed right after any Bash call.
- **JSON parsing.** Hook-mode `file_path` extraction now uses `jq` when
  available (falls back to the previous grep/sed parser, with an honest
  stderr note, when it isn't).
- **Stale duplicate source tree.** Root `agents/` and `commands/` directories
  were an unreferenced, drifted mirror of `.claude/agents/` and
  `.claude/commands/taa/` (neither `install.sh`, `scripts/convert-to-codex.py`,
  nor `.claude-plugin/plugin.json` read them). Deleted. `.claude/` is now the
  single documented source of truth.
- Regenerated `codex/agents/*.toml` from `.claude/agents/` — `taa_brain.toml`
  and `taa_po.toml` were stale (missing the `${CLAUDE_PLUGIN_ROOT}` fallback
  text already present in `.claude/agents/`).

### Added

- `scripts/taa-guard-pretooluse.sh` — a `PreToolUse` hook on
  `Write|Edit|MultiEdit` that denies secret-shaped content *before* it's
  written, not just after.
- `scripts/taa-guard-secrets.sh` — secret/PII detection shared by the pre-
  and post-tool-use guards and the Bash re-scan, so patterns live in one place.
  Uses `gitleaks` when installed; otherwise a regex bank extended with
  `ghp_`, `xox[baprs]-`, JWT (`eyJ...`), and `AIza...` (Google API key) shapes.
- Warn-only PII detection (email / TR phone / TR-kimlik-shaped 11-digit
  numbers) for writes under a brain directory — never blocks, only warns.
- `tests/guard/run_tests.sh` — a pure-bash test harness (no `bats` dependency)
  covering one block case and one pass case per guard rule, plus the two
  WP-1 acceptance scenarios (secret in `.taa/SPEC.md`; Bash-written interpolated
  SQL caught by the post-Bash scan).
- `CONTRIBUTING.md`.
- Hard-coded color check now also flags `hsl(`/`hsla(` and covers
  `.ts`/`.vue`/`.svelte` files (previously `.tsx`/`.jsx`/`.css`/`.scss` only).
- `PostToolUse`/`PreToolUse` matchers widened from `Write|Edit` to include
  `MultiEdit` (and `NotebookEdit` for `PostToolUse`).

### Changed

- `install-precommit.sh` repositioned in the README as a **recommended**
  second line of defense (not "optional") — it's the only enforcement path
  for Codex (no native hook mechanism) and a backstop for manual `git commit`.
- `<you>` placeholders replaced with `ademirel-taztech/taz-agent-stack`.
- Plugin version bumped to `2.1.0`.

## [2.0.0] — prior

Baseline before this audit pass: 10-role adversarial pipeline, brain memory
system, deterministic guard hook, Claude Code + Codex dual support, 46
bundled marketing skills.
