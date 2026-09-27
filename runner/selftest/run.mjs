// End-to-end self-test: serves selftest/app.mjs on a free loopback port, copies the shipped
// example scenario set to a temp dir, and runs the real runner (Playwright + Laya) against it.
// Extra args are passed to `playwright test` (e.g. --reporter=line). Honors TAA_JUDGE.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const runner = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(runner, "..", "templates", "taa", "test-scenarios", "example");
const set = join(mkdtempSync(join(tmpdir(), "taa-selftest-")), "test-scenarios");
cpSync(example, set, { recursive: true });

// Throwaway credentials, generated per run and only ever held in this process tree.
const env = {
  ...process.env,
  TEST_USER_EMAIL: `elif.kaya+${randomBytes(3).toString("hex")}@taz-muhasebe.test`,
  TEST_USER_PASSWORD: `Tz-${randomBytes(9).toString("base64url")}`,
};

const app = spawn(process.execPath, [join(runner, "selftest", "app.mjs")], { env, stdio: ["ignore", "pipe", "inherit"] });
const port = await new Promise((ok, fail) => {
  app.stdout.once("data", (d) => ok(/listening (\d+)/.exec(String(d))?.[1]));
  app.once("exit", (c) => fail(new Error(`self-test app exited (${c})`)));
});
const base = `http://127.0.0.1:${port}`;
console.log(`[selftest] app ${base} · scenarios ${set}`);

const pw = spawn("npx", ["playwright", "test", ...process.argv.slice(2)], {
  cwd: runner,
  stdio: "inherit",
  env: { ...env, BASE_URL: base, API_BASE_URL: base, TAA_SCENARIOS: set },
});
const code = await new Promise((r) => pw.on("exit", r));
app.kill();
console.log(`[selftest] results in ${join(set, "results")}`);
process.exit(code ?? 1);
