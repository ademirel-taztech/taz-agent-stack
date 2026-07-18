# TAA Brain — Institutional memory that compounds

> Inspired by [garrytan/gbrain](https://github.com/garrytan/gbrain)'s model: compiled
> truth above the line, append-only evidence below, every fact cited, and an overnight
> "dream cycle" that consolidates memory. TAA applies the same shape to the SDLC:
> **your pipeline's memory of patterns, decisions and mistakes, growing across projects.**

## Why a brain in an SDLC pipeline?

Subagent packs on GitHub are stateless: run #100 is exactly as naive as run #1.
TAA closes the loop:

```
recall (Stage 0) ──► pipeline runs ──► dream (Stage 10) ──► brain grows
      ▲                                                        │
      └────────────────── next run starts smarter ◄────────────┘
```

Concretely:
- **ARCH** stops re-deciding multi-tenancy for the 5th time — the brain hands it PAT/DEC pages with citations.
- **SEC** reads `findings/CHECKLIST.md`: every vulnerability class the org hit ≥2 times becomes a mandatory check. You literally stop repeating security mistakes.
- **Gate corrections are gold.** Every `düzelt:` note a human types at a gate is captured as a lesson during the dream cycle.

## Anatomy

```
~/.taa/brain/            (global)   or   ./.taa-brain/   (project)   or   $TAA_BRAIN_DIR
├── INDEX.md             hot pages, maintained by dream cycles
├── patterns/            PAT-### reusable architecture/code patterns
├── decisions/           DEC-### generalized ADRs
├── findings/            FND-### finding classes + CHECKLIST.md (read by taa-security)
├── lessons/             LES-### what loops & gate corrections taught us
├── entities/projects/   one page per project, typed links (used_by, supersedes, …)
└── runs/                append-only run summaries
```

Every page: YAML frontmatter with `id`, `type`, `tags`, typed `links`, then a
**Compiled truth** zone (always current, cites evidence) and an **Evidence** zone
(append-only). Compiled truth without a citation is treated as a bug.

## Commands

- `/taa:brain <query>` — synthesized, cited answer from memory ("what did we decide about idempotency keys?"). Gaps are reported honestly, never padded.
- `/taa:dream` — consolidate a finished run: extract patterns/ADRs/findings/lessons, merge duplicates, promote recurring findings to the checklist, update the project entity page.
- Recall also runs automatically as **Stage 0** of `/taa:start`.

## Rules

1. **No secrets, no PII, no customer numbers** in the brain — patterns and lessons, not payloads.
2. **Failures are first-class.** Reverted decisions and blocked approaches get pages too; a brain that only remembers wins can't warn you.
3. **Commit it.** The brain is Markdown in git — reviewable, diffable, multiplayer by default. For a team, host the global brain as its own repo and clone it to `~/.taa/brain`.

## Using real gbrain instead

The file-based brain needs zero infrastructure. If you run actual
[gbrain](https://github.com/garrytan/gbrain) as an MCP server (vector + knowledge-graph
retrieval at scale), connect it to Claude Code and `taa-brain` will prefer it for
search/write automatically, mirroring only run summaries locally. Same interface,
bigger brain.
