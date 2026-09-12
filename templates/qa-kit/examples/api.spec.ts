import { test, expect } from '@playwright/test';
import { z } from 'zod';

const OrderSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'paid', 'shipped', 'cancelled']),
  total: z.number().nonnegative(),
  createdAt: z.string().datetime(),
});

test.describe('API: /api/orders', () => {
  test('TC-API-010 | mutlu yol: sipariş oluşturulur ve şemaya uyar', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { items: [{ sku: 'SKU-1001', qty: 2 }] },
    });
    expect(res.status()).toBe(201);
    const parsed = OrderSchema.safeParse(await res.json());
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  test('TC-API-011 | validasyon: boş sepet 422 döner', async ({ request }) => {
    const res = await request.post('/api/orders', { data: { items: [] } });
    expect(res.status()).toBe(422);
    expect(await res.json()).toHaveProperty('errors');
  });

  test('TC-API-012 | authz: tokensiz istek 401 döner', async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    const res = await anon.get('/api/orders');
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test('TC-API-013 | IDOR: başka kullanıcının siparişine erişilemez', async ({ playwright }) => {
    const userA = await playwright.request.newContext({ storageState: '.auth/user.json' });
    const created = await userA.post('/api/orders', { data: { items: [{ sku: 'SKU-1001', qty: 1 }] } });
    const { id } = await created.json();

    const userB = await playwright.request.newContext({ storageState: '.auth/admin.json' });
    // NOT: burada "başka bir normal kullanıcı" olmalı; admin'in erişimi meşru olabilir.
    const res = await userB.get(`/api/orders/${id}`);
    expect([403, 404]).toContain(res.status());

    await userA.dispose();
    await userB.dispose();
  });

  test('TC-API-014 | rate limit: eşik aşımında 429 döner', async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 120 }, () => request.get('/api/orders')),
    );
    expect(results.some((r) => r.status() === 429)).toBe(true);
  });
});
