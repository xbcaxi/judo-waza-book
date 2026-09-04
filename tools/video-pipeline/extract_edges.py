"""Load the edges the repository already holds, and the videos it already
knows, into the pipeline's database.

The edges are the sequences and the grip-sets, read from sequences/*.json and
grips/*.json rather than from a catalogue: the catalogue was imported into
those files, and they are the copy that has been reviewed. Nothing here
parses markdown.

Two things are loaded before any matching happens, and the order matters:

- Every video a technique record already carries goes into the videos table
  with method 'existing', and the technique it belongs to into
  technique_videos. The matcher then knows that a video is a single-technique
  clip and refuses to offer it as a partial match to every edge naming that
  technique, which is exactly the false positive it would otherwise produce
  for the whole Kodokan series.
- An edge whose pairing is itself a named technique (o-soto-gari countered by
  o-soto-gaeshi) carries resolves_to. Such an edge needs no video of its own:
  the technique's page has the demonstration, and the sequence page shows it.
  The matcher and the searcher skip these; their existing videos are recorded
  as approved candidates with method 'existing' so the review sheet shows them
  as done.

Usage: python extract_edges.py
Writes edges.csv beside this file and fills the database named in config.
"""
import csv
import glob
import json
import os
from datetime import datetime, timezone

from common import HERE, load_config, open_db, repo_path, techniques

JOIN = {"combination": "-into-", "transition": "-into-", "counter": "-countered-by-", "chain": "-to-"}


def sequence_edges():
    for path in sorted(glob.glob(repo_path("sequences", "*.json"))):
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        src, dst = d["techniques"][0], d["techniques"][-1]
        slug = f"{src}__{d['kind']}__{dst}"
        note = "; ".join(x for x in (d.get("trigger"), d.get("direction")) if x)
        yield slug, src, dst, d["kind"], os.path.relpath(path, repo_path()).replace(os.sep, "/"), note, d.get("resolvesTo"), d["videos"]


def grip_edges():
    for path in sorted(glob.glob(repo_path("grips", "*.json"))):
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        grip = os.path.basename(path)[:-5]
        for link in d["throws"]:
            slug = f"grip:{grip}__grip-throw__{link['technique']}"
            yield slug, f"grip:{grip}", link["technique"], "grip-throw", os.path.relpath(path, repo_path()).replace(os.sep, "/"), link["direction"], None, d["videos"]


def main():
    cfg = load_config()
    con = open_db(cfg["db"])
    now = datetime.now(timezone.utc).isoformat()

    # The existing map, first.
    n_videos = 0
    for slug, d in techniques().items():
        for v in d["videos"]:
            if v["platform"] != "youtube":
                continue
            con.execute(
                "INSERT OR IGNORE INTO videos(video_id,channel_name,title,indexed_at,method) VALUES(?,?,?,?,?)",
                (v["id"], v["provider"], v.get("title", ""), now, "existing"),
            )
            con.execute(
                "INSERT OR IGNORE INTO technique_videos(video_id,technique,provider) VALUES(?,?,?)",
                (v["id"], slug, v["provider"]),
            )
            n_videos += 1

    rows = list(sequence_edges()) + list(grip_edges())
    with open(os.path.join(HERE, "edges.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["slug", "src", "dst", "type", "file", "note", "resolves_to"])
        for slug, src, dst, etype, file, note, resolves, videos in rows:
            w.writerow([slug, src, dst, etype, file, note, resolves or ""])
            con.execute(
                "INSERT OR REPLACE INTO edges(slug,src,dst,type,file,note,resolves_to,priority)"
                " VALUES(?,?,?,?,?,?,?,COALESCE((SELECT priority FROM edges WHERE slug=?),0))",
                (slug, src, dst, etype, file, note, resolves, slug),
            )
            # Videos the record already carries are approved by definition.
            for v in videos:
                if v["platform"] != "youtube":
                    continue
                con.execute(
                    "INSERT OR IGNORE INTO videos(video_id,channel_name,title,indexed_at,method) VALUES(?,?,?,?,?)",
                    (v["id"], v["provider"], v.get("title", ""), now, "existing"),
                )
                con.execute(
                    "INSERT OR IGNORE INTO candidates(edge_slug,video_id,score,method,start_s,status)"
                    " VALUES(?,?,?,?,?,?)",
                    (slug, v["id"], 1.0, "existing", v.get("start", 0), "approved"),
                )
            # A resolved edge inherits the technique's demonstrations.
            if resolves and resolves in techniques():
                for v in techniques()[resolves]["videos"]:
                    if v["platform"] != "youtube":
                        continue
                    con.execute(
                        "INSERT OR IGNORE INTO candidates(edge_slug,video_id,score,method,status)"
                        " VALUES(?,?,?,?,?)",
                        (slug, v["id"], 1.0, "existing", "approved"),
                    )
    con.commit()
    resolved = sum(1 for r in rows if r[6])
    print(f"{len(rows)} edges ({resolved} resolve to a technique page) -> edges.csv and {cfg['db']}")
    print(f"{n_videos} technique videos loaded as the existing map")


if __name__ == "__main__":
    main()
