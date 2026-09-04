"""Score every indexed video against every edge that still needs one. No API
calls.

A video is a candidate for A -> B when its normalised title (or, at half
weight, its description) names both A and B. A single-technique video, one
the repository already attaches to exactly one technique, is never offered:
its title names A and its description mentions B often enough to make it a
partial candidate for every edge involving A, and none of them is what the
edge wants. Edges that resolve to a technique page are skipped outright; the
technique's own demonstrations already serve them.

Usage: python match_edges.py
"""
from common import contains, flatten, load_config, norm, open_db, single_technique_videos, slug_tokens

KEYWORDS = {
    "combination": ["renraku", "renzoku", "combination", "combo", "連絡", "連続"],
    "counter": ["kaeshi", "counter", "gaeshi", "返"],
    "transition": ["transition", "ne-waza", "newaza", "follow", "寝技", "osaekomi"],
    "chain": ["ne-waza", "newaza", "turnover", "escape", "寝技"],
    "grip-throw": ["kumi kata", "kumikata", "grip", "組手", "組み手"],
}


def hits(tokens, flat_and_bounds):
    flat, bounds = flat_and_bounds
    return any(contains(t, flat, bounds) for t in tokens)


def main():
    cfg = load_config()
    con = open_db(cfg["db"])
    trust = {c.get("name"): c.get("trust", 0.5) for c in cfg["channels"]}
    max_dur = cfg.get("max_duration_seconds", 420)
    skip_videos = single_technique_videos(con)

    edges = con.execute(
        "SELECT slug,src,dst,type FROM edges WHERE resolves_to IS NULL OR resolves_to=''"
    ).fetchall()
    videos = con.execute(
        "SELECT video_id,channel_name,title,description,duration_s,views FROM videos"
        " WHERE method<>'existing' OR video_id NOT IN (SELECT video_id FROM technique_videos)"
    ).fetchall()
    vids = [(v[0], v[1], flatten(v[2] or ""), flatten(v[3] or ""), v[4] or 0, v[5] or 0)
            for v in videos if v[0] not in skip_videos]
    inserted = 0

    for slug, src, dst, etype in edges:
        src_key = src[5:] if src.startswith("grip:") else src
        st = slug_tokens(src_key) if not src.startswith("grip:") else [norm(src_key), "grip", "kumikata"]
        dt = slug_tokens(dst)
        kw = [norm(k) for k in KEYWORDS.get(etype, [])]
        for vid, ch, title, desc, dur, views in vids:
            s_t, d_t = hits(st, title), hits(dt, title)
            s_d, d_d = hits(st, desc), hits(dt, desc)
            if not ((s_t or s_d) and (d_t or d_d)):
                continue
            score = 0.0
            score += 0.35 if s_t else 0.15
            score += 0.35 if d_t else 0.15
            score += 0.15 if hits(kw, title) else 0.0
            score += 0.15 * trust.get(ch, 0.5)
            if dur and dur > max_dur:
                score -= 0.2
            if views > 10000:
                score += 0.05
            method = "title" if (s_t and d_t) else "partial"
            if score < cfg.get("min_score", 0.5) and method == "partial":
                continue
            before = con.total_changes
            con.execute(
                "INSERT OR IGNORE INTO candidates(edge_slug,video_id,score,method) VALUES(?,?,?,?)",
                (slug, vid, round(score, 3), method),
            )
            inserted += con.total_changes - before
    con.commit()
    covered = con.execute(
        "SELECT COUNT(DISTINCT edge_slug) FROM candidates WHERE status<>'rejected'"
    ).fetchone()[0]
    total = con.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
    print(f"{inserted} new candidates; {covered}/{total} edges have at least one, "
          f"{len(skip_videos)} single-technique videos left out")


if __name__ == "__main__":
    main()
