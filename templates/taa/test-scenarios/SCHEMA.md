# TAA test scenario format — v1.0

The contract between the scenario writer (`taa-tester`, via `/taa:writetest` or
`/taa:start` QA-A) and every executor: **a human tester, the Laya runner, or a
headless browser**. One scenario set must be runnable by all three without
edits. JSON is the source of truth; `README.md` is generated from it.

Machine-readable schemas (JSON Schema draft 2020-12) sit next to this file:
`scenario.schema.json`, `index.schema.json`, `result.schema.json`.
`scripts/taa-scenarios.py validate <dir>` enforces them plus the semantic rules
below; `render <dir>` regenerates the human checklist. A complete, valid
example lives in `example/`.

## Directory layout

```
<run-dir>/test-scenarios/          (.taa/runs/<run-id>/test-scenarios/)
  index.json                       manifest + execution order (index.schema.json)
  scenarios/TC-<LAYER>-<NNN>.json  one file per scenario (scenario.schema.json)
  README.md                        human checklist — GENERATED, never hand-edited
  results/<YYYYMMDD-HHMM[SS]>-<executor>.json   one file per execution (result.schema.json)
  results/evidence/                screenshots / traces referenced by results
```

## Levels (cumulative)

| Level | Question it answers | Layers | Minimum per page |
|---|---|---|---|
| `light` | Does the page work? | `SMOKE` | 1 SMOKE: page opens, key heading/landmarks/primary action visible, no console errors, no 4xx/5xx on load |
| `normal` | Do the basic functions work? | `UI`, `NEG`, `E2E` | happy path of every primary function (form submit, list/search/filter, CRUD create+read, navigation) + the main negative case of each form |
| `hard` | Does everything work, FE and BE? | `API`, `SEC`, `A11Y` (+ more `UI`/`NEG`/`E2E`) | every field's validation and boundary values; empty / loading / error states; every role's view and forbidden actions; every endpoint the page calls hit directly (status, body keys, 400 validation, 401 unauthenticated, 403/404 cross-tenant/IDOR, no sensitive fields); keyboard-only use + axe scan |

A `hard` set contains all `light` and `normal` scenarios too. Each scenario's
`level` is the *lowest* level it belongs to. Layer ↔ level is fixed:
`SMOKE`→light; `UI`/`NEG`/`E2E`→normal or hard; `API`/`SEC`/`A11Y`→hard.

## IDs

`TC-<LAYER>-<NNN>` (CLAUDE.md QA rule 3), e.g. `TC-SMOKE-001`, `TC-NEG-014`.
The file is named `<test_id>.json`. Automated tests generated from a scenario
keep the same ID in their title: `test('TC-NEG-014 | ...')`.

## A step = two layers over the same check

```jsonc
{
  "step_id": 3,
  "description": "Hata uyarısının doğrulanması",
  // Layer 1 — human / Laya: look at the screen, answer the question
  "laya_question": "Ekranda kırmızı renkli veya 'geçersiz/hatalı' ibareli bir uyarı metni belirdi mi?",
  "expected_primitive": "noul",
  "expected": { "answer": true, "min_confidence": 0.8 },
  // Layer 2 — headless browser: do the actions, evaluate the assertions
  "automation": {
    "actions":    [ ... ],
    "assertions": [ { "type": "visible", "locator": { "by": "role", "role": "alert" } } ]
  }
}
```

Execution order inside a step: `actions` run first, then the question is
answered / assertions evaluated — unless `question_phase: "before_actions"`,
where the question is answered on the screen *before* the actions run (for
"what is the next logical action?" judgement questions).

`channel: "api"` means the observation is the HTTP response of the step's
`api_call` (status + body), not the screen. Laya receives the response JSON
instead of a screenshot; a human uses Postman/curl or DevTools (see `human_hint`).

### What Laya sees

The Laya model is **text-only**. The runner (`runner/`) gives it a textual
observation: page path, tab title, alert/dialog texts and Playwright's
accessibility tree (ARIA snapshot) — or, for `channel: "api"`, the HTTP
status and body. Write `laya_question`s a reader of that text can answer:
visible copy, headings, labels, which fields/buttons exist, the URL. Colour,
layout and focus rings are not in the observation — back such checks with an
assertion (`focused`, `a11y_no_violations`) and phrase the question around the
text (*"'geçersiz/hatalı' ibareli bir uyarı var mı?"*).

### Primitives (`expected_primitive`)

| Primitive | Meaning | Laya returns | `expected` | PASS when |
|---|---|---|---|---|
| `noul` | **No / Yes / Null** — a yes/no question | p(yes) ∈ [0,1] (ONNX probability) | `answer: true\|false`, `min_confidence` (default 0.8, ≥ 0.5) | answer=true and p ≥ min_confidence, or answer=false and p ≤ 1 − min_confidence. The band in between is **null → `inconclusive`**, never a pass. A human answers Evet/Hayır. |
| `choice` | pick exactly one of `options` | one option key | `answer: "<option>"` | returned key == answer |
| `score` | rate on `scale` | a number | `eq` / `gte` / `lte` within the scale | the number satisfies every bound |

Rules the validator enforces: every `noul` step must also be **verifiable
headless** (≥ 1 assertion or an `api_call` with `expect`) — a yes/no question
must never depend on judgement alone. `choice` and `score` steps may have zero
assertions; a headless runner still executes their actions and records the
step as `judgement_only: true`. Every scenario has ≥ 1 deterministic check.
`options` are snake_case keys (2–6).

## Locators (CLAUDE.md QA rule 5)

Priority: `role` > `label` > `testid`; `text` only to read messages. CSS and
XPath are deliberately not representable.

