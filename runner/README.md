# TAA senaryo koşucusu — Playwright + Laya

`/taa:writetest` ve `/taa:start` (QA-A) tarafından yazılan test senaryosu
setlerini ([`SCHEMA.md`](../templates/taa/test-scenarios/SCHEMA.md))
**headless Playwright ile** koşar. Her adımda iki şey olur:

1. `automation.actions` + `assertions` Playwright'ta birebir çalışır
   (deterministik kontrol).
2. Adımın `laya_question`'ı yerel **Laya multilingual ONNX** modeline
   sorulur ([`models/laya/`](../models/laya/README.md)). Laya bir metin
   modelidir, ekran görüntüsü görmez. Ona verilen gözlem şudur: sayfa adresi,
   sekme başlığı, uyarılar, açık pencereler ve Playwright'ın erişilebilirlik
   ağacı (ARIA snapshot). `channel: "api"` adımlarında ise HTTP yanıtı
   (durum + gövde) verilir.

Sonuç `<set>/results/<YYYYMMDD-HHMMSS>-playwright.json` dosyasına
(`result.schema.json`) yazılır. Başarısız adımlar için ekran görüntüsü ve
Playwright trace'i `results/evidence/<stamp>/` altına düşer; HTML rapor
`runner/playwright-report/` altındadır.

```
runner/
  laya-judge/        .NET 10 Laya yargıcı (ONNX Runtime + HF tokenizers) — JSON-lines sidecar
  src/               Playwright koşucusu (TypeScript)
  selftest/          örnek seti gerçek bir giriş uygulamasına karşı koşan uçtan uca self-test
```

## Gereksinimler

- Node 20+ ve `npm install` (Playwright 1.63, axe-core), ardından `npx playwright install chromium`
- Laya kullanılacaksa: .NET 10 SDK (yargıç ilk koşuda otomatik derlenir) ve
  model (`scripts/taa-laya-model.sh`)
- Set doğrulaması için `python3` (`scripts/taa-scenarios.py`)

## Koşmak

```bash
cd runner
npm install && npx playwright install chromium

BASE_URL=http://localhost:3001 \
API_BASE_URL=http://localhost:5080 \
TAA_SCENARIOS=../.taa/runs/<run-id>/test-scenarios \
TEST_USER_EMAIL=… TEST_USER_PASSWORD=… \
npm run scenarios
```

