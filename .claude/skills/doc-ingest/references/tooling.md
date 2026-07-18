# Doc-ingest tooling — decision tree & honest-degrade messages

Philosophy (same as the rest of TAA): mechanical extraction is code's job,
not the model's. Every branch below ends in either a real extraction or an
honest "can't do this without X" — never a guess dressed up as a result.

## Decision tree

```
file extension?
├── .xlsx / .xlsm         → openpyxl if formulas/named-ranges/sheet-structure
│                            matter; else markitdown for a quick read
├── .xls                  → soffice --headless --convert-to xlsx, then as above
├── .docx / .docm         → python-docx if tracked-changes/comments/styles
│                            matter; else markitdown
├── .doc                  → soffice --headless --convert-to docx, then as above
├── .pptx / .pptm         → python-pptx if speaker notes/slide order matter;
│                            else markitdown
├── .ppt                  → soffice --headless --convert-to pptx, then as above
├── .pdf (text layer)     → pdfplumber for tables, PyMuPDF (fitz) for text+images;
│                            markitdown for a quick single-pass read
├── .pdf (scanned/no text)→ report "OCR required, not installed" — stop
├── .csv                  → read directly (it's already tabular text); no
│                            library needed, just parse and re-emit as an
│                            MD table
├── .vsdx                 → scripts/vsdx_to_mermaid.py
└── .vsd (legacy binary)  → NOT SUPPORTED — ask user for .vsdx or PDF export
```

## Checking what's installed

```bash
python3 -c "import markitdown" 2>&1 | grep -q Error && echo "markitdown: MISSING" || echo "markitdown: OK"
python3 -c "import openpyxl" 2>&1 | grep -q Error && echo "openpyxl: MISSING" || echo "openpyxl: OK"
python3 -c "import pdfplumber" 2>&1 | grep -q Error && echo "pdfplumber: MISSING" || echo "pdfplumber: OK"
python3 -c "import fitz" 2>&1 | grep -q Error && echo "PyMuPDF: MISSING" || echo "PyMuPDF: OK"
python3 -c "import docx" 2>&1 | grep -q Error && echo "python-docx: MISSING" || echo "python-docx: OK"
python3 -c "import pptx" 2>&1 | grep -q Error && echo "python-pptx: MISSING" || echo "python-pptx: OK"
python3 -c "import vsdx" 2>&1 | grep -q Error && echo "vsdx: MISSING" || echo "vsdx: OK"
command -v soffice >/dev/null && echo "soffice: OK" || echo "soffice: MISSING"
```

Run the check before committing to a tool; report the result rather than
discovering the `ImportError` mid-task and improvising.

## Honest-degrade messages (use verbatim, filled in)

| Situation | What to tell the user |
|---|---|
| `markitdown` missing, no fallback installed either | "I can't ingest `<file>` — none of markitdown/openpyxl/python-docx/python-pptx/pdfplumber/PyMuPDF are installed. Run `pip install -r requirements-doc.txt` (or `./install.sh --with-docs`) and I'll retry." |
| Legacy format (`.doc`/`.xls`/`.ppt`), `soffice` missing | "`<file>` is a legacy binary Office format and LibreOffice (`soffice`) isn't installed, so I can't convert it. Install LibreOffice, or export/save the file as `<modern-extension>` yourself and hand me that instead." |
| Scanned PDF, no OCR tool | "`<file>` looks like a scanned/image-only PDF — no text layer, and OCR isn't installed. I can't extract its content honestly; if you have OCR tooling (e.g. `ocrmypdf`) run it first, or provide a text-based export." |
| `.vsd` (legacy binary Visio) | "`<file>` is the legacy binary `.vsd` format, which isn't supported (no reliable open-source parser). Please export it as `.vsdx` from Visio, or as a PDF, and I'll ingest that instead." |
| Macro present (`.xlsm`/`.docm`/`.pptm`) | Not a blocker — ingest content normally, but add a `lossy_notes` line: `"file contains macros (VBA); macros were not executed or inspected, content only"`. |

## Formula/precision notes (why openpyxl over markitdown sometimes)

`markitdown` renders a spreadsheet cell's **value**, not its formula — fine
for "what does this report say" but wrong for "what does this model
compute and how." If PO/ARCH need to cite a calculation (e.g. a pricing
formula in a spec spreadsheet), use `openpyxl` (`data_only=False` to read
the formula string, `data_only=True` for the last-computed value — read both
and note either explicitly in the output) rather than markitdown.

## Vendor note

Anthropic's public `anthropics/skills` repository ships production-tested
docx/xlsx/pptx/pdf skills with a documented gotcha list (encoding quirks,
library version pitfalls). If its license permits vendoring for this
project, prefer copying its lessons into this file over rediscovering them;
otherwise, reference it here and keep this file as our own summary — do not
copy content of unclear license without attribution.
