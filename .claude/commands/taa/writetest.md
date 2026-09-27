---
description: Write level-graded test scenarios (light = page works, normal = basic functions, hard = full FE + BE) that a human, the Laya runner, or a headless browser can execute step by step
argument-hint: "[light|normal|hard] <route | page file | all | description> [--url <local/staging BASE_URL>] [--run]"
---

You are the **TAA Orchestrator** running the **test-scenario track**. Request:

> $ARGUMENTS

Do not write scenarios yourself — `taa-tester` does. You parse the request,
manage the run directory, and stop at the gate.

## 0. Parse
- **Level:** the first word if it is `light`, `normal` or `hard`; otherwise
  `normal`. Levels are cumulative (`hard` also writes `light` + `normal`).
- **Target:** the rest — a route (`/login`), a page file path, `all`, or a
  free-text description ("fatura oluşturma ekranı"). Empty → ask once:
  *"Hangi sayfa(lar) için senaryo yazılsın? (route, dosya yolu veya `all`)"*.
- **`--url <BASE_URL>`** (optional): a running local/staging app for live
  locator verification (and for `--run`). Refuse anything that doesn't look
  local/staging (`localhost`, `127.0.0.1`, `*.local`, `*.test`, or a host
  containing `staging`/`test`/`dev`/`qa`) — ask instead of guessing (CLAUDE.md
  QA rule 1: never test production).
- **`--run`** (optional): after approval, execute the set once (needs
  `--url`) — headless through the scenario runner (`taa-runner/`, `runner/`
  or `${CLAUDE_PLUGIN_ROOT}/runner`:
  Playwright + Laya judge), or the Playwright MCP when the runner can't be used.
- **`all` guard:** glob the repo's route files; if more than 15 user-facing
  pages, ask once: *"N sayfa bulundu. Hepsi mi, yoksa öncelikli bir alt küme
  mi (liste verin)?"* before invoking anything.

## 1. Run directory
- **An active pipeline run exists** (a `.taa/runs/*/state.md` whose stage
  isn't `DONE`): reuse its `<run-dir>` — same pattern as `/taa:marketing` —
  and append a `## TESTSCENARIO` section to its `state.md` (level, target,
  timestamp, outcome). If `<run-dir>/test-scenarios/` already exists (e.g.
  from QA-A), ask once: *"Mevcut senaryo seti var (N senaryo). Genişletilsin
  mi (yeni ID'lerle ekle), yeniden mi yazılsın, iptal mi?"*. Source =
  `code+spec` when that run has a `SPEC.md`, else `code`.
- **Otherwise:** create `.taa/runs/<run-id>/` (Run ID = timestamp-slug +
  `writetest-<short target>`) and `<run-dir>/state.md` from the state template
  with `Track: TESTSCENARIO`, `Test level: <level>`, the request, timestamp and
  git HEAD. Stage board for this track: `BRAIN` (hard only) → `WRITE` ⛩ →
  `RUN` (only with `--run`). Source = `code`.

Pass the absolute `<run-dir>` to every subagent and tell it to confine all
`.taa/` reads/writes to that directory.

## 2. Stages

| # | Stage | Subagent | Produces | Gate |
|---|-------|----------|----------|------|
| 1 | BRAIN | `taa-brain` (RECALL, **hard only**) | recurring finding classes relevant to the target (from `findings/CHECKLIST.md`) so hard `SEC`/`API` scenarios cover them — budget-capped per taa-brain.md | — |
| 2 | WRITE | `taa-tester` (mode `WRITE`, level, target, source, `--url` if given, + brain briefing) | `<run-dir>/test-scenarios/` — `index.json`, `scenarios/*.json`, generated `README.md` | ⛩ |
| 3 | RUN | `taa-tester` (mode `RUN`, BASE_URL) — only with `--run`; runner first, MCP fallback | `<run-dir>/test-scenarios/results/*.json` + scoreboard (+ Laya agreement rate) | — |

**Gate (after WRITE):**
1. Present the tester's summary **verbatim**, then the path to
   `<run-dir>/test-scenarios/README.md` (the human checklist) and
   `index.json` (the Laya/automation run list).
2. Re-run the validator yourself as a mechanical check —
   `python3 scripts/taa-scenarios.py validate <run-dir>/test-scenarios`
   (plugin: `${CLAUDE_PLUGIN_ROOT}/scripts/taa-scenarios.py … --schemas
   ${CLAUDE_PLUGIN_ROOT}/templates/taa/test-scenarios`) — and show its last
   line. A non-zero exit means the gate cannot be approved: re-invoke the
   tester with the errors.
3. CHIEF is not invoked on this track (it changes no code and no contract);
   say so in one line.
4. **STOP and ask:** `"Test senaryoları hazır. Onaylıyor musunuz? (onayla / düzelt: <not> / iptal)"`
   - `onayla` → record approval in `state.md`; continue to RUN if `--run`.
   - `düzelt: …` → re-invoke `taa-tester` (WRITE) with the note; repeat the gate.
   - `iptal` → record and halt.

**RUN (with `--run` only):** present the scoreboard verbatim. Failures are
**reported, never fixed** (CLAUDE.md QA rule 8): suggest `/taa:fix <bug>` for
app bugs, `test-triager` for unclear reds, and `/taa:writetest` `düzelt` for
scenario drift. Without `--run`, tell the user how the set can be executed:
a human with `README.md`; headless with the scenario runner
(`cd runner && BASE_URL=… TAA_SCENARIOS=<run-dir>/test-scenarios npm run scenarios`
— see `runner/README.md`); `/taa:writetest … --run`; or `e2e-engineer` to
turn it into committed Playwright specs (same TC IDs).

## 3. Completion
- **Own run (standalone):** set `state.md` to `DONE`, move
  `.taa/runs/<run-id>/` → `.taa/archive/<run-id>/` (`git mv` if tracked, else
  `mv`) and append `- <run-id> — TESTSCENARIO — <level> · <N> senaryo · <target> — <YYYY-MM-DD>`
  to `.taa/archive/INDEX.md`. Tell the user the scenarios now live at
  `.taa/archive/<run-id>/test-scenarios/`.
- **Reused pipeline run:** leave the directory in place; the pipeline's own
  completion step archives it.
- Never commit or push unless the user explicitly asks.
