import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { IndexFile, Level, Scenario } from "./types.ts";

export const RUNNER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const JUDGE_DLL = join(RUNNER_DIR, ".laya-judge-bin", "LayaJudge.dll");
export const LEVEL_ORDER: Record<Level, number> = { light: 0, normal: 1, hard: 2 };

/**
 * shadow (default) = deterministic assertions decide, Laya answers every question alongside and
 * its agreement is recorded; assertions = no model; both = both must agree; laya = the model decides.
 * Shadow is the default because the shipped Laya checkpoint measured at chance level on page-state
 * yes/no questions (runner/README.md § Laya'nın güvenilirliği) — it may not gate a test until a
 * model that passes that measurement replaces it.
 */
export type JudgeMode = "shadow" | "both" | "assertions" | "laya";

export class ConfigError extends Error {}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new ConfigError(`${name} is not set (see runner/README.md)`);
  return v;
}

export function settings() {
  const judge = (process.env.TAA_JUDGE ?? "shadow") as JudgeMode;
  if (!["shadow", "both", "assertions", "laya"].includes(judge))
    throw new ConfigError(`TAA_JUDGE must be shadow|both|assertions|laya, got ${judge}`);
  const level = process.env.TAA_LEVEL as Level | undefined;
  if (level && !(level in LEVEL_ORDER)) throw new ConfigError(`TAA_LEVEL must be light|normal|hard, got ${level}`);
  const baseUrl = required("BASE_URL").replace(/\/+$/, "");
  return {
    scenariosDir: resolve(required("TAA_SCENARIOS")),
    baseUrl,
    apiBaseUrl: (process.env.API_BASE_URL ?? baseUrl).replace(/\/+$/, ""),
    judge,
    level,
    only: (process.env.TAA_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    stamp: process.env.TAA_RUN_STAMP ?? "",
    saveObservations: process.env.TAA_SAVE_OBSERVATIONS === "1",
    layaDataset: process.env.TAA_LAYA_DATASET === "1",
  };
}

const SAFE_TOKENS = /(^|[.-])(staging|stg|test|testing|dev|qa|uat|sandbox|preprod|local)([.-]|$)/i;

/**
 * CLAUDE.md QA rule 1: never run against production. A target passes when it is loopback,
 * a *.local/*.test/*.localhost host, a host with a non-production label (staging, stg, test,
 * dev, qa, uat, sandbox, preprod), or explicitly listed in TAA_ALLOWED_HOSTS by the human.
 */
export function assertSafeTarget(url: string, label: string): "local" | "staging" | "test" {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new ConfigError(`${label} is not a valid URL: ${url}`);
  }
  if (["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "host.docker.internal"].includes(host) || /\.(localhost|local)$/.test(host))
    return "local";
  if (/\.test$/.test(host)) return "test";
  const allowed = (process.env.TAA_ALLOWED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (allowed.includes(host) || SAFE_TOKENS.test(host)) return /test|qa/.test(host) ? "test" : "staging";
  throw new ConfigError(
    `${label} host "${host}" does not look like local/staging. Scenarios never run against production ` +
      `(CLAUDE.md QA rule 1). If this really is a test environment, add it to TAA_ALLOWED_HOSTS.`,
  );
}

export function loadSet(dir: string, level?: Level, only: string[] = []) {
  const indexPath = join(dir, "index.json");
  if (!existsSync(indexPath)) throw new ConfigError(`No index.json in ${dir}`);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as IndexFile;
  const max = LEVEL_ORDER[level ?? index.level];
  const scenarios = index.scenarios
    .filter((e) => LEVEL_ORDER[e.level] <= max)
    .filter((e) => only.length === 0 || only.includes(e.test_id))
    .map((e) => JSON.parse(readFileSync(join(dir, e.file), "utf8")) as Scenario);
  return { index, scenarios };
}

/** LAYA_MODEL_DIR, else <repo>/models/laya/v4 (source checkout), else ~/.taa/models/laya/v4. */
export function resolveModelDir(): string | null {
  const candidates = [
    process.env.LAYA_MODEL_DIR,
    join(RUNNER_DIR, "..", "models", "laya", "v4"),
    join(homedir(), ".taa", "models", "laya", "v4"),
  ].filter((c): c is string => Boolean(c));
  return candidates.find((c) => existsSync(join(c, "model.onnx"))) ?? null;
}

/** scripts/taa-scenarios.py next to the runner: <repo>/scripts (source checkout or installed project). */
export function findValidator(): string | null {
  const c = join(RUNNER_DIR, "..", "scripts", "taa-scenarios.py");
  return existsSync(c) ? c : null;
}
