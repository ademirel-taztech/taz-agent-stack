# Test Planı — <Proje>

**Sürüm:** <commit sha> | **Tarih:** <> | **Hazırlayan:** QA agent

## 1. Kapsam
Test edilecek uygulamalar, modüller ve yüzeyler.

## 2. Kapsam dışı
Test edilmeyecekler ve **gerekçeleri**. (Sessizce atlanan hiçbir şey olmamalı.)

## 3. Test ortamı
| Bileşen | Değer |
|---|---|
| Ortam | local / staging |
| Base URL | http://localhost:3000 |
| API URL | http://localhost:4000 |
| DB | ephemeral postgres (tmpfs) |
| 3. parti | WireMock (ödeme, e-posta) |
| Tarayıcılar | Chromium, WebKit, Pixel 7 emülasyonu |

## 4. Test verisi ve roller
| Rol | Kullanıcı | Yetkiler |
|---|---|---|
| user | qa_user@test.local | kendi siparişleri |
| admin | qa_admin@test.local | tüm siparişler, kullanıcı yönetimi |

## 5. Risk tabanlı önceliklendirme
| Yüzey | İş etkisi (1-5) | Sıklık (1-5) | Skor | Öncelik |
|---|---|---|---|---|

## 6. Katman kapsamı
| Katman | Senaryo sayısı | Otomatik | Manuel |
|---|---|---|---|
| Smoke | | | |
| Fonksiyonel UI | | | |
| API / Entegrasyon | | | |
| Sistem E2E | | | |
| Kabul | | | |
| Negatif & sınır | | | |
| Güvenlik | | | |
| Erişilebilirlik | | | |
| Performans | | | |
| Yük | | | |

## 7. Performans eşikleri
| Metrik | Hedef | Kaynak |
|---|---|---|
| API p95 | < 500 ms | <SLO / varsayım> |
| API p99 | < 1200 ms | |
| Hata oranı | < %1 | |
| LCP | < 2.5 s | Core Web Vitals |
| CLS | < 0.1 | |

## 8. Giriş kriterleri
Ortam ayakta, seed uygulandı, build yeşil.

## 9. Çıkış kriterleri
P0 senaryoların %100'ü geçti, P1'lerin ≥%95'i geçti, kritik/yüksek bug yok, eşik ihlali yok.

## 10. İzlenebilirlik matrisi
| Yüzey (route/endpoint) | Kapsayan TC'ler | Durum |
|---|---|---|

## 11. Riskler ve varsayımlar
Testability engelleri, eksik testid'ler, mock'lanamayan bağımlılıklar, varsayılan eşikler.
