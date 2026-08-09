---
description: Dream cycle - consolidate the finished pipeline run into the TAA Brain
---

Resolve the active run: `.taa/runs/*/state.md`. Preconditions: it exists and shows stage DONE (or the user explicitly wants a partial consolidation — confirm first).

Invoke the `taa-brain` subagent in DREAM mode over the `<run-dir>` artifacts. $ARGUMENTS

Then report: pages created/updated, findings promoted to `findings/CHECKLIST.md`, and the one-line "what the org learned". If the run wasn't already archived by `/taa:start`'s own completion step (e.g. this command was run standalone after a manual DONE), archive it now: `git mv .taa/runs/<run-id> .taa/archive/<run-id>` and append the one-line summary to `.taa/archive/INDEX.md`. Suggest committing the brain (and the archive move) if it's a git repo.
