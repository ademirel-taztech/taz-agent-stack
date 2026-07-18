---
name: doc-export
description: When the user wants a `.taa/` artifact (status, metrics, backlog, review findings, a manual, a steering brief) delivered as a real office file — docx, pdf, xlsx, or pptx — instead of Markdown. Also use when `/taa:report` is called, or when taa-writer/taa-qa/taa-chief need to hand off a polished document rather than a raw .md file. Trigger phrases: "export this as a Word doc," "give me a PDF," "put the metrics in Excel," "make a slide deck out of this," "I need a report I can send to stakeholders." For reading office files INTO `.taa/`, see doc-ingest.
metadata:
  version: 1.0.0
---

# Doc Export

You turn `.taa/` Markdown artifacts into office files. The canonical content
always stays Markdown in the repo — office formats exist only at the output
boundary. Mechanical conversion is code's job (pandoc, openpyxl, python-pptx),
not yours: **you never hand-author a binary docx/xlsx/pptx byte-for-byte.**

## Canonical flow

```
.taa/<artifact>.md  →  (compiler script)  →  office output in .taa/reports/
```

| Target | Compiler | Notes |
|---|---|---|
| docx | `pandoc <in.md> -o <out.docx> --reference-doc=templates/export/reference.docx` | reference.docx carries corporate styles (cover/header/style set) |
| pdf | `pandoc <in.md> -o <out.pdf> --pdf-engine=weasyprint` | weasyprint avoids a LaTeX install; degrade if missing (see below) |
| xlsx | `scripts/md_tables_to_xlsx.py <in.md> <out.xlsx>` | one sheet per Markdown table, named after the nearest heading, numeric columns typed |
| pptx | `scripts/md_deck_to_pptx.py <in.md> <out.pptx> [templates/export/deck-theme.pptx]` | one slide per `##` heading; bullets from `-`/`*` list lines; `note:` lines → speaker notes |
| diagram (svg/png) | Mermaid stays canonical; `mmdc` (mermaid-cli) renders SVG/PNG if installed | **Visio (.vsdx) authoring is NOT supported** — see below |

Run `python3 scripts/ensure_templates.py templates/export .taa/DESIGN.md`
once per project (or whenever `DESIGN.md`'s palette changes) to (re)generate
`reference.docx`/`deck-theme.pptx` from the project's own design tokens
instead of hand-crafted binary assets committed to the repo. If the
generators degrade (python-docx/python-pptx missing), pandoc/python-pptx
fall back to their own built-in defaults — reported, never silent.

## The Visio limitation (be upfront about this)

**This skill does not write `.vsdx`.** There is no reliable open-source
writer for Visio's format that isn't a hand-rolled, likely-broken
approximation. If a user asks for a diagram "as a Visio file," do this
instead and say so explicitly:

1. Keep the diagram as Mermaid (canonical).
2. Offer an SVG/PNG render via `mmdc` if installed.
3. Offer a **draw.io XML** export instead (draw.io can import Mermaid-derived
   flowcharts reasonably well and its files *can* be imported into Visio via
   draw.io's own Visio-compatible export) — with the caveat: "this is
   importable into Visio via draw.io, not a native .vsdx."

Never claim a `.vsdx` was produced when it wasn't.

## Honest-degrade messages

| Missing tool | What to tell the user |
|---|---|
| `pandoc` | "I can't export docx/pdf — `pandoc` isn't installed. Run `./install.sh --with-docs` or `brew install pandoc` (or your platform's equivalent), then retry. I will not hand-write a docx to work around this." |
| `weasyprint` (pdf engine) | "pandoc is installed but the pdf engine (`weasyprint`) isn't — `pip install weasyprint` (has system deps: cairo, pango, gdk-pixbuf). Alternative: export docx and convert manually." |
| `openpyxl` | "xlsx export needs `openpyxl` — `pip install -r requirements-doc.txt`." |
| `python-pptx` | "pptx export needs `python-pptx` — `pip install -r requirements-doc.txt`." |
| `soffice` (render verification, see below) | "I generated the file but can't verify it renders — LibreOffice (`soffice`) isn't installed. Treat this as unverified until you open it yourself, or install LibreOffice and I'll re-check." |
| `mmdc` (diagram render) | "Mermaid stays as source; I can't render SVG/PNG without `mmdc` (`npm install -g @mermaid-js/mermaid-cli`)." |

## Mandatory verification step

Every generated docx/pptx is rendered with
`soffice --headless --convert-to pdf --outdir <tmp> <file>` and the first
page/slide is checked (page count > 0, non-zero file size). If it fails to
render, **the output is not handed to the user** — report the render error
instead of delivering a possibly-corrupt file. If `soffice` itself isn't
installed, deliver the file but say plainly that render-verification was
skipped (see table above) — never claim "verified" when it wasn't.

## Rules

- Markdown source is always kept in `.taa/` — office files are generated
  into `.taa/reports/`, never treated as the source of truth.
- Never invent metrics/content while "polishing" for the export format —
  export is formatting only, exactly the source content plus the template's
  presentation.
- DESIGN.md's Voice & Tone and palette apply if the project has one
  (`ensure_templates.py` reads the palette; wording is your job as you write
  the source `.md`, not the compiler's).
- Publishing/sending the exported file is always the human's action —
  this skill only produces the file under `.taa/reports/`.

## Output (returned to caller)

- Path written under `.taa/reports/`.
- Which compiler ran, and whether it degraded (and how).
- Render-verification result (pass / failed / skipped-no-soffice).
