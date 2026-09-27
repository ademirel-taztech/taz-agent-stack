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
Stage 5  QA-A    metrics.md (P95<200ms, coverage>80%) + test iskeletleri
                 + test senaryoları (light/normal/hard, insan/Laya/headless) ⛩ onay
Stage 6  DEV     task-task implementasyon, testler yeşilene kadar
Stage 7  OPS     Dockerfile/CI, config matrisi, migration+rollback, runbook ⛩ onay
Stage 8  SEC     severity-ranked denetim (+ COMPLIANCE); Critical/High → DEV'e geri (max 3 döngü)
Stage 9  QA-B    senaryo koşumu (Playwright + Laya) + metrik skorbordu
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
| `/taa:writetest [light\|normal\|hard] <hedef> [--url <local/staging>] [--run]` | Test senaryosu hattı: sayfaları insan test eder gibi adım adım yazar — **light** (sayfa çalışıyor), **normal** (temel fonksiyonlar), **hard** (tüm FE + BE: validasyon/sınır/durum/rol, sayfanın çağırdığı her endpoint 401/403/IDOR dahil, klavye + axe). Her adım iki katmanlı: insan/Laya için soru (`noul` evet/hayır, `choice`, `score`) + headless browser için Playwright'a birebir eşlenen aksiyon/assertion. `.taa/runs/<run-id>/test-scenarios/` altında `index.json` + `scenarios/TC-*.json` + üretilmiş `README.md` checklist; `scripts/taa-scenarios.py` mekanik doğrular. Tek kapı; `--run` ile [`runner/`](runner/README.md) üzerinden headless Playwright + yerel Laya modeliyle (yoksa Playwright MCP ile) koşar. `/taa:start` aynı yazarı QA-A'da çalıştırır (Chief full → hard, light → normal), QA-B'de koşar. Format: [`SCHEMA.md`](templates/taa/test-scenarios/SCHEMA.md) |
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
.claude/agents/        17 pipeline rolü: taa-pm, taa-po, taa-designer, taa-architect, taa-qa, taa-tester, taa-dev, taa-ops, taa-security, taa-compliance, taa-data, taa-support, taa-l10n, taa-brain, taa-chief, taa-writer, taa-explainer
                       + 5 bağımsız QA-kit subagent'ı: test-strategist, e2e-engineer, api-test-engineer, perf-engineer, test-triager
.claude/commands/taa/  start, continue, status, review, brain, dream, steer, docs, research, marketing, ingest, report, fix, release, incident, refactor, upgrade, onboard, explain, writetest
.claude/skills/        46 marketing skill'i (MIT, Corey Haines) + doc-ingest + doc-export — /taa:marketing ve /taa:ingest·/taa:report bunlara yönlendirir
                       + QA-kit: test-discovery, test-plan, test-automate, test-run (bkz. § Test hattı)
