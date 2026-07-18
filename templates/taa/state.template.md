# TAA Pipeline State

- **Run ID:** {uuid or ISO-timestamp-slug, e.g. 2026-07-18-1423-licensing}
- **Request:** {original user request}
- **Started:** {ISO timestamp}
- **Base commit:** {git HEAD at start}
- **Current stage:** BRAIN

<!-- Multiple stages may be `🔄 in-progress` at once (see start.md §1a, e.g.
DES + ARCH running in parallel after an opt-in) — each still gets its own
separate gate, never a combined approval. Running multiple pipelines at once
in one repo? Use a separate git worktree per run, each with its own `.taa/`
(see docs/PIPELINE.md's "Multiple concurrent runs" note) rather than
interleaving runs in one `.taa/state.md`. -->

## Stage board
| Stage | Status | Approved at | Notes |
|-------|--------|-------------|-------|
| BRAIN | ⏳ pending | | recall briefing |
| PM    | ⏳ pending | | research |
| PO    | ⏳ pending | | |
| DES   | ⏳ pending | | may run parallel with ARCH (opt-in) |
| ARCH  | ⏳ pending | | may run parallel with DES (opt-in) |
| QA-A  | ⏳ pending | | |
| DEV   | ⏳ pending | | |
| OPS   | ⏳ pending | | Dockerfile/CI/migration+rollback/runbook |
| SEC   | ⏳ pending | | + COMPLIANCE if SPEC has personal data |
| QA-B  | ⏳ pending | | |
| DREAM | ⏳ pending | | consolidation |

## Decision log
<!-- orchestrator appends: timestamp — stage — onayla/düzelt + note -->
