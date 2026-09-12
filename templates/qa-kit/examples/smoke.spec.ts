import { test, expect } from '@playwright/test';

// TC ID'ler docs/qa/10-smoke.md ile eşleşir. Rapor <-> plan izlenebilirliği bundan gelir.

test.describe('Smoke @P0', () => {
  test('TC-SMK-001 | ana sayfa yüklenir ve konsolda hata yoktur', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors, `konsol hataları: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('TC-SMK-002 | sağlık endpointi 200 döner', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  test('TC-SMK-003 | oturum açmış kullanıcı panelini görür', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /panel|dashboard/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('TC-SMK-004 | korumalı sayfa oturumsuz kullanıcıyı login’e yönlendirir', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });
});
