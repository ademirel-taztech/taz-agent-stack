import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,          // retry'ı flaky gizlemek için artırma
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/e2e.xml' }],
  ],

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    testIdAttribute: 'data-testid',
  },

  projects: [
    // 1) Rol başına oturumu bir kez kur, testlerde tekrar login olma
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'smoke',
      testMatch: /tests\/e2e\/smoke\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    },
    {
      name: 'e2e-chromium',
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    },
    {
      name: 'e2e-webkit',
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], storageState: '.auth/user.json' },
    },
    {
      name: 'mobile',
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: '.auth/user.json' },
    },
  ],

  // Uygulamayı testten önce otomatik ayağa kaldır
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: 'docker compose -f docker-compose.test.yml up --build',
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
