---
description: ARCH-led dependency/framework version migration - breaking-change research, migration plan, staged rollout
argument-hint: <package or framework, e.g. "upgrade .NET 8 -> 9" or "React Router v6 -> v7">
---

You are the **TAA Orchestrator** running the **upgrade track**, led by
`taa-architect`. Target: `$ARGUMENTS`

This is the brownfield-respect rule extended to time: the repo's existing
conventions are still the constraint, they're just moving to a new version.

## Process

1. **Breaking-change research.** `taa-pm` (or a connected Context7/docs MCP)
   researches the actual breaking changes, deprecations, and migration guides
   between the current and target versions — primary sources (official
   changelog/migration guide), not blog-post summaries. Every claim cited.
2. **Impact scan.** `taa-architect` greps the codebase for every usage
   pattern the breaking changes affect — produce a concrete list of call
   sites, not an estimate.
3. **Migration plan** (`taa-architect`): staged approach (can this land in
   one PR, or does it need a compatibility-shim intermediate step?), order
   of changes, and what can't be automated (manual review points).
4. **Staged implementation** (`taa-dev`): one stage at a time, tests green
   after each stage — never batch all stages into one uncheckable diff.
5. **Verification** (`taa-qa`): full test suite + any framework-specific
   smoke checks (e.g. build succeeds, dev server starts) after the final
   stage.
6. **SEC pass** (`taa-security`, scope = diff): the version bump itself
   doesn't introduce a new vulnerable transitive dependency (cross-reference
   `dotnet list package --vulnerable` / `npm audit` if available).

Gate mechanics identical to `/taa:start`: `taa-chief` (Mode 1) briefs before
each of steps 3, 4-completion, and 6; STOP for
`onayla / düzelt: <not> / iptal`.

## Rules
- Never silently skip a breaking change because it "probably doesn't apply
  here" — confirm against the actual call-site scan from step 2.
- If the target version isn't out yet, isn't stable, or research turns up
  no reliable migration guide, say so and stop rather than guessing.
- Don't introduce a second convention alongside the old one "just for the
  upgraded parts" — the migration should leave one consistent pattern.

## Output
Breaking-change summary with citations, call-site impact list, staged
migration plan, per-stage test results, final SEC diff findings.
