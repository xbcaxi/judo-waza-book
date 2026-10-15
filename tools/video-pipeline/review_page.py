"""The phone review page, and Claude's read of each candidate on it.

    python review_page.py build             review-page.html, from review-page.template.html
    python review_page.py unlabelled FILE   the page's candidates Claude has not labelled yet
    python review_page.py labels FILE       store labels: [{edge, video, verdict, reason}]

The page holds the top three candidates per edge, the same cut review.py
export makes, with the title heuristic (title_rules.py) and Claude's label on
each. A candidate is "new" where it is missing from candidates.before.sqlite,
the copy taken before the day's collection. Labels sort the page; only a
reviewer approves.
"""
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

from common import HERE, flatten, load_config, open_db, repo_path, slug_tokens, techniques
from title_rules import edge_tokens, first_at, source_signal, title_signal

TOP = 3
VERDICTS = ("yes", "maybe", "no")
TEMPLATE = os.path.join(HERE, "review-page.template.html")
OUT = os.path.join(HERE, "review-page.html")
BEFORE = os.path.join(HERE, "candidates.before.sqlite")


def ensure_labels(con):
    con.execute(
        """CREATE TABLE IF NOT EXISTS labels(
            edge_slug TEXT, video_id TEXT, verdict TEXT, reason TEXT, labelled_at TEXT,
            PRIMARY KEY(edge_slug, video_id))""")


def page_edges(con):
    """The edges on the page, each with its top candidates, sorted as shown."""
    ensure_labels(con)
    tech = techniques()
    all_slugs = {r[0] for r in con.execute("SELECT slug FROM edges")}
    seen = set()
    if os.path.exists(BEFORE):
        seen = {r[0] for r in sqlite3.connect(BEFORE).execute(
            "SELECT edge_slug||'|'||video_id FROM candidates")}
    existing = dict(con.execute(
        "SELECT edge_slug,count(*) FROM candidates WHERE method='existing' GROUP BY 1").fetchall())
    labels = {(r[0], r[1]): (r[2], r[3]) for r in con.execute(
        "SELECT edge_slug,video_id,verdict,reason FROM labels")}
    rows = con.execute(
        """
        SELECT e.slug,e.src,e.dst,e.type,e.file,e.priority,c.video_id,v.channel_id,v.channel_name,v.title,
               v.description,v.duration_s,v.views,c.score,c.method,c.start_s,c.status,c.reviewer
        FROM candidates c JOIN edges e ON e.slug=c.edge_slug JOIN videos v ON v.video_id=c.video_id
        WHERE c.method<>'existing' AND (e.resolves_to IS NULL OR e.resolves_to='')
        ORDER BY e.slug, c.status='approved' DESC, c.score DESC
        """).fetchall()
    edges = {}
    for (slug, src, dst, etype, file, prio, vid, ch_id, ch, title, desc, dur, views, score, method,
         start, status, reviewer) in rows:
        grip = src.startswith("grip:")
        s_key = src[5:] if grip else src
        e = edges.get(slug)
        if e is None:
            seq_status = None
            if file:
                try:
                    with open(repo_path(*file.split("/")), encoding="utf-8") as f:
                        seq_status = json.load(f).get("status")
                except OSError:
                    pass
            e = edges[slug] = {
                "slug": slug, "src": src, "dst": dst, "type": etype, "priority": prio or 0,
                "grip": grip, "srcJa": (tech.get(s_key) or {}).get("nameJa"),
                "dstJa": (tech.get(dst) or {}).get("nameJa"), "seqStatus": seq_status,
                "existing": existing.get(slug, 0), "c": [],
                "rev": None if grip else f"{dst}__{etype}__{src}",
                "revExists": f"{dst}__{etype}__{src}" in all_slugs,
            }
        if len(e["c"]) >= TOP:
            continue
        flat, bounds = flatten(title)
        src_toks, dst_toks, _ = edge_tokens(src, dst, slug_tokens)
        ps = first_at(src_toks, flat, bounds) if src_toks else -1
        pd = first_at(dst_toks, flat, bounds)
        hs, hwhy = title_signal(src_toks, dst_toks, etype, title, grip=grip)
        if source_signal(con, ch_id, ch):
            hs = min(1.0, round(hs + source_signal(con, ch_id, ch), 2))
            hwhy = hwhy + ["known source"]
        verdict, reason = labels.get((slug, vid), (None, None))
        e["c"].append({
            "v": vid, "t": title, "ch": ch, "d": dur or 0, "views": views or 0,
            "s": round(score, 2), "m": method, "st": start or 0,
            "status": status, "rev": reviewer or "",
            # A counter's title names the pair either way round, so order says nothing there.
            "rev_order": ps >= 0 and pd >= 0 and pd < ps and not grip and etype != "counter",
            "new": f"{slug}|{vid}" not in seen,
            "h": hs, "hw": hwhy, "ai": verdict, "air": reason or "",
            "_desc": desc or "",
        })
    rank = {"yes": 0, "maybe": 1, None: 1, "no": 2}
    for e in edges.values():
        e["c"].sort(key=lambda c: (c["status"] != "approved", rank[c["ai"]], -c["h"], -c["s"]))
    return sorted(edges.values(), key=lambda e: (-e["priority"], -max(c["s"] for c in e["c"]), e["slug"]))


def build(con):
    data = page_edges(con)
    for e in data:
        for c in e["c"]:
            del c["_desc"]
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    with open(TEMPLATE, encoding="utf-8") as f:
        html = f.read()
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html.replace("__DATA__", payload))
    n = sum(len(e["c"]) for e in data)
    new = sum(c["new"] for e in data for c in e["c"])
    print(f"{len(data)} edges, {n} candidates, {new} new -> {OUT}")


def unlabelled(con, path):
    out = []
    for e in page_edges(con):
        for c in e["c"]:
            if c["ai"] or c["status"] != "candidate":
                continue
            out.append({
                "edge": e["slug"], "video": c["v"], "kind": e["type"],
                "first": e["src"], "second": e["dst"], "title": c["t"],
                "channel": c["ch"], "duration_s": c["d"], "description": c["_desc"][:400],
            })
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"{len(out)} unlabelled -> {path}")


def store_labels(con, path):
    ensure_labels(con)
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    bad = [r for r in rows if r.get("verdict") not in VERDICTS]
    if bad:
        raise SystemExit(f"{len(bad)} labels have a verdict other than {VERDICTS}, e.g. {bad[0]}")
    con.executemany(
        "INSERT OR REPLACE INTO labels VALUES(?,?,?,?,?)",
        [(r["edge"], r["video"], r["verdict"], (r.get("reason") or "")[:200], now) for r in rows])
    con.commit()
    print(f"{len(rows)} labels stored")


def main():
    con = open_db(load_config()["db"])
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "build":
        build(con)
    elif cmd == "unlabelled" and len(sys.argv) == 3:
        unlabelled(con, sys.argv[2])
    elif cmd == "labels" and len(sys.argv) == 3:
        store_labels(con, sys.argv[2])
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
