---
description: Compile a .taa/ artifact into a polished office document via the doc-export skill
argument-hint: <tür: status|steering|review|manual|release-notes> [format: xlsx|docx|pdf|pptx|md]
---

Parse `$ARGUMENTS` as `<tür> [format]`. Default format per türü if omitted:

| Tür | Kaynak | Varsayılan format |
|---|---|---|
| `status` | `.taa/state.md` + `.taa/backlog.md` + `.taa/metrics.md` | xlsx |
| `steering` | CHIEF steering brief'leri (`/taa:steer` çıktısı veya brain'deki run özetleri) | pptx |
| `review` | `.taa/review.md` (SEC bulguları) | xlsx (bulgu listesi) veya docx (tam rapor) |
| `manual` | `taa-writer` dokümanı (`/taa:docs` çıktısı) | docx (veya pdf) |
| `release-notes` | CHANGELOG-style backlog aralığı | md veya docx |

Invoke the `doc-export` skill to compile the relevant source(s) into
`.taa/reports/<tür>-<timestamp>.<format>`. Follow the skill's mandatory
render-verification step before declaring success; if `soffice` isn't
installed, deliver the file but say plainly that render-verification was
skipped. If the required compiler (pandoc/openpyxl/python-pptx) isn't
installed, degrade honestly per the skill's table — do not hand-produce a
substitute file.

Report the output path, which compiler ran (and any degrade), and the
render-verification result. Publishing/sharing the file is always the
human's action, never automatic.
