---
name: test-discovery
description: Bir repoyu QA gözüyle keşfeder; FE/BE stack'ini, route'ları, API endpoint'lerini, auth akışını, ortam değişkenlerini ve mevcut test altyapısını çıkarır. Test planı yazmadan veya test otomasyonu üretmeden ÖNCE mutlaka çalıştırılır. "Bu repoyu test et", "test planı çıkar", "QA analizi yap" gibi isteklerde tetiklenir.
---

# Test Discovery — Repo QA Keşfi

Amaç: test yazmadan önce **neyi** test edeceğimizi kanıta dayalı çıkarmak.
Tahmin yürütme. Her bulgunun yanına `dosya:satır` referansı yaz.

## Adım 1 — Stack tespiti

Şu dosyaları ara ve oku:

- Paket yöneticileri: `package.json`, `pnpm-lock.yaml`, `requirements.txt`, `pyproject.toml`, `go.mod`, `pom.xml`, `build.gradle`, `Gemfile`, `composer.json`, `*.csproj`
- Orkestrasyon: `docker-compose*.yml`, `Dockerfile*`, `Makefile`, `Procfile`, `k8s/`, `helm/`
- Monorepo: `turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`, `apps/`, `packages/`
- CI: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`

Çıktı: her uygulama için `{ad, tip: fe|be|worker, dil, framework, port, başlatma komutu}`.

## Adım 2 — Frontend yüzey haritası

- Route tanımlarını bul: `app/**/page.tsx`, `pages/**`, `router/*.ts`, `*.routes.ts`, `<Route>` kullanımları
- Her route için: public mi auth'lu mu, hangi rolleri kabul ediyor
- Form ve kritik etkileşimler: `<form>`, submit handler'ları, dosya upload, ödeme, arama
- State/data katmanı: React Query / SWR / Redux / Apollo — hangi endpoint'leri çağırıyor
- `data-testid` / `aria-label` durumu: var mı, yok mu? Yoksa bunu **risk** olarak raporla
- i18n, tema, responsive breakpoint'ler

## Adım 3 — Backend yüzey haritası

- OpenAPI/Swagger dosyası var mı? (`openapi.yaml`, `swagger.json`, `/docs` endpoint'i) — varsa bu altın kaynak
- Yoksa route tanımlarını tara: Express `router.*`, FastAPI dekoratörleri, Spring `@*Mapping`, NestJS controller'ları, Rails `routes.rb`
- Her endpoint için: metod, path, auth gereksinimi, request/response şeması, validasyon kuralları, hata kodları
- GraphQL varsa: schema dosyasından query/mutation listesi
- Yan etkiler: DB yazma, kuyruk mesajı, e-posta, 3. parti çağrısı, webhook

## Adım 4 — Auth ve veri modeli

- Auth mekanizması: session cookie / JWT / OAuth / SSO — token nerede tutuluyor
- Rol ve yetki matrisi: hangi rol neyi görebilir
- DB şeması / migration'lar: temel entity'ler ve ilişkiler
- Seed script'i var mı? Test kullanıcıları nasıl yaratılıyor?

## Adım 5 — Mevcut test envanteri

- Test dosyalarını ve framework'lerini listele (jest, vitest, pytest, playwright, cypress, junit...)
- Coverage raporu üretilebiliyor mu?
- Hangi katmanlar **boş**? (unit var, e2e yok gibi)

## Adım 6 — Ortam ve çalıştırılabilirlik

- `.env.example` içindeki tüm değişkenleri listele
- Uygulama lokalde tek komutla ayağa kalkıyor mu? Kalkmıyorsa eksik ne?
- 3. parti bağımlılıklar: hangileri mock'lanmalı, hangileri sandbox'a bağlanabilir

## Çıktı

`docs/qa/00-discovery.md` dosyasını yaz. Şu bölümler olsun:

1. **Uygulama envanteri** (tablo)
2. **FE route haritası** (tablo: route, auth, kritiklik)
3. **BE endpoint haritası** (tablo: metod, path, auth, yan etki, kritiklik)
4. **Risk listesi** — testability engelleri (testid yok, seed yok, 3. parti mock'lanamıyor vb.)
5. **Açık sorular** — kullanıcıya sorulacaklar

Kritiklik skoru = (iş etkisi 1-5) x (kullanım sıklığı 1-5). Bu skor test planındaki önceliği belirler.

Keşif bittikten sonra DUR. Kullanıcıya özeti sun ve açık soruları sor. Otomatik olarak test yazmaya geçme.
