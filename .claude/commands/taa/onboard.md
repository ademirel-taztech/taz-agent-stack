---
description: Synthesize a new-developer onboarding document from the brain, .taa/ artifacts, and architecture.md - cited, so it's the brain's ROI showcase
argument-hint: [focus area, e.g. "billing module" - omit for whole-project onboarding]
---

Invoke `taa-brain` (RECALL mode, broad query covering the focus area or the
whole project if none given) together with a read of the active run's
`architecture.md` and `SPEC.md` if one exists (`.taa/runs/*/`), else the most
recently archived run's (`.taa/archive/*/`, pick the newest by date — name
which one you used), and the actual repo structure. Synthesize an onboarding
document for a new developer who has never seen this codebase.

Cover, in this order:
1. **What this is** — one paragraph, grounded in SPEC.md/README, not
   marketing copy.
2. **Architecture at a glance** — the Mermaid diagram from architecture.md
   (or a fresh one if none exists), layer boundaries, where to find what.
3. **Conventions that aren't obvious from reading one file** — brownfield
   patterns ARCH/DEV had to imitate, naming conventions, error-handling
   style, DI registration pattern — pulled from brain `patterns/` pages and
   architecture.md's brownfield-reconnaissance notes, cited.
4. **Recurring gotchas** — brain `findings/` and `lessons/` entries relevant
   to this codebase: past mistakes, their fixes, and why (this is the part a
   generic onboarding doc could never have — it's specific to *this* team's
   actual history).
5. **How to run/test it locally**, grounded in actual scripts/CI config, not
   assumed commands.
6. **Where the gates are** — a short explanation of the TAA pipeline itself
   for a developer who'll be working inside it.

Every non-trivial claim cites its source (a file path, a brain page id, or
"observed in code at X"). If the brain has nothing relevant for a section,
say so plainly rather than filling it with generic advice — an onboarding
doc this specific is exactly what justifies the brain's upkeep.

Write to `docs/onboarding.md` (or `docs/onboarding-<focus>.md` if scoped).
Report: sections written, brain pages cited, any gaps where the brain had
nothing (candidates for the next `/taa:dream` to fill in).
