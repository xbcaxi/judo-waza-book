"""Load data/shortlist.csv, the hand-curated candidates, into the database.

The shortlist writes technique names the way the catalogue did ("ouchi-gari",
"deashi-harai") and edge types the way the catalogue did ("tachi-ne"). Both
are translated to the repository's own here, through the technique files, so
the shortlist can stay as it was written. A row naming an edge the repository
has no sequence for is reported rather than created: a sequence is content and
is written by hand, not by a CSV.

Run after extract_edges.py.

Usage: python seed_shortlist.py [data/shortlist.csv]
"""
import csv
import os
import re
import sys
from datetime import datetime, timezone

from common import HERE, load_config, open_db, resolve_name

TYPES = {"tachi-ne": "transition", "ne-trans": "chain", "combination": "combination",
         "counter": "counter", "grip-throw": "grip-throw"}


def video_id(url):
    m = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_\-]{11})", url)
    return m.group(1) if m else None


def translate(edge):
    src, etype, dst = edge.split("__")
    if src.startswith("grip:"):
        s = src
    else:
        s = resolve_name(src)
    d = resolve_name(dst)
    if not s or not d or etype not in TYPES:
        return None
    return f"{s}__{TYPES[etype]}__{d}"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "data", "shortlist.csv")
    cfg = load_config()
    con = open_db(cfg["db"])
    now = datetime.now(timezone.utc).isoformat()
    loaded, missing = 0, []
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            vid = video_id(r["url"])
            if not vid:
                print(f"skip (no video id): {r['url']}")
                continue
            slug = translate(r["edge"])
            if not slug or not con.execute("SELECT 1 FROM edges WHERE slug=?", (slug,)).fetchone():
                missing.append(r["edge"])
                continue
            con.execute(
                "INSERT OR IGNORE INTO videos(video_id,channel_name,title,indexed_at,method) VALUES(?,?,?,?,'manual')",
                (vid, r.get("channel") or "", r.get("note") or "", now),
            )
            con.execute(
                "INSERT OR IGNORE INTO candidates(edge_slug,video_id,score,method,status) VALUES(?,?,?,?,?)",
                (slug, vid, 0.7, "manual", r.get("status") or "candidate"),
            )
            loaded += 1
    con.commit()
    print(f"{loaded} shortlist rows loaded")
    if missing:
        print(f"{len(missing)} rows name an edge the repository has no sequence for; write the sequence first:")
        for m in sorted(set(missing)):
            print(f"  {m}")


if __name__ == "__main__":
    main()
