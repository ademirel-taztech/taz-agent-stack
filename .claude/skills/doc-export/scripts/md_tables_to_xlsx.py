#!/usr/bin/env python3
"""Convert Markdown tables in a file into an .xlsx workbook — one sheet per
table, named after the nearest preceding heading. Header row is frozen and
numeric-looking columns are typed as numbers, not strings.

Usage:
    python3 md_tables_to_xlsx.py <input.md> <output.xlsx>

Mechanical only — no LLM judgment happens here. If a Markdown table can't be
parsed (ragged rows, no separator line), that table is skipped and reported
on stderr rather than guessed at.
"""
import re
import sys


def find_tables(md_text: str):
    """Yield (sheet_name, headers, rows) for every Markdown table found."""
    lines = md_text.splitlines()
    current_heading = "Sheet1"
    i = 0
    tables = []
    while i < len(lines):
        line = lines[i]
        heading_match = re.match(r"^#{1,6}\s+(.*)", line)
        if heading_match:
            current_heading = heading_match.group(1).strip()
            i += 1
            continue
        if line.strip().startswith("|") and i + 1 < len(lines) and re.match(
            r"^\s*\|?[\s:|-]+\|?\s*$", lines[i + 1]
        ):
            header = [c.strip() for c in line.strip().strip("|").split("|")]
            j = i + 2
            rows = []
            while j < len(lines) and lines[j].strip().startswith("|"):
                cells = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                if len(cells) == len(header):
                    rows.append(cells)
                else:
                    print(
                        f"WARN: skipping ragged row (expected {len(header)} cells, got {len(cells)}): {lines[j]}",
                        file=sys.stderr,
                    )
                j += 1
            tables.append((current_heading, header, rows))
            i = j
            continue
        i += 1
    return tables


def sanitize_sheet_name(name: str, used: set) -> str:
    name = re.sub(r'[\[\]:*?/\\]', "", name)[:31] or "Sheet"
    base = name
    n = 2
    while name in used:
        suffix = f" ({n})"
        name = base[: 31 - len(suffix)] + suffix
        n += 1
    used.add(name)
    return name


def typed_value(cell: str):
    if cell == "":
        return None
    try:
        if re.fullmatch(r"-?\d+", cell):
            return int(cell)
        if re.fullmatch(r"-?\d+\.\d+", cell):
            return float(cell)
    except ValueError:
        pass
    return cell


def main(input_path: str, output_path: str):
    try:
        import openpyxl
        from openpyxl.styles import Font
    except ImportError:
        print(
            "ERROR: openpyxl isn't installed. Run: pip install -r requirements-doc.txt "
            "(or `./install.sh --with-docs`). Not falling back to a hand-built xlsx.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    tables = find_tables(md_text)
    if not tables:
        print(f"ERROR: no Markdown tables found in {input_path}", file=sys.stderr)
        sys.exit(1)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    used_names = set()

    for heading, header, rows in tables:
        sheet_name = sanitize_sheet_name(heading, used_names)
        ws = wb.create_sheet(title=sheet_name)
        ws.append(header)
        for cell in ws[1]:
            cell.font = Font(bold=True)
        ws.freeze_panes = "A2"
        for row in rows:
            ws.append([typed_value(c) for c in row])
        for col_cells in ws.columns:
            length = max((len(str(c.value)) for c in col_cells if c.value is not None), default=8)
            ws.column_dimensions[col_cells[0].column_letter].width = min(length + 2, 60)

    wb.save(output_path)
    print(f"Wrote {len(tables)} sheet(s) to {output_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
