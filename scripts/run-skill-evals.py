#!/usr/bin/env python3
"""Run a skill's evals.json against the live Anthropic API and score the
result. Goal is catching regressions in a skill's SKILL.md, not building a
polished benchmark — so scoring is a cheap hybrid, not a research-grade rig:

  1. Keyword heuristic (always runs, no API key needed): does the response
     contain wording that plausibly satisfies each assertion? Crude, but
     free and fast, and gives *something* even with no API access.
  2. LLM judge (only if ANTHROPIC_API_KEY is set): asks the same model to
     score each assertion true/false with a one-line reason. This is the
     real signal; the keyword heuristic is a fallback, not a replacement.

Usage:
    python3 scripts/run-skill-evals.py <skill-name>   # one skill
    python3 scripts/run-skill-evals.py --all          # every skill with an evals.json
    python3 scripts/run-skill-evals.py --all --dry-run  # print eval defs, don't call the API

Writes .claude/skills/<skill>/evals/results-<YYYY-MM-DD>.json per skill run,
and prints a one-line pass/fail summary per skill to stdout.

Model: set ANTHROPIC_MODEL to override the default (claude-sonnet-5).
Without ANTHROPIC_API_KEY, this degrades honestly: it prints the eval
definitions and keyword-heuristic-only results, clearly labeled as such —
it never fabricates a "passed" result without having actually asked the model.
"""
import argparse
import datetime
import json
import os
import pathlib
import re
import sys

SKILLS_DIR = pathlib.Path(".claude/skills")
DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")


def find_skill_dirs(names):
    if names == ["--all"] or names == []:
        return sorted(d for d in SKILLS_DIR.iterdir() if (d / "evals" / "evals.json").exists())
    dirs = []
    for n in names:
        d = SKILLS_DIR / n
        if not (d / "evals" / "evals.json").exists():
            print(f"WARN: {n} has no evals/evals.json — skipping", file=sys.stderr)
            continue
        dirs.append(d)
    return dirs


def keyword_heuristic(response_text: str, assertion: str) -> bool:
    """Crude fallback: strip the assertion to its significant words and check
    how many appear in the response. Not rigorous — see module docstring."""
    words = re.findall(r"[a-zA-Z]{4,}", assertion.lower())
    stop = {"this", "that", "with", "should", "does", "from", "than", "into", "each"}
    sig = [w for w in words if w not in stop]
    if not sig:
        return False
    hits = sum(1 for w in sig if w in response_text.lower())
    return hits / len(sig) >= 0.5


def call_model(client, model, skill_md: str, prompt: str) -> str:
    msg = client.messages.create(
        model=model,
        max_tokens=2000,
        system=skill_md,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")


def judge_assertions(client, model, response_text: str, assertions: list) -> dict:
    assertion_list = "\n".join(f"{i+1}. {a}" for i, a in enumerate(assertions))
    judge_prompt = (
        "You are scoring whether an AI response satisfied a list of assertions. "
        "For each numbered assertion, answer strictly true or false with one short reason.\n\n"
        f"RESPONSE TO SCORE:\n---\n{response_text}\n---\n\n"
        f"ASSERTIONS:\n{assertion_list}\n\n"
        'Reply as JSON: {"1": {"pass": true/false, "reason": "..."}, "2": {...}, ...} — nothing else.'
    )
    msg = client.messages.create(
        model=model,
        max_tokens=1500,
        messages=[{"role": "user", "content": judge_prompt}],
    )
    raw = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {}


def run_skill(skill_dir: pathlib.Path, dry_run: bool):
    evals_path = skill_dir / "evals" / "evals.json"
    skill_md_path = skill_dir / "SKILL.md"
    data = json.loads(evals_path.read_text())
    skill_md = skill_md_path.read_text()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    client = None
    if not dry_run and api_key:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=api_key)
        except ImportError:
            print(
                "NOTE: `anthropic` package not installed (pip install anthropic) — "
                "falling back to keyword-heuristic-only scoring.",
                file=sys.stderr,
            )

    if dry_run:
        mode = "dry-run"
    elif client:
        mode = "live (LLM-judge, keyword-heuristic fallback if judging fails)"
    else:
        mode = "skipped — no ANTHROPIC_API_KEY, nothing was called or scored"

    results = {
        "skill_name": data["skill_name"],
        "run_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "mode": mode,
        "model": DEFAULT_MODEL if client else None,
        "cases": [],
    }

    for case in data["evals"]:
        case_result = {"id": case["id"], "prompt": case["prompt"], "assertions": []}
        if dry_run:
            for a in case["assertions"]:
                case_result["assertions"].append({"assertion": a, "pass": None, "reason": "dry-run, not evaluated"})
            results["cases"].append(case_result)
            continue

        response_text = ""
        if client:
            try:
                response_text = call_model(client, DEFAULT_MODEL, skill_md, case["prompt"])
            except Exception as e:  # noqa: BLE001 - report honestly, don't crash the whole run
                print(f"WARN: API call failed for case {case['id']}: {e}", file=sys.stderr)

        judged = {}
        if client and response_text:
            try:
                judged = judge_assertions(client, DEFAULT_MODEL, response_text, case["assertions"])
            except Exception as e:  # noqa: BLE001
                print(f"WARN: judge call failed for case {case['id']}: {e}", file=sys.stderr)

        for i, a in enumerate(case["assertions"]):
            key = str(i + 1)
            if key in judged:
                case_result["assertions"].append(
                    {"assertion": a, "pass": judged[key].get("pass"), "reason": judged[key].get("reason", ""), "method": "llm-judge"}
                )
            elif response_text:
                case_result["assertions"].append(
                    {"assertion": a, "pass": keyword_heuristic(response_text, a), "reason": "keyword heuristic (no judge result)", "method": "keyword"}
                )
            else:
                case_result["assertions"].append(
                    {"assertion": a, "pass": None, "reason": "no response captured (no API key or call failed)", "method": "none"}
                )
        case_result["response_excerpt"] = response_text[:500]
        results["cases"].append(case_result)

    today = datetime.date.today().isoformat()
    out_path = skill_dir / "evals" / f"results-{today}.json"
    out_path.write_text(json.dumps(results, indent=2))

    total = sum(len(c["assertions"]) for c in results["cases"])
    passed = sum(1 for c in results["cases"] for a in c["assertions"] if a["pass"] is True)
    unscored = sum(1 for c in results["cases"] for a in c["assertions"] if a["pass"] is None)
    print(f"{data['skill_name']}: {passed}/{total} assertions passed ({unscored} unscored) — {results['mode']} — wrote {out_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("skills", nargs="*", help="skill name(s), or --all")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="print eval definitions without calling the API")
    args = parser.parse_args()

    names = ["--all"] if args.all else args.skills
    dirs = find_skill_dirs(names)
    if not dirs:
        print("No skills with evals/evals.json matched.", file=sys.stderr)
        sys.exit(1)

    if not args.dry_run and not os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "NOTE: ANTHROPIC_API_KEY not set — running in keyword-heuristic-only mode. "
            "This is a much weaker signal than the LLM-judge hybrid; set the key for real regression coverage.",
            file=sys.stderr,
        )

    for d in dirs:
        run_skill(d, args.dry_run)


if __name__ == "__main__":
    main()
