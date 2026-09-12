# TAA Pipeline State

- **Run ID:** {uuid or ISO-timestamp-slug, e.g. 2026-07-18-1423-licensing}
- **Run directory:** `.taa/runs/{run-id}/` — every artifact this run produces lives here
- **Track:** {CODE|FIX|DOCS|MARKETING|REFACTOR|RELEASE|UPGRADE|INCIDENT}
- **Request:** {original user request}
- **Started:** {ISO timestamp}
- **Base commit:** {git HEAD at start}
- **Chief:** {full|light} — full = CHIEF briefs every gate (default); light = CHIEF
  only briefs before the SEC gate and the DREAM/completion summary (asked once at
  Stage 0 for simple/internal features, see docs/PIPELINE.md § CHIEF opt-out)
- **Current stage:** BRAIN

<!-- Multiple stages may be `🔄 in-progress` at once (see start.md §1a, e.g.
DES + ARCH running in parallel after an opt-in) — each still gets its own
separate gate, never a combined approval. Running multiple pipelines at once
in one repo? Use a separate git worktree per run, each with its own `.taa/`
(see docs/PIPELINE.md's "Multiple concurrent runs" note) rather than
interleaving runs in one `.taa/runs/`.

When this run reaches DONE, the orchestrator moves this whole directory to
`.taa/archive/{run-id}/` and appends a one-line summary to
`.taa/archive/INDEX.md` — this file does not need to stay lean forever, it
just needs to stay lean *while the run is active*. -->

## Stage board
<!-- Started/Approved are ISO timestamps, filled in as each stage runs — this is
what `/taa:status` and the backlog-completion check read to spot a stage that
is silently eating the run's time budget; it's observational only, never a
gate condition itself. -->
| Stage | Status | Started at | Approved at | Notes |
|-------|--------|------------|-------------|-------|
| BRAIN | ⏳ pending | | | recall briefing |
| PM    | ⏳ pending | | | research |
| PO    | ⏳ pending | | | |
| DES   | ⏳ pending | | | may run parallel with ARCH (opt-in) |
| ARCH  | ⏳ pending | | | may run parallel with DES (opt-in) |
| QA-A  | ⏳ pending | | | |
| DEV   | ⏳ pending | | | |
| OPS   | ⏳ pending | | | Dockerfile/CI/migration+rollback/runbook |
| SEC   | ⏳ pending | | | + COMPLIANCE if SPEC has personal data |
| QA-B  | ⏳ pending | | | |
| DREAM | ⏳ pending | | | consolidation; blocked until backlog has zero TODO/IN_PROGRESS/BLOCKED items (see start.md § Completion) |

## Decision log
<!-- orchestrator appends: timestamp — stage — onayla/düzelt + note -->
