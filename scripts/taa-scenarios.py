#!/usr/bin/env python3
"""TAA test-scenario tool - deterministic gate + human checklist renderer.

    taa-scenarios.py validate <test-scenarios-dir> [--schemas <dir>]
    taa-scenarios.py render   <test-scenarios-dir> [--schemas <dir>]

`validate` checks index.json, scenarios/*.json and results/*.json against the
JSON Schemas in templates/taa/test-scenarios/ (a dependency-free subset of
JSON Schema draft 2020-12 is implemented below) plus the rules a schema can't
express: primitive-specific expectations, TC-ID/layer/file-name agreement,
variable references, no literal hosts, no literal credentials, execution
order, and per-page coverage. Exit 0 = clean (warnings allowed), 1 = errors,
2 = usage/IO problem.

`render` validates first, then (re)writes <dir>/README.md - the human-readable
checklist generated from the JSON, so a person can run the exact same steps
Laya or a headless browser runs. JSON is the source of truth; never edit the
README by hand.

Same philosophy as scripts/taa-guard.sh and taa-check-backlog.sh: when a
check is mechanical, use code, not an LLM. Python 3.8+, stdlib only.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
LEVEL_ORDER = {"light": 0, "normal": 1, "hard": 2}
PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2}
LAYER_LEVELS = {
    "SMOKE": {"light"},
    "UI": {"normal", "hard"},
    "NEG": {"normal", "hard"},
    "E2E": {"normal", "hard"},
    "API": {"hard"},
    "SEC": {"hard"},
    "A11Y": {"hard"},
}
VAR_RE = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
HOST_RE = re.compile(r"https?://", re.I)
SECRET_KEY_RE = re.compile(r"(pass(word|wd)?|secret|token|api[_-]?key|credential)", re.I)
NEGATIVE_KEY_RE = re.compile(r"^(invalid|wrong|bad|expired|revoked)_", re.I)
PLACEHOLDER_RE = re.compile(r"lorem\s+ipsum|dolor\s+sit\s+amet|\basdf\b|\bqwerty\b|\bfoo\s*bar\b", re.I)

LOCATOR_ACTIONS = {"click", "fill", "clear", "select", "check", "uncheck", "hover", "upload", "wait_for"}
VALUE_ACTIONS = {"fill", "select", "press", "upload"}
LOCATOR_ASSERTIONS = {"visible", "hidden", "enabled", "disabled", "checked", "focused",
                      "text_contains", "text_equals", "value_equals", "count"}
VALUE_ASSERTIONS = {"text_contains", "text_equals", "value_equals", "url_matches", "title_contains"}


# --------------------------------------------------------------------------
# Minimal JSON Schema (draft 2020-12 subset) - exactly the keywords the TAA
# schemas use. Unknown keywords are ignored, like a real validator would.
# --------------------------------------------------------------------------
def _type_ok(value, t):
    if t == "object":
        return isinstance(value, dict)
    if t == "array":
        return isinstance(value, list)
    if t == "string":
        return isinstance(value, str)
    if t == "boolean":
        return isinstance(value, bool)
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if t == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if t == "null":
        return value is None
    return True


def schema_errors(schema, value, path, root):
    errs = []
    if "$ref" in schema:
        ref = schema["$ref"]
        if not ref.startswith("#/"):
            return ["%s: unsupported $ref %s" % (path, ref)]
        target = root
        for part in ref[2:].split("/"):
            target = target[part]
        return schema_errors(target, value, path, root)
    if "const" in schema and value != schema["const"]:
        errs.append("%s: must equal %r" % (path, schema["const"]))
    if "enum" in schema and value not in schema["enum"]:
        errs.append("%s: %r is not one of %s" % (path, value, schema["enum"]))
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_type_ok(value, t) for t in types):
            errs.append("%s: expected %s, got %s" % (path, "/".join(types), type(value).__name__))
            return errs
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            errs.append("%s: shorter than %d chars" % (path, schema["minLength"]))
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errs.append("%s: %r does not match %s" % (path, value, schema["pattern"]))
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errs.append("%s: %r < minimum %r" % (path, value, schema["minimum"]))
        if "maximum" in schema and value > schema["maximum"]:
            errs.append("%s: %r > maximum %r" % (path, value, schema["maximum"]))
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errs.append("%s: needs at least %d item(s)" % (path, schema["minItems"]))
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errs.append("%s: at most %d item(s)" % (path, schema["maxItems"]))
        if schema.get("uniqueItems"):
            seen = [json.dumps(v, sort_keys=True) for v in value]
            if len(seen) != len(set(seen)):
                errs.append("%s: items must be unique" % path)
        if "items" in schema:
            for i, item in enumerate(value):
                errs += schema_errors(schema["items"], item, "%s[%d]" % (path, i), root)
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                errs.append("%s: missing required field '%s'" % (path, key))
        props = schema.get("properties", {})
        extra = schema.get("additionalProperties", True)
        for key, sub in value.items():
            sub_path = "%s.%s" % (path, key)
            if key in props:
                errs += schema_errors(props[key], sub, sub_path, root)
            elif extra is False:
                errs.append("%s: unknown field '%s'" % (path, key))
            elif isinstance(extra, dict):
                errs += schema_errors(extra, sub, sub_path, root)
    return errs


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def load_json(path, errors):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError) as exc:
        errors.append("%s: cannot parse JSON (%s)" % (path.name, exc))
        return None


def walk_strings(node, path="$"):
    """Yield (path, key, string) for every string value in a JSON tree."""
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str):
                yield "%s.%s" % (path, k), k, v
            else:
                yield from walk_strings(v, "%s.%s" % (path, k))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str):
                yield "%s[%d]" % (path, i), None, v
            else:
                yield from walk_strings(v, "%s[%d]" % (path, i))


def find_schemas(explicit):
    candidates = []
    if explicit:
        candidates.append(pathlib.Path(explicit))
    candidates += [
        HERE.parent / "templates" / "taa" / "test-scenarios",
        pathlib.Path.cwd() / "templates" / "taa" / "test-scenarios",
    ]
    for c in candidates:
        if (c / "scenario.schema.json").is_file():
            return c
    return None


# --------------------------------------------------------------------------
# Semantic checks
# --------------------------------------------------------------------------
def check_locator(loc, where, errors):
    if not isinstance(loc, dict):
        return
    by = loc.get("by")
    if by == "role":
        if not loc.get("role"):
            errors.append("%s: by=role needs 'role'" % where)
        if "value" in loc:
            errors.append("%s: by=role uses role/name, not 'value'" % where)
    elif by in ("label", "testid", "text"):
        if not loc.get("value"):
            errors.append("%s: by=%s needs 'value'" % (where, by))
        for k in ("role", "name", "level"):
            if k in loc:
                errors.append("%s: '%s' is only valid with by=role" % (where, k))
    if "within" in loc:
        check_locator(loc["within"], where + ".within", errors)


def check_step(step, where, errors, warnings):
    prim = step.get("expected_primitive")
    exp = step.get("expected") or {}
    auto = step.get("automation") or {}
    actions = auto.get("actions") or []
    assertions = auto.get("assertions") or []
    api_checks = [a for a in actions if isinstance(a, dict) and a.get("action") == "api_call"]

    if prim == "noul":
        if not isinstance(exp.get("answer"), bool):
            errors.append("%s: noul needs expected.answer true|false" % where)
        for k in ("eq", "gte", "lte"):
            if k in exp:
                errors.append("%s: noul does not use expected.%s" % (where, k))
        if "options" in step or "scale" in step:
            errors.append("%s: noul takes neither options nor scale" % where)
        if not assertions and not api_checks:
            errors.append("%s: a noul (yes/no) step must be verifiable headless - add at least one assertion "
                          "or an api_call with expect" % where)
    elif prim == "choice":
        opts = step.get("options")
        if not opts:
            errors.append("%s: choice needs options" % where)
        elif exp.get("answer") not in opts:
            errors.append("%s: expected.answer %r is not one of options %s" % (where, exp.get("answer"), opts))
        for k in ("min_confidence", "eq", "gte", "lte"):
            if k in exp:
                errors.append("%s: choice does not use expected.%s" % (where, k))
        if "scale" in step:
            errors.append("%s: choice takes no scale" % where)
    elif prim == "score":
        scale = step.get("scale")
        if not scale:
            errors.append("%s: score needs scale {min,max}" % where)
        elif scale.get("min", 0) >= scale.get("max", 0):
            errors.append("%s: scale.min must be < scale.max" % where)
        bounds = [k for k in ("eq", "gte", "lte") if k in exp]
        if not bounds:
            errors.append("%s: score needs expected.eq, .gte or .lte" % where)
        elif scale:
            for k in bounds:
                if not scale["min"] <= exp[k] <= scale["max"]:
                    errors.append("%s: expected.%s=%r outside scale %s-%s" % (where, k, exp[k], scale["min"], scale["max"]))
        for k in ("answer", "min_confidence"):
            if k in exp:
                errors.append("%s: score does not use expected.%s" % (where, k))
        if "options" in step:
            errors.append("%s: score takes no options" % where)

    if step.get("channel") == "api" and not api_checks:
        errors.append("%s: channel=api needs an api_call action" % where)
    if step.get("question_phase") == "before_actions" and not actions:
        warnings.append("%s: question_phase=before_actions without actions has no effect" % where)

    for i, act in enumerate(actions):
        if not isinstance(act, dict):
            continue
        aw = "%s.actions[%d]" % (where, i)
        kind = act.get("action")
        if kind == "goto" and "url" not in act:
            errors.append("%s: goto needs url" % aw)
        if kind in LOCATOR_ACTIONS and "locator" not in act:
            errors.append("%s: %s needs a locator" % (aw, kind))
        if kind in VALUE_ACTIONS and "value" not in act:
            errors.append("%s: %s needs a value" % (aw, kind))
        if kind == "wait_for" and "state" not in act:
            errors.append("%s: wait_for needs state (web-first wait, never a fixed sleep)" % aw)
        if kind == "set_viewport" and "viewport" not in act:
            errors.append("%s: set_viewport needs viewport" % aw)
        if kind == "api_call" and ("request" not in act or "expect" not in act):
            errors.append("%s: api_call needs request and expect" % aw)
        if kind != "api_call" and ("request" in act or "expect" in act):
            errors.append("%s: request/expect are only valid on api_call" % aw)
        if "locator" in act:
            check_locator(act["locator"], aw + ".locator", errors)

    for i, asr in enumerate(assertions):
        if not isinstance(asr, dict):
            continue
        sw = "%s.assertions[%d]" % (where, i)
        kind = asr.get("type")
        if kind in LOCATOR_ASSERTIONS and "locator" not in asr:
            errors.append("%s: %s needs a locator" % (sw, kind))
        if kind in VALUE_ASSERTIONS and "value" not in asr:
            errors.append("%s: %s needs a value" % (sw, kind))
        if kind == "count" and not any(k in asr for k in ("eq", "gte", "lte")):
            errors.append("%s: count needs eq, gte or lte" % sw)
        if kind == "response" and ("url_pattern" not in asr or "status" not in asr):
            errors.append("%s: response needs url_pattern and status" % sw)
        if kind == "url_matches" and "value" in asr:
            try:
                re.compile(asr["value"])
            except re.error as exc:
                errors.append("%s: url_matches value is not a valid regex (%s)" % (sw, exc))
        if "locator" in asr:
            check_locator(asr["locator"], sw + ".locator", errors)


def check_scenario(sc, fname, index_env, errors, warnings):
    tid = sc.get("test_id", "")
    where = fname
    if fname != "%s.json" % tid:
        errors.append("%s: file name must be <test_id>.json (%s.json)" % (where, tid))
    m = re.match(r"^TC-([A-Z0-9]+)-\d{3}$", tid)
    if m and m.group(1) != sc.get("layer"):
        errors.append("%s: test_id layer segment '%s' != layer '%s'" % (where, m.group(1), sc.get("layer")))
    layer, level = sc.get("layer"), sc.get("level")
    if layer in LAYER_LEVELS and level not in LAYER_LEVELS[layer]:
        errors.append("%s: layer %s belongs to level %s, not '%s'"
                      % (where, layer, "/".join(sorted(LAYER_LEVELS[layer], key=LEVEL_ORDER.get)), level))
    auth = (sc.get("preconditions") or {}).get("auth") or {}
    if auth.get("mode") == "role" and not auth.get("role"):
        errors.append("%s: preconditions.auth.mode=role needs 'role'" % where)

    steps = sc.get("steps") or []
    ids = [s.get("step_id") for s in steps if isinstance(s, dict)]
    if ids != list(range(1, len(ids) + 1)):
        errors.append("%s: step_id must run 1..%d in order, got %s" % (where, len(ids), ids))
    deterministic = 0
    for s in steps:
        if not isinstance(s, dict):
            continue
        check_step(s, "%s step %s" % (where, s.get("step_id")), errors, warnings)
        auto = s.get("automation") or {}
        deterministic += len(auto.get("assertions") or [])
        deterministic += sum(1 for a in auto.get("actions") or [] if isinstance(a, dict) and a.get("action") == "api_call")
    if steps and not deterministic:
        errors.append("%s: scenario has no deterministic check at all (no assertion, no api_call expect)" % where)
    first_actions = ((steps[0].get("automation") or {}).get("actions") or []) if steps and isinstance(steps[0], dict) else []
    if sc.get("target_url", "").startswith("{{BASE_URL}}") and not any(
            isinstance(a, dict) and a.get("action") == "goto" for a in first_actions):
        warnings.append("%s: step 1 has no goto - independent scenarios should open their own page (QA rule 6)" % where)

    # Variables, literal hosts, credentials, placeholder text.
    test_data = sc.get("test_data") or {}
    for spath, key, text in walk_strings(sc):
        if HOST_RE.search(text):
            errors.append("%s: literal URL at %s - use {{BASE_URL}} / {{API_BASE_URL}}" % (where, spath))
        if PLACEHOLDER_RE.search(text):
            errors.append("%s: placeholder text at %s - use realistic, domain-correct data" % (where, spath))
        for var in VAR_RE.findall(text):
            if var in ("BASE_URL", "API_BASE_URL", "run.uid"):
                if var != "run.uid":
                    index_env.setdefault("_used", set()).add(var)
            elif var.startswith("env."):
                index_env.setdefault("_used", set()).add(var[4:])
            elif var.startswith("test_data."):
                if var[10:] not in test_data:
                    errors.append("%s: {{%s}} at %s - no such key in test_data" % (where, var, spath))
            else:
                errors.append("%s: unknown variable {{%s}} at %s (allowed: BASE_URL, API_BASE_URL, env.X, "
                              "test_data.key, run.uid)" % (where, var, spath))
        if key and SECRET_KEY_RE.search(key) and not NEGATIVE_KEY_RE.search(key) \
                and not VAR_RE.fullmatch(text.strip()):
            errors.append("%s: literal credential at %s - use {{env.X}} or {{test_data.x}} "
                          "(intentionally wrong values: prefix the key with invalid_/wrong_)" % (where, spath))


def validate(root, schema_dir):
    errors, warnings = [], []
    schemas = {}
    for name in ("scenario", "index", "result"):
        schemas[name] = load_json(schema_dir / ("%s.schema.json" % name), errors)
    if errors:
        return None, [], errors, warnings

    index = load_json(root / "index.json", errors) if (root / "index.json").is_file() else None
    if index is None:
        errors.append("index.json: missing or unreadable")
        return None, [], errors, warnings
    errors += ["index.json " + e for e in schema_errors(schemas["index"], index, "$", schemas["index"])]

    env = {}
    scenarios = []
    scen_dir = root / "scenarios"
    files = sorted(scen_dir.glob("*.json")) if scen_dir.is_dir() else []
    if not files:
        errors.append("scenarios/: no scenario files")
    by_id = {}
    for f in files:
        sc = load_json(f, errors)
        if sc is None:
            continue
        errs = schema_errors(schemas["scenario"], sc, "$", schemas["scenario"])
        errors += ["%s %s" % (f.name, e) for e in errs]
        if isinstance(sc, dict):
            check_scenario(sc, f.name, env, errors, warnings)
            tid = sc.get("test_id")
            if tid in by_id:
                errors.append("%s: duplicate test_id %s (also in %s)" % (f.name, tid, by_id[tid][0]))
            by_id[tid] = (f.name, sc)
            scenarios.append(sc)

    entries = index.get("scenarios") or []
    listed = {}
    prev = None
    index_level = LEVEL_ORDER.get(index.get("level"), 2)
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            continue
        tid = e.get("test_id")
        if tid in listed:
            errors.append("index.json: %s listed twice" % tid)
        listed[tid] = e
        if tid not in by_id:
            errors.append("index.json: %s has no file scenarios/%s.json" % (tid, tid))
            continue
        sc = by_id[tid][1]
        for k in ("level", "layer", "priority"):
            if e.get(k) != sc.get(k):
                errors.append("index.json: %s.%s=%r but the scenario file says %r" % (tid, k, e.get(k), sc.get(k)))
        if e.get("file") != "scenarios/%s.json" % tid:
            errors.append("index.json: %s.file must be scenarios/%s.json" % (tid, tid))
        if LEVEL_ORDER.get(sc.get("level"), 0) > index_level:
            errors.append("index.json: %s is level %s but the set is only '%s'" % (tid, sc.get("level"), index.get("level")))
        key = (LEVEL_ORDER.get(e.get("level"), 9), PRIORITY_ORDER.get(e.get("priority"), 9))
        if prev is not None and key < prev:
            errors.append("index.json: scenarios[%d] %s breaks execution order (level, then priority)" % (i, tid))
        prev = key
    for tid, (fname, _) in by_id.items():
        if tid not in listed:
            errors.append("%s: not listed in index.json scenarios (orphan file)" % fname)

    declared = set((index.get("env") or {}).get("required") or [])
    for var in sorted(env.get("_used", set()) - declared):
        errors.append("index.json: env.required is missing %s (referenced by scenarios)" % var)
    for var in sorted(declared - env.get("_used", set())):
        warnings.append("index.json: env.required lists %s but no scenario uses it" % var)

    in_pages = set()
    for p in index.get("pages") or []:
        if not isinstance(p, dict):
            continue
        ids = p.get("scenarios") or []
        in_pages.update(ids)
        for tid in ids:
            if tid not in by_id:
                errors.append("index.json: page %s references unknown %s" % (p.get("route"), tid))
            elif by_id[tid][1].get("page", {}).get("route") != p.get("route"):
                errors.append("index.json: %s is listed under page %s but its page.route is %s"
                              % (tid, p.get("route"), by_id[tid][1].get("page", {}).get("route")))
        levels = {by_id[t][1].get("level") for t in ids if t in by_id}
        layers = {by_id[t][1].get("layer") for t in ids if t in by_id}
        if "SMOKE" not in layers:
            warnings.append("coverage: page %s has no SMOKE scenario (light = 'sayfa çalışıyor' is expected for every page)"
                            % p.get("route"))
        if index_level >= 1 and "normal" not in levels:
            warnings.append("coverage: page %s has no normal-level scenario (temel fonksiyonlar)" % p.get("route"))
        if index_level >= 2 and "hard" not in levels:
            warnings.append("coverage: page %s has no hard-level scenario (tam FE+BE)" % p.get("route"))
    for tid in by_id:
        if tid not in in_pages:
            errors.append("index.json: %s is not attached to any page in pages[]" % tid)

    res_dir = root / "results"
    if res_dir.is_dir():
        for f in sorted(res_dir.glob("*.json")):
            res = load_json(f, errors)
            if res is None:
                continue
            errs = schema_errors(schemas["result"], res, "$", schemas["result"])
            errors += ["results/%s %s" % (f.name, e) for e in errs]
            for r in (res.get("results") or []) if isinstance(res, dict) else []:
                if isinstance(r, dict) and r.get("test_id") not in by_id:
                    errors.append("results/%s: unknown test_id %s" % (f.name, r.get("test_id")))

    ordered = [by_id[e["test_id"]][1] for e in entries if isinstance(e, dict) and e.get("test_id") in by_id]
    return index, ordered, errors, warnings


# --------------------------------------------------------------------------
# Markdown checklist renderer
# --------------------------------------------------------------------------
ROLE_TR = {
    "button": "düğmesi", "link": "bağlantısı", "textbox": "metin alanı", "heading": "başlığı",
    "alert": "uyarı kutusu", "dialog": "iletişim penceresi", "table": "tablosu", "row": "satırı",
    "cell": "hücresi", "checkbox": "onay kutusu", "radio": "seçenek düğmesi", "combobox": "açılır listesi",
    "tab": "sekmesi", "menuitem": "menü öğesi", "navigation": "gezinme menüsü", "img": "görseli",
    "list": "listesi", "listitem": "liste öğesi", "status": "durum mesajı", "searchbox": "arama kutusu",
}
STATE_TR = {"visible": "görünür", "hidden": "gizli", "attached": "sayfada", "detached": "sayfadan kalkmış"}
LEVEL_TR = {"light": "light (sayfa çalışıyor)", "normal": "normal (temel fonksiyonlar)", "hard": "hard (tam FE + BE)"}


def md_escape(text):
    return str(text).replace("|", "\\|")


def loc_tr(loc):
    if not isinstance(loc, dict):
        return "?"
    by = loc.get("by")
    if by == "role":
        role = loc.get("role", "")
        name = '"%s" ' % loc["name"] if loc.get("name") else ""
        out = "%s%s" % (name, ROLE_TR.get(role, "(role=%s)" % role))
    elif by == "label":
        out = '"%s" etiketli alan' % loc.get("value")
    elif by == "testid":
        out = '`data-testid="%s"` öğesi' % loc.get("value")
    else:
        out = '"%s" metni' % loc.get("value")
    if "nth" in loc:
        out = "%d. sıradaki %s" % (loc["nth"] + 1, out)
    if "within" in loc:
        out = "%s içindeki %s" % (loc_tr(loc["within"]), out)
    return out


def action_tr(a):
    k = a.get("action")
    loc = loc_tr(a.get("locator")) if "locator" in a else ""
    v = a.get("value", "")
    if k == "goto":
        return "`%s` adresini açın" % a.get("url")
    if k == "reload":
        return "Sayfayı yenileyin"
    if k == "go_back":
        return "Tarayıcıda geri gidin"
    if k == "click":
        return "%s öğesine tıklayın" % loc
    if k == "fill":
        return "%s içine `%s` yazın" % (loc, v)
    if k == "clear":
        return "%s içeriğini temizleyin" % loc
    if k == "select":
        return "%s içinden `%s` seçin" % (loc, v)
    if k == "check":
        return "%s işaretleyin" % loc
    if k == "uncheck":
        return "%s işaretini kaldırın" % loc
    if k == "press":
        return ("%s üzerindeyken " % loc if loc else "") + "klavyede `%s` tuşuna basın" % v
    if k == "hover":
        return "Fareyi %s üzerine getirin" % loc
    if k == "upload":
        return "%s ile `%s` dosyasını yükleyin" % (loc, v)
    if k == "wait_for":
        return "%s %s olana kadar bekleyin" % (loc, STATE_TR.get(a.get("state"), a.get("state")))
    if k == "set_viewport":
        return "Pencereyi `%s` boyutuna getirin" % a.get("viewport")
    if k == "api_call":
        rq, ex = a.get("request", {}), a.get("expect", {})
        out = "API isteği: `%s %s` (kimlik: %s" % (rq.get("method"), rq.get("path"), rq.get("auth", "session"))
        if "body" in rq:
            out += ", gövde: `%s`" % json.dumps(rq["body"], ensure_ascii=False)
        out += ") → durum **%s** olmalı" % ex.get("status")
        if ex.get("body_has_keys"):
            out += "; gövdede %s alanları olmalı" % ", ".join("`%s`" % x for x in ex["body_has_keys"])
        if ex.get("body_contains"):
            out += "; gövde `%s` içermeli" % json.dumps(ex["body_contains"], ensure_ascii=False)
        if ex.get("body_not_contains_keys"):
            out += "; gövdede %s alanları OLMAMALI" % ", ".join("`%s`" % x for x in ex["body_not_contains_keys"])
        if ex.get("max_ms"):
            out += "; yanıt süresi ≤ %d ms" % ex["max_ms"]
        return out
    return k


def assertion_tr(s):
    k = s.get("type")
    loc = loc_tr(s.get("locator")) if "locator" in s else ""
    simple = {"visible": "görünür", "hidden": "görünmez", "enabled": "etkin (tıklanabilir)",
              "disabled": "devre dışı", "checked": "işaretli", "focused": "klavye odağında"}
    if k in simple:
        return "%s %s" % (loc, simple[k])
    if k == "text_contains":
        return '%s "%s" metnini içeriyor' % (loc, s.get("value"))
    if k == "text_equals":
        return '%s metni tam olarak "%s"' % (loc, s.get("value"))
    if k == "value_equals":
        return '%s değeri "%s"' % (loc, s.get("value"))
    if k == "count":
        bounds = " ".join("%s %s" % ({"eq": "=", "gte": "≥", "lte": "≤"}[b], s[b]) for b in ("eq", "gte", "lte") if b in s)
        return "%s sayısı %s" % (loc, bounds)
    if k == "url_matches":
        return "Adres çubuğundaki URL `%s` ile eşleşiyor" % s.get("value")
    if k == "title_contains":
        return 'Sekme başlığı "%s" içeriyor' % s.get("value")
    if k == "no_console_errors":
        return "Tarayıcı konsolunda hata yok (F12 > Console)"
    if k == "network_no_errors":
        return "`%s` isteklerinde 4xx/5xx yanıt yok (F12 > Network)" % s.get("url_pattern", "tüm")
    if k == "response":
        return "`%s %s` isteği **%s** döndü (F12 > Network)" % (s.get("method", ""), s.get("url_pattern"), s.get("status"))
    if k == "a11y_no_violations":
        return "Erişilebilirlik taramasında `%s` ve üstü ihlal yok (axe / Lighthouse)" % s.get("impact", "serious")
    return k


def expected_tr(step):
    prim, exp = step.get("expected_primitive"), step.get("expected", {})
    if prim == "noul":
        c = exp.get("min_confidence", 0.8)
        if exp.get("answer"):
            return "**Evet** (Laya: p ≥ %.2f)" % c
        return "**Hayır** (Laya: p ≤ %.2f)" % (1 - c)
    if prim == "choice":
        return "**%s** (seçenekler: %s)" % (exp.get("answer"), " / ".join(step.get("options", [])))
    if prim == "score":
        sc = step.get("scale", {})
        bounds = ", ".join("%s %s" % ({"eq": "=", "gte": "≥", "lte": "≤"}[b], exp[b]) for b in ("eq", "gte", "lte") if b in exp)
        return "puan **%s** (ölçek %s–%s)" % (bounds, sc.get("min"), sc.get("max"))
    return "?"


def render(root, index, scenarios):
    lines = [
        "# Test senaryoları — %s" % index.get("target"),
        "",
        "<!-- Bu dosya scripts/taa-scenarios.py render tarafından JSON'dan üretilir. Elle düzenlemeyin: "
        "değişikliği scenarios/*.json'a yapıp yeniden üretin. -->",
        "",
        "- **Run:** `%s` · **Üretildi:** %s" % (index.get("run_id"), index.get("generated_at")),
        "- **Seviye:** %s — alt seviyeler dahildir" % LEVEL_TR.get(index.get("level"), index.get("level")),
        "- **Doğrulama:** `%s` (live = çalışan uygulamada doğrulandı · code-only = koddan · spec-only = "
        "kod yazılmadan, SPEC/DESIGN'dan)" % index.get("verification"),
        "- **Gerekli ortam değişkenleri:** %s" % ", ".join("`%s`" % v for v in (index.get("env") or {}).get("required", [])),
    ]
    if (index.get("env") or {}).get("notes"):
        lines.append("- **Not:** %s" % index["env"]["notes"])
    lines += [
        "",
        "## Nasıl koşulur",
        "",
        "- **İnsan:** Aşağıdaki her senaryoyu sırayla uygulayın. Her adımda önce *Yapılacaklar*'ı yapın "
        "(soru *önce* işaretliyse soruyu önce cevaplayın), sonra *Soru*'yu cevaplayıp *Beklenen*le karşılaştırın; "
        "*Otomatik kontroller* aynı adımın gözle doğrulanabilir karşılığıdır. `{{env.X}}` değerlerini test "
        "ortamı yöneticisinden alın, `{{BASE_URL}}` yerine test/staging adresini koyun — **production'da koşmayın**.",
        "- **Laya:** `index.json` → `scenarios` sırasıyla her dosyayı koşar; `noul` için p(evet), `choice` için "
        "seçenek anahtarı, `score` için sayı döndürür.",
        "- **Headless browser:** her adımın `automation.actions` + `automation.assertions` bloğu Playwright'a "
        "birebir eşlenir (eşleme tablosu: `templates/taa/test-scenarios/SCHEMA.md`).",
        "- **Sonuç kaydı:** `results/<YYYYMMDD-HHMM>-<executor>.json` (`result.schema.json`).",
        "",
        "## Özet",
        "",
        "| # | Test ID | Ad | Sayfa | Seviye | Katman | Öncelik |",
        "|---|---|---|---|---|---|---|",
    ]
    for i, sc in enumerate(scenarios, 1):
        lines.append("| %d | [%s](#%s) | %s | `%s` | %s | %s | %s |" % (
            i, sc["test_id"], sc["test_id"].lower(), md_escape(sc["test_name"]), sc["page"]["route"],
            sc["level"], sc["layer"], sc["priority"]))
    if index.get("out_of_scope"):
        lines += ["", "**Kapsam dışı:**", ""] + ["- %s" % x for x in index["out_of_scope"]]

    for sc in scenarios:
        pre = sc.get("preconditions", {})
        auth = pre.get("auth", {})
        lines += ["", "---", "", "## %s" % sc["test_id"], "",
                  "**%s** — %s · %s · %s · sayfa `%s` (%s)" % (
                      sc["test_name"], sc["level"], sc["layer"], sc["priority"], sc["page"]["route"], sc["page"]["name"]),
                  "", "- **Başlangıç URL:** `%s`" % sc["target_url"]]
        if auth.get("mode") == "role":
            cred = ", ".join("%s=`%s`" % (k, v) for k, v in (auth.get("credentials") or {}).items())
            lines.append("- **Oturum:** `%s` rolüyle giriş yapılmış olmalı%s" % (auth.get("role"), " (%s)" % cred if cred else ""))
        else:
            lines.append("- **Oturum:** giriş yapılmamış (anonim)")
        for k, label in (("viewport", "Ekran"), ("locale", "Dil")):
            if pre.get(k):
                lines.append("- **%s:** %s" % (label, pre[k]))
        for s in pre.get("seed", []):
            lines.append("- **Ön veri:** %s" % s)
        for fl in pre.get("feature_flags", []):
            lines.append("- **Feature flag:** `%s`" % fl)
        if pre.get("notes"):
            lines.append("- **Not:** %s" % pre["notes"])
        if sc.get("test_data"):
            lines.append("- **Test verisi:** " + ", ".join("`%s` = `%s`" % (k, v) for k, v in sc["test_data"].items()))
        lines += ["", "| Adım | Yapılacaklar | Soru (insan / Laya) | Beklenen | Otomatik kontroller | Sonuç |",
                  "|---|---|---|---|---|---|"]
        for st in sc["steps"]:
            auto = st.get("automation", {})
            acts = "<br>".join("%d) %s" % (i, md_escape(action_tr(a))) for i, a in enumerate(auto.get("actions", []), 1)) or "—"
            q = md_escape(st["laya_question"])
            if st.get("question_phase") == "before_actions":
                q = "*(aksiyonlardan ÖNCE sorun)* " + q
            if st.get("human_hint"):
                q += "<br>💡 " + md_escape(st["human_hint"])
            checks = auto.get("assertions", [])
            chk = "<br>".join("• " + md_escape(assertion_tr(s)) for s in checks)
            if not chk:
                api = [a for a in auto.get("actions", []) if a.get("action") == "api_call"]
                chk = "API beklentisi (Yapılacaklar'da)" if api else "— *yalnızca yargı (insan / Laya)*"
            fail = " · kalırsa devam" if st.get("on_fail") == "continue" else ""
            lines.append("| %d. %s | %s | %s | %s | %s | ☐ Geçti ☐ Kaldı%s |" % (
                st["step_id"], md_escape(st["description"]), acts, q, expected_tr(st), chk, fail))
        if sc.get("cleanup"):
            lines += ["", "**Temizlik:**", ""] + ["- %s" % c for c in sc["cleanup"]]
        tr = sc.get("traceability", {})
        refs = [", ".join(tr.get(k, [])) for k in ("spec", "backlog", "endpoints", "sources") if tr.get(k)]
        if refs:
            lines += ["", "*İzlenebilirlik:* " + " · ".join(refs) + " · *doğrulama:* `%s`" % sc.get("verification")]
    (root / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------
def main(argv):
    args = list(argv[1:])
    schema_arg = None
    if "--schemas" in args:
        i = args.index("--schemas")
        if i + 1 >= len(args):
            print(__doc__)
            return 2
        schema_arg = args[i + 1]
        del args[i:i + 2]
    if len(args) != 2 or args[0] not in ("validate", "render"):
        print(__doc__)
        return 2
    root = pathlib.Path(args[1])
    if not root.is_dir():
        print("✖ %s is not a directory" % root)
        return 2
    schema_dir = find_schemas(schema_arg)
    if schema_dir is None:
        print("✖ scenario.schema.json not found - pass --schemas <dir> (templates/taa/test-scenarios)")
        return 2

    index, scenarios, errors, warnings = validate(root, schema_dir)
    for w in warnings:
        print("WARN  %s" % w)
    for e in errors:
        print("ERROR %s" % e)
    if errors:
        print("✖ %d error(s), %d warning(s) in %s" % (len(errors), len(warnings), root))
        return 1
    levels = {}
    for sc in scenarios:
        levels[sc["level"]] = levels.get(sc["level"], 0) + 1
    print("✔ %d scenario(s) valid in %s (%s), %d warning(s)" % (
        len(scenarios), root, ", ".join("%s: %d" % (k, levels[k]) for k in sorted(levels, key=LEVEL_ORDER.get)),
        len(warnings)))
    if args[0] == "render":
        render(root, index, scenarios)
        print("✔ wrote %s" % (root / "README.md"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
