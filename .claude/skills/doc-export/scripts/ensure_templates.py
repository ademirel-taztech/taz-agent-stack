#!/usr/bin/env python3
"""Generate templates/export/reference.docx and deck-theme.pptx if they don't
exist yet. Run once per project (or whenever DESIGN.md's palette changes);
the resulting files are then reused by pandoc (`--reference-doc`) and
md_deck_to_pptx.py (`theme.pptx` arg) so every export looks consistent
without hand-crafting binary Office templates by hand.

Usage:
    python3 ensure_templates.py <templates/export dir> [DESIGN.md path]

If DESIGN.md is given and contains a `## Palette` section with hex colors,
the first color found is used as an accent; otherwise a neutral default is
used and this is reported on stderr (never invented as if it were a real
brand color).
"""
import os
import re
import sys


def read_accent_color(design_md_path):
    if not design_md_path or not os.path.exists(design_md_path):
        return None
    with open(design_md_path, "r", encoding="utf-8") as f:
        text = f.read()
    section = re.search(r"##\s*Palette.*?(?=\n##|\Z)", text, re.IGNORECASE | re.DOTALL)
    scope = section.group(0) if section else text
    match = re.search(r"#([0-9a-fA-F]{6})\b", scope)
    return match.group(1).upper() if match else None


def ensure_reference_docx(out_path, accent_hex):
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor
    except ImportError:
        print(
            "NOTE: python-docx not installed — cannot generate reference.docx. "
            "docx export will use pandoc's built-in default styling instead.",
            file=sys.stderr,
        )
        return False

    if os.path.exists(out_path):
        return True

    doc = Document()
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)

    heading1 = styles["Heading 1"]
    heading1.font.size = Pt(20)
    heading1.font.bold = True
    if accent_hex:
        r, g, b = (int(accent_hex[i : i + 2], 16) for i in (0, 2, 4))
        heading1.font.color.rgb = RGBColor(r, g, b)

    heading2 = styles["Heading 2"]
    heading2.font.size = Pt(15)
    heading2.font.bold = True

    # A visible placeholder cover so users notice this is the reference doc,
    # not real content — pandoc uses this file's *styles*, not its body text.
    doc.add_paragraph(
        "This is the doc-export reference template — pandoc copies its styles, "
        "not this text, into generated documents."
    )
    doc.save(out_path)
    return True


def ensure_deck_theme_pptx(out_path, accent_hex):
    try:
        from pptx import Presentation
    except ImportError:
        print(
            "NOTE: python-pptx not installed — cannot generate deck-theme.pptx. "
            "md_deck_to_pptx.py will fall back to python-pptx's blank default theme.",
            file=sys.stderr,
        )
        return False

    if os.path.exists(out_path):
        return True

    prs = Presentation()
    # A blank default deck is an honest baseline theme; python-pptx doesn't
    # expose a simple API to rewrite the master's theme colors, so accent_hex
    # is recorded in a comment for a human/designer to apply in PowerPoint
    # rather than silently ignored.
    if accent_hex:
        print(
            f"NOTE: DESIGN.md accent color #{accent_hex} found, but python-pptx "
            "can't rewrite the slide master's theme XML directly. Open "
            f"{out_path} in PowerPoint/Keynote once and apply the accent color "
            "manually if you want it reflected in generated decks.",
            file=sys.stderr,
        )
    prs.save(out_path)
    return True


def main(export_dir, design_md_path=None):
    os.makedirs(export_dir, exist_ok=True)
    accent = read_accent_color(design_md_path)
    if not accent:
        print(
            "NOTE: no DESIGN.md palette found — using neutral defaults, not a guessed brand color.",
            file=sys.stderr,
        )
    ensure_reference_docx(os.path.join(export_dir, "reference.docx"), accent)
    ensure_deck_theme_pptx(os.path.join(export_dir, "deck-theme.pptx"), accent)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else None)
