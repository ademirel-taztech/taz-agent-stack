#!/usr/bin/env python3
"""Convert a Markdown "deck" file into a .pptx — one new slide per `## `
heading, bullet lines (`- `/`* `) become the body's bullet list, and a line
starting with `note:` becomes that slide's speaker notes.

Usage:
    python3 md_deck_to_pptx.py <input.md> <output.pptx> [theme.pptx]

If `theme.pptx` is given (and exists), new slides are appended using its
slide master/layouts so palette and fonts follow DESIGN.md instead of
python-pptx's default theme. Without one, a blank default presentation is
used and this is reported on stderr — not silently.
"""
import os
import re
import sys


def parse_deck(md_text: str):
    """Yield (title, bullets, notes) per slide."""
    lines = md_text.splitlines()
    slides = []
    title = None
    bullets = []
    notes = []
    for line in lines:
        heading_match = re.match(r"^##\s+(.*)", line)
        if heading_match:
            if title is not None:
                slides.append((title, bullets, "\n".join(notes)))
            title = heading_match.group(1).strip()
            bullets = []
            notes = []
            continue
        if title is None:
            continue  # content before the first ## heading isn't a slide
        note_match = re.match(r"^note:\s*(.*)", line, re.IGNORECASE)
        if note_match:
            notes.append(note_match.group(1))
            continue
        bullet_match = re.match(r"^\s*[-*]\s+(.*)", line)
        if bullet_match:
            bullets.append(bullet_match.group(1).strip())
    if title is not None:
        slides.append((title, bullets, "\n".join(notes)))
    return slides


def main(input_path: str, output_path: str, theme_path: str = None):
    try:
        from pptx import Presentation
        from pptx.util import Inches
    except ImportError:
        print(
            "ERROR: python-pptx isn't installed. Run: pip install -r requirements-doc.txt "
            "(or `./install.sh --with-docs`). Not falling back to a hand-built pptx.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    slides = parse_deck(md_text)
    if not slides:
        print(f"ERROR: no `## ` slide headings found in {input_path}", file=sys.stderr)
        sys.exit(1)

    if theme_path and os.path.exists(theme_path):
        prs = Presentation(theme_path)
        # Drop any pre-existing slides from the theme file itself — we only want its master/layouts.
        for i in range(len(prs.slides) - 1, -1, -1):
            xml_slides = prs.slides._sldIdLst
            xml_slides.remove(list(xml_slides)[i])
    else:
        if theme_path:
            print(
                f"NOTE: theme file {theme_path} not found — using python-pptx's default theme "
                "(DESIGN.md palette will not be reflected).",
                file=sys.stderr,
            )
        prs = Presentation()

    layout = prs.slide_layouts[1] if len(prs.slide_layouts) > 1 else prs.slide_layouts[0]

    for title, bullets, notes in slides:
        slide = prs.slides.add_slide(layout)
        slide.shapes.title.text = title
        body = None
        for ph in slide.placeholders:
            if ph.placeholder_format.idx != 0:
                body = ph
                break
        if body is not None and bullets:
            tf = body.text_frame
            tf.text = bullets[0]
            for b in bullets[1:]:
                p = tf.add_paragraph()
                p.text = b
        elif bullets:
            left = top = Inches(0.5)
            width = prs.slide_width - Inches(1)
            height = prs.slide_height - Inches(1.5)
            box = slide.shapes.add_textbox(left, top, width, height)
            tf = box.text_frame
            tf.text = bullets[0]
            for b in bullets[1:]:
                p = tf.add_paragraph()
                p.text = b
        if notes:
            slide.notes_slide.notes_text_frame.text = notes

    prs.save(output_path)
    print(f"Wrote {len(slides)} slide(s) to {output_path}")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) == 4 else None)
