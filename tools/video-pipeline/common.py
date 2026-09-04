"""Shared pieces of the video pipeline: the database, the YouTube client, and
the name matching that everything else relies on.

THE REPOSITORY IS THE SOURCE. Technique names, kanji and spellings come from
techniques/*.json, not from a table kept here; a table kept here would be a
second copy of every name and would drift. The one thing this file adds is a
handful of English words a video title uses where the record does not
("armbar").

QUOTA. YouTube Data API v3 gives 10,000 units a day. search.list costs 100,
so a hundred searches; playlistItems.list and videos.list cost 1 per 50.
Every call goes through YouTube.get, which records what it spent, so a run
that stops for the day says so rather than failing halfway.
"""
import glob
import json
import os
import re
import sqlite3
import time
import unicodedata
from datetime import date
from functools import lru_cache

import requests
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
API = "https://www.googleapis.com/youtube/v3"

# English words a title uses for a technique the record names in Japanese.
# Keys are normalised (see norm); add as titles turn them up.
ENGLISH = {
    "armbar": "juji-gatame",
    "scarfhold": "kesa-gatame",
    "footsweep": "de-ashi-harai",
}


def repo_path(*parts):
    return os.path.join(REPO, *parts)


def load_config(path=None):
    with open(path or os.path.join(HERE, "config.yaml"), encoding="utf-8") as f:
        return yaml.safe_load(f)


def norm(s: str) -> str:
    """Lowercase, strip accents and macrons, drop hyphens, spaces and
    punctuation: "O-soto-gari", "osoto gari" and "Ōsotogari" all become
    osotogari, which is why the repository's hyphenated slugs match titles
    written every other way without an alias table."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    return re.sub(r"[\-\s_'’\.]", "", s)


def flatten(text: str):
    """norm() with the word boundaries remembered: the flat string, and for
    each of its characters whether a space, hyphen or other separator came
    before it in the original. Needed because once spaces go, "ouchigari"
    is a substring of "kouchigari" and every ko-uchi-gari title would offer
    itself to every o-uchi-gari edge."""
    s = unicodedata.normalize("NFKD", text or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    flat, bounds, after_sep = [], [], True
    for c in s:
        if re.match(r"[\-\s_'’\.]", c):
            after_sep = True
            continue
        flat.append(c)
        bounds.append(after_sep)
        after_sep = False
    return "".join(flat), bounds


def contains(token: str, flat: str, bounds) -> bool:
    """Whether a normalised token occurs in the flat text at a place a word
    could start: the start of the text, after a separator, or after a
    non-letter. Kanji tokens match anywhere; Japanese has no spaces to keep."""
    if not token:
        return False
    if not token.isascii():
        return token in flat
    start = 0
    while True:
        i = flat.find(token, start)
        if i < 0:
            return False
        if i == 0 or bounds[i] or not flat[i - 1].isalpha():
            return True
        start = i + 1


@lru_cache(maxsize=None)
def techniques():
    """slug -> the technique record, read once."""
    out = {}
    for path in sorted(glob.glob(repo_path("techniques", "*.json"))):
        with open(path, encoding="utf-8") as f:
            out[os.path.basename(path)[:-5]] = json.load(f)
    return out


@lru_cache(maxsize=None)
def name_index():
    """normalised name or alias -> slug, from the technique files."""
    index = {}
    for slug, d in techniques().items():
        index[norm(slug)] = slug
        index[norm(d["nameRomaji"])] = slug
        for alias in d.get("aliases", []):
            index.setdefault(norm(alias), slug)
        if d.get("kodokan"):
            index.setdefault(norm(d["kodokan"]["nameRomaji"]), slug)
    for word, slug in ENGLISH.items():
        index.setdefault(word, slug)
    return index


def resolve_name(name: str):
    """A name as another catalogue writes it ("ouchi-gari", "ippon seoi") to
    the repository's slug, or None where nothing matches."""
    key = norm(name)
    if key in name_index():
        return name_index()[key]
    # "ippon seoi" for ippon-seoi-nage, "sasae" for sasae-tsurikomi-ashi
    hits = [slug for n, slug in name_index().items() if n.startswith(key)]
    return hits[0] if len(set(hits)) == 1 else None


def slug_tokens(slug: str) -> list:
    """Every string whose presence in a normalised title counts as this
    technique: its normalised slug, its kanji, its aliases."""
    d = techniques().get(slug)
    toks = {norm(slug)}
    if d:
        toks.add(norm(d["nameRomaji"]))
        if d.get("nameJa"):
            toks.add(d["nameJa"])
        for alias in d.get("aliases", []):
            toks.add(norm(alias))
    for word, s in ENGLISH.items():
        if s == slug:
            toks.add(word)
    return sorted(t for t in toks if t)


