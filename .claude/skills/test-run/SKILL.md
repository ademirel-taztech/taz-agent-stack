---
name: test-run
description: Test paketini çalıştırır, hataları ayıklayıp triage eder ve okunabilir bir QA raporu üretir. Başarısız testin uygulama bug'ı mı yoksa test bug'ı mı olduğunu kanıtla ayırır. "testleri çalıştır", "neden kırmızı", "QA raporu çıkar" isteklerinde kullanılır.
---

# Test Run — Koşum, Triage ve Raporlama

## Koşum sırası

Hızlıdan yavaşa. Erken kırılırsa sonrakileri koşturma, zaman harcama.

1. `unit` → 2. `api` → 3. `contract` → 4. `smoke e2e` → 5. `full e2e` → 6. `a11y` → 7. `lighthouse` → 8. `k6 load`

Yük testini her zaman en sona bırak ve yalnızca diğerleri yeşilken çalıştır.

## Ortam ön kontrolü

Koşumdan önce doğrula: servisler ayakta mı, health endpoint 200 dönüyor mu, seed uygulandı mı, doğru ortama (localhost/staging) bakıyor mu. Hedef production ise **DUR** ve kullanıcıya sor.

## Triage protokolü

Başarısız her test için sırayla:

1. **Kanıt topla:** Playwright trace, screenshot, konsol logu, network logu, sunucu logu
2. **Sınıflandır:**
   - `BUG` — uygulama hatalı davranıyor
   - `TEST-BUG` — locator/assertion/kurulum hatalı
   - `FLAKY` — 3 koşumdan en az 1'inde geçiyor
   - `ENV` — servis kapalı, seed eksik, config yanlış
   - `SPEC` — beklenti belirsiz, karar gerekiyor
3. **Kanıt göster:** sınıflandırmayı gerekçelendir. "Muhtemelen" deme; hangi log satırı, hangi network yanıtı?
4. **Aksiyon:** TEST-BUG ve ENV'yi düzelt. BUG'ı **düzeltme** — raporla. Uygulama kodunu değiştirmek için kullanıcıdan açık onay iste.

Flaky testi retry ile gizleme. Kök nedeni yaz (yarış durumu, animasyon, sabit bekleme, paylaşılan veri).

## Bug raporu formatı

```
### BUG-<NNN>: <başlık>
- İlgili senaryo: TC-...
- Şiddet: kritik | yüksek | orta | düşük
- Ortam: <url, commit sha, tarayıcı>
- Tekrar adımları: 1... 2... 3...
- Beklenen / Gözlenen
- Kanıt: trace yolu, screenshot yolu, ilgili log satırı
- Şüpheli kaynak: dosya:satır (bulabildiysen)
```

## Rapor

`docs/qa/reports/<tarih>-report.md` üret:

- Özet tablo: katman başına toplam / geçen / kalan / atlanan / süre
- İzlenebilirlik: hangi TC koştu, hangisi kapsanmadı
- Bug listesi (şiddet sıralı)
- Performans sonuçları: k6 p95/p99, hata oranı, eşik ihlalleri; Lighthouse skorları
- Kapsam boşlukları ve sonraki adım önerileri

Rapor iddialı değil, dürüst olmalı. Koşmayan testi "geçti" sayma; atlanan senaryoyu ayrı sütunda göster.
