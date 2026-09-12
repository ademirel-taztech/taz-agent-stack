import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';

// Rol başına oturum durumu üretir. Testler login ekranından geçmez.
const ROLES = [
  { name: 'user',  email: 'qa_user@test.local',  password: 'Test1234!' },
  { name: 'admin', email: 'qa_admin@test.local', password: 'Test1234!' },
];

for (const role of ROLES) {
  setup(`auth:${role.name}`, async ({ page, request }) => {
    fs.mkdirSync('.auth', { recursive: true });

    // Tercihen API üzerinden login — UI'dan daha hızlı ve daha az kırılgan.
    const res = await request.post('/api/auth/login', {
      data: { email: role.email, password: role.password },
    });
    expect(res.ok(), `login başarısız: ${role.name}`).toBeTruthy();

    // Cookie tabanlı auth ise request context'ten storage state al:
    await request.storageState({ path: `.auth/${role.name}.json` });

    // Token localStorage'da tutuluyorsa UI tarafına da yaz:
    const { token } = await res.json();
    if (token) {
      await page.goto('/');
      await page.evaluate((t) => localStorage.setItem('access_token', t), token);
      await page.context().storageState({ path: `.auth/${role.name}.json` });
    }
  });
}
