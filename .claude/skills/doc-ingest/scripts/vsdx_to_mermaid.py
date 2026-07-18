#!/usr/bin/env python3
"""Convert a Visio .vsdx file's shape/connector graph into a Mermaid flowchart.

Usage:
    python3 vsdx_to_mermaid.py <file.vsdx> [page_name_or_index]

Prints a Mermaid ```mermaid``` fenced block to stdout. Shapes that can't be
mapped to a labeled node (empty/non-text shapes, e.g. pure decoration) are
listed as `[VSDX-UNMAPPED: shape <id>]` nodes rather than silently dropped —
per doc-ingest's SKILL.md rule against hiding lossy conversions.

Legacy binary `.vsd` is NOT supported by this script (or by the `vsdx`
library) — ask the user for a `.vsdx` or PDF export instead.

Mechanical note: this reads the page's `Connect` elements the way the `vsdx`
library models them — a connector shape has two `Connect` records pointing at
the two shapes it joins (`FromCell` of `BeginX`/`EndX` marks which end is
which). We group by connector shape id to reconstruct each edge.
"""
import re
import sys


def sanitize_node_id(shape_id: str) -> str:
    return "n" + re.sub(r"[^A-Za-z0-9_]", "_", str(shape_id))


def sanitize_label(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    text = text.replace('"', "'").replace("\n", "<br/>")
    if len(text) > 120:
        text = text[:117] + "..."
    return text


def convert(vsdx_path: str, page_ref=None) -> str:
    try:
        import vsdx
    except ImportError:
        print(
            "ERROR: the `vsdx` Python package isn't installed.\n"
            "Install it with: pip install -r requirements-doc.txt (or `pip install vsdx`)\n"
            "I can't guess this diagram's structure without it — stopping honestly.",
            file=sys.stderr,
        )
        sys.exit(1)

    unmapped = []
    lines = ["flowchart TD"]

    with vsdx.VisioFile(vsdx_path) as vis:
        if page_ref is not None:
            try:
                page = vis.get_page(int(page_ref))
            except (ValueError, TypeError):
                page = vis.get_page_by_name(page_ref)
        else:
            page = vis.pages[0]

        node_ids = set()
        for shape in page.all_shapes:
            label = sanitize_label(getattr(shape, "text", ""))
            node_id = sanitize_node_id(shape.ID)
            if node_id in node_ids:
                continue
            node_ids.add(node_id)
            if label:
                lines.append(f'    {node_id}["{label}"]')
            else:
                unmapped.append(shape.ID)
                lines.append(f'    {node_id}["[VSDX-UNMAPPED: shape {shape.ID}]"]')

        # Group Connect records by the connector shape id (from_id) to
        # reconstruct each edge from its Begin/End endpoints.
        by_connector = {}
        for c in page.connects:
            by_connector.setdefault(c.connector_shape_id, []).append(c)

        edges_emitted = 0
        for connector_id, conns in by_connector.items():
            if len(conns) != 2:
                # Can't unambiguously reconstruct a two-ended edge — note and skip.
                unmapped.append(f"connector {connector_id} (unexpected endpoint count: {len(conns)})")
                continue
            begin = next((c for c in conns if c.from_rel == "BeginX"), conns[0])
            end = next((c for c in conns if c.from_rel == "EndX"), conns[1])
            src = sanitize_node_id(begin.shape_id)
            dst = sanitize_node_id(end.shape_id)
            lines.append(f"    {src} --> {dst}")
            edges_emitted += 1

    if edges_emitted == 0 and not any("-->" in l for l in lines):
        lines.append("    %% no connectors found on this page")

    output = "```mermaid\n" + "\n".join(lines) + "\n```"
    if unmapped:
        output += "\n\n**Unmapped items (report these, do not drop silently):**\n"
        for u in unmapped:
            output += f"- `[VSDX-UNMAPPED: {u}]`\n"
    return output


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    path = sys.argv[1]
    ref = sys.argv[2] if len(sys.argv) > 2 else None
    if path.lower().endswith(".vsd"):
        print(
            "ERROR: legacy binary .vsd is not supported. "
            "Ask the user to export as .vsdx or PDF instead.",
            file=sys.stderr,
        )
        sys.exit(1)
    print(convert(path, ref))
