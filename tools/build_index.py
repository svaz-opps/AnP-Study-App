#!/usr/bin/env python3
"""Build a browsable Markdown + JSON index of the BIOL 2401 final exam study guide.

Input : study-guide/data/source-content.json  (the site's data/content.js, parsed as JSON)
Output: study-guide/README.md, chapters/*.md, glossary.md, key-terms.md,
        practice-exam.md, figures.md, data/study-guide-index.json

Run from the repository root:  python3 tools/build_index.py
"""
import json
import re
from collections import defaultdict
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://lsc-nh-biol2401-final-study-guide.netlify.app/"
ROOT = Path(__file__).resolve().parent.parent / "study-guide"
SRC = ROOT / "data" / "source-content.json"

VOID = {"br", "img", "hr", "meta", "link", "input", "source", "wbr"}


# --------------------------------------------------------------------------- DOM
class Node:
    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs or {}), parent, []

    def cls(self):
        return self.attrs.get("class", "").split()

    def find_all(self, pred):
        for ch in self.children:
            if isinstance(ch, Node):
                if pred(ch):
                    yield ch
                yield from ch.find_all(pred)

    def text(self):
        out = []
        for ch in self.children:
            out.append(ch if isinstance(ch, str) else ch.text())
        return "".join(out)


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse(html):
    b = TreeBuilder()
    b.feed(html)
    return b.root


# ---------------------------------------------------------------------- rendering
def ws(s):
    return re.sub(r"\s+", " ", s).strip()


def abs_url(href):
    if href.startswith(("http://", "https://", "mailto:")):
        return href
    return SITE + href.lstrip("/")


