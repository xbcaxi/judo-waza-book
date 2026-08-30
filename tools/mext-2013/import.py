"""Turn the MEXT 2013 source pack into one perspective file per technique.

Run once. What it writes is CONTENT from that point on: a reviewer who can read
the Japanese will correct these files by hand, and re-running this would throw
that away. It is kept so the import can be repeated against a corrected pack,
not so the output can be regenerated on a whim.
"""
import json, os, re, sys, unicodedata

PACK = os.path.expanduser("~/Downloads/Japan Judo docs/mext-2013-source-pack/pages.jsonl")
OUT = sys.argv[1]

FIRST, LAST = 'mext-2013/1333611_07/p020', 'mext-2013/1333611_10/p006'

# The twenty, in source order, against the slug each belongs to. Written out
# rather than inferred from the page title: a wrong guess here files MEXT's
# teaching of one technique under another and nothing downstream would notice.
SLUGS = [
    ('hiza-guruma', 'Hiza-guruma'), ('sasae-tsurikomi-ashi', 'Sasae-tsurikomi-ashi'),
    ('tai-otoshi', 'Tai-otoshi'), ('o-goshi', 'Ō-goshi'), ('tsurikomi-goshi', 'Tsurikomi-goshi'),
    ('seoi-nage', 'Seoi-nage'), ('harai-goshi', 'Harai-goshi'), ('hane-goshi', 'Hane-goshi'),
    ('uchi-mata', 'Uchi-mata'), ('o-soto-gari', 'O-soto-gari'), ('ko-uchi-gari', 'Ko-uchi-gari'),
    ('o-uchi-gari', 'O-uchi-gari'), ('okuri-ashi-harai', 'Okuri-ashi-barai'),
    ('tomoe-nage', 'Tomoe-nage'), ('uki-waza', 'Uki-waza'), ('kesa-gatame', 'Kesa-gatame'),
    ('yoko-shiho-gatame', 'Yoko-shiho-gatame'), ('kami-shiho-gatame', 'Kami-shiho-gatame'),
    ('tate-shiho-gatame', 'Tate-shiho-gatame'), ('kata-gatame', 'Kata-gatame'),
]

# English heading -> (section kind, the Japanese heading it renders). The
# Japanese is the anchor the source is organised on and is asserted rather than
# searched for: these strings are fixed across all twenty pages, so a heading
# this table does not know is a change in the source and must stop the run.
HEADINGS = {
    'explanation of the technique': ('coaching', '技の説明'),
    'how to apply the technique': ('coaching', '技のかけ方'),
    'basic way of holding': ('coaching', '基本の抑え方'),
    'how uke responds': ('coaching', '受の応じ方'),
    'opportunities for applying the technique': ('coaching', '技をかける機会'),
    'opportunities to apply the technique': ('coaching', '技をかける機会'),
    'basic way of entering': ('coaching', '基本的な入り方'),
    'points to note in instruction': (None, '指導上の留意点'),
    'points to note in teaching': (None, '指導上の留意点'),
    # Sub-headings, which carry the real content of the last two sections.
    'elementary way of applying it': ('coaching', '初歩のかけ方'),
    'the elementary way of applying it': ('coaching', '初歩のかけ方'),
    'introductory way of applying the technique': ('coaching', '初歩のかけ方'),
    'basic way of applying it': ('coaching', '基本のかけ方'),
    'the basic way of applying it': ('coaching', '基本のかけ方'),
    'basic way of applying the technique': ('coaching', '基本のかけ方'),
    'devising the practice': ('coaching', '練習の工夫'),
    'practice ideas': ('coaching', '練習の工夫'),
    'faults that are easy to fall into': ('coaching', '陥りやすい欠点'),
    'points for safe instruction': ('safety', '安全指導のポイント'),
    'points for safety instruction': ('safety', '安全指導のポイント'),
    'points of safety instruction': ('safety', '安全指導のポイント'),
}

def norm(s):
    return unicodedata.normalize('NFKC', s or '').lower().replace('ō', 'o')

def head_key(text):
    """Match a heading that carries a trailing gloss, as several do."""
    t = norm(text).split('—')[0].strip().rstrip(':').strip()
    return t

def tidy(text):
    """No em dashes. The site fails its own build on one in any published page,
    so a source that uses them freely has to be converted here rather than
    caught three steps later in a build log. Every one of them in this pack
    separates a label from what it introduces, which is what a colon is for."""
    t = re.sub(r'\s*[—―]\s*', ': ', text)
    t = re.sub(r':\s*:', ':', t)
    return re.sub(r'\s+', ' ', t).strip()


def clean(line):
    """A blockquote in the pack is a photo, a caption or a coloured note.

    The bracket is a stage direction describing a picture this site does not
    have, so it goes; the sentence after it is the book's own caption and is
    exactly the teaching point, so it stays. A line that is nothing but the
    bracket has said nothing without its picture and is dropped."""
    t = line.strip()
    t = re.sub(r'^>\s*', '', t)
    t = re.sub(r'^\[[^\]]*\]\s*', '', t)
    t = t.replace('**', '')
    # "Caption:" introduces the words printed under a photograph and turns up
    # mid-line as often as at the start. The words are the teaching point; the
    # label is scaffolding for a picture this site does not carry.
    t = re.sub(r'\bCaption:\s*', '', t)
    t = tidy(t)
    return t if len(t.split()) >= 3 else ''


