### TC-<KATMAN>-<NNN>: <Kısa başlık>

| Alan | Değer |
|---|---|
| Öncelik | P0 / P1 / P2 |
| Kapsam | UI / API / E2E / Perf / A11y |
| Otomasyon | evet / hayır (gerekçe) / manuel |
| İlgili yüzey | `/route` veya `POST /api/...` |

**Ön koşul**
- Rol: `qa_user`
- Seed: SKU-1001 stokta, kullanıcının sepeti boş
- Feature flag: `checkout_v2 = on`

**Test verisi**
| Alan | Değer |
|---|---|
| E-posta | qa_user@test.local |
| Ürün | SKU-1001 |

**Adımlar**
1. Given kullanıcı oturum açmış ve `/products` sayfasındadır
2. When SKU-1001 ürününü sepete ekler ve `/checkout` sayfasına gider
3. And geçerli kart bilgisiyle ödemeyi onaylar
4. Then sipariş onay sayfası görüntülenir

**Beklenen sonuç**
- `h1` metni "Siparişiniz alındı"
- Sipariş numarası `#\d{6,}` formatında görünür

**Doğrulama noktaları**
- UI: onay başlığı görünür, sepet rozeti 0 olur
- API: `GET /api/orders/{id}` → 200, `status: "paid"`
- DB: `orders` tablosunda ilgili kayıt, `payments` tablosunda 1 satır
- Yan etki: WireMock ödeme sağlayıcısına 1 istek gitmiş olmalı

**Temizlik**
- Oluşan sipariş silinir, stok geri alınır

**Notlar / riskler**
- Ödeme sağlayıcısı mock; gerçek sandbox testi ayrı TC ile kapsanmalı
