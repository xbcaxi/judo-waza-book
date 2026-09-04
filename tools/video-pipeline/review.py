"""Export candidates to review.csv, import the decisions, and write what was
approved.

python review.py export [--top 3]    -> review.csv, the best N per edge
python review.py import review.csv   -> applies status, start_s and reviewer
python review.py approved            -> approved.json, read by apply_approved.py

A row whose method is 'existing' is already on a record and needs no
decision; it is exported so the sheet shows what an edge already has.
"""
import csv
import json
import os
import sys
from datetime import datetime, timezone

from common import HERE, load_config, open_db


def export(con, top):
    rows = con.execute(
        """
        SELECT c.edge_slug,e.type,e.resolves_to,c.video_id,v.channel_name,v.title,v.duration_s,
               c.score,c.method,c.start_s,c.status
        FROM candidates c JOIN edges e ON e.slug=c.edge_slug
        JOIN videos v ON v.video_id=c.video_id
        ORDER BY c.edge_slug, c.status='approved' DESC, c.score DESC
        """
    ).fetchall()
    out = os.path.join(HERE, "review.csv")
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["edge", "type", "resolves_to", "url", "channel", "title", "duration_s",
                    "score", "method", "start_s", "status", "reviewer"])
        count = {}
        for r in rows:
            count[r[0]] = count.get(r[0], 0) + 1
            if count[r[0]] > top:
                continue
            w.writerow([r[0], r[1], r[2] or "", f"https://youtu.be/{r[3]}", r[4], r[5], r[6],
                        r[7], r[8], r[9], r[10], ""])
    print(f"{out} written")


def imp(con, path):
    now = datetime.now(timezone.utc).isoformat()
    n = 0
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["status"] not in ("approved", "rejected") or r.get("method") == "existing":
                continue
            vid = r["url"].rsplit("/", 1)[-1]
            con.execute(
                "UPDATE candidates SET status=?, start_s=?, reviewer=?, reviewed_at=?"
                " WHERE edge_slug=? AND video_id=?",
                (r["status"], int(r["start_s"] or 0), r["reviewer"], now, r["edge"], vid),
            )
            n += 1
    con.commit()
    print(f"{n} decisions applied")


def approved(con):
    rows = con.execute(
        """
        SELECT e.slug,e.src,e.dst,e.type,e.file,c.video_id,c.start_s,v.channel_name,v.title
        FROM candidates c JOIN edges e ON e.slug=c.edge_slug
        JOIN videos v ON v.video_id=c.video_id
        WHERE c.status='approved' AND c.method<>'existing'
        """
    ).fetchall()
    out = {}
    for slug, src, dst, etype, file, vid, start, ch, title in rows:
        out.setdefault(slug, {"from": src, "to": dst, "type": etype, "file": file, "videos": []})
        out[slug]["videos"].append(
            {"youtube_id": vid, "start_s": start, "channel": ch, "title": title}
        )
    path = os.path.join(HERE, "approved.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"{len(out)} edges with newly approved videos -> {path}")


if __name__ == "__main__":
    cfg = load_config()
    con = open_db(cfg["db"])
    cmd = sys.argv[1] if len(sys.argv) > 1 else "export"
    if cmd == "export":
        top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 3
        export(con, top)
    elif cmd == "import":
        imp(con, sys.argv[2])
    elif cmd == "approved":
        approved(con)