class Renderer:
    """Render a section's HTML tree to Markdown, collecting terms and figures."""

    def __init__(self):
        self.terms = []      # glossary ids linked in the text
        self.bold = []       # bold phrases (key terms)
        self.figures = []    # dicts

    # inline -----------------------------------------------------------------
    def inline(self, node):
        if isinstance(node, str):
            return re.sub(r"\s+", " ", node)
        t = node.tag
        inner = "".join(self.inline(c) for c in node.children)
        if t in ("strong", "b"):
            s = ws(inner)
            if not s:
                return ""
            plain = re.sub(r"^\d+\.\s*|[.:,;]+$", "", ws(node.text())).strip()
            if 1 < len(plain) < 60:
                self.bold.append(plain)
            return f"**{s}**"
        if t == "em" or t == "i":
            s = ws(inner)
            return f"*{s}*" if s else ""
        if t == "a":
            if "term" in node.cls():
                self.terms.append(node.attrs.get("data-term", ""))
                return inner
            href = node.attrs.get("href", "")
            return f"[{ws(inner)}]({abs_url(href)})" if href else inner
        if t == "br":
            return " "
        if t == "small":
            return f" ({ws(inner)})"
        if t == "code":
            return f"`{ws(inner)}`"
        if t in ("sup",):
            return f"^{ws(inner)}"
        if t in ("sub",):
            return f"_{ws(inner)}"
        return inner

    def inline_text(self, node):
        return ws("".join(self.inline(c) for c in node.children))

    # blocks -----------------------------------------------------------------
    def blocks(self, node, depth=0):
        out = []
        buf = []

        def flush():
            s = ws("".join(buf))
            if s:
                out.append(s)
            buf.clear()

        for ch in node.children:
            if isinstance(ch, str) or ch.tag in ("strong", "b", "em", "i", "a", "br", "small", "span", "code", "sup", "sub"):
                buf.append(self.inline(ch))
                continue
            flush()
            out.extend(self.block(ch, depth))
        flush()
        return out

    def block(self, n, depth):
        t, c = n.tag, n.cls()
        if t == "p":
            s = self.inline_text(n)
            if "notice" in c:
                return [f"> *{s}*"] if s else []
            return [s] if s else []
        if t in ("ul", "ol"):
            lines, i = [], 1
            for li in n.children:
                if isinstance(li, Node) and li.tag == "li":
                    sub = self.blocks(li, depth + 1)
                    marker = f"{i}." if t == "ol" else "-"
                    first, rest = (sub[0] if sub else ""), sub[1:]
                    lines.append("  " * depth + f"{marker} {first}")
                    lines.extend("  " * (depth + 1) + r for r in rest)
                    i += 1
            return ["\n".join(lines)]
        if t == "table":
            return [self.table(n)]
        if t == "figure":
            return [self.figure(n)]
        if t == "div" and "callout" in c:
            kind = next((x.split("-", 1)[1] for x in c if x.startswith("callout-")), "note")
            label, body = kind.title(), []
            for ch in n.children:
                if isinstance(ch, Node) and "callout-label" in ch.cls():
                    label = ws(ch.text())
                elif isinstance(ch, Node):
                    body.extend(self.block(ch, depth))
                elif ws(ch):
                    body.append(ws(ch))
            text = "\n>\n> ".join(body)
            return [f"> **{label}** ({kind})\n>\n> {text}"]
        if t == "div" and "pathway" in c:
            steps = []
            for sp in n.children:
                if isinstance(sp, Node) and sp.tag == "span":
                    main = ws("".join(self.inline(x) for x in sp.children if not (isinstance(x, Node) and x.tag == "small")))
                    small = [ws(self.inline_text(x)) for x in sp.children if isinstance(x, Node) and x.tag == "small"]
                    steps.append(main + (f" ({'; '.join(small)})" if small else ""))
            return ["**Pathway:** " + " → ".join(steps)]
        if t == "details":
            return []
        return self.blocks(n, depth)

    def table(self, n):
        rows = []
        for tr in n.find_all(lambda x: x.tag == "tr"):
            cells = [self.inline_text(td).replace("|", "\\|") for td in tr.children
                     if isinstance(td, Node) and td.tag in ("td", "th")]
            rows.append(cells)
        if not rows:
            return ""
        w = max(len(r) for r in rows)
        rows = [r + [""] * (w - len(r)) for r in rows]
        md = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * w]
        md += ["| " + " | ".join(r) + " |" for r in rows[1:]]
        return "\n".join(md)

    def figure(self, n):
        img = next(n.find_all(lambda x: x.tag == "img"), None)
        cap = next(n.find_all(lambda x: x.tag == "figcaption"), None)
        desc = next(n.find_all(lambda x: x.tag == "details"), None)
        credit = next(n.find_all(lambda x: "figure-credit" in x.cls()), None)
        notice = next(n.find_all(lambda x: "notice" in x.cls()), None)
        src = img.attrs.get("src", "") if img else ""
        fig = {
            "image": abs_url(src) if src else "",
            "file": src.rsplit("/", 1)[-1],
            "alt": img.attrs.get("alt", "") if img else "",
            "caption": ws(cap.text()) if cap else "",
            "key": ws(notice.text()) if notice else "",
            "description": ws("".join(x.text() for x in desc.children
                                      if isinstance(x, Node) and x.tag != "summary")) if desc else "",
            "credit": ws(credit.text()) if credit else "",
            "credit_links": [a.attrs.get("href") for a in credit.find_all(lambda x: x.tag == "a")] if credit else [],
        }
        for k in ("alt", "caption", "key", "description"):
            fig[k] = ws(re.sub(r"<[^>]+>", "", unescape(fig[k])))
        self.figures.append(fig)
        lines = [f"> 🖼 **Figure — {fig['caption'] or fig['alt']}** ([image]({fig['image']}))"]
        if fig["key"]:
            lines.append(f"> *{fig['key']}*")
        if fig["description"]:
            lines.append(f"> Description: {fig['description']}")
        return "\n".join(lines)


def render_section(html):
    r = Renderer()
    md = "\n\n".join(b for b in r.blocks(parse(html)) if b)
    return md, r


# ------------------------------------------------------------------------- helpers
def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def anchor(title):
    """GitHub-style heading anchor."""
    a = re.sub(r"[^\w\- ]", "", title.lower()).replace(" ", "-")
    return a


def correct(q):
    return next((o["text"] for o in q["options"] if o["correct"]), "")


