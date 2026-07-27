---
description: Explain how existing code actually works - traces one execution path end to end (API/entrypoint → application → domain → infrastructure), cited file:line at every hop. Read-only, no gate.
argument-hint: <hedef, örn. "RunAgentAsync fonksiyonunu API'den infrastructure'a kadar anlat" | "POST /api/agents/{id}/run" | "map: billing modülü" | "impact: IAgentRunner arayüzünü değiştirsem">
---

Invoke `taa-explainer` for:

> $ARGUMENTS

## Mode
Pick from the request, and say which one you picked before starting:

- **`trace`** (default) — one execution path, end to end, across every layer it crosses.
  Triggered by: a function/method name, an endpoint, a UI action, "nasıl çalışıyor",
  "nereye gidiyor", "ne oluyor".
- **`map`** — a subsystem's components, boundaries and dependency direction.
  Triggered by: `map:` prefix, a module/folder name, "genel yapı", "neyden oluşuyor".
- **`impact`** — blast radius of a proposed change: callers, contracts, persisted shapes,
  tests that pin the behavior. Triggered by: `impact:` prefix, "değiştirsem ne olur",
  "kırar mı".

If the target is ambiguous (a name that matches several symbols, or a request that could
be `trace` or `map`), list the candidates with file paths and **ask once** — do not guess
and produce a confident trace of the wrong thing.

## What EXPLAIN must not do
- **No gate here.** This track is read-only and advisory, like `/taa:brain` and
  `/taa:steer`. It does not touch `.taa/state.md`, does not consume a pipeline stage, and
  does not need `onayla`.
- **No fixes.** Anything worth changing goes into the report's Observations section with a
  route: security → `/taa:review`, small bug → `/taa:fix`, structural →
  `/taa:refactor`, missing/incorrect docs → `/taa:docs`. If the human then wants the fix,
  that's a new command — never slide from explaining into editing.
- **No invented hops.** A seam that can't be resolved from code (runtime dispatch,
  reflection, vault-held config) goes in **Open questions** with the cheapest way to
  answer it — not into the call-path table.

## Grounding
Every hop carries a `file:line` citation. `.taa/architecture.md` states intent; the code
states reality — where they disagree, the code wins and the drift is reported explicitly
(that drift is a `/taa:dream` input and often an ADR that needs updating).

## Output
`.taa/explain/<slug>.md` + a chat summary: the one-paragraph explanation, the call-path
table, the Mermaid diagram, hop count, layers crossed, top observations, open questions.

If the trace uncovered a non-obvious convention or seam that future stages would have to
re-derive (a DI/decorator ordering, an implicit tenant scope, a hand-off through a queue),
offer — don't force — to promote it to a brain `patterns/` page via `/taa:dream`.
