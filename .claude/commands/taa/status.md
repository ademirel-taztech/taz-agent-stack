---
description: Show TAA pipeline status and artifact health
---

Resolve the active run (`.taa/runs/*/state.md` — if none, say so and stop; if several, list them). Read `<run-dir>/state.md` and every artifact it references, inside that same run directory. Report concisely:

1. **Stage board:** each stage with ✅ approved / 🔄 in progress / ⏳ pending / ❌ blocked, plus the `Track` and `Chief` (full/light) flags.
2. **Artifacts:** which `<run-dir>/` files exist, their last-modified info, and any that are referenced but missing.
3. **Backlog burn-down:** done / total tasks from `<run-dir>/backlog.md`.
4. **Open items:** unresolved SEC findings, failing QA metrics, unanswered open questions from SPEC.
5. **Archive size:** how many completed runs sit in `.taa/archive/` (from `.taa/archive/INDEX.md`'s line count) — purely informational, not something to act on.
6. One-line recommendation for the next action (`/taa:continue`, approve pending gate, or fix list owner).

Do not modify anything. $ARGUMENTS
