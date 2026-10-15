"""A heuristic read of a video title for one edge: a score from -1 to 1 and
the reasons behind it, shown beside each candidate on the review page.

It sorts, it never decides. A reviewer still approves every video, and the
words below are what titles in the crawl actually use; add to them as titles
turn up that they miss.
"""
import glob
import json
import os
import re
from functools import lru_cache

from common import contains, flatten, load_config, norm, repo_path

# Words that say the video is about a pairing rather than one throw.
SEQUENCE_WORDS = [
    "combination", "combo", "renraku", "renzoku", "into", "setup", "set up",
    "follow up", "followup", "transition", "chain", "->", "→",
]
COUNTER_WORDS = ["counter", "kaeshi", "gaeshi", "defence", "defense", "against"]
# Words that say it is something else: contest footage, kata, other sports.
AGAINST = {
    # "no kata" rather than "kata", which would catch kata-guruma and kata-gatame.
    "kata": ["no kata", "no-kata", "nokata", "kime-shiki", "goshin jutsu"],
    "highlights": ["highlight", "highlights", "best of", "top 10", "top 5", "ippons", "compilation"],
    "contest": ["final", "grand slam", "grand prix", "world championships", "olympic", "olympics", "masters"],
    "other sport": ["bjj", "jiu jitsu", "jiujitsu", "mma", "ufc", "wrestling", "sambo", "aikido", "karate"],
    "not instruction": ["fail", "funny", "reaction", "prank"],
}


def first_at(tokens, flat, bounds):
    """Where the earliest of a technique's names starts in a flattened title, or -1."""
    best = -1
    for t in tokens:
        start = 0
        while t:
            i = flat.find(t, start)
            if i < 0:
                break
            if contains(t, flat[i:], bounds[i:]):
                if best < 0 or i < best:
                    best = i
                break
            start = i + 1
    return best


def _has_word(words, text):
    return [w for w in words if re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text)]


def title_signal(src_tokens, dst_tokens, kind, title, grip=False):
    """Score and reasons for a title against an edge. src_tokens and
    dst_tokens are the techniques' normalised names (common.slug_tokens);
    for a grip edge src_tokens is empty and only the throw is looked for."""
    flat, bounds = flatten(title or "")
    low = (title or "").lower()
    ps = first_at(src_tokens, flat, bounds) if src_tokens else -1
    pd = first_at(dst_tokens, flat, bounds)
    score, why = 0.0, []

    if grip:
        if pd >= 0:
            score += 0.3; why.append("names the throw")
        else:
            score -= 0.3; why.append("throw not in title")
    elif ps >= 0 and pd >= 0:
        # A counter's title names the pair either way round: "X counter to Y", "Y countered by X".
        if kind == "counter":
            score += 0.5; why.append("both names")
        elif ps < pd:
            score += 0.5; why.append("both names, in order")
        else:
            # Most often a demo of the opposite edge, which the page offers to move it to.
            score -= 0.4; why.append("both names, reversed")
    elif ps >= 0 or pd >= 0:
        score -= 0.2; why.append("one name only")
    else:
        score -= 0.5; why.append("neither name")

    linked = _has_word(COUNTER_WORDS if kind == "counter" else SEQUENCE_WORDS, low)
    if linked:
        score += 0.2; why.append("says " + linked[0])
    for label, words in AGAINST.items():
        if _has_word(words, low):
            score -= 0.3; why.append(label)

    return max(-1.0, min(1.0, round(score, 2))), why


def edge_tokens(src, dst, tokens_for):
    """The token lists title_signal takes, from an edge's slugs."""
    grip = src.startswith("grip:")
    return ([] if grip else tokens_for(src)), tokens_for(dst), grip



KNOWN_SOURCE = 0.2


@lru_cache(maxsize=None)
def known_sources(con):
    """Channel ids and normalised names of the sources the book already uses:
    the channels a record's video comes from, video-channels/, the
    providers in video-providers/ and the channels config.yaml indexes.
    Names catch the providers whose videos were recorded without a channel id."""
    ids, names = set(), set()
    ids.update(r[0] for r in con.execute(
        "SELECT DISTINCT v.channel_id FROM technique_videos t JOIN videos v USING(video_id) "
        "WHERE v.channel_id IS NOT NULL"))
    ids.update(ch["channel_id"] for ch in load_config().get("channels", []))
    for folder in ("video-channels", "video-providers"):
        for path in glob.glob(repo_path(folder, "*.json")):
            with open(path, encoding="utf-8") as f:
                d = json.load(f)
            names.add(norm(d["name"]))
            names.add(norm(os.path.basename(path)[:-5]))
            m = re.search(r"/channel/(UC[\w-]+)", d.get("url", ""))
            if m:
                ids.add(m.group(1))
    return frozenset(ids), frozenset(names)


def source_signal(con, channel_id, channel_name):
    """KNOWN_SOURCE where the channel is one the book already uses, else 0."""
    ids, names = known_sources(con)
    if channel_id in ids or norm(channel_name or "") in names:
        return KNOWN_SOURCE
    return 0.0
