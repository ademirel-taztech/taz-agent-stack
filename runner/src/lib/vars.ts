import { randomBytes } from "node:crypto";

import type { Scenario } from "./types.ts";

/** A step can't run because the environment lacks something (env var, auth state) — not a product failure. */
export class BlockedError extends Error {}

const VAR = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SECRET_NAME = /(PASS(WORD|WD)?|SECRET|TOKEN|API[_-]?KEY|CREDENTIAL)/i;

export class Vars {
  readonly uid = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  private readonly secrets = new Set<string>();

  constructor(
    private readonly scenario: Scenario,
    private readonly baseUrl: string,
    private readonly apiBaseUrl: string,
  ) {}

  /** Resolve {{BASE_URL}}, {{API_BASE_URL}}, {{env.X}}, {{test_data.k}} and {{run.uid}}. */
  resolve(text: string, depth = 0): string {
    if (depth > 4) throw new Error(`Variable nesting too deep in "${text}"`);
    return text.replace(VAR, (_, name: string) => {
      if (name === "BASE_URL") return this.baseUrl;
      if (name === "API_BASE_URL") return this.apiBaseUrl;
      if (name === "run.uid") return this.uid;
      if (name.startsWith("env.")) {
        const key = name.slice(4);
        const value = process.env[key];
        if (value === undefined || value === "") throw new BlockedError(`ortam değişkeni eksik: ${key}`);
        if (SECRET_NAME.test(key)) this.secrets.add(value);
        return value;
      }
      if (name.startsWith("test_data.")) {
        const key = name.slice(10);
        const value = this.scenario.test_data?.[key];
        if (value === undefined) throw new Error(`test_data.${key} is not defined`);
        const resolved = this.resolve(String(value), depth + 1);
        if (SECRET_NAME.test(key)) this.secrets.add(resolved);
        return resolved;
      }
      throw new Error(`Unknown variable {{${name}}}`);
    });
  }

  /** Deep-resolve every string inside a JSON value (api_call bodies/headers). */
  resolveDeep<T>(value: T): T {
    if (typeof value === "string") return this.resolve(value) as T;
    if (Array.isArray(value)) return value.map((v) => this.resolveDeep(v)) as T;
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.resolveDeep(v)])) as T;
    return value;
  }

  /** Replace every resolved credential value; observations and notes must never carry them. */
  mask(text: string): string {
    let out = text;
    for (const s of this.secrets) if (s.length >= 3) out = out.split(s).join("●●●●");
    return out;
  }
}
