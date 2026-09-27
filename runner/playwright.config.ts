import { defineConfig, devices } from "@playwright/test";

// One worker, no retries: scenarios run in index.json order, and a red scenario is
// root-caused, never retried green (CLAUDE.md QA rule 7). Each test opens its own browser
// context (auth storageState, viewport, trace) inside src/scenarios.spec.ts.
export default defineConfig({
  testDir: "./src",
  testMatch: "scenarios.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: Number(process.env.TAA_SCENARIO_TIMEOUT_MS ?? 180_000),
  expect: { timeout: Number(process.env.TAA_ASSERT_TIMEOUT_MS ?? 5_000) },
  globalSetup: "./src/global-setup.ts",
  globalTeardown: "./src/global-teardown.ts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { headless: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
