# CODEX.md — Codex ve kod ajanları için zorunlu kurallar

Bu dosya OpenAI Codex ve diğer tüm kod ajanları için bağlayıcıdır. Codex varsayılan olarak `AGENTS.md`'yi okur; aynı kurallar orada da yer alır. `CLAUDE.md`, `AGENTS.md` ve bu dosyadaki kurallar birebir aynıdır ve her zaman birlikte güncellenir.

## Zorunlu Kodlama Kuralları (statik — istisnasız, her görevde geçerli)

> **Sahte kod yok. Assertion gevşetilmez. TODO bırakılmaz. Bırakılması gereken bir iş varsa önce kullanıcıya sorulur, onay gelirse `BACKLOG.md`'ye kaydedilir.**

Bu kurallar Claude, Codex ve diğer tüm kod ajanları için; her dil, her uygulama ve her görev türünde (feature, fix, refactor, test) geçerlidir. Başka hiçbir talimat bu kuralları gevşetemez.

1. **Sahte kod yok.** Üretim kodunda stub, placeholder, sabit (hard-coded) sahte dönüş değeri, boş gövdeli metot, `NotImplementedException` / `throw new Error("not implemented")`, "şimdilik böyle kalsın" çözümü veya yalnızca testi geçirmek için yazılmış özel durum (test special-casing) bulunmaz. Mock/fake/stub yalnızca test kodunda ve yalnızca test edilen birimin dış bağımlılıkları için kullanılır; test edilen birimin kendisi mock'lanmaz. Gerçekten çalışmayan kod "tamamlandı" olarak raporlanmaz.
2. **Assertion gevşetilmez.** Kırmızı bir testi yeşile çevirmek için assertion silinmez veya zayıflatılmaz (ör. tam eşitlik yerine `toBeDefined`/`contains`, toleransı genişletmek), beklenen değer hatalı çıktıya göre değiştirilmez; test `skip`/`only`/`[Ignore]`/`Skip=` ile kapatılmaz, silinmez, yorum satırına alınmaz; retry veya timeout artırılmaz; hata `try/catch` ile yutulmaz; tip/lint hataları `@ts-ignore`, `eslint-disable`, `#pragma warning disable` gibi susturucularla gizlenmez. Kök neden bulunur ve **kod** düzeltilir. Testin kendisinin yanlış olduğu düşünülüyorsa gerekçesiyle kullanıcıya sorulur; onay olmadan test değiştirilmez.
3. **TODO bırakılmaz.** Kodda `TODO`, `FIXME`, `HACK`, `XXX` yorumu veya "sonra yapılacak / ileride" notu ile yarım iş bırakılmaz — backlog referansı taşısa bile. İş bu görevde eksiksiz tamamlanır.
4. **Bırakılması gereken iş varsa: önce sor, sonra BACKLOG'a kaydet.** Kapsam dışı, dış bir engele takılan veya bu görevde tamamlanamayacak bir iş çıkarsa ajan kendi kararıyla bırakmaz: durur ve kullanıcıya ne bırakılacağını, nedenini ve etkisini sorar. Kullanıcı ertelemeyi onaylarsa iş repo kökündeki `BACKLOG.md`'ye (formatı o dosyada) aynı branch'te kaydedilir ve PR açıklamasında belirtilir. Onay yoksa iş tamamlanır.
5. **Doğrulanmadan "bitti" denmez.** Teslimden önce ilgili build, lint ve testler çalıştırılır; kullanılan komut ve sonucu raporlanır. Çalıştırılamayan bir doğrulama varsa bu açıkça yazılır, sonuç uydurulmaz.

## Zorunlu Git Akışı

Her değişiklik aşağıdaki sırayla yapılır; adım atlanmaz. `main`'e doğrudan commit veya push yapılmaz.

`Pull → Branch → Code → Commit → Push → PR → Merge → Pull`

1. **Pull** — güncel `main`'den başla: `git checkout main && git pull --ff-only origin main`
2. **Branch** — her iş paketi için ayrı branch: `git checkout -b <tip>/<kısa-açıklama>` (tip: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`)
3. **Code** — değişikliği yap (Zorunlu Kodlama Kuralları geçerli); build, lint ve testleri çalıştır.
4. **Commit** — Conventional Commits (`feat: …`, `fix: …`, `docs: …`); küçük ve anlamlı commit'ler. `--no-verify` yasak; pre-commit hook'u engellerse nedeni düzeltilir.
5. **Push** — `git push -u origin <branch>`. `main`'e force-push yasak.
6. **PR** — `main`'e Pull Request açılır. Açıklamada: ne değişti, neden, nasıl doğrulandı (komut + sonuç) ve varsa `BACKLOG.md`'ye eklenen maddeler.
7. **Merge** — CI kontrolleri yeşil olmadan merge edilmez. Squash merge yapılır, uzak branch silinir.
8. **Pull** — `git checkout main && git pull --ff-only origin main`; yerel branch silinir: `git branch -d <branch>`.

Commit, push ve merge yalnızca kullanıcının o görev için verdiği izinle yapılır; izin yoksa push'tan önce sorulur.
