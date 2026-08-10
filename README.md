# TAA — Taz Architectural Agent Stack

**The SDLC pipeline that remembers.** Works with **Claude Code** and **OpenAI Codex**.
Adversarial, approval-gated multi-agent development (PO → Designer → Architect → QA → Dev → Security) **plus an institutional-memory brain** that makes run #100 smarter than run #1 — and deterministic guard hooks that block secrets, lorem ipsum and SQL injection with *code*, not vibes.

`spec-first (gstack)` × `token-based design (open-design)` × `compounding memory (gbrain)` — in one installable stack.

---

## 30 saniyede TAA

```bash
# Claude Code içinde — projenize hiçbir dosya kopyalanmaz:
/plugin marketplace add ademirel-taztech/taz-agent-stack
/plugin install taa@taz-marketplace
# oturumu yeniden başlatın, sonra:
/taa:start Lisanslama modülü: tenant bazlı planlar, deneme süresi, Stripe
```

Pipeline sırayla çalışır, **her aşamada durup onay ister**, her kararı `.taa/` altında dosyaya dondurur ve bittiğinde öğrendiklerini brain'e yazar.

```
Stage 0  BRAIN   geçmiş pattern/ADR/bulgu hatırlama (cited briefing)
Stage 1  PM      RESEARCH.md — web'den atıflı rakip/gap analizi         ⛩ onay
Stage 2  PO      SPEC.md (research'ü tüketir) + hiyerarşik backlog       ⛩ onay
Stage 3  DES     DESIGN.md (9 başlık, token-only, gerçek veri) + mockup ⛩ onay
Stage 4  ARCH    architecture.md + ADR'ler + DEV kontrat listesi        ⛩ onay
Stage 5  QA-A    metrics.md (P95<200ms, coverage>80%) + test iskeletleri ⛩ onay
Stage 6  DEV     task-task implementasyon, testler yeşilene kadar
Stage 7  OPS     Dockerfile/CI, config matrisi, migration+rollback, runbook ⛩ onay
Stage 8  SEC     severity-ranked denetim (+ COMPLIANCE); Critical/High → DEV'e geri (max 3 döngü)
Stage 9  QA-B    metrik skorbordu
Stage 10 DREAM   koşu brain'e konsolide edilir → bir dahaki sefere daha akıllı
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
| **Deterministik guard'lar** (hook) | ✖ | ✖ | ✔ secret (PreToolUse deny + PostToolUse, `.md`/`.taa` dahil) / lorem-ipsum / hard-coded renk / interpolated SQL / orphan TODO → blok; Bash yazımları da `git status` ile yeniden taranır |
| Oturum çökse de devam | değişken | kısmi | ✔ `.taa/state.md` + `/taa:continue` |
| Brownfield saygısı | ✖ | kısmi | ✔ ARCH önce keşif+taklit; yarışan desen = SEC bulgusu |
| **Kanıt-temelli steering** | ✖ | ✖ | ✔ CHIEF: her kapıdan önce scope-creep/bütçe/risk brief'i; kill-switch analizi; salt tavsiye, yetkisiz |
| **Çift motor** | ✖ Claude-only | çoğu tek motor | ✔ Claude Code + OpenAI Codex (`codex/` adaptörü + dönüştürücü) |
| **Rol-kapsamlı MCP** | global bağlanır | global | ✔ MCP anayasası: rol bazlı en-az-yetki, read-only DB, injection kuralı, dürüst degrade raporu |
| **Canlı E2E doğrulama** | ✖ | ✖ | ✔ QA-B Playwright MCP ile kabul kriterlerini gerçek UI'da yürür; manuel adımları canlı test edilir |
| **Ofis dosyası I/O** | ✖ | ✖ | ✔ `/taa:ingest` (xls(x)/doc(x)/pdf/ppt(x)/vsd(x)/csv → atıflı Markdown kanıt) + `/taa:report` (`.taa/` → xlsx/docx/pdf/pptx); dürüst degrade, guard'dan geçer |
| **Release hattı** | ✖ | ✖ | ✔ Stage 7 `taa-ops` (Dockerfile/CI/migration+rollback/runbook) + `/taa:release` (sürüm, CHANGELOG, deploy checklist) — deploy'un kendisi asla otomatik değil |
| Kurulum | dosya kopyala | framework öğren | ✔ `install.sh` / plugin; başka stack'e 2 dosyadan uyarlanır |

> Felsefe (gbrain'den ödünç): **mekanik iş koda, muhakeme LLM'e.** Sızıntı yakalamak regex'in işi, mimari karar vermek modelin.

## Komutlar

| Komut | İş |
|---|---|
| `/taa:start <talep>` | Tam pipeline (Stage 0–10) |
| `/taa:continue` | `.taa/state.md`'den kaldığı yerden sürdür |
| `/taa:status` | Aşama panosu, backlog burn-down, açık bulgular |
| `/taa:review [kapsam]` | Hat dışı tek başına SEC denetimi |
| `/taa:brain <soru>` | Kurumsal hafızadan atıflı sentez |
| `/taa:dream` | Biten koşuyu brain'e konsolide et |
| `/taa:steer` | Chief-of-Staff: anlık sağlık raporu, ihtilaf hakemliği hazırlığı, `portfolio` ile koşular-arası süreç analizi |
| `/taa:research <soru>` | PM: bağımsız pazar/rakip araştırması, atıflı, brain'e yazılabilir |
| `/taa:docs <talep>` | Doküman hattı: kullanım manueli, özellik rehberi, release notes, API guide — aynı kapı disiplini, kod-kanıtlı yazım |
| `/taa:marketing <talep>` | Pazarlama hattı: talebi 46 marketing skill'inden doğrusuna yönlendirir (sosyal post, blog, video senaryosu, launch, SEO, pricing…) — `.taa/` artefaktlarına dayalı, uydurma iddia yok, yayınlama daima insanda |
| `/taa:ingest <dosya\|dizin>...` | xls(x)/doc(x)/pdf/ppt(x)/vsd(x)/csv dosyalarını `.taa/inputs/`'a atıflı Markdown kanıt olarak alır (guard'dan geçer); pipeline dışında da tek başına çalışır |
| `/taa:report <tür> [format]` | `.taa/` artefaktını (status/steering/review/manual/release-notes) xlsx/docx/pdf/pptx'e derler (`.taa/reports/`); yayınlamak daima insanın işi |
| `/taa:fix <bug>` | Hafif bugfix hattı: reproduce → test → düzelt → kapsamlı review → brain'e yazım |
| `/taa:release [sürüm]` | Sürüm önerisi, CHANGELOG/release notes, deploy+rollback planı, tag/PR metni — deploy'un kendisi asla otomatik değil |
| `/taa:incident <özet\|log>` | Postmortem: zaman çizelgesi, etki, kök neden, aksiyonlar; tekrarlayan bulgu sınıfı `findings/CHECKLIST.md`'ye terfi eder |
| `/taa:refactor <hedef>` | Davranış-koruyan refactor: karakterizasyon testleri → refactor → SEC diff denetimi; SPEC yerine `.taa/invariants.md` |
| `/taa:upgrade <paket\|framework>` | ARCH liderliğinde sürüm geçişi: breaking-change araştırması, aşamalı plan ve uygulama |
| `/taa:onboard [odak]` | Brain + `.taa/` + architecture.md'den atıflı yeni geliştirici oryantasyon dokümanı |
| `/taa:explain <hedef>` | Kod anlama hattı: tek bir çalışma yolunu uçtan uca izler (endpoint/entrypoint → application → domain → infrastructure), her sıçramada `file:line` atfı, Mermaid sequence diyagramı; DI/mediator/queue gibi dinamik dikişleri kaydından çözer, çözemediğini "Açık sorular"a yazar. `map:` alt sistem haritası, `impact:` değişiklik yarıçapı. Salt-okunur, kapısız, **asla düzeltmez** — bulgular `/taa:review`·`/taa:fix`·`/taa:refactor`'a yönlendirilir |

## Doküman I/O: `/taa:ingest` ve `/taa:report`

Pipeline dış dünyadan gelen ofis dosyalarını okuyup **kanıta çevirir**
(`doc-ingest` skill'i) ve `.taa/` artefaktlarından **profesyonel çıktı üretir**
(`doc-export` skill'i). Kanonik iç format her zaman Markdown kalır; ofis
formatları yalnızca giriş/çıkış sınırında yaşar — mekanik iş `markitdown` /
`openpyxl` / `pdfplumber` / `PyMuPDF` / `python-docx` / `python-pptx` /
`pandoc` / LibreOffice'e (`soffice`) devredilir, muhakeme LLM'e kalır.
Visio (`.vsdx`) okunur ve Mermaid flowchart'a çevrilir; **Visio yazımı
desteklenmez** (draw.io XML alternatifi önerilir — dürüstçe). Bağımlılıklar
opsiyoneldir: `./install.sh --with-docs` pip paketlerini (`requirements-doc.txt`)
kurar ve `pandoc`/`soffice`/`mmdc` varlığını kontrol eder; bayrak verilmezse
skill'ler yine kurulur ama eksik araç için dürüst degrade mesajı verir,
sessizce sahte bir çıktı üretmez. Ayrıntı:
[`.claude/skills/doc-ingest/SKILL.md`](.claude/skills/doc-ingest/SKILL.md),
[`.claude/skills/doc-export/SKILL.md`](.claude/skills/doc-export/SKILL.md).

## Depo yapısı

**Tek doğruluk kaynağı `.claude/`'dur.** Agent'lar, komutlar ve skill'ler
yalnızca `.claude/agents/`, `.claude/commands/taa/`, `.claude/skills/` altında
yaşar; `install.sh`, `scripts/convert-to-codex.py` ve `.claude-plugin/plugin.json`
hepsi buradan okur. Rakip bir kök `agents/`/`commands/` kopyası **tutulmaz** —
CI (bkz. yol haritası) `scripts/convert-to-codex.py` çıktısı ile commit'lenmiş
`codex/agents/` arasında drift olursa build'i kırar.

```
.claude/agents/        16 rol: taa-pm, taa-po, taa-designer, taa-architect, taa-qa, taa-dev, taa-ops, taa-security, taa-compliance, taa-data, taa-support, taa-l10n, taa-brain, taa-chief, taa-writer, taa-explainer
.claude/commands/taa/  start, continue, status, review, brain, dream, steer, docs, research, marketing, ingest, report, fix, release, incident, refactor, upgrade, onboard, explain
.claude/skills/        46 marketing skill'i (MIT, Corey Haines) + doc-ingest + doc-export — /taa:marketing ve /taa:ingest·/taa:report bunlara yönlendirir
requirements-doc.txt    doc-ingest/doc-export'un opsiyonel pip bağımlılıkları (`./install.sh --with-docs`)
scripts/taa-guard.sh            PostToolUse hook (Write/Edit/MultiEdit/NotebookEdit) — deterministik bloklar
scripts/taa-guard-pretooluse.sh PreToolUse hook — secret şekilleri yazılmadan önce reddedilir
scripts/taa-guard-bash-scan.sh  PostToolUse/Bash hook — Bash'le yazılan dosyaları `git status` ile yeniden tarar
scripts/taa-guard-secrets.sh    üç script'in paylaştığı secret/PII desenleri
tests/guard/            saf-bash guard test paketi (bats bağımlılığı yok)
hooks/hooks.json       plugin kurulumunda guard'ı otomatik aktifleştirir
hooks/settings.example.json   install.sh yolunda elle merge edilir
templates/taa/         SPEC / DESIGN / architecture / metrics / backlog / state şablonları
templates/brain/       brain iskeleti + sayfa şablonu (compiled truth / evidence)
.claude-plugin/        plugin + marketplace manifestleri
CLAUDE.md              projeye giden hafıza kuralları
CHANGELOG.md · CONTRIBUTING.md
docs/PIPELINE.md · docs/BRAIN.md · docs/MCP.md
install.sh
```

## Kurulum seçenekleri

### Ön koşullar

TAA'nın hangi yolunu kullanırsanız kullanın şu temel araçlar hazır olmalıdır:

- **Git** — depoyu indirmek ve güncellemek için
- **Claude Code** ve/veya **OpenAI Codex** — pipeline'ı çalıştırmak için
- **Python 3 + pip** — `taa` CLI ve LiteLLM/doc bağımlılıkları için

`taa launch claude` akışı **LiteLLM proxy** kullandığı için ayrıca şu bağımlılık zorunludur:

```bash
pip install "litellm[proxy]"
```

`/taa:ingest` ve `/taa:report` için doküman I/O bağımlılıkları ayrıca gerekir. `./install.sh --with-docs` bunların pip tarafını kurar ve eksik binary'leri kontrol eder:

```bash
pip install -r requirements-doc.txt
```

Ek doküman araçları:

- `pandoc` — docx/pdf derleme
- `soffice` (LibreOffice) — legacy Office formatları ve render doğrulama
- `mmdc` (`@mermaid-js/mermaid-cli`) — Mermaid diyagram render'ı

macOS için önerilen temel kurulum:

```bash
brew install jq
pip install "litellm[proxy]"
```

Windows için önerilen temel kurulum:

```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.12 -e
winget install --id OpenJS.NodeJS.LTS -e
python -m pip install --upgrade pip
pip install "litellm[proxy]"
npm install -g @mermaid-js/mermaid-cli
winget install --id Pandoc.Pandoc -e
winget install --id TheDocumentFoundation.LibreOffice -e
```

Windows'ta ayrıca şunlar önerilir:

- **PowerShell 5.1+ veya PowerShell 7** — `bin/taa.ps1` bununla çalışır
- **Git Bash** veya **WSL** — `install.sh` bash betiği olduğu için gereklidir
- Yeni terminal açmak — `PATH` değişiklikleri ve global `taa` komutu için

> Not: Windows CLI tarafında `jq` gerekmez; `Templates/bin/taa.ps1` ve `Templates/bin/taa.cmd` yalnızca PowerShell + `litellm` varsayar. `jq` kontrolü sadece Unix betiğinde vardır.

**1. Plugin (önerilen)** — projenize dosya kopyalanmaz; agent'lar, komutlar, TAA Guard hook'u ve şablonlar plugin içinden yüklenir, güncelleme tek komut:

```bash
claude plugin marketplace add ademirel-taztech/taz-agent-stack
claude plugin install taa@taz-marketplace
```

**2. `install.sh` (kopyalayarak)** — plugin kullanmak istemeyenler veya `.claude/`'u repo ile versiyonlamak isteyenler için:

```bash
git clone https://github.com/ademirel-taztech/taz-agent-stack && cd taz-agent-stack
./install.sh /path/to/project   # .claude/ + templates/ + scripts/ hedef projeye kopyalanır
./install.sh --global           # agents/commands tüm projeler için ~/.claude'a + ~/.taa/brain
./install.sh /path/to/project --with-docs   # + doc-ingest/doc-export pip bağımlılıkları, pandoc/soffice/mmdc kontrolü
```

Windows'ta aynı akışı **Git Bash** veya **WSL** içinden çalıştırın:

```bash
git clone https://github.com/ademirel-taztech/taz-agent-stack.git
cd taz-agent-stack

