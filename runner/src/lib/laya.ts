import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

import { JUDGE_DLL } from "./config.ts";
import type { LayaAnswer, Step } from "./types.ts";

interface Pending {
  resolve: (a: LayaAnswer) => void;
  reject: (e: Error) => void;
}

/**
 * Long-lived Laya judge (runner/laya-judge, .NET) over JSON lines on stdin/stdout. One process
 * per Playwright worker: the 650 MB model loads once, each question then costs one forward pass.
 */
export class LayaClient {
  private readonly pending = new Map<string, Pending>();
  private seq = 0;
  private stderr = "";

  private constructor(private readonly proc: ChildProcessWithoutNullStreams) {}

  static start(modelDir: string, timeoutMs = 120_000): Promise<LayaClient> {
    const proc = spawn("dotnet", [JUDGE_DLL, "serve", "--model-dir", modelDir], { stdio: ["pipe", "pipe", "pipe"] });
    const client = new LayaClient(proc);
    proc.stderr.on("data", (d: Buffer) => (client.stderr = (client.stderr + d.toString()).slice(-4000)));
    const lines = createInterface({ input: proc.stdout });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Laya judge did not become ready in ${timeoutMs} ms. ${client.stderr}`)), timeoutMs);
      let ready = false;
      lines.on("line", (line) => {
        const msg = JSON.parse(line) as { ready?: boolean; id?: string; ok?: boolean; error?: string };
        if (!ready) {
          ready = true;
          clearTimeout(timer);
          return msg.ready ? resolve(client) : reject(new Error(`Laya judge failed to start: ${line}`));
        }
        const p = msg.id ? client.pending.get(msg.id) : undefined;
        if (!p) return;
        client.pending.delete(msg.id!);
        if (msg.ok) p.resolve(msg as unknown as LayaAnswer);
        else p.reject(new Error(`Laya: ${msg.error}`));
      });
      proc.on("exit", (code) => {
        clearTimeout(timer);
        const err = new Error(`Laya judge exited (code ${code}). ${client.stderr}`);
        if (!ready) reject(err);
        for (const p of client.pending.values()) p.reject(err);
        client.pending.clear();
      });
    });
  }

  ask(type: string, instructions: string, criteria: unknown, state: string): Promise<LayaAnswer> {
    const id = String(++this.seq);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify({ id, type, instructions, criteria, state }) + "\n");
    });
  }

  async close(): Promise<void> {
    this.proc.stdin.end();
    await new Promise<void>((r) => {
      const t = setTimeout(() => {
        this.proc.kill();
        r();
      }, 5000);
      this.proc.on("exit", () => {
        clearTimeout(t);
        r();
      });
    });
  }
}

/** Laya criteria for a scenario step (upstream question format). */
export function criteriaFor(step: Step): unknown {
  if (step.expected_primitive === "choice")
    return Object.fromEntries((step.options ?? []).map((o) => [o, o.replaceAll("_", " ")]));
  if (step.expected_primitive === "score") {
    const { min, max } = scoreScale(step);
    return Array.from({ length: max - min + 1 }, (_, i) => {
      const v = min + i;
      return v === min ? `${v} (en düşük)` : v === max ? `${v} (en yüksek)` : String(v);
    });
  }
  return null;
}

function scoreScale(step: Step): { min: number; max: number } {
  const s = step.scale!;
  if (!Number.isInteger(s.min) || !Number.isInteger(s.max) || s.max - s.min < 1 || s.max - s.min > 10)
    throw new Error(`score scale ${s.min}-${s.max} must be integers with 2..11 levels for Laya`);
  return s;
}

export interface Verdict {
  status: "pass" | "fail" | "inconclusive";
  answer: boolean | string | number;
  verdict: "match" | "mismatch" | "null";
  note: string;
}

/**
 * Compare Laya's answer with the step's expectation (SCHEMA.md § Primitives).
 * noul: p(yes) >= min_confidence -> yes, <= 1 - min_confidence -> no, otherwise NULL (inconclusive).
 */
export function judge(step: Step, a: LayaAnswer): Verdict {
  const exp = step.expected;
  if (step.expected_primitive === "noul") {
    const p = a.noul ?? 0;
    const c = exp.min_confidence ?? 0.8;
    const said = p >= c ? true : p <= 1 - c ? false : null;
    const shown = `p(evet)=${p.toFixed(3)}`;
    if (said === null) return { status: "inconclusive", answer: round(p), verdict: "null", note: `Laya kararsız: ${shown}, eşik ${c}` };
    const ok = said === exp.answer;
    return {
      status: ok ? "pass" : "fail",
      answer: round(p),
      verdict: ok ? "match" : "mismatch",
      note: `Laya: ${said ? "evet" : "hayır"} (${shown}), beklenen ${exp.answer ? "evet" : "hayır"}`,
    };
  }
  if (step.expected_primitive === "choice") {
    const ok = a.choice === exp.answer;
    return {
      status: ok ? "pass" : "fail",
      answer: a.choice ?? "",
      verdict: ok ? "match" : "mismatch",
      note: `Laya: ${a.choice} (p=${(a.probabilities[a.choice ?? ""] ?? 0).toFixed(3)}), beklenen ${exp.answer}`,
    };
  }
  const { min } = scoreScale(step);
  const value = min + (a.score ?? 0);
  const checks: string[] = [];
  let ok = true;
  if (exp.eq !== undefined) { ok &&= Math.abs(value - exp.eq) <= 0.5; checks.push(`= ${exp.eq}`); }
  if (exp.gte !== undefined) { ok &&= value >= exp.gte; checks.push(`≥ ${exp.gte}`); }
  if (exp.lte !== undefined) { ok &&= value <= exp.lte; checks.push(`≤ ${exp.lte}`); }
  return {
    status: ok ? "pass" : "fail",
    answer: round(value),
    verdict: ok ? "match" : "mismatch",
    note: `Laya puanı ${value.toFixed(2)}, beklenen ${checks.join(" ")}`,
  };
}

const round = (v: number) => Math.round(v * 10_000) / 10_000;
