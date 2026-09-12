---
name: test-plan
description: Keşif çıktısından insan tarafından okunabilir test senaryoları üretir — smoke, fonksiyonel, entegrasyon, sistem, kabul, regresyon, negatif, güvenlik, erişilebilirlik, performans ve yük senaryoları dahil. Henüz KOD YAZMAZ. "test senaryolarını yaz", "test planı hazırla", "acceptance kriterleri çıkar" isteklerinde kullanılır.
---

# Test Plan — Senaryo Yazımı

Ön koşul: `docs/qa/00-discovery.md` mevcut olmalı. Yoksa önce `test-discovery` çalıştır.

Bu aşamada **kod yazılmaz**. Amaç, geliştirici olmayan birinin de okuyup onaylayabileceği senaryolar üretmek.

## Kapsam katmanları

Her katman için ayrı dosya üret. Boş kalan katmanı "kapsam dışı, gerekçe: ..." diye işaretle, sessizce atlama.

| Katman | Dosya | Ne test edilir | Nerede koşar |
|---|---|---|---|
| Smoke | `docs/qa/10-smoke.md` | Sistem ayakta mı, kritik 5-10 akış | Her deploy sonrası, <3 dk |
| Fonksiyonel (UI) | `docs/qa/20-functional-ui.md` | Route/form/etkileşim davranışları | Headless browser |
| API / Entegrasyon | `docs/qa/30-api-integration.md` | Endpoint sözleşmesi, servisler arası akış | HTTP client |
| Sistem (E2E) | `docs/qa/40-system-e2e.md` | Uçtan uca iş akışı, FE+BE+DB birlikte | Headless browser + DB doğrulama |
| Kabul (UAT) | `docs/qa/50-acceptance.md` | İş kuralı, Given/When/Then | Headless browser |
| Negatif & sınır | `docs/qa/60-negative.md` | Hatalı girdi, yetkisiz erişim, sınır değerler | Karma |
| Regresyon | `docs/qa/70-regression.md` | Geçmiş bug'lar, kritik akışlar | Karma |
| Güvenlik (temel) | `docs/qa/80-security.md` | Authz bypass, IDOR, rate limit, input sanitization | API + browser |
| Erişilebilirlik | `docs/qa/85-a11y.md` | WCAG AA, klavye navigasyonu, kontrast | Headless browser |
| Performans | `docs/qa/90-performance.md` | Sayfa yükleme, Core Web Vitals, API p95 | Lighthouse + k6 |
| Yük / stres | `docs/qa/95-load.md` | Eşzamanlılık, dayanıklılık, kırılma noktası | k6 |

## Senaryo formatı

Her senaryo şu alanları içermeli:

```
### TC-<KATMAN>-<NNN>: <Kısa başlık>

- **Öncelik:** P0 | P1 | P2   (P0 = smoke'a girer)
- **Kapsam:** UI | API | E2E | Perf
- **Ön koşul:** hangi seed veri, hangi kullanıcı rolü, hangi feature flag
- **Test verisi:** somut değerler (kullanıcı: qa_admin@test.local, ürün ID: 1001)
- **Adımlar:**
  1. Given ...
  2. When ...
  3. Then ...
- **Beklenen sonuç:** gözlemlenebilir, ölçülebilir ifade
- **Doğrulama noktaları:** UI assertion + API status/body + DB kaydı (uygulanabilir olanlar)
- **Temizlik:** test sonrası ne geri alınacak
- **İzlenebilirlik:** hangi route/endpoint/gereksinim
- **Otomasyon:** evet | hayır (gerekçe) | manuel
```

## Kurallar

1. **Ölçülebilir yaz.** "Sayfa düzgün açılır" değil; "başlık `h1` metni 'Siparişlerim' olur ve tablo en az 1 satır içerir".
2. **Bağımsız senaryo.** Her TC kendi ön koşulunu kurar, başka TC'nin çıktısına dayanmaz.
3. **Somut veri.** Placeholder bırakma; seed'e eklenmesi gereken veriyi açıkça yaz.
4. **Performans senaryolarında eşik zorunlu:** "p95 < 400ms", "LCP < 2.5s", "hata oranı < %1". Eşiksiz performans senaryosu yazma — kullanıcıya sor.
5. **Yük senaryolarında profil zorunlu:** sanal kullanıcı sayısı, ramp-up süresi, plato süresi, hedef RPS.
6. Discovery'deki kritiklik skoru yüksek olan yüzeyler P0 olur.

## Çıktı

Yukarıdaki dosyalara ek olarak `docs/qa/01-test-plan.md` yaz:
kapsam, kapsam dışı, ortam gereksinimleri, giriş/çıkış kriterleri, risk-tabanlı öncelik, izlenebilirlik matrisi (route/endpoint → TC listesi).

Bitince DUR. Otomasyona geçmeden önce kullanıcıdan senaryo onayı iste ve kaç senaryo çıktığını özetle.