# Proje içine kurulum
./install.sh /c/Users/<kullanici>/Projects/<proje>

# Proje içine kurulum + doc-ingest/doc-export bağımlılıkları
./install.sh /c/Users/<kullanici>/Projects/<proje> --with-docs

# Global kurulum (~/.claude + ~/.taa/brain + C:\tools\taa)
./install.sh --global

# Global kurulum + docs bağımlılıkları
./install.sh --global --with-docs
```

Windows'ta `install.sh --global` başarılı olursa:

- `C:\tools\taa\taa.ps1`
- `C:\tools\taa\taa.cmd`

dosyaları oluşturulur ve installer kullanıcı `PATH`'ine `C:\tools\taa` eklemeyi dener. Terminali kapatıp yeniden açtıktan sonra `taa` komutu kullanılabilir. `PATH` otomatik eklenemezse installer bunu ayrıca söyler; bu durumda `C:\tools\taa` klasörünü kullanıcı `PATH`'ine elle ekleyin.

Windows'ta proje içine kurulum yapıldıysa doğrudan şu dosyalardan biri kullanılabilir:

```powershell
.\bin\taa.ps1 list
.\bin\taa.ps1 launch codex --supplier local-engine --model qwen2.5-coder
```

```cmd
bin\taa.cmd list
bin\taa.cmd launch claude --supplier nvidia --model z-ai/glm-5.2
```

Bu yol ayrıca `taa` CLI'sini de kurar. Proje kurulumu `bin/taa`, `bin/taa.ps1` ve `bin/taa.cmd` üretir. Global kurulumda platforma göre şunlar hedeflenir:

- macOS / Linux: betik `/usr/local/bin/taa` konumuna yazılır ve gerekirse `sudo chmod +x /usr/local/bin/taa` ile çalıştırılabilir hale getirilir.
- Windows: `C:\tools\taa` klasörü oluşturulur, içine `taa.ps1` ve `taa.cmd` yazılır; mümkünse kullanıcı `PATH`'ine otomatik eklenir, eklenemezse installer talimat verir.

Bu yolda TAA Guard'ı açmak için `hooks/settings.example.json` içeriğini projenizin `.claude/settings.json` dosyasına birleştirin (plugin kurulumunda guard otomatik aktiftir). Ajanlar oturum başında yüklenir — kurulumdan sonra oturumu yeniden başlatın.

## `taa` CLI

`taa`, farklı sağlayıcılardaki modelleri tek bir config üstünden yönetip **Codex** veya **Claude Code** çalıştırmak için hafif bir başlatıcıdır. Claude tarafında arkada **LiteLLM proxy** açar; böylece yerel modeller veya OpenAI-uyumlu başka uç noktalar Claude Code'a tek biçimde sunulur.

### Önşartlar

`taa launch claude` akışı LiteLLM proxy kullandığı için `litellm[proxy]` kurulmuş olmalıdır.

```bash
pip install "litellm[proxy]"
```

macOS için önerilen kurulum:

```bash
# Sistem bağımlılıkları (macOS için Homebrew ile)
brew install jq

