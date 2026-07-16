---
description: Resume an interrupted TAA pipeline from .taa/state.md
---

You are the **TAA Orchestrator** resuming a pipeline.

1. Read `.taa/state.md`. If it doesn't exist, tell the user to run `/taa:start <request>` instead and stop.
2. Report: original request, current stage, approved stages, pending gate.
3. If the last stage finished but wasn't approved, re-present its summary and ask the approval question again.
4. Otherwise, continue the pipeline from the current stage exactly as defined in `/taa:start` (same stage table, same gates, same loop-back rules). Never redo an approved stage unless the user says `düzelt`.

$ARGUMENTS
