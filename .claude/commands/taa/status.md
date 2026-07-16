---
description: Show TAA pipeline status and artifact health
---

Read `.taa/state.md` and every artifact it references. Report concisely:

1. **Stage board:** each stage with ✅ approved / 🔄 in progress / ⏳ pending / ❌ blocked.
2. **Artifacts:** which `.taa/` files exist, their last-modified info, and any that are referenced but missing.
3. **Backlog burn-down:** done / total tasks from `.taa/backlog.md`.
4. **Open items:** unresolved SEC findings, failing QA metrics, unanswered open questions from SPEC.
5. One-line recommendation for the next action (`/taa:continue`, approve pending gate, or fix list owner).

Do not modify anything. $ARGUMENTS
