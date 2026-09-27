import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { JUDGE_DLL, RUNNER_DIR, assertSafeTarget, findValidator, loadSet, resolveModelDir, settings } from "./lib/config.ts";

function newestMtime(dir: string): number {
  let newest = 0;
  for (const name of readdirSync(dir)) {
    if (["bin", "obj"].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    newest = Math.max(newest, st.isDirectory() ? newestMtime(p) : st.mtimeMs);
  }
  return newest;
}

export default async function globalSetup(): Promise<void> {
  const s = settings();
  assertSafeTarget(s.baseUrl, "BASE_URL");
  assertSafeTarget(s.apiBaseUrl, "API_BASE_URL");

  // 1) The set must pass the same mechanical gate the TESTER/QA-A gates use.
  const validator = findValidator();
  if (validator) {
    const r = spawnSync("python3", [validator, "validate", s.scenariosDir], { encoding: "utf8" });
    if (r.error) console.warn(`[taa-runner] python3 not available — skipping scenario validation (${r.error.message})`);
    else if (r.status !== 0) throw new Error(`Scenario set is invalid:\n${r.stdout}${r.stderr}`);
    else console.log(`[taa-runner] ${r.stdout.trim().split("\n").at(-1)}`);
  } else {
    console.warn("[taa-runner] scripts/taa-scenarios.py not found — skipping scenario validation");
  }
  const { scenarios } = loadSet(s.scenariosDir, s.level, s.only);
  if (scenarios.length === 0) throw new Error("No scenarios selected (check TAA_LEVEL / TAA_ONLY).");

  // 2) Laya judge: model present + .NET judge built (rebuilt when its sources change).
  if (s.judge !== "assertions") {
    const modelDir = resolveModelDir();
    if (!modelDir)
      throw new Error("Laya model not found: set LAYA_MODEL_DIR or run scripts/taa-laya-model.sh (or TAA_JUDGE=assertions to run without the model).");
    process.env.TAA_MODEL_DIR = modelDir;
    const src = join(RUNNER_DIR, "laya-judge");
    if (!existsSync(JUDGE_DLL) || statSync(JUDGE_DLL).mtimeMs < newestMtime(src)) {
      console.log("[taa-runner] building Laya judge (dotnet build)…");
      const b = spawnSync("dotnet", ["build", src, "-c", "Release", "-o", join(RUNNER_DIR, ".laya-judge-bin"), "--nologo", "-v", "q"], { encoding: "utf8" });
      if (b.error) throw new Error(`dotnet not available: ${b.error.message} (.NET 10 SDK is required for the Laya judge; or TAA_JUDGE=assertions)`);
      if (b.status !== 0) throw new Error(`Laya judge build failed:\n${b.stdout}${b.stderr}`);
    }
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  process.env.TAA_RUN_STAMP = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  console.log(`[taa-runner] ${scenarios.length} senaryo · judge=${s.judge} · hedef ${s.baseUrl} · run ${process.env.TAA_RUN_STAMP}`);
}
