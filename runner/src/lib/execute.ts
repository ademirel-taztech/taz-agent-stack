import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";

import { RUNNER_DIR, type JudgeMode } from "./config.ts";
import { criteriaFor, judge, type LayaClient } from "./laya.ts";
import { build, describe } from "./locator.ts";
import type { Action, Assertion, Scenario, ScenarioResult, Step, StepResult, StepStatus, Viewport } from "./types.ts";
import { BlockedError, Vars } from "./vars.ts";

const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};
const IMPACT_RANK = { minor: 0, moderate: 1, serious: 2, critical: 3 } as const;
const ACTION_TIMEOUT = Number(process.env.TAA_ACTION_TIMEOUT_MS ?? 15_000);
const ASSERT_TIMEOUT = Number(process.env.TAA_ASSERT_TIMEOUT_MS ?? 5_000);

export interface RunOptions {
  browser: Browser;
  playwright: PlaywrightWorkerArgs["playwright"];
  laya: LayaClient | null;
  judgeMode: JudgeMode;
  scenario: Scenario;
  baseUrl: string;
  apiBaseUrl: string;
  resultsDir: string;
  stamp: string;
  saveObservations: boolean;
  /** Append assertion-labelled (observation, question, answer) rows for Laya fine-tuning. */
  layaDataset: boolean;
}

interface Check {
  ok: boolean;
  label: string;
  message?: string;
}

interface ApiObservation {
  method: string;
  path: string;
  status: number;
  statusText: string;
  ms: number;
  body: string;
}