requirements-doc.txt    doc-ingest/doc-export'un opsiyonel pip bağımlılıkları (`./install.sh --with-docs`)
templates/qa-kit/      QA-kit senaryo/plan şablonları + Playwright/k6/Docker/CI örnekleri (bkz. § Test hattı)
scripts/taa-guard.sh            PostToolUse hook (Write/Edit/MultiEdit/NotebookEdit) — deterministik bloklar
scripts/taa-guard-pretooluse.sh PreToolUse hook — secret şekilleri yazılmadan önce reddedilir
scripts/taa-guard-bash-scan.sh  PostToolUse/Bash hook — Bash'le yazılan dosyaları `git status` ile yeniden tarar
scripts/taa-guard-secrets.sh    üç script'in paylaştığı secret/PII desenleri
scripts/taa-scenarios.py       test senaryosu doğrulayıcı + insan checklist'i üretici (yalnızca python3)
scripts/taa-laya-model.sh      Laya ONNX modelini checksum doğrulamalı kurar (models/laya/)
runner/                Senaryo koşucusu: headless Playwright + Laya yargıcı (.NET, ONNX Runtime) — bkz. runner/README.md
models/laya/           Laya multilingual ONNX modeli (binary'ler gitignore'da; config + SHA256SUMS commit'li)
tests/guard/            saf-bash guard test paketi (bats bağımlılığı yok)
tests/scenarios/        taa-scenarios.py test paketi (örnek set geçer, her kural ihlali reddedilir)
hooks/hooks.json       plugin kurulumunda guard'ı otomatik aktifleştirir
hooks/settings.example.json   install.sh yolunda elle merge edilir
templates/taa/         SPEC / DESIGN / architecture / metrics / backlog / state şablonları
                       + test-scenarios/: SCHEMA.md, scenario/index/result JSON Schema'ları, eksiksiz örnek set
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

### v2.2.0 ile kurulumda değişenler

Test senaryosu hattı (`/taa:writetest`, `taa-tester`) ve senaryo koşucusu
(`runner/`: Playwright + Laya) bu sürümle geldi. Kurulumda değişenler:

| | Önce | v2.2.0 |
|---|---|---|
| Ajanlar / komutlar | 16 rol | **17 rol** (`taa-tester`) + `/taa:writetest` |
| `templates/taa/` | yalnız `*.md` kopyalanıyordu (`loadtest.template.js` hiç gitmiyordu — hata) | **tüm ağaç**: `test-scenarios/` (SCHEMA.md, 3 JSON Schema, örnek set) + `loadtest.template.js` |
| `scripts/` | guard + backlog kontrolü | + `taa-scenarios.py` (senaryo doğrulayıcı / checklist üretici) |
| Proje köküne | — | **`taa-runner/`** (Playwright koşucusu + .NET Laya yargıcı kaynağı; `node_modules` ve build çıktısı hariç) |
| `.gitignore` | `.taa/inputs/`, `.taa/reports/`, eval sonuçları | + `taa-runner/{node_modules,.laya-judge-bin,playwright-report,test-results}/`, senaryo `results/evidence/`, `laya-dataset-*.jsonl`, `.partial-*.jsonl` (sonuç JSON'ları commit'lenir) |
| Yeni bayrak | — | **`--with-laya`**: Laya ONNX modelini (650 MB) **bir kez** `~/.taa/models/laya/v4`'e kurar, SHA256 ile doğrular — tüm projeler paylaşır |
| `state.md` şablonu | — | `Track: TESTSCENARIO`, `Test level: light\|normal\|hard` |

**Yeni ön koşullar — hepsi opsiyonel, yalnız senaryoları otomatik koşmak için:**

| Araç | Ne için | Yoksa |
|---|---|---|
| Node 20+ | `taa-runner` (Playwright) | senaryolar yine yazılır; insan `README.md` checklist'iyle ya da Playwright MCP ile koşar |
| .NET 10 SDK | Laya yargıcı (ilk koşuda otomatik derlenir) | `TAA_JUDGE=assertions` — Laya'sız, yalnız deterministik kontroller |
| Laya modeli | yargıcın modeli (`--with-laya` veya `scripts/taa-laya-model.sh`) | aynı: `TAA_JUDGE=assertions` |
| python3 | set doğrulaması (`taa-scenarios.py`) — zaten ön koşul | koşucu doğrulamayı atlar ve uyarır |

```bash
# yeni proje
./install.sh /path/to/project --with-laya
cd /path/to/project/taa-runner && npm install && npx playwright install chromium

# modeli ayrıca / başka kaynaktan kurmak
scripts/taa-laya-model.sh --from /path/to/laya/v4 --to ~/.taa/models/laya/v4
```

**Zaten kurulu bir projeyi güncellerken:** `./install.sh /path/to/project`
komutunu tekrar çalıştırın. Agent, komut, şablon, script ve `taa-runner/`
yenilenir. **İstisna `CLAUDE.md`:** installer, içinde TAA kuralları olan bir
`CLAUDE.md`'ye dokunmaz. Yeni `/taa:writetest` satırını ve QA tablosundaki
"Senaryo seti" komutunu bu deponun [`CLAUDE.md`](CLAUDE.md)'sinden elle
taşıyın. Ajanlar oturum başında yüklendiği için ardından Claude Code
oturumunu yeniden başlatın.

**Plugin kurulumunda:** koşucu plugin'in içinde gelir
(`${CLAUDE_PLUGIN_ROOT}/runner`) ve `taa-tester` onu otomatik bulur. İlk
kullanımda `npm install` bu dizinde yapılır. Plugin model binary'sini
içermez; modeli bir kez kurun:
`"${CLAUDE_PLUGIN_ROOT}/scripts/taa-laya-model.sh" --from <v4 dizini> --to ~/.taa/models/laya/v4`.

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

`codex/` adaptörü: `AGENTS.md` (Codex talimat zinciri), `codex/agents/*.toml` (17 rolün otomatik dönüşümü — `scripts/convert-to-codex.py`), TAA Guard git pre-commit olarak (`scripts/install-precommit.sh`). Pipeline'a giriş: *"Run the TAA pipeline for: <talep>"*. Fark tablosu: [codex/README.md](codex/README.md)

## Doküman hattı: `/taa:docs`

Kod değil doküman ürettirmek için aynı disiplinin hafif hattı: **BRAIN → PLAN (kitle/dil/outline, PO) → DRAFT (`taa-writer`) → REVIEW (QA) → DREAM.** Writer'ın anayasal kuralı *grounding*: uygulamaya dair her iddia koda, `.taa/` artefaktına veya brain'e izlenmek zorunda — bulamadığını `[VERIFY]` diye işaretler, **asla var olmayan özellik dokümante etmez.** QA aşaması iddiaları koda karşı spot-check eder, adımları baştan sona yürür, terminolojiyi sözlüğe karşı doğrular. Sözlük ve voice kararları dream ile brain'e yazılır — ikinci manuel ilk günden tutarlı çıkar.

```
/taa:docs kullanım manueli: lisans yönetimi modülü, hedef kitle son kullanıcı, dil TR
/taa:docs release notes v2.4 için, backlog TAA-030..045
```

## Pazarlama hattı: `/taa:marketing`

Yazılımı üreten aynı stack onu pazarlar da: [Corey Haines'in marketingskills](https://github.com/coreyhaines31/marketingskills) paketi (MIT) `.claude/skills/` altında **46 skill** olarak gömülü — sosyal post, blog/copywriting, video senaryosu, launch, SEO/AI-SEO, reklam, e-posta/SMS, pricing, CRO, churn, rakip analizi ve dahası. `/taa:marketing <talep>` tek giriş noktasıdır: talebi doğru skill(ler)e yönlendirir ve TAA farkını ekler — **içerik `.taa/` artefaktlarına dayanır** (SPEC'teki gerçek özellikler, RESEARCH'teki rakip konumu, DESIGN.md'nin Voice & Tone'u bağlayıcı), uydurma iddia/metrik yasak (writer'la aynı grounding kuralı), taslaklar `.taa/marketing/` altına düşer, **yayınlamak daima insanın eylemidir.** Skill'ler doğrudan da çağrılabilir (`/social`, `/launch`, `/pricing`…). Instagram/LinkedIn gibi görsel-ağırlıklı kanallarda `social` metni yazdıktan sonra orkestratör otomatik olarak **`design`** (Claude Design canvas) ile `DESIGN.md`'nin palette/typography'sine bağlı, marka-tutarlı bir görsel de üretir (quote card/carousel slide/kapak — API key gerektirmez); fotogerçekçi görsel gerekiyorsa `image` skill'i ayrıca ve isteğe bağlı devreye girer.

```
/taa:marketing launch: lisanslama modülü v2 — LinkedIn postu + blog + 30sn video senaryosu
/taa:marketing pricing sayfamızı Van Westendorp'a göre gözden geçir
```

## Test senaryosu hattı: yazdır → onayla → koş

Sayfaları **insan test eder gibi** adım adım yazan ve aynı dosyadan **insan,
Laya veya headless Playwright** ile koşulabilen senaryolar.
Format: [`templates/taa/test-scenarios/SCHEMA.md`](templates/taa/test-scenarios/SCHEMA.md) ·
koşucu: [`runner/README.md`](runner/README.md).

| Seviye | Ne test eder |
|---|---|
| `light` | Sayfa çalışıyor mu? Sayfa başına bir SMOKE: açılıyor, ana başlık ve ana aksiyon görünüyor, konsol hatası yok, 4xx/5xx yok |
| `normal` | Temel fonksiyonlar: her formun mutlu yolu + ana negatif durumu, liste/arama/filtre, CRUD, navigasyon |
| `hard` | Tüm FE + BE: her alanın validasyonu ve sınır değerleri, boş/yükleniyor/hata durumları, her rolün yetkisi, sayfanın çağırdığı her endpoint'e doğrudan istek (400/401/403/IDOR, hassas alan sızıntısı), klavye + axe |

Seviyeler kümülatiftir: `hard` seçilirse `light` ve `normal` senaryoları da yazılır.

### 1) `/taa:start` içinde — otomatik

Ayrı bir şey yapmanız gerekmez:

1. **Stage 0:** CHIEF sorusuna verdiğiniz cevap seviyeyi belirler:
   `full` → **hard**, `light` → **normal** (`state.md` → `Test level`).
2. **QA-A:** `taa-qa` metrikleri ve iskeletleri yazar, ardından `taa-tester`
   SPEC/DESIGN/architecture'dan senaryoları yazar. İkisi **aynı onay
   kapısında** gelir. Seviyeyi ya da içeriği değiştirmek için:
   `düzelt: seviye hard olsun` / `düzelt: fatura listesinde sayfalama senaryosu eksik`.
3. **DEV:** senaryolardaki başlık, etiket ve düğme adları DEV için
   **sözleşmedir**. UI, bu locator'lar çözülecek şekilde yazılır; senaryo
   dosyası düzenlenmez.
4. **QA-B:** Çalışan uygulamanın local/staging adresi sorulur (production
   asla kabul edilmez). Set `taa-runner` ile headless koşulur. Kalan
   senaryolar normal DEV düzeltme listesine girer.

### 2) Bağımsız — `/taa:writetest`

Mevcut bir projede (brownfield) koddan senaryo yazdırmak için:

```text
/taa:writetest light all                                   # her sayfa için "açılıyor mu" testi
/taa:writetest /login                                      # normal (varsayılan) — giriş sayfası
/taa:writetest hard fatura oluşturma ekranı                # serbest metin → route eşlenir
/taa:writetest normal /faturalar --url http://localhost:3001          # locator'lar canlı sayfada doğrulanır (salt okunur)
/taa:writetest hard /faturalar --url http://localhost:3001 --run      # yaz, onayla, hemen koş
```

Akış: (hard ise brain'den tekrarlayan bulgu sınıfları) → `taa-tester`
koddan yazar ve her iddia için `file:line` kanıtı gösterir → validator
mekanik kontrol yapar → **tek onay kapısı** (`onayla / düzelt: <not> / iptal`)
→ `--run` verilmişse koşum → run `.taa/archive/`'e taşınır.
Aktif bir `/taa:start` run'ı varsa onun dizinine yazar.

Çıktı (`.taa/runs/<run-id>/test-scenarios/`):

```
index.json                 koşum listesi (Laya / otomasyon bu sırayla koşar)
scenarios/TC-SMOKE-001.json   her senaryo: adım başına soru + beklenen + aksiyon/assertion
README.md                  insan için checklist (JSON'dan üretilir, elle düzenlenmez)
results/                   koşum sonuçları; evidence/ altında ekran görüntüsü + trace
```

### 3) Koşmak

**İnsan:** `README.md` checklist'ini sırayla uygular. Her adımda
Yapılacaklar → Soru → Beklenen → ☐ Geçti / ☐ Kaldı.

**Headless (Playwright + Laya):**

```bash
cd taa-runner            # kaynak depoda: runner/
BASE_URL=http://localhost:3001 \
API_BASE_URL=http://localhost:5080 \
TAA_SCENARIOS=../.taa/runs/<run-id>/test-scenarios \
TEST_USER_EMAIL=… TEST_USER_PASSWORD=… \
npm run scenarios
```

- Senaryonun istediği `{{env.X}}` değerleri ortamdan gelir
  (`index.json` → `env.required`). Eksik olan senaryo `blocked` olur.
- Rol gerektiren senaryolar için storageState verin:
  `TAA_AUTH_STATE_MUHASEBE_UZMANI=./auth/muhasebe.json`
  (`templates/qa-kit/examples/auth.setup.ts` ile üretilir).
- Alt küme koşmak için: `TAA_LEVEL=light`, `TAA_ONLY=TC-SMOKE-001,TC-NEG-003`.
- Sonuç: `results/<stamp>-playwright.json`. Başarısız adımlar için
  `results/evidence/` altında ekran görüntüsü ve trace; HTML rapor
  `taa-runner/playwright-report/` altında.
- Kurulumu denemek için: `npm run selftest` (örnek seti gömülü bir giriş
  uygulamasına karşı koşar, 5/5 geçmeli).

**Laya'nın rolü — dürüst not:** Laya (yerel, metin tabanlı ONNX model)
her adımın sorusunu sayfanın erişilebilirlik ağacına bakarak cevaplar.
Ölçümde bugünkü v4 modeli sayfa durumu sorularında **şans seviyesinde**
çıktı (5–7/12). Bu yüzden varsayılan mod **`shadow`**: geç/kal kararını
deterministik assertion'lar verir, Laya'nın cevabı ve assertion'larla
uyuşup uyuşmadığı sonuca kaydedilir. `TAA_LAYA_DATASET=1` fine-tune için
etiketli veri toplar. Modelsiz koşmak için `TAA_JUDGE=assertions`
kullanın. Ayrıntı: [`models/laya/README.md`](models/laya/README.md).

## Test hattı: QA-kit

Pipeline'ın `taa-qa` aşamasından bağımsız, herhangi bir repoda tam kapsamlı test
mühendisliği yapmak için ayrı bir skill + subagent seti: **keşif → senaryo (onay)
→ otomasyon → koşum**, dört ayrı beceriye bölünmüş — tek bir "her şeyi test et"
prompt'u hem neyin test edileceğini bilmez hem de testleri gerçekten koşturamaz.

```
/test-discovery   repo taranır, FE route + BE endpoint haritası çıkar → docs/qa/00-discovery.md
/test-plan        risk tabanlı, insan okunur senaryolar üretir        → docs/qa/*.md   [ONAY]
/test-automate     senaryolar Playwright/k6 koduna çevrilir            → tests/**
/test-run          çalıştırır, triage eder, raporlar                  → docs/qa/reports/
```

Senaryo fazından sonra durup onay alması kasıtlıdır. Dört uzman subagent doğrudan
da çağrılabilir: `test-strategist` (risk tabanlı strateji, kod yazmaz),
`e2e-engineer` (Playwright UI/E2E/smoke/a11y), `api-test-engineer` (API/sözleşme/
authz), `perf-engineer` (k6 yük/stres + Lighthouse), `test-triager` (kırmızı testin
kök nedenini kanıtla ayırır: uygulama bug'ı mı, test bug'ı mı, flaky mi).
Değişmez kurallar CLAUDE.md § QA / Test Kuralları'nda kilitlidir: prod'da test
koşulmaz, `waitForTimeout`/sabit `sleep` yasak, retry ile flaky gizlenmez,
eşiksiz yük testi yazılmaz, kırmızı testi geçirmek için assertion gevşetilmez.
Örnek `playwright.config.ts` / `docker-compose.test.yml` / `k6-load.js` /
GitHub Actions `qa.yml` ve senaryo/plan şablonları `templates/qa-kit/` altındadır.

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
accessibility-auditor — gelecekte istenirse mevcut 17 rolün kalıbını taklit
ederek eklenebilirler.

---

## English quickstart

TAA is an adversarial, approval-gated multi-agent SDLC pipeline for Claude Code — 17 least-privilege subagents (the core PM→PO→DES→ARCH→QA→DEV→OPS→SEC→QA gated pipeline, plus a read-only Chief-of-Staff producing evidence-based steering briefs before every human gate, a read-only code Explainer that traces an execution path across layers with a `file:line` citation per hop, a scenario Tester that writes light/normal/hard test scenarios a human, the Laya runner or a headless browser executes step by step, plus data/compliance/support/l10n specialists), human gates after every stage, all decisions frozen into versioned `.taa/*.md` artifacts — **plus an institutional-memory brain** (recall at Stage 0, dream-cycle consolidation at Stage 10, recurring findings auto-promoted to a mandatory security checklist) and deterministic PreToolUse/PostToolUse guard hooks (secrets — including `.md`/`.taa` artifacts and Bash-written files, lorem ipsum, hard-coded colors, interpolated SQL → blocked by code). Beyond code it ships a grounded docs track (`/taa:docs`), a marketing track (`/taa:marketing`) bundling the 46 MIT-licensed [marketing skills by Corey Haines](https://github.com/coreyhaines31/marketingskills), and a doc I/O track (`/taa:ingest`, `/taa:report`) that turns office files (xlsx/docx/pdf/pptx/vsdx) into cited Markdown evidence and back, and a standalone QA-kit (`/test-discovery` → `/test-plan` [approval] → `/test-automate` → `/test-run`, plus 5 specialist subagents for Playwright E2E, API/contract, k6 load, and red-test triage) for repos that need full test-engineering coverage outside the pipeline — a full software-company agent set: build it, test it, document it, market it. Docs: [PIPELINE](docs/PIPELINE.md) · [BRAIN](docs/BRAIN.md).

```bash
# recommended — nothing is copied into your project:
claude plugin marketplace add ademirel-taztech/taz-agent-stack
claude plugin install taa@taz-marketplace

# or copy-based:
./install.sh /path/to/project    # or --global; add --with-laya for the scenario runner's model

/taa:start <your feature request>
/taa:writetest normal /login --url http://localhost:3001 --run   # human-style scenarios, run headless
```

## License

MIT — see [LICENSE](LICENSE).