SUB = re.compile(r'^(?:#{2,4}\s*)?(?:\*\*)?[①②③④]?\s*(.*?)\s*\**\s*$')

def sections_from(markdown):
    """Every heading in one page, with the prose under it.

    THE SUB-HEADINGS ARE WRITTEN FIVE WAYS across these twenty pages: "### ①
    Faults...", "**①**" with the words on the next line, a bare "① Faults...",
    a bold "**Faults...**" with no numeral at all, and the numeral alone. So a
    candidate is only accepted as a sub-heading when the words it carries are
    one this table already knows, which is also what stops a bolded photo
    caption being read as a heading and swallowing the paragraph beneath it.
    """
    out, current = [], None
    for line in markdown.split('\n'):
        m = re.match(r'^#{2,4}\s*\((\d)\)\s*(.+?)\s*$', line)
        sub = SUB.match(line) if not line.startswith('>') else None
        if m:
            current = {'title': m.group(2), 'lines': []}
            out.append(current)
        elif sub and sub.group(1) and head_key(sub.group(1)) in HEADINGS:
            current = {'title': sub.group(1), 'lines': []}
            out.append(current)
        elif current is not None:
            if re.match(r'^#{1,4}\s', line) or re.match(r'^\*[A-Za-z]', line):
                continue                      # running heads and side tabs
            text = clean(line)
            if text:
                current['lines'].append(text)
    return out

def main():
    recs = [json.loads(l) for l in open(PACK)]
    ids = [r['record_id'] for r in recs]
    pages = recs[ids.index(FIRST):ids.index(LAST) + 1]

    groups, unknown = {slug: [] for slug, _ in SLUGS}, []
    for r in pages:
        title = norm(r.get('page_title_en'))
        hit, best = None, 0
        # LONGEST match on a word boundary: "ko-uchi-gari" contains
        # "o-uchi-gari", and a substring test files every ko-uchi-gari page
        # under o-uchi-gari.
        for slug, label in SLUGS:
            needle = norm(label)
            if re.search(rf'(?<![a-z-]){re.escape(needle)}(?![a-z-])', title) and len(needle) > best:
                hit, best = slug, len(needle)
        if hit:
            groups[hit].append(r)
        elif 'blank' not in title:
            unknown.append((r['printed_page'], r.get('page_title_en')))
    if unknown:
        raise SystemExit(f'pages matched no technique: {unknown}')

    os.makedirs(OUT, exist_ok=True)
    report = []
    for slug, label in SLUGS:
        pp = groups[slug]
        if not pp:
            raise SystemExit(f'{slug}: no pages')
        sections, misses = [], []
        for r in pp:
            for sec in sections_from(r.get('text_en_markdown') or ''):
                key = head_key(sec['title'])
                if key not in HEADINGS:
                    misses.append(sec['title'])
                    continue
                kind, ja = HEADINGS[key]
                if kind is None or not sec['lines']:
                    continue          # a wrapper heading, or a heading whose
                                      # only content was its photographs
                sections.append({
                    'kind': kind,
                    'heading': {'en': tidy(sec['title']), 'ja': ja},
                    'prose': {'en': ' '.join(sec['lines'])},
                    'pages': [{'recordId': r['record_id'], 'printedPage': r['printed_page'],
                               'jaSource': r.get('ja_source')}],
                })
        doc = {
            'source': {
                'sourceId': 'mext-2013',
                'jurisdiction': 'JP',
                'pathway': 'compulsory-school-pe',
                'population': 'whole-cohort',
                'evidenceLabel': 'authority',
                'translationStatus': 'machine-assisted, unreviewed',
            },
            'sections': sections,
            'sourcePages': [{
                'recordId': r['record_id'],
                'printedPage': r['printed_page'],
                'nameInSource': label,
                'textJa': r.get('text_ja') or '',
                'jaSource': r.get('ja_source'),
                'figureTextConfidence': r.get('figure_text_confidence'),
            } for r in pp],
        }
        for section in sections:
            for value in (section['heading']['en'], section['prose']['en']):
                if '\u2014' in value or '\u2015' in value:
                    raise SystemExit(f'{slug}: em dash survived tidy(): {value[:80]}')
        with open(os.path.join(OUT, f'{slug}.json'), 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        report.append((slug, len(sections), sum(1 for s in sections if s['kind'] == 'safety'), misses))

    print(f'{"technique":24} {"sections":>8} {"safety":>7}  unmatched headings')
    for slug, n, safe, misses in report:
        flag = '  <-- ' + '; '.join(sorted(set(misses))) if misses else ''
        print(f'{slug:24} {n:8} {safe:7}{flag}')

main()