def letters(opts):
    return [f"{'ABCD'[i]}. {o['text']}" for i, o in enumerate(opts)]


def plain(md):
    s = re.sub(r"\*\*|\*|`|^> ?|^#+ ", "", md, flags=re.M)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    return s


# ---------------------------------------------------------------------------- main
def main():
    c = json.loads(SRC.read_text())
    chapters, glossary, practice, credits = c["chapters"], c["glossary"], c["practice"], c["imageCredits"]
    gloss_by_id = {g["id"]: g for g in glossary}

    (ROOT / "chapters").mkdir(parents=True, exist_ok=True)

    practice_by_section = defaultdict(list)
    for p in practice:
        practice_by_section[p["section"]].append(p)

    term_hits = defaultdict(list)     # glossary id -> [(chapter, section, link)]
    bold_hits = defaultdict(list)     # key phrase -> [(ch, section, link)]
    all_figs = []
    index_json = {"source": SITE, "chapters": [], "glossary": [], "practice": [], "figures": []}
    chapter_files = {}

    for ch in chapters:
        num = int(ch["number"])
        fname = f"ch{num:02d}-{slug(ch['short'])}.md"
        chapter_files[ch["id"]] = fname
        lines = [f"# Chapter {num} — {ch['title']}", "",
                 f"**{ch['short']}.** {ch['intro']}", "",
                 f"[← Index](../README.md) · Source: [{SITE}#/unit/{ch['id']}]({SITE}#/unit/{ch['id']})", "",
                 "## Sections", ""]
        for i, s in enumerate(ch["sections"], 1):
            lines.append(f"{i}. [{s['title']}](#{anchor(f'{num}.{i} ' + s['title'])})")
        lines.append("")
        ch_json = {"id": ch["id"], "number": num, "title": ch["title"], "short": ch["short"],
                   "intro": ch["intro"], "file": f"chapters/{fname}", "sections": []}

        for i, s in enumerate(ch["sections"], 1):
            head = f"{num}.{i} {s['title']}"
            link = f"chapters/{fname}#{anchor(head)}"
            body, r = render_section(s["html"])
            focus = [ws(r.inline_text(parse(x))) for x in s.get("focus", [])]
            terms = list(dict.fromkeys(t for t in r.terms if t))
            bolds = list(dict.fromkeys(r.bold))
            for t in terms:
                term_hits[t].append((num, head, link))
            for b in bolds:
                bold_hits[b.lower()].append((num, head, link, b))
            for f in r.figures:
                f.update(chapter=num, section=head, link=link)
                all_figs.append(f)

            lines += ["---", "", f"## {head}", "", f"`{s['id']}`", ""]
            if focus:
                lines += ["**Focus:**", ""] + [f"- {x}" for x in focus] + [""]
            lines += [body, ""]
            chk = s.get("check")
            if chk:
                lines += ["### ✅ Check yourself", "", chk["q"], ""] + [f"- {x}" for x in letters(chk["options"])] + [
                    "", "<details><summary>Answer</summary>", "",
                    f"**{correct(chk)}**", "", chk["explain"], "", "</details>", ""]
            if terms:
                lines += ["**Glossary terms in this section:** " + ", ".join(
                    f"[{gloss_by_id[t]['term'] if t in gloss_by_id else t}](../glossary.md#{t})" for t in terms), ""]
            pq = practice_by_section.get(s["id"], [])
            if pq:
                lines += ["**Practice exam questions on this section:** " + ", ".join(
                    f"[{p['id']}](../practice-exam.md#{p['id'].lower()})" for p in pq), ""]

            ch_json["sections"].append({
                "id": s["id"], "number": f"{num}.{i}", "title": s["title"], "link": link,
                "focus": [plain(x) for x in focus], "text": plain(body), "markdown": body,
                "glossary_terms": terms, "key_terms": bolds,
                "figures": [f["file"] for f in r.figures],
                "check": {"question": chk["q"], "options": [o["text"] for o in chk["options"]],
                          "answer": correct(chk), "explanation": chk["explain"]} if chk else None,
                "practice_ids": [p["id"] for p in pq],
            })
        (ROOT / "chapters" / fname).write_text("\n".join(lines).rstrip() + "\n")
        index_json["chapters"].append(ch_json)

    sec_title = {s["id"]: (f"{int(ch['number'])}.{i} {s['title']}", ch["id"])
                 for ch in chapters for i, s in enumerate(ch["sections"], 1)}

    # ---------------------------------------------------------------- glossary
    g_sorted = sorted(glossary, key=lambda g: g["term"].lower())
    lines = ["# Glossary", "", f"{len(glossary)} terms ({sum(g['acronym'] for g in glossary)} acronyms). "
             "Each entry lists the chapter tag from the study guide and every section whose text links the term.",
             "", "[← Index](README.md)", ""]
    letters_seen = sorted({g["term"][0].upper() if g["term"][0].isalpha() else "#" for g in glossary})
    lines += [" · ".join(f"[{L}](#{L.lower()})" if L != "#" else "[#](#-1)" for L in letters_seen), ""]
    cur = None
    for g in g_sorted:
        L = g["term"][0].upper() if g["term"][0].isalpha() else "#"
        if L != cur:
            lines += [f"## {L}", ""]
            cur = L
        name = g["term"] + (f" ({g['expansion']})" if g.get("expansion") else "")
        lines.append(f'<a id="{g["id"]}"></a>**{name}** — {g["definition"]}  ')
        hits = term_hits.get(g["id"], [])
        where = f"*{g['chapter']}*"
        if hits:
            where += " · Appears in: " + "; ".join(f"[{h[1]}]({h[2]})" for h in hits)
        lines += [where, ""]
        index_json["glossary"].append({**{k: g[k] for k in ("id", "term", "expansion", "definition", "chapter", "acronym")},
                                       "appears_in": [h[2] for h in hits]})
    (ROOT / "glossary.md").write_text("\n".join(lines).rstrip() + "\n")

    # --------------------------------------------------------------- key terms
    lines = ["# Key-term index", "",
             "Every **bolded** phrase in the section text, alphabetized, with the sections where it is emphasized. "
             "Phrases that are also glossary entries link to their definition.", "", "[← Index](README.md)", ""]
    gloss_by_term = {g["term"].lower(): g["id"] for g in glossary}
    cur = None
    for key in sorted(bold_hits, key=lambda k: re.sub(r"^[^a-z0-9]+", "", k)):
        hits = bold_hits[key]
        disp = hits[0][3]
        first = (re.sub(r"^[^a-z0-9]+", "", key)[:1] or "#").upper()
        if first != cur:
            lines += [f"## {first}", ""]
            cur = first
        g = gloss_by_term.get(key)
        name = f"[{disp}](glossary.md#{g})" if g else disp
        seen, refs = set(), []
        for h in hits:
            if h[2] not in seen:
                seen.add(h[2])
                refs.append(f"[{h[1]}]({h[2]})")
        lines.append(f"- **{name}** — " + "; ".join(refs))
    (ROOT / "key-terms.md").write_text("\n".join(lines).rstrip() + "\n")

    # ---------------------------------------------------------------- practice
    lines = ["# Practice exam", "", f"{len(practice)} application questions, 10 per chapter. "
             "Answers are folded under each question.", "", "[← Index](README.md)", ""]
    for ch in chapters:
        qs = [p for p in practice if p["chapter"] == ch["id"]]
        if not qs:
            continue
        lines += [f"## Chapter {ch['number']} — {ch['title']}", ""]
        for p in qs:
            st, _ = sec_title.get(p["section"], (p["section"], ""))
            lines += [f'<a id="{p["id"].lower()}"></a>', f"### {p['id']} · {p['concept']}", "",
                      f"*Section:* [{st}](chapters/{chapter_files[p['chapter']]}#{anchor(st)})", "", p["q"], ""]
            lines += [f"- {x}" for x in letters(p["options"])]
            lines += ["", "<details><summary>Answer</summary>", "", f"**{correct(p)}**", "", p["explain"], "",
                      "</details>", ""]
            index_json["practice"].append({"id": p["id"], "chapter": p["chapter"], "section": p["section"],
                                           "concept": p["concept"], "question": p["q"],
                                           "options": [o["text"] for o in p["options"]],
                                           "answer": correct(p), "explanation": p["explain"]})
    (ROOT / "practice-exam.md").write_text("\n".join(lines).rstrip() + "\n")

    # ----------------------------------------------------------------- figures
    cred_by_file = {}
    for cr in credits:
        cred_by_file[cr["id"]] = cr
    lines = ["# Figure index", "", f"{len(all_figs)} figures embedded in the study sections "
             f"({len(credits)} image-credit records). Images are linked, not copied; most are OpenStax / Wikimedia "
             "Commons works under Creative Commons licenses (see each credit).", "", "[← Index](README.md)", ""]
    cur = None
    for f in all_figs:
        if f["chapter"] != cur:
            cur = f["chapter"]
            lines += [f"## Chapter {cur}", ""]
        stem = f["file"].rsplit(".", 1)[0]
        cr = cred_by_file.get(stem, {})
        lic = f" · {cr['license']}" if cr.get("license") else ""
        auth = f" · {cr['author']}" if cr.get("author") else ""
        lines.append(f"- **[{f['caption'] or f['alt']}]({f['image']})** — in [{f['section']}]({f['link']}){auth}{lic}")
        if f["description"]:
            lines.append(f"  - {f['description']}")
        index_json["figures"].append({**f, "license": cr.get("license", ""), "author": cr.get("author", ""),
                                      "commons_page": cr.get("page", "")})
    (ROOT / "figures.md").write_text("\n".join(lines).rstrip() + "\n")

    # ------------------------------------------------------------------ README
    n_sec = sum(len(ch["sections"]) for ch in chapters)
    lines = ["# BIOL 2401 Final Exam Study Guide — Index", "",
             f"An offline, searchable index of the [LSC-North Harris BIOL 2401 Final Exam Study Guide]({SITE}) "
             "(Anatomy & Physiology I, created by Dr. Víctor García Martínez). It is for personal study and "
             "supports, but does not replace, the course readings and lectures.", "",
             "| What | Count | File |", "|---|---|---|",
             f"| Chapters | {len(chapters)} | `chapters/` |",
             f"| Study sections (with focus points and a check question) | {n_sec} | `chapters/` |",
             f"| Glossary terms | {len(glossary)} | [glossary.md](glossary.md) |",
             f"| Key (bolded) phrases | {len(bold_hits)} | [key-terms.md](key-terms.md) |",
             f"| Practice exam questions | {len(practice)} | [practice-exam.md](practice-exam.md) |",
             f"| Figures | {len(all_figs)} | [figures.md](figures.md) |",
             "| Machine-readable index | — | [data/study-guide-index.json](data/study-guide-index.json) |", "",
             "## Chapters and sections", ""]
    for chj in index_json["chapters"]:
        lines += [f"### [Chapter {chj['number']} — {chj['title']}]({chj['file']})", "", f"*{chj['intro']}*", ""]
        for s in chj["sections"]:
            extra = []
            if s["figures"]:
                extra.append(f"{len(s['figures'])} fig")
            if s["practice_ids"]:
                extra.append(f"{len(s['practice_ids'])} practice Q")
            lines.append(f"- {s['number']} [{s['title']}]({s['link']})" + (f" — {', '.join(extra)}" if extra else ""))
        lines.append("")
    lines += ["## Rebuilding", "",
              "`data/source-content.json` is the site's `data/content.js` saved as JSON. To regenerate every file:",
              "", "```bash", "python3 tools/build_index.py", "```", ""]
    (ROOT / "README.md").write_text("\n".join(lines))

    (ROOT / "data" / "study-guide-index.json").write_text(json.dumps(index_json, indent=1, ensure_ascii=False))
    print(f"chapters={len(chapters)} sections={n_sec} glossary={len(glossary)} key_terms={len(bold_hits)} "
          f"practice={len(practice)} figures={len(all_figs)}")


if __name__ == "__main__":
    main()