def open_db(path):
    if not os.path.isabs(path):
        path = os.path.join(HERE, path)
    con = sqlite3.connect(path)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS edges(
            slug TEXT PRIMARY KEY, src TEXT, dst TEXT, type TEXT, file TEXT,
            note TEXT, resolves_to TEXT, priority INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS videos(
            video_id TEXT PRIMARY KEY, channel_id TEXT, channel_name TEXT,
            title TEXT, description TEXT, published TEXT, duration_s INTEGER,
            views INTEGER, indexed_at TEXT, method TEXT DEFAULT 'indexed');
        CREATE TABLE IF NOT EXISTS technique_videos(
            video_id TEXT, technique TEXT, provider TEXT,
            PRIMARY KEY(video_id, technique));
        CREATE TABLE IF NOT EXISTS candidates(
            edge_slug TEXT, video_id TEXT, score REAL, method TEXT,
            start_s INTEGER DEFAULT 0, status TEXT DEFAULT 'candidate',
            reviewer TEXT, reviewed_at TEXT,
            PRIMARY KEY(edge_slug, video_id));
        CREATE TABLE IF NOT EXISTS quota(day TEXT PRIMARY KEY, units INTEGER);
        """
    )
    return con


def single_technique_videos(con):
    """Videos the repository already attaches to exactly one technique: a
    Kodokan clip of o-soto-gari, say. A partial match would otherwise offer
    every one of them to every edge that names the technique."""
    rows = con.execute(
        "SELECT video_id FROM technique_videos GROUP BY video_id HAVING COUNT(*)=1"
    ).fetchall()
    return {r[0] for r in rows}


def api_key():
    """YT_API_KEY from the environment, or from a gitignored .env beside this
    file (one KEY=value per line). The environment wins, as it does for the
    site's .env.deploy. The key is per person and never committed."""
    key = os.environ.get("YT_API_KEY")
    if key:
        return key
    env = os.path.join(HERE, ".env")
    if os.path.exists(env):
        with open(env, encoding="utf-8") as f:
            for line in f:
                m = re.match(r"^\s*YT_API_KEY\s*=\s*(.+?)\s*$", line)
                if m and not line.lstrip().startswith("#"):
                    return m.group(1).strip("\"'")
    return None


class YouTube:
    def __init__(self, con, key=None):
        self.key = key or api_key()
        if not self.key:
            raise SystemExit(
                "No YouTube API key. Set YT_API_KEY in the environment, or put\n"
                "  YT_API_KEY=...\n"
                f"in {os.path.join(HERE, '.env')} (gitignored). Get one from the Google\n"
                "Cloud console: YouTube Data API v3."
            )
        self.con = con

    def _spend(self, units):
        d = date.today().isoformat()
        cur = self.con.execute("SELECT units FROM quota WHERE day=?", (d,)).fetchone()
        used = (cur[0] if cur else 0) + units
        self.con.execute("INSERT OR REPLACE INTO quota VALUES(?,?)", (d, used))
        self.con.commit()
        return used

    def used_today(self):
        cur = self.con.execute(
            "SELECT units FROM quota WHERE day=?", (date.today().isoformat(),)
        ).fetchone()
        return cur[0] if cur else 0

    def get(self, endpoint, cost, **params):
        params["key"] = self.key
        for attempt in range(3):
            r = requests.get(f"{API}/{endpoint}", params=params, timeout=30)
            if r.status_code == 200:
                self._spend(cost)
                return r.json()
            if r.status_code == 403 and "quota" in r.text.lower():
                raise SystemExit("Daily quota exhausted; run again tomorrow")
            time.sleep(2 * (attempt + 1))
        r.raise_for_status()

    def resolve_handle(self, handle):
        j = self.get("channels", 1, part="id,snippet,contentDetails", forHandle=handle)
        items = j.get("items") or []
        return items[0] if items else None

    def uploads_playlist(self, channel_id):
        j = self.get("channels", 1, part="contentDetails", id=channel_id)
        return j["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    def playlist_items(self, playlist_id):
        token = None
        while True:
            j = self.get(
                "playlistItems", 1, part="snippet", playlistId=playlist_id,
                maxResults=50, pageToken=token,
            )
            for it in j.get("items", []):
                yield it["snippet"]
            token = j.get("nextPageToken")
            if not token:
                break

    def video_details(self, ids):
        out = {}
        for i in range(0, len(ids), 50):
            chunk = ids[i:i + 50]
            j = self.get(
                "videos", 1, part="contentDetails,statistics,snippet",
                id=",".join(chunk),
            )
            for it in j.get("items", []):
                out[it["id"]] = it
        return out

    def search(self, q, channel_id=None, max_results=10):
        params = dict(
            part="snippet", q=q, type="video", maxResults=max_results,
            videoDuration="short", safeSearch="none",
        )
        if channel_id:
            params["channelId"] = channel_id
        return self.get("search", 100, **params).get("items", [])


def iso_duration_to_seconds(s: str) -> int:
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return 0
    h, mi, se = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + se