| Değişken | Anlamı |
|---|---|
| `TAA_SCENARIOS` | senaryo seti dizini (`index.json` içeren) — **zorunlu** |
| `BASE_URL` / `API_BASE_URL` | hedef (API yoksa BASE_URL). Yalnızca local/staging kabul edilir; production'a benzeyen host reddedilir (QA kuralı 1). Gerçek bir test ortamı reddediliyorsa `TAA_ALLOWED_HOSTS=host1,host2` |
| `TAA_JUDGE` | karar modu — aşağıya bakın (varsayılan `shadow`) |
| `TAA_LEVEL` | `light` / `normal` / `hard` — setin seviyesinden düşükse yalnız o seviyeye kadar koşar |
| `TAA_ONLY` | `TC-SMOKE-001,TC-NEG-003` — yalnız bu senaryolar |
| `{{env.X}}` değerleri | senaryonun istediği her ortam değişkeni (index.json → `env.required`). Eksikse senaryo `blocked` olur |
| `TAA_AUTH_STATE_<ROL>` | `preconditions.auth.mode: role` için Playwright storageState dosyası. Rol adı büyük harf/alt çizgi: "Muhasebe Uzmanı" → `TAA_AUTH_STATE_MUHASEBE_UZMANI`. `templates/qa-kit/examples/auth.setup.ts` ile üretilir |
| `TAA_API_TOKEN` / `TAA_API_TOKEN_<ROL>` | `api_call` için Bearer token (çerez tabanlı olmayan API'ler) |
| `LAYA_MODEL_DIR` | model dizini (varsayılan `models/laya/v4`, sonra `~/.taa/models/laya/v4`) |
| `TAA_SAVE_OBSERVATIONS=1` | Laya'ya verilen gözlem metnini adım başına `evidence/` altına kaydeder |
| `TAA_LAYA_DATASET=1` | assertion'larla doğrulanmış adımlardan etiketli eğitim verisi üretir: `results/laya-dataset-<stamp>.jsonl` |
| `TAA_SCENARIO_TIMEOUT_MS`, `TAA_ACTION_TIMEOUT_MS`, `TAA_ASSERT_TIMEOUT_MS` | 180000 / 15000 / 5000 |

Kimlik bilgileri gözlemlerden, notlardan ve dataset'ten maskelenir (`●●●●`):
adı PASSWORD/SECRET/TOKEN/API_KEY içeren her `{{env.*}}` değeri ve
`test_data` anahtarı bu kapsamdadır.

## Karar modları (`TAA_JUDGE`)

| Mod | Adımın sonucu | Ne zaman |
|---|---|---|
| `shadow` (varsayılan) | assertion'lar belirler; Laya her soruyu cevaplar, cevabı ve uyuşup uyuşmadığı sonuç dosyasına yazılır ama sonucu **etkilemez** | bugünkü model ile her zaman |
| `assertions` | yalnız assertion'lar, model hiç yüklenmez (.NET gerekmez) | CI, hızlı koşu |
| `both` | assertion'lar **ve** Laya aynı sonuca varmalı; Laya kararsızsa (`noul` null bandı) adım `inconclusive` | ölçümü geçmiş bir model ile |
| `laya` | yalnız Laya | modeli kalibre ederken |

Yalnızca yargı içeren adımlar (assertion'ı olmayan `choice` / `score`)
`shadow` ve `assertions` modlarında `skipped` + `judgement_only: true` olarak
kaydedilir; asla "geçti" sayılmaz.

### Laya'nın güvenilirliği — neden varsayılan `shadow`

v4 modeli (genel amaçlı, 322M, metin) sayfa durumuyla ilgili evet/hayır
sorularında ölçüldü: 12 dengeli soruda denenen her gözlem formatında
**5–7/12** doğru. Model, sorudaki konu gözlemde geçiyorsa ifadenin doğru olup
olmadığına bakmadan "evet" diyor. Self-test'teki `SELFTEST_BUG=message`
koşusu bunu gösteriyor: uyarı metni yanlış olduğu halde Laya "hatalı ibareli
uyarı var mı?" sorusuna 1.000 ile *evet* dedi; hatayı `text_contains`
assertion'ı yakaladı. Ayrıntı: [`models/laya/README.md`](../models/laya/README.md).

Yolu açık bırakan iki şey var:
- `TAA_LAYA_DATASET=1` her koşuda assertion'larla etiketlenmiş
  `(gözlem, soru, doğru cevap)` satırları biriktirir. Bu veri, Laya'yı bu
  göreve fine-tune etmek için hazır bir eğitim setidir.
- Daha iyi bir model aynı ölçümü geçtiğinde `TAA_JUDGE=both` ile karar
  yetkisi verilir; koşucu kodunda değişiklik gerekmez.

## Self-test

```bash
npm run selftest                          # örnek set, temiz uygulama → 5/5 geçmeli
SELFTEST_BUG=message npm run selftest     # yanlış hata metni → TC-NEG-001 kalmalı
SELFTEST_BUG=leak npm run selftest        # 401 gövdesinde token → TC-API-001 kalmalı
SELFTEST_BUG=a11y npm run selftest        # etiketsiz şifre alanı → 4 senaryo kalmalı
TAA_JUDGE=assertions npm run selftest     # modelsiz
```

`selftest/app.mjs`, örnek setin tarif ettiği giriş uygulamasıdır
(`/login`, `POST /api/auth/login` 200/400/401, `/panel`). Kimlik bilgileri
her koşuda rastgele üretilir.

## Laya yargıcı tek başına

```bash
npm run build:judge
npm run judge:ask -- --type noul --question "Ekranda hata mesajı var mı?" --state "Sayfa adresi: /login …"
```

`serve` modu JSON-lines protokolüyle çalışır: her satırda bir istek gelir
(`{"id","type","instructions","criteria","state"}`), her satıra bir cevap
döner (`noul` p(evet) / `choice` / `score`, olasılıklar, güven,
`act_probability`, token sayısı, `state_truncated`). Prompt yapısı ve
kalibrasyon upstream Laya (`laya_mlx.common` / `laya_mlx.agent`) ile
aynıdır. Kodlama çekirdeği Laya guardrail konsolununkiyle ortaktır; aynı
girdilerde olasılıklar 4.9 × 10⁻⁷ içinde eşleşir.
