"""A heuristic read of a video title for one edge: a score from -1 to 1 and
the reasons behind it, shown beside each candidate on the review page.

It sorts, it never decides. A reviewer still approves every video, and the
words below are what titles in the crawl actually use; add to them as titles
turn up that they miss.
"""
import re

from common import contains, flatten

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


def _first(tokens, flat, bounds):
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
    ps = _first(src_tokens, flat, bounds) if src_tokens else -1
    pd = _first(dst_tokens, flat, bounds)
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
            score += 0.1; why.append("both names, reversed")
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

