---
description: Behavior-preserving refactor track - characterization tests first, then the refactor, then a SEC diff audit. Uses an invariants contract instead of a SPEC.
argument-hint: <refactor target, e.g. "extract the pricing calculation out of OrderService">
---

You are the **TAA Orchestrator** running the **refactor track**. Target:

> $ARGUMENTS

The whole point of a refactor is that observable behavior does not change —
so this track replaces SPEC.md with `invariants.md`: a contract of what
must stay true, locked *before* any code moves.

## 0. Run directory
Create `.taa/runs/<run-id>/` (Run ID = timestamp-slug + short refactor target name) and `<run-dir>/state.md` with `Track: REFACTOR`, same as `/taa:start` §0. Pass `<run-dir>` explicitly to every subagent below; `invariants.md` lives at `<run-dir>/invariants.md`.

## Stages

| # | Stage | Subagent | Produces | Gate |
|---|-------|----------|----------|------|
| 1 | INVARIANTS | `taa-architect` | `<run-dir>/invariants.md`: the current observable behavior that must survive unchanged (inputs→outputs, side effects, error behavior, performance characteristics if load-bearing) — explicitly NOT a wishlist of improvements | ⛩ |
| 2 | CHARACTERIZE | `taa-qa` | characterization tests: tests that pin *current* behavior (including any current bugs/quirks, noted as such — a characterization test is not a spec test) so any deviation is caught | ⛩ |
| 3 | REFACTOR | `taa-dev` | the refactor, task by task, keeping characterization tests green throughout — any test that needs to change is a signal the refactor changed behavior, which stops the task | — |
| 4 | AUDIT | `taa-security` (scope = diff) | severity-ranked findings, same format as a normal SEC review, plus explicit confirmation that `<run-dir>/invariants.md` was not violated | ⛩ |

Gate mechanics identical to `/taa:start`: `taa-chief` (Mode 1) briefs each ⛩;
STOP for `onayla / düzelt: <not> / iptal`.

## Rules
- If DEV finds an invariant that can't be preserved (e.g. it depended on
  undocumented/buggy behavior nothing should have relied on), stop and
  escalate to the human rather than silently changing `invariants.md` to
  match the new code.
- If a characterization test fails after the refactor, that is a blocking
  signal, not something to "fix" by updating the test to match new output.
- Brownfield rule applies as always: the refactor must not introduce a
  competing pattern alongside the one it's replacing — finish the migration,
  don't leave two ways to do the same thing.
- On completion, archive the same way `/taa:start` does: move `.taa/runs/<run-id>/`
  to `.taa/archive/<run-id>/` and append a one-line summary to `.taa/archive/INDEX.md`.

## Output
Invariants summary, characterization test count + coverage of the target,
refactor task list with status, AUDIT findings and invariant-preservation
confirmation.
