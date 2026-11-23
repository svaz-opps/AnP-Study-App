#!/usr/bin/env python3
"""Build "Ward Rounds", the hospital study game, from the BIOL 2401 study guide.

Inputs
  ../study-guide/data/source-content.json   the guide (sections, focus points, callouts, 232 questions)
  content/units.json                        room / ward metadata, one per chapter
  content/questions/*.json                  new ATI-style questions written for the game
  src/template.html, src/css/*.css, src/js/*.js

Outputs (dist/)
  index.html        the page published as the Artifact (fetches data.json beside it)
  data.json         sections + the full question bank
  ward-rounds.html  one fully self-contained file (page + data inlined) for offline use

Run from anywhere:  python3 game/build.py [--strict]
  --strict  fail the build when any instructor focus point has no new question covering it
"""
import hashlib
import html
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

GAME = Path(__file__).resolve().parent
REPO = GAME.parent
SOURCE = REPO / "study-guide" / "data" / "source-content.json"
DIST = GAME / "dist"

TYPES = {"mcq", "sata", "priority", "teaching", "order", "math"}
SINGLE = {"mcq", "priority", "teaching", "math"}
BANNED = re.compile(r"\b(all|none) of the above\b", re.I)


def strip(s):
    """HTML fragment -> plain text."""
    s = re.sub(r"<[^>]+>", "", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def load_sections(src):
    sections, order = {}, []
    for ch in src["chapters"]:
        for i, s in enumerate(ch["sections"], 1):
            tips = []
            for m in re.finditer(r'<div[^>]*class="callout callout-(\w+)"[^>]*>(.*?)</div>', s["html"], re.S):
                kind, body = m.group(1), m.group(2)
                lab = re.search(r'<p class="callout-label">(.*?)</p>', body, re.S)
                label = strip(lab.group(1)) if lab else kind.title()
                text = strip(re.sub(r'<p class="callout-label">.*?</p>', "", body, flags=re.S))
                if kind in ("mnemonic", "tip", "clinical", "note") and text:
                    tips.append({"kind": kind, "label": label, "text": text})
            sections[s["id"]] = {
                "title": strip(s["title"]),
                "unit": ch["id"],
                "num": f'{ch["number"]}.{i}',
                "focus": [strip(f) for f in (s.get("focus") or [])],
                "tips": tips,
            }
            order.append(s["id"])
    return sections, order


def import_guide(src, sections):
    """The guide's own 232 questions, reshaped into the game schema."""
    out = []

    def conv(qid, sec, q, kind):
        return {
            "id": qid,
            "unit": sections[sec]["unit"],
            "sec": sec,
            "focus": [],
            "type": "mcq",
            "stem": strip(q["q"]),
            "opts": [{"t": strip(o["text"]), "c": bool(o["correct"])} for o in q["options"]],
            "why": strip(q["explain"]),
            "diff": 2,
            "origin": "guide",
            "src": kind,
        }

    for p in src["practice"]:
        out.append(conv("G-" + p["id"], p["section"], p, "practice"))
    for ch in src["chapters"]:
        for s in ch["sections"]:
            if s.get("check"):
                out.append(conv("C-" + s["id"], s["id"], s["check"], "check"))
    return out


def validate_new(items, sections, errors):
    clean = []
    for it in items:
        qid = it.get("id", "?")

        def err(msg):
            errors.append(f"{qid}: {msg}")

        for key in ("id", "sec", "type", "stem", "why"):
            if not it.get(key):
                err(f"missing '{key}'")
        if it.get("type") not in TYPES:
            err(f"bad type {it.get('type')!r}")
            continue
        sec = sections.get(it.get("sec"))
        if not sec:
            err(f"unknown section {it.get('sec')!r}")
            continue
        focus = []
        for f in it.get("focus", []):
            # an int points into the item's own section; "sec-id#n" points into another section
            fsec, fi = (it["sec"], f) if isinstance(f, int) else (str(f).split("#")[0], int(str(f).split("#")[1]))
            if fsec not in sections or not 0 <= fi < len(sections[fsec]["focus"]):
                err(f"focus {f!r} out of range")
            else:
                focus.append([fsec, fi])
        t = it["type"]
        if t == "order":
            steps = it.get("steps") or []
            if len(steps) < 3:
                err("order item needs at least 3 steps")
            opts = [{"t": s} for s in steps]
        else:
            opts = it.get("opts") or []
            n_ok = sum(1 for o in opts if o.get("c"))
            if t in SINGLE and n_ok != 1:
                err(f"{t} needs exactly 1 correct option (has {n_ok})")
            if t == "sata":
                if n_ok < 2:
                    err(f"SATA needs at least 2 correct options (has {n_ok})")
                if len(opts) < 5:
                    err(f"SATA needs 5-6 options (has {len(opts)})")
            if t != "sata" and len(opts) < 3:
                err("needs at least 3 options")
            for o in opts:
                if not o.get("t"):
                    err("option without text")
                if not o.get("c") and not o.get("w"):
                    err(f"wrong option lacks a 'w' (why it is wrong): {o.get('t', '')[:40]!r}")
        for text in [it.get("stem", "")] + [o.get("t", "") for o in opts]:
            if BANNED.search(text):
                err("uses 'all/none of the above'")
        item = {
            "id": qid,
            "unit": sec["unit"],
            "sec": it["sec"],
            "focus": focus,
            "type": t,
            "stem": it["stem"],
            "why": it["why"],
            "diff": it.get("diff", 2),
            "origin": "new",
        }
        if t == "order":
            item["steps"] = it["steps"]
        else:
            item["opts"] = [{k: v for k, v in o.items() if k in ("t", "c", "w")} for o in opts]
        for k in ("trick", "tip", "patient", "unitLabel"):
            if it.get(k):
                item[k] = it[k]
        clean.append(item)
    return clean


def build_js():
    files = sorted((GAME / "src" / "js").glob("*.js"))
    parts = [f"/* ---- {f.name} ---- */\n{f.read_text()}" for f in files]
    return "(function () {\n'use strict';\n" + "\n".join(parts) + "\n})();\n"


def build_css():
    return "\n".join(f.read_text() for f in sorted((GAME / "src" / "css").glob("*.css")))


def main():
    strict = "--strict" in sys.argv
    src = json.loads(SOURCE.read_text())
    sections, sec_order = load_sections(src)
    units = json.loads((GAME / "content" / "units.json").read_text())

    errors = []
    new_raw = []
    for f in sorted((GAME / "content" / "questions").glob("*.json")):
        try:
            new_raw.extend(json.loads(f.read_text()))
        except json.JSONDecodeError as e:
            errors.append(f"{f.name}: invalid JSON ({e})")
    new = validate_new(new_raw, sections, errors)
    guide = import_guide(src, sections)
    questions = new + guide

    ids = Counter(q["id"] for q in questions)
    errors += [f"{i}: duplicate id" for i, n in ids.items() if n > 1]
    stems = Counter(re.sub(r"\W+", " ", q["stem"].lower()).strip() for q in questions)
    errors += [f"duplicate stem: {s[:70]!r}" for s, n in stems.items() if n > 1]

    # ---- coverage of the instructor's focus points (new questions only)
    covered = defaultdict(list)
    for q in new:
        for fsec, fi in q["focus"]:
            covered[(fsec, fi)].append(q["id"])
    all_focus = [(sid, i) for sid in sec_order for i in range(len(sections[sid]["focus"]))]
    gaps = [k for k in all_focus if k not in covered]

    # ---- report
    print("Ward Rounds build")
    print(f"  questions: {len(new)} new + {len(guide)} guide = {len(questions)}")
    by_unit = Counter(q["unit"] for q in new)
    by_unit_g = Counter(q["unit"] for q in guide)
    print("  room  unit  new  guide  focus covered")
    for u in units:
        uf = [k for k in all_focus if sections[k[0]]["unit"] == u["id"]]
        cov = sum(1 for k in uf if k in covered)
        print(f"  {u['room']}   {u['id']:<5} {by_unit[u['id']]:>3}  {by_unit_g[u['id']]:>5}  {cov:>3}/{len(uf)}")
    print("  types (new):", dict(Counter(q["type"] for q in new)))
    print(f"  focus points covered: {len(all_focus) - len(gaps)}/{len(all_focus)}")
    if gaps and ("--gaps" in sys.argv or strict):
        for sid, i in gaps:
            print(f"    GAP {sid}#{i}: {sections[sid]['focus'][i][:90]}")

    if errors:
        print(f"\n{len(errors)} error(s):")
        for e in errors:
            print("  ERROR", e)
        sys.exit(1)
    if strict and gaps:
        print("\nStrict mode: uncovered focus points.")
        sys.exit(1)

    # ---- assemble
    for u in units:
        u["count"] = by_unit[u["id"]] + by_unit_g[u["id"]]
    data = {"units": units, "sections": sections, "questions": questions}
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    data["version"] = hashlib.sha1(data_json.encode()).hexdigest()[:10]
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    template = (GAME / "src" / "template.html").read_text()
    css, js = build_css(), build_js()
    page = template.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)

    DIST.mkdir(exist_ok=True)
    (DIST / "data.json").write_text(data_json)
    (DIST / "index.html").write_text(page.replace("<!--__DATA__-->", ""))
    inline = '<script type="application/json" id="wr-data">' + data_json.replace("</", "<\\/") + "</script>"
    standalone = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        "</head><body>" + page.replace("<!--__DATA__-->", inline) + "</body></html>"
    )
    (DIST / "ward-rounds.html").write_text(standalone)

    kb = lambda p: (DIST / p).stat().st_size / 1024
    print(f"  dist/index.html {kb('index.html'):.0f} KB · data.json {kb('data.json'):.0f} KB · "
          f"ward-rounds.html {kb('ward-rounds.html'):.0f} KB · version {data['version']}")


if __name__ == "__main__":
    main()
