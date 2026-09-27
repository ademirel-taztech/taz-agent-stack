import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Level, ScenarioResult, StepStatus } from "./types.ts";

const partialPath = (dir: string, stamp: string) => join(dir, "results", `.partial-${stamp}.jsonl`);

/** Each finished scenario is appended as one JSON line; global teardown assembles the result file. */
export function appendPartial(scenariosDir: string, stamp: string, r: ScenarioResult): void {
  mkdirSync(join(scenariosDir, "results"), { recursive: true });
  appendFileSync(partialPath(scenariosDir, stamp), JSON.stringify(r) + "\n");
}

/** Writes results/<stamp>-playwright.json per result.schema.json; returns its path (or null if nothing ran). */
export function assemble(opts: {
  scenariosDir: string;
  stamp: string;
  runId: string;
  level: Level;
  baseUrl: string;
  kind: "local" | "staging" | "test";
  detail: string;
}): { path: string; summary: Record<StepStatus | "total", number> } | null {
  const partial = partialPath(opts.scenariosDir, opts.stamp);
  if (!existsSync(partial)) return null;
  const results = readFileSync(partial, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as ScenarioResult);
  const count = (s: StepStatus) => results.filter((r) => r.status === s).length;
  const summary = {
    total: results.length,
    pass: count("pass"),
    fail: count("fail"),
    inconclusive: count("inconclusive"),
    blocked: count("blocked"),
    skipped: count("skipped"),
  };
  // stamp = YYYYMMDD-HHMMSS (local time of the run)
  const [d, t] = [opts.stamp.slice(0, 8), opts.stamp.slice(9, 15).padEnd(6, "0")];
  const doc = {
    schema_version: "1.0",
    run_id: opts.runId,
    executed_at: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`,
    executor: "playwright",
    executor_detail: opts.detail,
    environment: { base_url: opts.baseUrl, kind: opts.kind },
    level: opts.level,
    results,
    summary,
  };
  const out = join(opts.scenariosDir, "results", `${opts.stamp}-playwright.json`);
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
  rmSync(partial);
  return { path: out, summary };
}
