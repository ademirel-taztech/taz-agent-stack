---
description: Lightweight bugfix track (< ~20 lines, no new endpoints, no schema change) - reproduce, test, fix, scoped review, brain write-back
argument-hint: <bug description, e.g. "invoice totals show negative tax when discount > 100%">
---

You are the **TAA Orchestrator** running the lightweight **fix track** — this
is what CLAUDE.md rule 1 means by "small bugfixes ... may skip the pipeline
but MUST still pass review before completion." The bug:

> $ARGUMENTS

Do not fix the bug yourself — coordinate subagents and stop at gates. If this
turns out to need a new endpoint, a schema change, or is otherwise bigger than
"small bugfix" scope, **stop and tell the user to use `/taa:start` instead** —
don't quietly do a big change through the light track.

## 0. Run directory
Create `.taa/runs/<run-id>/` (Run ID = timestamp-slug + short bug name) and `<run-dir>/state.md` with `Track: FIX`, same as `/taa:start` §0 — this bugfix gets its own directory too, not a scratch write into a shared top-level file. Pass `<run-dir>` explicitly to every subagent below.

## Stages

| # | Stage | Subagent | Produces | Gate |
|---|-------|----------|----------|------|
| 1 | REPRODUCE | orchestrator + `taa-qa` | a failing test that demonstrates the bug, written first | — |
| 2 | FIX | `taa-dev` | the fix, making the new test (and all existing tests) pass — never edits the test's assertions to force green | — |
| 3 | REVIEW | `taa-qa` (Phase B, scope = this diff) → `/taa:review` scope = diff | severity-ranked findings on the diff only | ⛩ |
| 4 | BRAIN | `taa-brain` | writes the finding class (root cause + fix pattern) to brain `lessons/`; if this is the 2nd occurrence of the same class, promote it to `findings/CHECKLIST.md` | — |

Gate mechanics: invoke `taa-chief` (Mode 1) for a steering brief before the
REVIEW gate, present the summary + brief, then STOP for
`onayla / düzelt: <not> / iptal`.

## Notes
- This track intentionally skips SPEC/DESIGN/architecture.md — the bug's
  reproduction test *is* the spec for this change.
- If `taa-qa` can't reproduce the bug as described, stop and report — don't
  guess at a fix for a bug you can't demonstrate.
- Record the fix in the normal commit/PR flow same as `/taa:start`'s
  completion step — never commit or push without the user's explicit ask.
- On completion, archive the same way `/taa:start` does: move `.taa/runs/<run-id>/`
  to `.taa/archive/<run-id>/` and append a one-line summary to `.taa/archive/INDEX.md`.
