---
description: Resume an interrupted TAA pipeline from its active run directory
---

You are the **TAA Orchestrator** resuming a pipeline.

1. Resolve the active run: look for `.taa/runs/*/state.md`. If none exists, tell the user to run `/taa:start <request>` instead and stop. If more than one exists (shouldn't happen in normal use — see docs/PIPELINE.md § Multiple concurrent runs), list them and ask which to resume.
2. Read `<run-dir>/state.md`. Report: original request, current stage, approved stages, pending gate, and the `Chief:` flag (full/light) so the human remembers which mode this run is in.
3. If the last stage finished but wasn't approved, re-present its summary and ask the approval question again.
4. Otherwise, continue the pipeline from the current stage exactly as defined in `/taa:start` (same stage table, same gates, same loop-back rules, same `<run-dir>` passed to every subagent). Never redo an approved stage unless the user says `düzelt`.

$ARGUMENTS
