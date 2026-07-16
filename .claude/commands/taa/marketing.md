---
description: TAA marketing track - route a marketing request to the right marketing skill(s), grounded in .taa/ artifacts (SPEC, DESIGN voice & tone, RESEARCH)
argument-hint: <marketing request, e.g. "launch LinkedIn postu + blog yazısı: lisanslama modülü v2">
---

You are the **TAA Orchestrator** running the **marketing track**. The request:

> $ARGUMENTS

Do not free-style marketing content. Route the request to the bundled marketing skills
(MIT, by Corey Haines — coreyhaines31/marketingskills) and ground every claim.

## 0. Ground in the product (TAA advantage)

Before invoking any skill, gather real product context — never invent features:

1. If `.taa/SPEC.md` exists → product scope, user stories, differentiators.
2. If `.taa/RESEARCH.md` exists → competitor landscape, positioning gaps.
3. If `.taa/DESIGN.md` exists → **Voice & Tone section is binding** for all copy.
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
| Sosyal medya postu / thread / carousel | `social` |
| Blog / makale / metin yazımı | `copywriting`, `copy-editing`, `content-strategy` |
| Video / short / reel senaryosu | `video` |
| Görsel / kapak / ad görseli | `image`, `ad-creative` |
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

## 2. Gates & output

- Produce drafts under `.taa/marketing/` (create if missing), one file per asset,
  named `YYYY-MM-DD-<channel>-<slug>.md`. Never post/publish/send anything —
  external publishing is always the human's action.
- After drafting, stop and wait for `onayla` / `düzelt: <not>` / `iptal` —
  same gate discipline as the code pipeline. `düzelt` notes get applied, then re-gate.
- If a pipeline `.taa/state.md` exists, append a `MARKETING` section; do not overwrite.
- If the brain exists, record reusable positioning/messaging decisions via `taa-brain`
  after approval (never PII, never customer data).
