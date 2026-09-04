"""search.list for edges that still have no strong candidate.

Each call costs 100 units, so this runs against search_daily_budget from the
config and takes edges in priority order: edges.priority first, then counters,
combinations, grips, transitions, chains. Edges that resolve to a technique
page are never searched for. Results are stored with method 'search' and
scored the way match_edges.py scores.

Usage: python search_gaps.py [--allowlist-only]

--allowlist-only searches each configured channel separately (100 units per
channel per edge), so use it for a handful of high-priority edges only.
"""
import sys
from datetime import datetime, timezone

from common import YouTube, contains, flatten, iso_duration_to_seconds, load_config, norm, open_db, single_technique_videos, techniques

TYPE_ORDER = {"counter": 0, "combination": 1, "grip-throw": 2, "transition": 3, "chain": 4}


def words(slug):
    return slug.replace("-", " ")


def kanji(slug):
    d = techniques().get(slug)
    return d.get("nameJa") if d else None


def query_for(src, dst, etype):
    grip = src.startswith("grip:")
    s = src[5:] if grip else src
    if etype == "counter":
        q = f"{words(s)} counter {words(dst)} judo"
    elif etype == "grip-throw":
        q = f"{words(s)} grip {words(dst)} judo"
    else:
        q = f"{words(s)} {words(dst)} judo"
    jp = ""
    if not grip and kanji(s) and kanji(dst):
        jp = f"{kanji(s)} {kanji(dst)}"
    return q, jp


def main():
    cfg = load_config()
    con = open_db(cfg["db"])
    yt = YouTube(con)
    budget = cfg.get("search_daily_budget", 90) * 100
    allow_only = "--allowlist-only" in sys.argv
    allow_ids = [c["channel_id"] for c in cfg["channels"] if c.get("channel_id")]
    skip_videos = single_technique_videos(con)

    gaps = con.execute(
        """
        SELECT e.slug,e.src,e.dst,e.type,e.priority FROM edges e
        WHERE (e.resolves_to IS NULL OR e.resolves_to='')
          AND NOT EXISTS (SELECT 1 FROM candidates c
                          WHERE c.edge_slug=e.slug AND c.method IN ('title','search','existing','manual')
                            AND c.status<>'rejected')
        """
    ).fetchall()
    gaps.sort(key=lambda r: (-r[4], TYPE_ORDER.get(r[3], 9), r[0]))
    print(f"{len(gaps)} edges without a strong candidate")
    now = datetime.now(timezone.utc).isoformat()

    for slug, src, dst, etype, _ in gaps:
        if yt.used_today() + 100 > budget:
            print("budget reached for today")
            break
        q, jp = query_for(src, dst, etype)
        items = []
        if allow_only:
            for cid in allow_ids:
                if yt.used_today() + 100 > budget:
                    break
                items += yt.search(q, channel_id=cid, max_results=5)
        else:
            items = yt.search(q, max_results=10)
            if jp and yt.used_today() + 100 <= budget:
                items += yt.search(jp, max_results=5)

        ids = [it["id"]["videoId"] for it in items if it["id"]["videoId"] not in skip_videos]
        if not ids:
            continue
        det = yt.video_details(ids)
        s_key = src[5:] if src.startswith("grip:") else src
        st, dt = norm(s_key), norm(dst)
        for vid, it in det.items():
            sn = it["snippet"]
            flat, bounds = flatten(sn["title"])
            dur = iso_duration_to_seconds(it["contentDetails"]["duration"])
            views = int(it["statistics"].get("viewCount", 0))
            con.execute(
                "INSERT OR IGNORE INTO videos(video_id,channel_id,channel_name,title,description,published,duration_s,views,indexed_at,method)"
                " VALUES(?,?,?,?,?,?,?,?,?,'search')",
                (vid, sn["channelId"], sn["channelTitle"], sn["title"],
                 sn.get("description", ""), sn["publishedAt"], dur, views, now),
            )
            both = ((contains(st, flat, bounds) or contains(kanji(s_key) or "", flat, bounds))
                    and (contains(dt, flat, bounds) or contains(kanji(dst) or "", flat, bounds)))
            score = 0.6 if both else 0.35
            if dur > cfg.get("max_duration_seconds", 420):
                score -= 0.2
            if views > 10000:
                score += 0.05
            con.execute(
                "INSERT OR IGNORE INTO candidates(edge_slug,video_id,score,method) VALUES(?,?,?,?)",
                (slug, vid, round(score, 3), "search"),
            )
        con.commit()
        print(f"{slug}: {len(ids)} results  (quota {yt.used_today()})")


if __name__ == "__main__":
    main()
