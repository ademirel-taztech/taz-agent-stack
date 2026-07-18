# TAA on OpenAI Codex

TAA's core is engine-agnostic Markdown (.taa artifacts, brain, templates, gate discipline, guard script). This directory is the Codex adapter.

## Install
1. `cp codex/AGENTS.md /your/project/AGENTS.md` (or merge into an existing one).
2. `cp codex/agents/*.toml ~/.codex/agents/` — regenerate anytime with `python3 scripts/convert-to-codex.py`.
3. `./scripts/install-precommit.sh /your/project` — TAA Guard as a git pre-commit hook (replaces Claude Code's PostToolUse hook; blocks at commit time instead of write time).
4. Copy `templates/` into the project as usual (`install.sh` does this too).

## Usage
- Full pipeline: tell Codex **"Run the TAA pipeline for: <request>"** — AGENTS.md carries the stage table, gates, and constitution; Codex spawns the taa_* custom agents per stage.
- Single roles: "Spawn taa_security to review the last commit", "Spawn taa_pm to research <topic>".
- MCP: Codex supports MCP servers; apply the same role-scoping rules from `docs/MCP.md`.

## Known differences vs Claude Code
| Capability | Claude Code | Codex |
|---|---|---|
| Subagent definition | `.claude/agents/*.md` (YAML frontmatter) | `~/.codex/agents/*.toml` (generated here) |
| Per-role tool least-privilege | `tools:` whitelist | sandbox/permission config per agent (`read_only` hint emitted; verify against current Codex docs) |
| Pipeline entry | `/taa:start` slash command | natural-language trigger via AGENTS.md |
| Write-time guard | PostToolUse hook (blocks instantly) | git pre-commit (blocks at commit) |
| Plugin packaging | `.claude-plugin/` | not ported |
| Skills (`.claude/skills/`) | 46 marketing skills + `doc-ingest`/`doc-export`, auto-triggered by description matching | **no skill mechanism in Codex** — `/taa:marketing`, `/taa:ingest`, `/taa:report` as slash commands don't exist here either |

The TOML schema for Codex custom agents evolves — the converter emits a VERIFY note in each file; check field names against developers.openai.com/codex before first run.

### Honest gap: skills, `/taa:marketing`, `/taa:ingest`, `/taa:report`

Codex has no equivalent of Claude Code's skill system, so none of
`.claude/skills/` ports over automatically — this includes the 46 marketing
skills **and** the WP-3 `doc-ingest`/`doc-export` skills. Concretely, in
Codex:

- `/taa:marketing`, `/taa:ingest`, `/taa:report` **do not exist** — there is
  no slash-command or auto-trigger equivalent.
- The doc-ingest/doc-export *scripts* under `.claude/skills/doc-ingest/scripts/`
  and `.claude/skills/doc-export/scripts/` are plain Python/CLI and **do**
  run fine under Codex — but you have to invoke them yourself (or ask Codex
  to run them) rather than relying on skill auto-triggering. Point Codex at
  the relevant `SKILL.md` for the tool-selection logic and honest-degrade
  messages if you want it to follow the same rules a Claude Code session
  would.
