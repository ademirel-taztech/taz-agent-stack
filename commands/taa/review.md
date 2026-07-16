---
description: Run only the SEC security & code-debt review on recent changes
argument-hint: [optional scope, e.g. a folder or "last commit"]
---

Invoke the `taa-security` subagent as a standalone review (outside a full pipeline) on: $ARGUMENTS (default: uncommitted changes + last commit).

Present its severity-ranked findings verbatim, then your prioritized top-3 remediation plan. Do not fix code unless the user approves.
