# Backlog

Ertelenmiş işlerin tek kaydı. Kodda `TODO`/`FIXME`/`HACK`/`XXX` bırakılmaz; bu görevde tamamlanamayan her iş burada izlenir.

Buraya **yalnızca kullanıcının onayıyla** madde eklenir (CLAUDE.md / CODEX.md → Zorunlu Kodlama Kuralları, madde 4): ajan işi bırakmadan önce durur, ne bırakılacağını, nedenini ve etkisini kullanıcıya sorar; onay gelirse maddeyi aynı branch'te ekler ve PR açıklamasında belirtir. Onay yoksa iş tamamlanır.

## Madde formatı

```markdown
### BL-001 — <kısa başlık>
- **Tarih:** YYYY-AA-GG
- **Durum:** Açık | Devam ediyor | Kapandı (<PR bağlantısı>)
- **Bağlam:** hangi görev / PR sırasında ortaya çıktı
- **Konum:** `dosya/yolu:satır` veya modül adı
- **Ne eksik:** yapılmayan işin açık tanımı
- **Neden ertelendi:** kapsam dışı / dış engel / karar bekliyor …
- **Onay:** kullanıcı, YYYY-AA-GG
- **Kabul kriteri:** iş bittiğinde doğrulanabilir olarak ne doğru olmalı
```

Numaralar sıralı ilerler (`BL-001`, `BL-002`, …) ve yeniden kullanılmaz. Kapanan madde silinmez; `Durum` alanı kapatan PR ile güncellenir.

## Açık maddeler

Şu an açık madde yok.

## Kapanan maddeler

Şu an kapanan madde yok.