| Locator | Playwright |
|---|---|
| `{by:"role", role, name?, exact?, level?}` | `page.getByRole(role, { name, exact, level })` |
| `{by:"label", value, exact?}` | `page.getByLabel(value, { exact })` |
| `{by:"testid", value}` | `page.getByTestId(value)` |
| `{by:"text", value, exact?}` | `page.getByText(value, { exact })` |
| `nth: n` | `.nth(n)` |
| `within: <locator>` | `resolve(within).<getBy…>(…)` (scoped) |

In `spec-only` sets (written at QA-A before code exists) locators are a
**contract**: DEV must build the UI so the accessible names/labels resolve,
exactly as DEV must make QA's test skeletons pass.

## Actions → Playwright

| `action` | Fields | Playwright | Human |
|---|---|---|---|
| `goto` | `url` | `page.goto(url)` | open the address |
| `reload` / `go_back` | — | `page.reload()` / `page.goBack()` | F5 / back |
| `click` | `locator` | `loc.click()` | click |
| `fill` | `locator`, `value` | `loc.fill(value)` | type |
| `clear` | `locator` | `loc.clear()` | clear the field |
| `select` | `locator`, `value` (option label) | `loc.selectOption({ label: value })` | choose from list |
| `check` / `uncheck` | `locator` | `loc.check()` / `loc.uncheck()` | tick / untick |
| `press` | `value`, `locator?` | `(loc ?? page.keyboard).press(value)` | press the key |
| `hover` | `locator` | `loc.hover()` | mouse over |
| `upload` | `locator`, `value` (path under `tests/fixtures/`) | `loc.setInputFiles(value)` | choose the file |
| `wait_for` | `locator`, `state` | `loc.waitFor({ state })` — web-first, **never** a fixed sleep | wait until it appears/disappears |
| `set_viewport` | `viewport` | desktop 1440×900 · tablet 834×1112 · mobile 390×844 | resize / DevTools device mode |
| `api_call` | `request`, `expect` | `request.newContext()` + `fetch`; assert `expect` | Postman / curl |

`api_call.request.auth`: `none` (no credentials), `session` (the scenario's
logged-in user), `role:<r>` (another seeded role — authz/IDOR checks).
`expect`: `status` (required), `body_has_keys`, `body_contains`,
`body_not_contains_keys` (e.g. `passwordHash`, tokens on failure), `max_ms`.

## Assertions → Playwright

| `type` | Fields | Playwright (web-first) |
|---|---|---|
| `visible` / `hidden` | `locator` | `expect(loc).toBeVisible()` / `.toBeHidden()` |
| `enabled` / `disabled` / `checked` / `focused` | `locator` | `.toBeEnabled()` / `.toBeDisabled()` / `.toBeChecked()` / `.toBeFocused()` |
| `text_contains` / `text_equals` | `locator`, `value` | `.toContainText(value)` / `.toHaveText(value)` |
| `value_equals` | `locator`, `value` | `.toHaveValue(value)` |
| `count` | `locator`, `eq\|gte\|lte` | `.toHaveCount(eq)` / `expect(await loc.count()).toBeGreaterThanOrEqual(gte)` |
| `url_matches` | `value` (regex) | `expect(page).toHaveURL(new RegExp(value))` |
| `title_contains` | `value` | `expect(page).toHaveTitle(new RegExp(value))` |
| `no_console_errors` | — | collect `page.on('console')` type=error and `pageerror` since the scenario started (load errors included); expect none |
| `network_no_errors` | `url_pattern?` | collect `page.on('response')` since the scenario started; after the network settles, no status ≥ 400 on matching URLs |
| `response` | `url_pattern`, `status`, `method?` | the latest matching response since the scenario started (listener registered before the first action) has `status` — so a later step can check a request an earlier step triggered |
| `a11y_no_violations` | `impact?` (default serious) | `@axe-core/playwright` `AxeBuilder.analyze()`; no violation at or above `impact` |

`timeout_ms` overrides the default web-first timeout for one assertion.

## Variables

Every string may contain `{{…}}` references; nothing else may carry hosts or
credentials.

| Variable | Resolved from |
|---|---|
| `{{BASE_URL}}` | env — the frontend under test (local/staging, **never production**) |
| `{{API_BASE_URL}}` | env — the backend; falls back to `BASE_URL` |
| `{{env.NAME}}` | env / CI secret / `.env.test` — credentials always go here |
| `{{test_data.key}}` | the scenario's own `test_data` object |
| `{{run.uid}}` | a unique token per execution, so records a scenario creates never collide (`"Fatura {{run.uid}}"`) — use it for independence and cleanup |

Every env name referenced must be listed in `index.json` → `env.required`.
Literal `http(s)://` anywhere is rejected. A key that looks like a credential
(`password`, `token`, `secret`, `apiKey`…) must hold a `{{…}}` reference —
unless it is an intentionally *wrong* value and the key says so
(`invalid_password`, `wrong_token`).

## Independence (CLAUDE.md QA rule 6)

Each scenario opens its own page (step 1 starts with `goto`), states its
`preconditions` (auth mode/role, seed rows, feature flags, viewport), and
lists `cleanup` for anything it creates. No scenario relies on another's
output.

## Results

Executors: a human (`README.md` checklist), `runner/` (`executor:
"playwright"` — headless Playwright, Laya answers recorded per step under
`laya`), the Playwright MCP (`taa-tester` RUN fallback), or Laya itself.
Every executor writes the same shape (`result.schema.json`):
`status` per scenario and per step is one of `pass | fail | inconclusive |
blocked | skipped`; `answer` holds what the executor answered (Laya: p(yes)
for `noul`); `evidence` points to screenshots under `results/evidence/`.
`environment.kind` is `local | staging | test` — production is not a valid
value.
