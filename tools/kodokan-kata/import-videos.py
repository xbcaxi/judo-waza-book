"""Build the kata collection from what the repository already holds.

NOTHING HERE IS WRITTEN FROM MEMORY. The romaji names come from the BJA kata
requirements and from the titles of the recordings; the kanji come from the
Kodokan's own video titles, which print both scripts; the sets come from the
Spanish federation's dan programme, which names them; the recordings come from
the two backlog files that have been waiting for this collection to exist.
"""
import json, os, re, collections

REPO = os.path.expanduser('~/repos/judo-waza-book')
OUT = os.path.join(REPO, 'kata')

# slug -> (romaji name, kanji or None). The kanji is lifted from the Kodokan's
# own recording titles, which print "古式の形 / ... Koshiki-no-Kata"; where the
# Kodokan's titles give only romaji, this stays None rather than being guessed.
KATA = [
    ('nage-no-kata', 'Nage-no-kata', '投の形'),
    ('katame-no-kata', 'Katame-no-kata', '固の形'),
    ('kime-no-kata', 'Kime-no-kata', '極の形'),
    ('ju-no-kata', 'Ju-no-kata', '柔の形'),
    ('koshiki-no-kata', 'Koshiki-no-kata', '古式の形'),
    ('itsutsu-no-kata', 'Itsutsu-no-kata', '五の形'),
    ('kodokan-goshin-jutsu', 'Kodokan Goshin-jutsu', '講道館護身術'),
    ('seiryoku-zenyo-kokumin-taiiku', 'Seiryoku-Zenyo-Kokumin-Taiiku', '精力善用国民体育'),
    ('kodomo-no-kata', 'Kodomo-no-kata', None),
    # Named as its only source names it. Akita's recording and the backlog
    # both write "Kaeshi-kata"; the fuller "Kaeshi-no-kata" is common
    # elsewhere and nothing here says so.
    ('kaeshi-kata', 'Kaeshi-kata', None),
    ('nage-waza-ura-no-kata', 'Nage-waza-ura-no-kata', None),
]

# The sets, only where a source in this repository names them. The Spanish dan
# programme lists these two and no others.
SETS = {
    'nage-no-kata': ['Te-waza', 'Koshi-waza', 'Ashi-waza', 'Ma-sutemi-waza', 'Yoko-sutemi-waza'],
    'katame-no-kata': ['Osaekomi-waza', 'Shime-waza', 'Kansetsu-waza'],
}
SETS_NOTE = {
    'nage-no-kata': 'The five sets as the Spanish federation’s dan programme lists them; '
                    'its lower dan grades ask for the first three only.',
    'katame-no-kata': 'The three sets as the Spanish federation’s dan programme lists them.',
}

def match(title):
    """Which kata a recording's title names.

    ROMAJI AND KANJI BOTH. The Kodokan titles its recordings in either script
    and sometimes in neither consistently: "Nage-no-Kata (English ver.)" beside
    "投の形（日本語版）", and a Kagami Biraki ceremony recording that names only
    the performers. Matching romaji alone silently dropped fourteen of them,
    every Japanese-language teaching recording and the whole 2024 ceremony,
    which is the kind of loss that leaves no trace: the records simply looked
    complete.

    Longest match wins, and the kanji are compared whole: 固の形 and 古式の形
    share a character and are different forms."""
    t = re.sub(r'[^a-z]+', '', title.lower().replace('ō', 'o'))
    hit, best = None, 0
    for slug, name, ja in KATA:
        needle = re.sub(r'[^a-z]+', '', name.lower())
        if needle in t and len(needle) > best:
            hit, best = slug, len(needle)
        if ja and ja in title and len(ja) * 3 > best:
            # Weighted so a kanji name beats a shorter romaji one: a title
            # carrying both is naming the same form either way.
            hit, best = slug, len(ja) * 3
    return hit

def main():
    videos = collections.defaultdict(list)
    seen = set()

    def add(slug, video):
        key = (slug, video['id'])
        if key in seen:
            return
        seen.add(key)
        videos[slug].append(video)

    # 1. The Kodokan's own channel: full recordings in both languages, and the
    #    Kagami Biraki ceremony performances.
    for v in json.load(open(f'{REPO}/backlog/kodokan-unlinked.json')):
        slug = match(v['title'])
        if not slug:
            continue
        title = re.sub(r'\s+', ' ', v['title']).strip()
        add(slug, {
            'provider': 'kodokan', 'platform': 'youtube', 'id': v['id'],
            'title': title, 'duration': v.get('length'),
            'lang': 'ja' if re.search(r'日本語版|令和', title) and 'English' not in title else 'en',
        })

    # 2. The nine linked from the Spanish dan programme, already tagged with the
    #    kata they belong to.
    for v in json.load(open(f'{REPO}/backlog/rfejyda-kata-videos.json'))['links']:
        slug = v.get('kata') or match(v['title'])
        if not slug:
            continue
        add(slug, {'provider': 'assorted', 'platform': v['platform'], 'id': v['id'],
                   'title': v['title'], 'note': {'en': v['note']} if v.get('note') else None})

    # 3. The candidates that were held back for exactly this collection.
    candidates = json.load(open(f'{REPO}/backlog/video-candidates.json'))
    items = candidates if isinstance(candidates, list) else next(
        v for v in candidates.values() if isinstance(v, list))
    for v in items:
        slug = match(v['title'])
        if not slug:
            continue
        add(slug, {'provider': v['provider'], 'platform': v['platform'], 'id': v['id'],
                   'title': v['title']})

    os.makedirs(OUT, exist_ok=True)
    for slug, name, ja in KATA:
        entries = [{k: val for k, val in video.items() if val is not None}
                   for video in videos[slug]]
        doc = {
            'name': name,
            'nameJa': ja,
            'gloss': None,
            'about': None,
            'sets': [{'name': s} for s in SETS.get(slug, [])],
            'videos': entries,
            'links': [],
            'image': None,
        }
        if ja or slug in SETS:
            parts = []
            if ja:
                parts.append('The Japanese name is as the Kodokan writes it in the titles of '
                             'its own recordings of this form.')
            if slug in SETS:
                parts.append(SETS_NOTE[slug])
            doc['source'] = {'title': 'Kodokan Judo Institute recordings; '
                                      'Real Federación Española de Judo dan programme',
                             'date': '2026-08-30',
                             'note': {'en': ' '.join(parts)}}
        with open(os.path.join(OUT, f'{slug}.json'), 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        print(f'{slug:32} {len(entries):3} recording(s)  {"kanji" if ja else "romaji only":12} '
              f'{len(doc["sets"])} set(s)')
    print(f'\n{sum(len(v) for v in videos.values())} recordings attached across {len(KATA)} kata')

main()
