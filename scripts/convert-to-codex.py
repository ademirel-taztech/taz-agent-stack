#!/usr/bin/env python3
"""Convert TAA Claude Code subagents (.claude/agents/*.md) to Codex custom-agent TOML files.
NOTE: verify field names against current Codex docs (developers.openai.com/codex/subagents)
before first use - the custom-agent TOML schema may evolve."""
import re, sys, pathlib

SRC = pathlib.Path(".claude/agents"); DST = pathlib.Path("codex/agents"); DST.mkdir(parents=True, exist_ok=True)
READ_ONLY = {"taa-chief", "taa-security"}  # advisory/audit roles: mark read-only sandbox

def esc(s): return s.replace('\\', '\\\\').replace('"""', '\\"\\"\\"')

for md in sorted(SRC.glob("taa-*.md")):
    text = md.read_text()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    fm, body = m.group(1), m.group(2).strip()
    name = re.search(r"^name:\s*(.+)$", fm, re.M).group(1).strip()
    desc = re.search(r"^description:\s*(.+)$", fm, re.M).group(1).strip()
    tools = (re.search(r"^tools:\s*(.+)$", fm, re.M) or [None, ""])
    tools = tools.group(1).strip() if hasattr(tools, "group") else ""
    ro = "true" if name in READ_ONLY else "false"
    toml = f'''# Generated from .claude/agents/{md.name} by scripts/convert-to-codex.py
# Install: copy to ~/.codex/agents/ (global) or your Codex agents dir, then spawn by name:
#   "Spawn {name.replace('-','_')} to ..."
# VERIFY schema against current Codex custom-agent docs before use.

name = "{name.replace('-','_')}"
description = "{esc(desc)}"
# Claude Code least-privilege tool list was: {tools or '(inherited all)'}
# Codex equivalent: configure sandbox/permissions per agent; read_only below is a hint.
read_only = {ro}

instructions = """
{esc(body)}
"""
'''
    (DST / (name.replace('-','_') + ".toml")).write_text(toml)
    print("converted:", name)
