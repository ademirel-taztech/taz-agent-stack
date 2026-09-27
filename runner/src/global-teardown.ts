import { spawnSync } from "node:child_process";
import { isAbsolute, relative } from "node:path";

import { assertSafeTarget, findValidator, loadSet, settings } from "./lib/config.ts";
import { assemble } from "./lib/results.ts";

export default async function globalTeardown(): Promise<void> {
  const s = settings();
  const stamp = process.env.TAA_RUN_STAMP;
  if (!stamp) return;
  const { index } = loadSet(s.scenariosDir, s.level, s.only);
  const detail =
    s.judge === "assertions"
      ? "Playwright headless · judge=assertions (Laya kapalı)"
      : `Playwright headless · Laya multilingual ONNX (${process.env.TAA_MODEL_DIR ?? "?"}) · judge=${s.judge}`;
  const out = assemble({
    scenariosDir: s.scenariosDir,
    stamp,
    runId: index.run_id,
    level: s.level ?? index.level,
    baseUrl: s.baseUrl,
    kind: assertSafeTarget(s.baseUrl, "BASE_URL"),
    detail,
  });
  if (!out) return;
  const sm = out.summary;
  console.log(
    `\n[taa-runner] sonuç: ${sm.pass}/${sm.total} geçti · ${sm.fail} kaldı · ${sm.inconclusive} kararsız · ${sm.blocked} engelli · ${sm.skipped} atlandı`,
  );
  const shown = relative(process.cwd(), out.path);
  console.log(`[taa-runner] sonuç dosyası: ${shown.startsWith("..") || isAbsolute(shown) ? out.path : shown}`);
  const validator = findValidator();
  if (validator) {
    const r = spawnSync("python3", [validator, "validate", s.scenariosDir], { encoding: "utf8" });
    if (!r.error && r.status !== 0) console.error(`[taa-runner] result file failed validation:\n${r.stdout}${r.stderr}`);
  }
}
