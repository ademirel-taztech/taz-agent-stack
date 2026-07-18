# Contributing to TAA

## Single source of truth

`.claude/` is the only place agents, commands, and skills live:
`.claude/agents/*.md`, `.claude/commands/taa/*.md`, `.claude/skills/*/`.
`install.sh`, `scripts/convert-to-codex.py`, and `.claude-plugin/plugin.json`
all read from there. Never reintroduce a root-level `agents/`/`commands/`
mirror — that drifted silently before and was removed for exactly that reason.

## Adding a new agent (role)

1. Create `.claude/agents/taa-<role>.md` imitating an existing file's
   frontmatter **exactly**: `name`, `description`, `tools`, `model` (in that
   order). `description` should include a "Use PROACTIVELY when..." trigger
   clause. `model` is `inherit` unless you have a specific reason to pin one.
2. **Least privilege**: list only the tools the role actually needs in
   `tools:` — an omitted `tools:` field inherits everything, which is why
   every TAA agent declares its list explicitly. Read-only/advisory roles
   (e.g. `taa-chief`) get `Read, Grep, Glob` and nothing else.
3. Add a row to `.claude/commands/taa/start.md`'s stage table if the role
   participates in the main pipeline.
4. Add the file path to the `agents` array in `.claude-plugin/plugin.json`.
5. Run `python3 scripts/convert-to-codex.py` to regenerate the Codex TOML
   equivalent, and commit the diff — don't hand-edit `codex/agents/*.toml`.
6. Update the README's role list and comparison table if relevant.

## Adding a new command

1. Create `.claude/commands/taa/<name>.md` with just `description` and
   `argument-hint` frontmatter (no `name` field — the filename is the
   command name). Body is short prose, not headed sections: state which
   subagent(s) it invokes, how `$ARGUMENTS` is used, default behavior, and
   any guardrails (e.g. "do not fix code unless the user approves").
2. Add it to the README's commands table.

## Adding a new skill

Follow the existing `.claude/skills/<name>/` layout: `SKILL.md` (frontmatter
`name`, `description` — dense with trigger phrases and "for X, see Y"
cross-references — plus `metadata.version`), optionally `references/*.md` and
`evals/evals.json`.

## The guard is not optional to satisfy

`scripts/taa-guard.sh` (+ `taa-guard-pretooluse.sh`, `taa-guard-bash-scan.sh`,
`taa-guard-secrets.sh`) blocks secrets, PII in the brain, lorem-ipsum,
hard-coded colors, interpolated SQL, and orphan TODOs by code, not by asking
the model to remember. If a guard change is needed, fix the underlying rule —
never bypass or rename the guard, and never ask a user to run with
`--no-verify`. Any change to guard behavior must:

1. Keep the doc's constitution intact: secrets are blocked everywhere
   (including `.md`/`.taa` artifacts and the brain); only content-quality
   checks (lorem/color/SQL/TODO) may be skipped for prose/memory files.
2. Add or update a case in `tests/guard/run_tests.sh` (pure bash, no `bats`
   dependency) — one block case and one pass case per rule.
3. Pass `bash tests/guard/run_tests.sh` before you open a PR.
4. Degrade honestly when an optional dependency (`jq`, `gitleaks`) is
   missing — never silently skip a check without a stderr note.

## Branching & gates

Each work package/feature gets its own branch + PR; the PR description states
the acceptance criteria and how they were verified (command output). Never
commit or push without the user's explicit go-ahead — this applies to the
maintainers of this stack too, not just the pipeline it runs for others.
