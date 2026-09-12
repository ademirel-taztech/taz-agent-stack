---
name: test-automate
description: Onaylanmış test senaryolarını çalıştırılabilir otomasyon koduna çevirir — Playwright (headless E2E/UI/a11y), API sözleşme testleri, k6 yük ve performans script'leri, seed ve fixture'lar, CI workflow'u. "senaryoları otomatiğe geçir", "playwright testlerini yaz", "k6 load test yaz" isteklerinde kullanılır.
---

# Test Automate — Senaryodan Koda

Ön koşul: `docs/qa/` altında onaylanmış senaryolar olmalı.

## Altın kural: TC ID izlenebilirliği

Her test fonksiyonunun adı TC ID ile başlar. Böylece rapor ile plan eşleşir.

```ts
test('TC-E2E-014 | kullanıcı sepetten ödeme akışını tamamlar', async ({ page }) => { ... })
```

Otomatize edilmeyen senaryoyu `test.skip` ile ve gerekçesiyle bırak — sessizce düşürme.

## Katman → araç eşlemesi

| Katman | Araç | Konum |
|---|---|---|
| UI / E2E / smoke / kabul | Playwright (headless, chromium+firefox+webkit) | `tests/e2e/` |
| Erişilebilirlik | Playwright + `@axe-core/playwright` | `tests/e2e/a11y/` |
| Görsel regresyon | Playwright `toHaveScreenshot` | `tests/e2e/visual/` |
| API / entegrasyon | Playwright `APIRequestContext` veya supertest/pytest | `tests/api/` |
| Sözleşme (OpenAPI) | Schemathesis veya Zod/AJV şema doğrulama | `tests/contract/` |
| Yük / stres / soak | k6 | `tests/load/` |
| Web performans | Lighthouse CI | `tests/perf/` |

Repoda zaten bir framework varsa **onu kullan**, yenisini dayatma. Cypress varsa Cypress'te yaz.

## Playwright kurulum kuralları

- `playwright.config.ts`: `webServer` bloğu ile uygulamayı otomatik ayağa kaldır; `reporter: [['html'], ['junit'], ['list']]`; `trace: 'on-first-retry'`; `screenshot: 'only-on-failure'`; `video: 'retain-on-failure'`
- Auth'u her testte tekrarlama: `storageState` ile rol başına oturum önbelleği (`auth.setup.ts`)
- Locator önceliği: `getByRole` > `getByLabel` > `getByTestId` > CSS. **Asla** kırılgan XPath veya class selector kullanma
- `data-testid` yoksa: kaynak koda testid eklemeyi öner, ekleme yapmadan önce kullanıcıya sor
- `waitForTimeout` yasak. Web-first assertion kullan (`await expect(locator).toBeVisible()`)
- Testler paralel ve izole çalışmalı; her test kendi verisini API üzerinden yaratır, sonunda siler

## API testi kuralları

- Status kodu, response şeması, header'lar ve yan etki (DB/kuyruk) ayrı ayrı doğrulanır
- Negatif durumlar zorunlu: 400 / 401 / 403 / 404 / 409 / 422 / 429
- IDOR kontrolü: A kullanıcısının token'ı ile B kullanıcısının kaynağına eriş — 403 bekle
- OpenAPI varsa response'u şemaya karşı doğrula

## k6 yük testi kuralları

- Her script'te `thresholds` zorunlu — eşiksiz yük testi anlamsızdır
- Senaryo tipleri: `smoke` (1 VU), `load` (beklenen trafik), `stress` (kırılma noktası), `spike` (ani sıçrama), `soak` (uzun süre, memory leak)
- `checks` ile fonksiyonel doğruluk da kontrol edilir (200 dönmesi yetmez, body doğru mu)
- Yük testi **asla** production'a yönlendirilmez; hedef URL env değişkeninden gelir ve varsayılanı localhost'tur

## Test verisi

- `tests/fixtures/seed.ts` (veya eşdeğeri): rol başına test kullanıcıları, referans veri
- Her koşum öncesi deterministik reset: `docker compose down -v && up` veya DB truncate + seed
- Rastgele veri gerektiğinde faker kullan ama seed'i sabitle (tekrarlanabilirlik)

## CI

`.github/workflows/qa.yml` üret:
- PR'da: lint + unit + api + smoke e2e
- main merge'de: tam e2e + a11y + lighthouse
- nightly: load + soak + full regression
- Artefaktlar: Playwright HTML raporu, trace, k6 özet, JUnit XML

## Çıktı

Kod yazdıktan sonra **çalıştır**. Yeşil olduğunu görmeden "hazır" deme.
Kırmızı kalan varsa `test-run` skill'ine geçip triage yap.