# LiteLLM Proxy bağımlılığı (proxy opsiyonu şarttır)
pip install "litellm[proxy]"
```

Windows için önerilen kurulum:

```powershell
python -m pip install --upgrade pip
pip install "litellm[proxy]"
```

Doküman hattını da kullanacaksanız:

```powershell
pip install -r .\requirements-doc.txt
npm install -g @mermaid-js/mermaid-cli
```

ve sistemde `pandoc` ile `LibreOffice` (`soffice`) kurulu olmalıdır. `install.sh --with-docs` bu eksikleri sizin yerinize kurmaz; pip paketlerini yükler ve hangi dış araçların eksik olduğunu raporlar.

### Komut Sözdizimi ve Kullanım Örnekleri

#### 1. Yeni Sağlayıcı Ekleme (`add`)

```bash
# Yerel C# Servisi veya Llama.cpp (API Key gerektirmez)
taa config add --supplier local-engine --api http://localhost:5000/v1

# NVIDIA API Endpoint (API Key ile)
taa config add --supplier nvidia --api https://integrate.api.nvidia.com/v1 --apikey nvapi-xxxxxx

# OpenRouter
taa config add --supplier openrouter --api https://openrouter.ai/api/v1 --apikey sk-or-xxxxxx
```

#### 2. Tanımlı Sağlayıcıları Listeleme (`list`)

```bash
taa list
```

Çıktı:

```text
📋 Kayıtlı Sağlayıcılar (Config: /Users/username/.taa/config.json):
------------------------------------------------------------
• local-engine
  API:    http://localhost:5000/v1
  KEY:    (Yok/Local)

