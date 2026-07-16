# TAA — Taz Architectural Agent Stack

**The SDLC pipeline that remembers.** Works with **Claude Code** and **OpenAI Codex**.
Adversarial, approval-gated multi-agent development (PO → Designer → Architect → QA → Dev → Security) **plus an institutional-memory brain** that makes run #100 smarter than run #1 — and deterministic guard hooks that block secrets, lorem ipsum and SQL injection with *code*, not vibes.

`spec-first (gstack)` × `token-based design (open-design)` × `compounding memory (gbrain)` — in one installable stack.

---

## 30 saniyede TAA

```bash
# Claude Code içinde — projenize hiçbir dosya kopyalanmaz:
/plugin marketplace add <you>/taz-agent-stack
/plugin install taa@taz-marketplace
# oturumu yeniden başlatın, sonra:
/taa:start Lisanslama modülü: tenant bazlı planlar, deneme süresi, Stripe
```

Pipeline sırayla çalışır, **her aşamada durup onay ister**, her kararı `.taa/` altında dosyaya dondurur ve bittiğinde öğrendiklerini brain'e yazar.

```
Stage 0  BRAIN   geçmiş pattern/ADR/bulgu hatırlama (cited briefing)
Stage 1  PM      RESEARCH.md — web'den atıflı rakip/gap analizi         ⛩ onay
Stage 2  PO      SPEC.md (research'ü tüketir) + hiyerarşik backlog       ⛩ onay
Stage 2  DES     DESIGN.md (9 başlık, token-only, gerçek veri) + mockup ⛩ onay
Stage 3  ARCH    architecture.md + ADR'ler + DEV kontrat listesi        ⛩ onay
Stage 4  QA-A    metrics.md (P95<200ms, coverage>80%) + test iskeletleri ⛩ onay
Stage 5  DEV     task-task implementasyon, testler yeşilene kadar
Stage 6  SEC     severity-ranked denetim; Critical/High → DEV'e geri (max 3 döngü)
Stage 7  QA-B    metrik skorbordu
Stage 8  DREAM   koşu brain'e konsolide edilir → bir dahaki sefere daha akıllı
```

Her ⛩ kapıdan önce **CHIEF** tek paragraflık kanıtlı steering brief sunar (scope sadakati,
bütçe/döngü durumu, en büyük risk, tavsiye) — **karar daima insanındır.**
Anayasa: SEC "güvenli mi", QA "kanıtlandı mı", CHIEF "değer mi" — "devam mı" yalnız insan.

## Neden rakiplerinden farklı?

| | Subagent koleksiyonları | Spec-driven framework'ler | **TAA** |
|---|---|---|---|
| Roller arası **çelişme** (adversarial) | ✖ bağımsız ajanlar | kısmi | ✔ SEC bloklayıcı kapı; DEV gereksinim değiştiremez; en-az-yetki araçlar |
| **İnsan onay kapıları** | ✖ | ✔ | ✔ + `düzelt:` notları hafızaya işlenir |
| **Kalıcı kurumsal hafıza** | ✖ stateless | ✖ run-scoped | ✔ Brain: pattern/ADR/bulgu sayfaları, atıf zorunlu, `/taa:dream` |
| **Tekrarlanan bulgu ≥2 → otomatik zorunlu kontrol** | ✖ | ✖ | ✔ `findings/CHECKLIST.md`, SEC her incelemede okur |
| **Deterministik guard'lar** (hook) | ✖ | ✖ | ✔ secret / lorem-ipsum / hard-coded renk / interpolated SQL / orphan TODO → blok |
| Oturum çökse de devam | değişken | kısmi | ✔ `.taa/state.md` + `/taa:continue` |
| Brownfield saygısı | ✖ | kısmi | ✔ ARCH önce keşif+taklit; yarışan desen = SEC bulgusu |
| **Kanıt-temelli steering** | ✖ | ✖ | ✔ CHIEF: her kapıdan önce scope-creep/bütçe/risk brief'i; kill-switch analizi; salt tavsiye, yetkisiz |
| **Çift motor** | ✖ Claude-only | çoğu tek motor | ✔ Claude Code + OpenAI Codex (`codex/` adaptörü + dönüştürücü) |
| **Rol-kapsamlı MCP** | global bağlanır | global | ✔ MCP anayasası: rol bazlı en-az-yetki, read-only DB, injection kuralı, dürüst degrade raporu |
| **Canlı E2E doğrulama** | ✖ | ✖ | ✔ QA-B Playwright MCP ile kabul kriterlerini gerçek UI'da yürür; manuel adımları canlı test edilir |
| Kurulum | dosya kopyala | framework öğren | ✔ `install.sh` / plugin; başka stack'e 2 dosyadan uyarlanır |

