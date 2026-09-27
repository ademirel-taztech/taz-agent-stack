import { test as base, expect } from "@playwright/test";

import { loadSet, settings } from "./lib/config.ts";
import { ScenarioRunner } from "./lib/execute.ts";
import { LayaClient } from "./lib/laya.ts";
import { appendPartial } from "./lib/results.ts";

// One Playwright test per scenario, generated from <TAA_SCENARIOS>/index.json in execution order.
// Test titles keep the TC ID first (CLAUDE.md QA rule 3). See runner/README.md.

const s = settings();
const { scenarios } = loadSet(s.scenariosDir, s.level, s.only);

const test = base.extend<object, { laya: LayaClient | null }>({
  laya: [
    async ({}, use) => {
      if (s.judge === "assertions") return use(null);
      const client = await LayaClient.start(process.env.TAA_MODEL_DIR!);
      await use(client);
      await client.close();
    },
    { scope: "worker", timeout: 180_000 },
  ],
});

for (const scenario of scenarios) {
  test(
    `${scenario.test_id} | ${scenario.test_name}`,
    { tag: [`@${scenario.level}`, `@${scenario.layer}`, `@${scenario.priority}`] },
    async ({ browser, playwright, laya }, testInfo) => {
      const stamp = process.env.TAA_RUN_STAMP!;
      const result = await new ScenarioRunner({
        browser,
        playwright,
        laya,
        judgeMode: s.judge,
        scenario,
        baseUrl: s.baseUrl,
        apiBaseUrl: s.apiBaseUrl,
        resultsDir: `${s.scenariosDir}/results`,
        stamp,
        saveObservations: s.saveObservations,
        layaDataset: s.layaDataset,
      }).run();
      appendPartial(s.scenariosDir, stamp, result);

      for (const step of result.steps)
        testInfo.annotations.push({ type: `step ${step.step_id}: ${step.status}`, description: step.note ?? "" });

      const failing = result.steps.filter((st) => st.status !== "pass" && st.status !== "skipped");
      const summary = failing.map((st) => `  adım ${st.step_id} [${st.status}] ${st.note ?? ""}`).join("\n");
      // blocked = the environment lacks something (env var, auth state) — not a product signal.
      test.skip(result.status === "blocked", `blocked:\n${summary}`);
      test.skip(result.status === "skipped", "no step produced a verdict in this judge mode");
      // fail and inconclusive are both red: inconclusive is never counted as passed.
      expect(result.status, `${scenario.test_id} ${result.status}:\n${summary}`).toBe("pass");
    },
  );
}