• nvidia
  API:    https://integrate.api.nvidia.com/v1
  KEY:    *****xxxx
```

#### 3. Güncelleme (`update`)

```bash
# Sadece API adresini değiştirme
taa config update --supplier local-engine --api http://localhost:8080/v1

# Sadece API Key güncelleme
taa config update --supplier nvidia --apikey nvapi-NEWKEY123
```

#### 4. Silme (`delete`)

```bash
taa config delete --supplier openrouter
```

#### 5. Ajan Çalıştırma (`launch`)

```bash
taa launch claude --supplier nvidia --model z-ai/glm-5.2
taa launch codex --supplier local-engine --model qwen2.5-coder
```

**Önerilen ikinci savunma hattı:** `scripts/install-precommit.sh <repo>` — TAA Guard'ı git `pre-commit` hook'u olarak da kurar. Hook'lar (PreToolUse/PostToolUse) her zaman devrede olsa da, bu ikinci hat hem Codex tarafında (Codex'in native hook mekanizması yok) hem de Claude Code'da hook'ların hiç çalışmadığı senaryolarda (elle `git commit`, harici düzenleyici) son bir güvenlik ağıdır — opsiyonel değil, **önerilir**.

## Brain: hattın hafızası

- **Stage 0 recall:** ilgili pattern'ler, geçmiş ADR'ler, tekrarlayan bulgular — hepsi sayfa atıflı; boşluklar dürüstçe "brain'de yok" diye raporlanır.
- **Stage 10 dream:** koşudan pattern/ADR/bulgu/ders çıkarımı, mükerrer birleştirme, `supersedes` bağlantıları; **aynı bulgu sınıfı 2. kez görülürse** `findings/CHECKLIST.md`'ye terfi eder ve SEC bundan sonra her incelemede kontrol eder.
- Markdown + git = diffable, reviewable, ekipçe paylaşılabilir. Gerçek [gbrain](https://github.com/garrytan/gbrain) MCP sunucusu bağlıysa `taa-brain` otomatik onu tercih eder.

Ayrıntı: [docs/BRAIN.md](docs/BRAIN.md)

## MCP entegrasyonları

Varsayılan set `.mcp.json.example` içinde: **GitHub** (backlog⇄issue senkronu, PR'lar, SEC bulguları PR yorumu), **PostgreSQL read-only** (ARCH gerçek şemayı görür), **Playwright** (QA-B kabul kriterlerini canlı UI'da yürür, WRITER gerçek ekran görüntüsü alır). Sentry/Context7/Figma/gbrain opsiyonel katman. İki anayasal kural: **MCP yetkileri rol bazlı** (GitHub yazma sadece DEV'de, SEC/CHIEF her yerde salt-okunur) ve **dış içerik veri sayılır, talimat değil** (prompt-injection savunması). MCP yoksa her davranışın dürüst fallback'i var: "canlı doğruladım" ile "koda karşı doğruladım" asla karıştırılmaz. Ayrıntı: [docs/MCP.md](docs/MCP.md)

## OpenAI Codex desteği

`codex/` adaptörü: `AGENTS.md` (Codex talimat zinciri), `codex/agents/*.toml` (16 rolün otomatik dönüşümü — `scripts/convert-to-codex.py`), TAA Guard git pre-commit olarak (`scripts/install-precommit.sh`). Pipeline'a giriş: *"Run the TAA pipeline for: <talep>"*. Fark tablosu: [codex/README.md](codex/README.md)

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

Katkı kuralları ve adım adım rehber: [CONTRIBUTING.md](CONTRIBUTING.md). Sürüm
geçmişi: [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog formatı). Kısaca: rol
eklemek = `.claude/agents/taa-<rol>.md` + `start.md` tablosuna bir satır +
`.claude-plugin/plugin.json` `agents` listesine bir girdi (tek kaynak
`.claude/`; plugin manifest'i oradan okur). Yol haritası: `evals/` (pipeline
kalite benchmark'ı — gbrain-evals'ın dürüst skor felsefesiyle), PreCompact hook
ile otomatik state yedekleme, CI drift kontrolü (`convert-to-codex.py` çıktısı
vs commit'lenmiş `codex/agents/`). Değerlendirilip **şimdilik implemente
edilmeyen** roller (bir dış denetimin notu): UX-researcher, FinOps (CHIEF'in
"budget" kavramına gerçek maliyet — token + bulut — ölçümü), bağımsız
accessibility-auditor — gelecekte istenirse mevcut 16 rolün kalıbını taklit
ederek eklenebilirler.

---

## English quickstart

TAA is an adversarial, approval-gated multi-agent SDLC pipeline for Claude Code — 16 least-privilege subagents (the core PM→PO→DES→ARCH→QA→DEV→OPS→SEC→QA gated pipeline, plus a read-only Chief-of-Staff producing evidence-based steering briefs before every human gate, a read-only code Explainer that traces an execution path across layers with a `file:line` citation per hop, plus data/compliance/support/l10n specialists), human gates after every stage, all decisions frozen into versioned `.taa/*.md` artifacts — **plus an institutional-memory brain** (recall at Stage 0, dream-cycle consolidation at Stage 10, recurring findings auto-promoted to a mandatory security checklist) and deterministic PreToolUse/PostToolUse guard hooks (secrets — including `.md`/`.taa` artifacts and Bash-written files, lorem ipsum, hard-coded colors, interpolated SQL → blocked by code). Beyond code it ships a grounded docs track (`/taa:docs`), a marketing track (`/taa:marketing`) bundling the 46 MIT-licensed [marketing skills by Corey Haines](https://github.com/coreyhaines31/marketingskills), and a doc I/O track (`/taa:ingest`, `/taa:report`) that turns office files (xlsx/docx/pdf/pptx/vsdx) into cited Markdown evidence and back — a full software-company agent set: build it, document it, market it. Docs: [PIPELINE](docs/PIPELINE.md) · [BRAIN](docs/BRAIN.md).

```bash
# recommended — nothing is copied into your project:
claude plugin marketplace add ademirel-taztech/taz-agent-stack
claude plugin install taa@taz-marketplace

# or copy-based:
./install.sh /path/to/project    # or --global

/taa:start <your feature request>
```

## License

MIT — see [LICENSE](LICENSE).
