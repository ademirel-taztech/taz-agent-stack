---
description: Dream cycle - consolidate the finished pipeline run into the TAA Brain
---

Preconditions: `.taa/state.md` exists and shows stage DONE (or the user explicitly wants a partial consolidation — confirm first).

Invoke the `taa-brain` subagent in DREAM mode over the current `.taa/` artifacts. $ARGUMENTS

Then report: pages created/updated, findings promoted to `findings/CHECKLIST.md`, and the one-line "what the org learned". Suggest committing the brain if it's a git repo.