/** Env key for a role name: "Muhasebe Uzmanı" -> MUHASEBE_UZMANI. */
export function roleKey(role: string): string {
  return role
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function urlMatches(url: string, pattern: string): boolean {
  if (url.includes(pattern)) return true;
  try {
    return new RegExp(pattern).test(url);
  } catch {
    return false;
  }
}

function firstLine(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  // Playwright assertion messages are multi-line with ANSI colors; keep the gist.
  return text.replace(/\u001b\[[0-9;]*m/g, "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 2).join(" — ");
}

export class ScenarioRunner {
  private context!: BrowserContext;
  private page!: Page;
  private readonly vars: Vars;
  private readonly consoleErrors: string[] = [];
  private readonly responses: { url: string; method: string; status: number }[] = [];
  private readonly apiContexts: APIRequestContext[] = [];
  private lastApi: ApiObservation | null = null;
  private readonly evidenceDir: string;

  constructor(private readonly o: RunOptions) {
    this.vars = new Vars(o.scenario, o.baseUrl, o.apiBaseUrl);
    this.evidenceDir = join(o.resultsDir, "evidence", o.stamp);
  }

  async run(): Promise<ScenarioResult> {
    const started = Date.now();
    const sc = this.o.scenario;
    const steps: StepResult[] = [];
    let setupBlock: string | null = null;

    const pre = sc.preconditions;
    const storageState = pre.auth.mode === "role" ? process.env[`TAA_AUTH_STATE_${roleKey(pre.auth.role ?? "")}`] : undefined;
    if (pre.auth.mode === "role" && !storageState)
      setupBlock = `oturum durumu yok: TAA_AUTH_STATE_${roleKey(pre.auth.role ?? "")} (rol "${pre.auth.role}" için storageState dosyası)`;

    this.context = await this.o.browser.newContext({
      viewport: VIEWPORTS[pre.viewport ?? "desktop"],
      ...(pre.locale ? { locale: pre.locale } : {}),
      ...(storageState ? { storageState } : {}),
    });
    await this.context.tracing.start({ screenshots: true, snapshots: true });
    this.page = await this.context.newPage();
    this.page.on("console", (m) => m.type() === "error" && this.consoleErrors.push(m.text()));
    this.page.on("pageerror", (e) => this.consoleErrors.push(e.message));
    this.page.on("response", (r) => this.responses.push({ url: r.url(), method: r.request().method(), status: r.status() }));

    let stopped = false;
    try {
      for (const step of sc.steps) {
        if (setupBlock) {
          steps.push({ step_id: step.step_id, status: "blocked", note: setupBlock });
          continue;
        }
        if (stopped) {
          steps.push({ step_id: step.step_id, status: "skipped", note: "önceki adım başarısız (on_fail: stop)" });
          continue;
        }
        const r = await this.runStep(step);
        steps.push(r);
        if ((r.status === "fail" || r.status === "blocked") && step.on_fail !== "continue") stopped = true;
      }
    } finally {
      const status = rollUp(steps);
      if (status === "fail" || status === "inconclusive") {
        mkdirSync(this.evidenceDir, { recursive: true });
        const trace = join(this.evidenceDir, `${sc.test_id}-trace.zip`);
        await this.context.tracing.stop({ path: trace }).catch(() => {});
        steps.at(-1)?.evidence?.push(this.rel(trace));
      } else {
        await this.context.tracing.stop().catch(() => {});
      }
      for (const c of this.apiContexts) await c.dispose().catch(() => {});
      await this.context.close().catch(() => {});
    }

    const status = rollUp(steps);
    const notes = [pre.seed?.length ? `ön veri varsayıldı: ${pre.seed.length} madde` : "", pre.feature_flags?.length ? `feature flag'ler doğrulanmadı: ${pre.feature_flags.join(", ")}` : ""].filter(Boolean);
    return {
      test_id: sc.test_id,
      status,
      duration_ms: Date.now() - started,
      ...(notes.length ? { note: notes.join("; ") } : {}),
      steps,
    };
  }

  private async runStep(step: Step): Promise<StepResult> {
    const result: StepResult = { step_id: step.step_id, status: "pass", evidence: [] };
    const checks: Check[] = [];
    const notes: string[] = [];
    let actionError: string | null = null;
    let blocked: string | null = null;
    let verdict: ReturnType<typeof judge> | null = null;
    const wantLaya = this.o.laya !== null;
    const asked: { phase: string; state: string; answer: Awaited<ReturnType<LayaClient["ask"]>> }[] = [];

    const askLaya = async (phase: "before_actions" | "after_actions") => {
      const state = step.channel === "api" && phase === "after_actions" ? this.observeApi() : await this.observePage();
      if (this.o.saveObservations) {
        mkdirSync(this.evidenceDir, { recursive: true });
        const f = join(this.evidenceDir, `${this.o.scenario.test_id}-step${step.step_id}-observation.txt`);
        writeFileSync(f, state);
        result.evidence!.push(this.rel(f));
      }
      const answer = await this.o.laya!.ask(step.expected_primitive, this.vars.resolve(step.laya_question), criteriaFor(step), state);
      verdict = judge(step, answer);
      asked.push({ phase, state, answer });
      result.answer = verdict.answer;
      result.laya = {
        phase,
        verdict: verdict.verdict,
        probabilities: answer.probabilities,
        confidence: answer.confidence,
        act_probability: answer.act_probability,
        input_tokens: answer.input_tokens,
        state_truncated: answer.state_truncated,
        latency_ms: answer.latency_ms,
      };
      const shadow = this.o.judgeMode === "shadow" ? " [gölge — sonucu etkilemez]" : "";
      notes.push(verdict.note + shadow + (answer.state_truncated ? " (gözlem token sınırında kesildi)" : ""));
    };

    try {
      if (wantLaya && step.question_phase === "before_actions") await askLaya("before_actions");
      for (const action of step.automation.actions) {
        try {
          await this.act(action, checks);
        } catch (e) {
          if (e instanceof BlockedError) throw e;
          actionError = `aksiyon ${action.action}${action.locator ? ` ${describe(action.locator)}` : ""}: ${firstLine(e)}`;
          break;
        }
      }
      if (!actionError) {
        for (const a of step.automation.assertions) checks.push(await this.check(a));
        if (wantLaya && step.question_phase !== "before_actions") await askLaya("after_actions");
      }
    } catch (e) {
      if (e instanceof BlockedError) blocked = e.message;
      else actionError = `çalıştırma hatası: ${firstLine(e)}`;
    }

    const failed = checks.filter((c) => !c.ok);
    result.assertions_passed = checks.length - failed.length;
    result.assertions_failed = failed.length;
    if (checks.length === 0) result.judgement_only = true;
    for (const f of failed) notes.push(`✗ ${f.label}${f.message ? `: ${f.message}` : ""}`);
    if (actionError) notes.push(actionError);

    result.status = decide(this.o.judgeMode, { blocked, actionError, failed: failed.length, checks: checks.length, verdict });
    if (blocked) notes.unshift(blocked);

    // The assertions proved the expected state holds, so the expectation is a clean label for
    // what Laya should have answered. Only yes/no rows qualify (choice/score are judgement).
    if (this.o.layaDataset && step.expected_primitive === "noul" && checks.length && !failed.length && !actionError && !blocked) {
      mkdirSync(this.o.resultsDir, { recursive: true });
      for (const a of asked)
        appendFileSync(
          join(this.o.resultsDir, `laya-dataset-${this.o.stamp}.jsonl`),
          JSON.stringify({
            test_id: this.o.scenario.test_id,
            step_id: step.step_id,
            phase: a.phase,
            type: "noul",
            instructions: this.vars.resolve(step.laya_question),
            state: a.state,
            label: step.expected.answer,
            laya_p_true: a.answer.noul,
          }) + "\n",
        );
    }

    if (result.status === "fail" || result.status === "inconclusive") {
      mkdirSync(this.evidenceDir, { recursive: true });
      const shot = join(this.evidenceDir, `${this.o.scenario.test_id}-step${step.step_id}.png`);
      await this.page.screenshot({ path: shot, fullPage: true }).then(() => result.evidence!.push(this.rel(shot))).catch(() => {});
    }
    if (notes.length) result.note = this.vars.mask(notes.join(" · "));
    if (!result.evidence!.length) delete result.evidence;
    return result;
  }

  // ---------------------------------------------------------------- actions
  private async act(a: Action, checks: Check[]): Promise<void> {
    const loc = () => build(this.page, a.locator!);
    const val = () => this.vars.resolve(a.value ?? "");
    const t = { timeout: ACTION_TIMEOUT };
    switch (a.action) {
      case "goto": await this.page.goto(this.vars.resolve(a.url!), t); return;
      case "reload": await this.page.reload(t); return;
      case "go_back": await this.page.goBack(t); return;
      case "click": await loc().click(t); return;
      case "fill": await loc().fill(val(), t); return;
      case "clear": await loc().clear(t); return;
      case "select": await loc().selectOption({ label: val() }, t); return;
      case "check": await loc().check(t); return;
      case "uncheck": await loc().uncheck(t); return;
      case "press": a.locator ? await loc().press(val(), t) : await this.page.keyboard.press(val()); return;
      case "hover": await loc().hover(t); return;
      case "upload": await loc().setInputFiles(resolve(process.env.TAA_FIXTURES_ROOT ?? join(RUNNER_DIR, ".."), val()), t); return;
      case "wait_for": await loc().waitFor({ state: a.state!, timeout: ACTION_TIMEOUT }); return;
      case "set_viewport": await this.page.setViewportSize(VIEWPORTS[a.viewport!]); return;
      case "api_call": await this.apiCall(a, checks); return;
    }
  }

  private async apiContext(auth: string): Promise<{ ctx: APIRequestContext; headers: Record<string, string> }> {
    const tokenFor = (key: string) => process.env[key];
    if (auth === "none") {
      const ctx = await this.o.playwright.request.newContext();
      this.apiContexts.push(ctx);
      return { ctx, headers: {} };
    }
    if (auth === "session") {
      const role = this.o.scenario.preconditions.auth.role;
      const token = role ? tokenFor(`TAA_API_TOKEN_${roleKey(role)}`) : tokenFor("TAA_API_TOKEN");
      return { ctx: this.context.request, headers: token ? { authorization: `Bearer ${token}` } : {} };
    }
    const role = auth.slice("role:".length);
    const key = roleKey(role);
    const state = process.env[`TAA_AUTH_STATE_${key}`];
    const token = tokenFor(`TAA_API_TOKEN_${key}`);
    if (!state && !token) throw new BlockedError(`rol "${role}" için TAA_AUTH_STATE_${key} veya TAA_API_TOKEN_${key} yok`);
    const ctx = await this.o.playwright.request.newContext(state ? { storageState: state } : {});
    this.apiContexts.push(ctx);
    return { ctx, headers: token ? { authorization: `Bearer ${token}` } : {} };
  }

  private async apiCall(a: Action, checks: Check[]): Promise<void> {
    const rq = a.request!;
    const ex = a.expect!;
    const { ctx, headers } = await this.apiContext(rq.auth ?? "session");
    const path = this.vars.resolve(rq.path);
    const began = Date.now();
    const res = await ctx.fetch(this.o.apiBaseUrl + path, {
      method: rq.method,
      headers: { ...headers, ...this.vars.resolveDeep(rq.headers ?? {}) },
      ...(rq.query ? { params: this.vars.resolveDeep(rq.query) } : {}),
      ...(rq.body !== undefined ? { data: this.vars.resolveDeep(rq.body) } : {}),
      timeout: ACTION_TIMEOUT,
      failOnStatusCode: false,
      maxRedirects: 0,
    });
    const ms = Date.now() - began;
    const text = await res.text();
    this.lastApi = { method: rq.method, path, status: res.status(), statusText: res.statusText(), ms, body: text };
    let body: unknown = undefined;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    const label = `${rq.method} ${path}`;
    checks.push({ ok: res.status() === ex.status, label: `${label} durum ${ex.status}`, message: `gelen ${res.status()}` });
    for (const k of ex.body_has_keys ?? [])
      checks.push({ ok: getPath(body, k) !== undefined, label: `${label} gövdede "${k}" var` });
    if (ex.body_contains)
      checks.push({ ok: isSubset(this.vars.resolveDeep(ex.body_contains), body), label: `${label} gövde ${JSON.stringify(ex.body_contains)} içeriyor` });
    for (const k of ex.body_not_contains_keys ?? [])
      checks.push({ ok: !hasKeyDeep(body, k), label: `${label} gövdede "${k}" YOK` });
    if (ex.max_ms !== undefined) checks.push({ ok: ms <= ex.max_ms, label: `${label} ≤ ${ex.max_ms} ms`, message: `${ms} ms` });
  }

  // ------------------------------------------------------------- assertions
  private async check(a: Assertion): Promise<Check> {
    const timeout = a.timeout_ms ?? ASSERT_TIMEOUT;
    const l = () => build(this.page, a.locator!);
    const v = () => this.vars.resolve(a.value ?? "");
    const label = `${a.type}${a.locator ? ` ${describe(a.locator)}` : ""}${a.value !== undefined ? ` "${a.value}"` : ""}`;
    try {
      switch (a.type) {
        case "visible": await expect(l()).toBeVisible({ timeout }); break;
        case "hidden": await expect(l()).toBeHidden({ timeout }); break;
        case "enabled": await expect(l()).toBeEnabled({ timeout }); break;
        case "disabled": await expect(l()).toBeDisabled({ timeout }); break;
        case "checked": await expect(l()).toBeChecked({ timeout }); break;
        case "focused": await expect(l()).toBeFocused({ timeout }); break;
        case "text_contains": await expect(l()).toContainText(v(), { timeout }); break;
        case "text_equals": await expect(l()).toHaveText(v(), { timeout }); break;
        case "value_equals": await expect(l()).toHaveValue(v(), { timeout }); break;
        case "count":
          if (a.eq !== undefined) await expect(l()).toHaveCount(a.eq, { timeout });
          if (a.gte !== undefined) await expect.poll(() => l().count(), { timeout }).toBeGreaterThanOrEqual(a.gte);
          if (a.lte !== undefined) await expect.poll(() => l().count(), { timeout }).toBeLessThanOrEqual(a.lte);
          break;
        case "url_matches": await expect(this.page).toHaveURL(new RegExp(v()), { timeout }); break;
        case "title_contains": await expect(this.page).toHaveTitle(new RegExp(escapeRegex(v())), { timeout }); break;
        case "no_console_errors":
          if (this.consoleErrors.length) return { ok: false, label, message: this.consoleErrors.slice(0, 3).join(" | ") };
          break;
        case "network_no_errors": {
          await this.page.waitForLoadState("networkidle", { timeout }).catch(() => {});
          const bad = this.responses.filter((r) => r.status >= 400 && urlMatches(r.url, a.url_pattern ?? ""));
          if (bad.length) return { ok: false, label, message: bad.slice(0, 3).map((r) => `${r.status} ${r.method} ${new URL(r.url).pathname}`).join(", ") };
          break;
        }
        case "response": {
          const latest = () =>
            this.responses.filter((r) => urlMatches(r.url, a.url_pattern!) && (!a.method || r.method === a.method)).at(-1)?.status ?? null;
          await expect.poll(latest, { timeout, message: `${a.method ?? ""} ${a.url_pattern}` }).toBe(a.status);
          break;
        }
        case "a11y_no_violations": {
          const min = IMPACT_RANK[a.impact ?? "serious"];
          const report = await new AxeBuilder({ page: this.page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          const bad = report.violations.filter((x) => IMPACT_RANK[(x.impact ?? "minor") as keyof typeof IMPACT_RANK] >= min);
          if (bad.length) return { ok: false, label, message: bad.map((x) => `${x.id} (${x.impact}, ${x.nodes.length} öğe)`).join(", ") };
          break;
        }
      }
      return { ok: true, label };
    } catch (e) {
      if (e instanceof BlockedError) throw e;
      return { ok: false, label, message: firstLine(e) };
    }
  }

  // ------------------------------------------------------------ observation
  /** What Laya "sees": the text model reads the page as URL + title + alerts + accessibility tree. */
  private async observePage(): Promise<string> {
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    const url = new URL(this.page.url());
    const parts = [`Sayfa adresi: ${url.pathname}${url.search}`, `Sekme başlığı: ${await this.page.title().catch(() => "")}`];
    const alerts = (await this.page.getByRole("alert").allInnerTexts().catch(() => [] as string[])).map((s) => s.trim()).filter(Boolean);
    if (alerts.length) parts.push(`Uyarı mesajları: ${alerts.join(" | ")}`);
    const dialogs = (await this.page.getByRole("dialog").allInnerTexts().catch(() => [] as string[])).map((s) => s.trim()).filter(Boolean);
    if (dialogs.length) parts.push(`Açık pencere: ${dialogs.join(" | ")}`);
    let tree = await this.page.locator("body").ariaSnapshot({ timeout: ASSERT_TIMEOUT }).catch(() => "");
    if (!tree) tree = (await this.page.locator("body").innerText().catch(() => "")).slice(0, 6000);
    parts.push("Ekrandaki öğeler:", tree);
    return this.vars.mask(parts.join("\n"));
  }

  private observeApi(): string {
    const r = this.lastApi;
    if (!r) return "HTTP isteği yapılmadı.";
    return this.vars.mask(
      [`HTTP isteği: ${r.method} ${r.path}`, `Yanıt durumu: ${r.status} ${r.statusText}`, `Süre: ${r.ms} ms`, `Yanıt gövdesi: ${r.body.slice(0, 4000) || "(boş)"}`].join("\n"),
    );
  }

  private rel(p: string): string {
    return relative(this.o.resultsDir, p);
  }
}

/**
 * Step status per judge mode (runner/README.md § Karar modları):
 * shadow (default) = assertions decide, Laya is asked and recorded but never changes the status;
 * assertions = no model at all; both = assertions AND Laya must agree; laya = Laya alone decides.
 */
function decide(
  mode: JudgeMode,
  s: { blocked: string | null; actionError: string | null; failed: number; checks: number; verdict: { status: string } | null },
): StepStatus {
  if (s.blocked) return "blocked";
  if (s.actionError) return "fail";
  const laya = s.verdict?.status as StepStatus | undefined;
  if (mode === "assertions" || mode === "shadow") return s.failed ? "fail" : s.checks ? "pass" : "skipped";
  if (mode === "laya") return laya ?? "skipped";
  if (s.failed || laya === "fail") return "fail";
  if (laya === "inconclusive") return "inconclusive";
  return laya || s.checks ? "pass" : "skipped";
}

export function rollUp(steps: StepResult[]): StepStatus {
  const has = (st: StepStatus) => steps.some((s) => s.status === st);
  if (has("fail")) return "fail";
  if (has("blocked")) return "blocked";
  if (has("inconclusive")) return "inconclusive";
  if (steps.length && steps.every((s) => s.status === "skipped")) return "skipped";
  return "pass";
}

function getPath(body: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, k) => (cur && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined), body);
}

function hasKeyDeep(body: unknown, key: string): boolean {
  if (Array.isArray(body)) return body.some((v) => hasKeyDeep(v, key));
  if (body && typeof body === "object")
    return Object.entries(body).some(([k, v]) => k === key || hasKeyDeep(v, key));
  return false;
}

function isSubset(expected: unknown, actual: unknown): boolean {
  if (expected && typeof expected === "object" && !Array.isArray(expected))
    return !!actual && typeof actual === "object" &&
      Object.entries(expected).every(([k, v]) => isSubset(v, (actual as Record<string, unknown>)[k]));
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.every((v) => actual.some((x) => isSubset(v, x)));
  return expected === actual;
}
