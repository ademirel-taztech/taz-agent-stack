---
description: TAA marketing track - route a marketing request to the right marketing skill(s), grounded in .taa/ artifacts (SPEC, DESIGN voice & tone, RESEARCH)
argument-hint: <marketing request, e.g. "launch LinkedIn postu + blog yazısı: lisanslama modülü v2">
---

You are the **TAA Orchestrator** running the **marketing track**. The request:

> $ARGUMENTS

Do not free-style marketing content. Route the request to the bundled marketing skills
(MIT, by Corey Haines — coreyhaines31/marketingskills) and ground every claim.

## 0. Ground in the product (TAA advantage)

If this marketing request is standalone (no active code pipeline), create `.taa/runs/<run-id>/` (Run ID = timestamp-slug + short campaign name) and `<run-dir>/state.md` with `Track: MARKETING`, same as `/taa:start` §0. If a code pipeline is already active in this working tree, reuse its `<run-dir>` and append a MARKETING section to its `state.md` instead of creating a second one.

Before invoking any skill, gather real product context — never invent features:

1. If `<run-dir>/SPEC.md` exists (this run's own, or the active code pipeline's) → product scope, user stories, differentiators.
2. If `<run-dir>/RESEARCH.md` exists → competitor landscape, positioning gaps.
3. If `<run-dir>/DESIGN.md` exists → **Voice & Tone section is binding** for all copy.
4. If `.claude/product-marketing.md` or `.agents/product-marketing.md` exists → use it;
   the `product-marketing` skill can create it on first run.
5. Else: read README/docs of the repo. If context is still thin, run the
   `product-marketing` skill first to build it — with the human's approval.

WRITER's grounding rule applies: **no claim without code/artifact evidence.**
No lorem ipsum, no fabricated metrics, no fake testimonials (TAA Guard blocks them anyway).

## 1. Route to skills

Pick the smallest set of skills that covers the request (invoke via the Skill tool):

| İstek sınıfı | Skill(ler) |
|---|---|
| Strateji / plan / fikir | `marketing-plan`, `marketing-ideas`, `content-strategy`, `marketing-loops`, `marketing-psychology` |
| Sosyal medya postu / thread / carousel | `social` + otomatik görsel (bkz. § 1a) |
| Blog / makale / metin yazımı | `copywriting`, `copy-editing`, `content-strategy` |
| Video / short / reel senaryosu | `video` |
| Görsel / kapak / ad görseli (tek başına istenirse) | `image`, `ad-creative` |
| Lansman | `launch`, `public-relations`, `directory-submissions` |
| SEO / AI-SEO / site mimarisi | `seo-audit`, `ai-seo`, `programmatic-seo`, `site-architecture`, `schema` |
| Reklam (paid) | `ads`, `ad-creative` |
| E-posta / SMS / soğuk erişim | `emails`, `sms`, `cold-email`, `prospecting` |
| Fiyatlandırma / teklif / paywall | `pricing`, `offers`, `paywalls` |
| Dönüşüm / deney | `cro`, `ab-testing`, `signup`, `popups`, `onboarding` |
| Elde tutma / büyüme döngüleri | `churn-prevention`, `referrals`, `revops`, `analytics` |
| Pazar / müşteri / rakip analizi | `customer-research`, `competitors`, `competitor-profiling` (taa-pm'in RESEARCH.md'si varsa önce onu tüket) |
| Satış / topluluk / ortaklık | `sales-enablement`, `community-marketing`, `co-marketing`, `lead-magnets`, `free-tools`, `aso` |

Multi-part requests (e.g. "launch post + blog + video script") → run the relevant
skills sequentially, sharing the Step-0 context pack so outputs stay consistent.

## 1a. Auto-pair social copy with a visual (Design canvas)

`social` alone only writes copy — Instagram/LinkedIn gibi görsel-ağırlıklı
kanallarda bu tek başına eksik bir teslimat sayılır. `social` her post/carousel
ürettiğinde, orkestratör ek onay istemeden ardından **`design`** skill'ini
(Claude Design canvas — `.dc.html` artboard, Artifact olarak yayınlanır, PNG/PDF
export edilebilir) çağırır ve `social`'ın ürettiği metni **görselleştirir**:

- **Ne zaman zorunlu:** Instagram gönderisi (feed post, carousel, Story) —
  Instagram'da metin-only gönderi geçersiz sayılır. LinkedIn carousel veya
  "quote graphic"/"cover image" içeren formatlar da zorunlu.
- **Ne zaman opsiyonel:** düz metin LinkedIn postu, Twitter/X thread — bunlarda
  görsel isteğe bağlıdır; istek belirtmiyorsa bir kere sor: *"Bu post için de bir
  görsel hazırlayayım mı (LinkedIn/Instagram uyumlu, marka tonunda)?"*
- **Marka tutarlılığı:** `design`'ı çağırırken `<run-dir>/DESIGN.md` varsa onun
  palette/typography/voice bölümlerini bağlayıcı stil girdisi olarak ver.
  `DESIGN.md` yoksa (bağımsız pazarlama koşusu) `.claude/product-marketing.md`
  veya `README`'deki marka ipuçlarını kullan ve bu varsayımı taslakta not düş.
- **Format:** post kopyasının hook'u/başlığı ve platform boyutu (Instagram
  1080×1350 veya 1080×1080, LinkedIn 1200×627 tek görsel ya da 1080×1080
  carousel slide'ları) canvas'a girdi olarak verilir — carousel isteniyorsa
  her slide ayrı bir artboard olarak üretilir.
- **Sınır (dürüst degrade):** `design` canvas tipografi-ağırlıklı marka
  grafikleri (quote card, carousel slide, kapak görseli) üretir; fotogerçekçi/
  lifestyle sahne üretmez. Böyle bir görsel istenirse bunu kullanıcıya söyle —
  `image` skill'i (AI görsel üretim API'leri, ayrı kurulum/maliyet gerektirir)
  ayrı bir istek olarak devreye alınabilir, otomatik tetiklenmez.
- Üretilen Artifact URL'i ve görsel briefi ilgili `.taa/marketing/` taslak
  dosyasının `## Görsel` bölümüne yazılır (bkz. § 2) — Artifact kullanıcı
  onayına kadar **private** kalır, yayınlamak/paylaşmak her zaman insanın işidir.

## 2. Gates & output

- Produce drafts under the shared `.taa/marketing/` folder (create if missing, this one
  stays top-level — it's already self-namespaced), one file per asset,
  named `YYYY-MM-DD-<channel>-<slug>.md`. Görseli olan postlarda dosyaya bir
  `## Görsel` bölümü ekle: Artifact URL'i, kısa görsel briefi (stil/layout
  kararları) ve hangi `DESIGN.md`/marka kaynağının kullanıldığı. Never post/publish/send anything —
  external publishing is always the human's action.
- After drafting, stop and wait for `onayla` / `düzelt: <not>` / `iptal` —
  same gate discipline as the code pipeline. `düzelt` notes get applied, then
  re-gate; a `düzelt` targeting the visual (renk/layout/metin) republishes the
  same Artifact (same URL) rather than creating a new one.
- If the brain exists, record reusable positioning/messaging decisions via `taa-brain`
  after approval (never PII, never customer data).
- On completion (if this run created its own `<run-dir>` rather than reusing an active
  code pipeline's), archive it the same way `/taa:start` does — the `.taa/marketing/`
  drafts themselves are not moved, only the planning `<run-dir>`.