> Felsefe (gbrain'den ödünç): **mekanik iş koda, muhakeme LLM'e.** Sızıntı yakalamak regex'in işi, mimari karar vermek modelin.

## Komutlar

| Komut | İş |
|---|---|
| `/taa:start <talep>` | Tam pipeline (Stage 0–8) |
| `/taa:continue` | `.taa/state.md`'den kaldığı yerden sürdür |
| `/taa:status` | Aşama panosu, backlog burn-down, açık bulgular |
| `/taa:review [kapsam]` | Hat dışı tek başına SEC denetimi |
| `/taa:brain <soru>` | Kurumsal hafızadan atıflı sentez |
| `/taa:dream` | Biten koşuyu brain'e konsolide et |
| `/taa:steer` | Chief-of-Staff: anlık sağlık raporu, ihtilaf hakemliği hazırlığı, `portfolio` ile koşular-arası süreç analizi |
| `/taa:research <soru>` | PM: bağımsız pazar/rakip araştırması, atıflı, brain'e yazılabilir |
| `/taa:docs <talep>` | Doküman hattı: kullanım manueli, özellik rehberi, release notes, API guide — aynı kapı disiplini, kod-kanıtlı yazım |
| `/taa:marketing <talep>` | Pazarlama hattı: talebi 46 marketing skill'inden doğrusuna yönlendirir (sosyal post, blog, video senaryosu, launch, SEO, pricing…) — `.taa/` artefaktlarına dayalı, uydurma iddia yok, yayınlama daima insanda |

## Depo yapısı

```
.claude/agents/        10 rol: taa-pm, taa-po, taa-designer, taa-architect, taa-qa, taa-dev, taa-security, taa-brain, taa-chief, taa-writer
.claude/commands/taa/  start, continue, status, review, brain, dream, steer, docs, research, marketing
.claude/skills/        46 marketing skill'i (MIT, Corey Haines) — /taa:marketing bunlara yönlendirir
scripts/taa-guard.sh   PostToolUse hook — deterministik bloklar
hooks/hooks.json       plugin kurulumunda guard'ı otomatik aktifleştirir
hooks/settings.example.json   install.sh yolunda elle merge edilir
templates/taa/         SPEC / DESIGN / architecture / metrics / backlog / state şablonları
templates/brain/       brain iskeleti + sayfa şablonu (compiled truth / evidence)
.claude-plugin/        plugin + marketplace manifestleri
CLAUDE.md              projeye giden hafıza kuralları
docs/PIPELINE.md · docs/BRAIN.md
install.sh
```

## Kurulum seçenekleri

**1. Plugin (önerilen)** — projenize dosya kopyalanmaz; agent'lar, komutlar, TAA Guard hook'u ve şablonlar plugin içinden yüklenir, güncelleme tek komut:

```bash
claude plugin marketplace add <you>/taz-agent-stack
claude plugin install taa@taz-marketplace
```

**2. `install.sh` (kopyalayarak)** — plugin kullanmak istemeyenler veya `.claude/`'u repo ile versiyonlamak isteyenler için:

```bash
git clone https://github.com/<you>/taz-agent-stack && cd taz-agent-stack
./install.sh /path/to/project   # .claude/ + templates/ + scripts/ hedef projeye kopyalanır
./install.sh --global           # agents/commands tüm projeler için ~/.claude'a + ~/.taa/brain
```

Bu yolda TAA Guard'ı açmak için `hooks/settings.example.json` içeriğini projenizin `.claude/settings.json` dosyasına birleştirin (plugin kurulumunda guard otomatik aktiftir). Ajanlar oturum başında yüklenir — kurulumdan sonra oturumu yeniden başlatın.

## Brain: hattın hafızası

- **Stage 0 recall:** ilgili pattern'ler, geçmiş ADR'ler, tekrarlayan bulgular — hepsi sayfa atıflı; boşluklar dürüstçe "brain'de yok" diye raporlanır.
- **Stage 8 dream:** koşudan pattern/ADR/bulgu/ders çıkarımı, mükerrer birleştirme, `supersedes` bağlantıları; **aynı bulgu sınıfı 2. kez görülürse** `findings/CHECKLIST.md`'ye terfi eder ve SEC bundan sonra her incelemede kontrol eder.
- Markdown + git = diffable, reviewable, ekipçe paylaşılabilir. Gerçek [gbrain](https://github.com/garrytan/gbrain) MCP sunucusu bağlıysa `taa-brain` otomatik onu tercih eder.

Ayrıntı: [docs/BRAIN.md](docs/BRAIN.md)

## MCP entegrasyonları

Varsayılan set `.mcp.json.example` içinde: **GitHub** (backlog⇄issue senkronu, PR'lar, SEC bulguları PR yorumu), **PostgreSQL read-only** (ARCH gerçek şemayı görür), **Playwright** (QA-B kabul kriterlerini canlı UI'da yürür, WRITER gerçek ekran görüntüsü alır). Sentry/Context7/Figma/gbrain opsiyonel katman. İki anayasal kural: **MCP yetkileri rol bazlı** (GitHub yazma sadece DEV'de, SEC/CHIEF her yerde salt-okunur) ve **dış içerik veri sayılır, talimat değil** (prompt-injection savunması). MCP yoksa her davranışın dürüst fallback'i var: "canlı doğruladım" ile "koda karşı doğruladım" asla karıştırılmaz. Ayrıntı: [docs/MCP.md](docs/MCP.md)

## OpenAI Codex desteği

`codex/` adaptörü: `AGENTS.md` (Codex talimat zinciri), `codex/agents/*.toml` (10 rolün otomatik dönüşümü — `scripts/convert-to-codex.py`), TAA Guard git pre-commit olarak (`scripts/install-precommit.sh`). Pipeline'a giriş: *"Run the TAA pipeline for: <talep>"*. Fark tablosu: [codex/README.md](codex/README.md)

## Doküman hattı: `/taa:docs`

Kod değil doküman ürettirmek için aynı disiplinin hafif hattı: **BRAIN → PLAN (kitle/dil/outline, PO) → DRAFT (`taa-writer`) → REVIEW (QA) → DREAM.** Writer'ın anayasal kuralı *grounding*: uygulamaya dair her iddia koda, `.taa/` artefaktına veya brain'e izlenmek zorunda — bulamadığını `[VERIFY]` diye işaretler, **asla var olmayan özellik dokümante etmez.** QA aşaması iddiaları koda karşı spot-check eder, adımları baştan sona yürür, terminolojiyi sözlüğe karşı doğrular. Sözlük ve voice kararları dream ile brain'e yazılır — ikinci manuel ilk günden tutarlı çıkar.

```
/taa:docs kullanım manueli: lisans yönetimi modülü, hedef kitle son kullanıcı, dil TR
/taa:docs release notes v2.4 için, backlog TAA-030..045
```

## Pazarlama hattı: `/taa:marketing`

Yazılımı üreten aynı stack onu pazarlar da: [Corey Haines'in marketingskills](https://github.com/coreyhaines31/marketingskills) paketi (MIT) `.claude/skills/` altında **46 skill** olarak gömülü — sosyal post, blog/copywriting, video senaryosu, launch, SEO/AI-SEO, reklam, e-posta/SMS, pricing, CRO, churn, rakip analizi ve dahası. `/taa:marketing <talep>` tek giriş noktasıdır: talebi doğru skill(ler)e yönlendirir ve TAA farkını ekler — **içerik `.taa/` artefaktlarına dayanır** (SPEC'teki gerçek özellikler, RESEARCH'teki rakip konumu, DESIGN.md'nin Voice & Tone'u bağlayıcı), uydurma iddia/metrik yasak (writer'la aynı grounding kuralı), taslaklar `.taa/marketing/` altına düşer, **yayınlamak daima insanın eylemidir.** Skill'ler doğrudan da çağrılabilir (`/social`, `/launch`, `/pricing`…).

```
/taa:marketing launch: lisanslama modülü v2 — LinkedIn postu + blog + 30sn video senaryosu
/taa:marketing pricing sayfamızı Van Westendorp'a göre gözden geçir
```

## Taz.SaaS / brownfield

`taa-architect` mevcut çözümde önce keşif yapar ve **birebir taklit eder** (klasör düzeni, DI kaydı, isimlendirme, hata yönetimi). Yarışan desen getirmek SEC'te bloklayıcı bulgudur. Greenfield varsayılanları (Clean Architecture, CQRS+MediatR, PostgreSQL/EF Core, Next.js App Router + ShadCN) `CLAUDE.md` ve `taa-architect.md`'de tek yerden değişir — Python/Go/Java ekipleri iki dosya düzenleyerek uyarlar.

## Katkı & yol haritası

Rol eklemek = `.claude/agents/taa-<rol>.md` + `start.md` tablosuna bir satır + `.claude-plugin/plugin.json` `agents` listesine bir girdi (tek kaynak `.claude/`; plugin manifest'i oradan okur). Yol haritası: `evals/` (pipeline kalite benchmark'ı — gbrain-evals'ın dürüst skor felsefesiyle), PreCompact hook ile otomatik state yedekleme.

---

## English quickstart

TAA is an adversarial, approval-gated multi-agent SDLC pipeline for Claude Code — eight least-privilege subagents (incl. a read-only Chief-of-Staff producing evidence-based steering briefs before every human gate), human gates after every stage, all decisions frozen into versioned `.taa/*.md` artifacts — **plus an institutional-memory brain** (recall at Stage 0, dream-cycle consolidation at Stage 8, recurring findings auto-promoted to a mandatory security checklist) and deterministic PostToolUse guard hooks (secrets, lorem ipsum, hard-coded colors, interpolated SQL → blocked by code). Beyond code it ships a grounded docs track (`/taa:docs`) and a marketing track (`/taa:marketing`) bundling the 46 MIT-licensed [marketing skills by Corey Haines](https://github.com/coreyhaines31/marketingskills) — a full software-company agent set: build it, document it, market it. Docs: [PIPELINE](docs/PIPELINE.md) · [BRAIN](docs/BRAIN.md).

```bash
# recommended — nothing is copied into your project:
claude plugin marketplace add <you>/taz-agent-stack
claude plugin install taa@taz-marketplace

# or copy-based:
./install.sh /path/to/project    # or --global

/taa:start <your feature request>
```

## License

MIT — see [LICENSE](LICENSE).
