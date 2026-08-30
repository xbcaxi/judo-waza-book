"""MEXT 2013, printed pages 90 to 117: the basic movements, as perspectives.

Run once. See tools/mext-2013/README.md; the same rules apply here.
"""
import json, os, re, sys, collections

PACK = os.path.expanduser("~/Downloads/Japan Judo docs/mext-2013-source-pack/pages.jsonl")
OUT = sys.argv[1]
FIRST, LAST = 'mext-2013/1333611_06/p002', 'mext-2013/1333611_07/p017'

# WHICH SUBJECT EACH PAGE SPEAKS ABOUT, written out rather than inferred.
#
# The left-hand pages carry the reference material and the right-hand pages a
# step of the teaching progression beside it. A step is assigned to the skill
# ITS OWN HEADING NAMES, which is the only assignment the source supports:
# there are two overlapping step numberings here, one for the basic movements
# and one within ukemi, and reconstructing a single order would be inventing a
# structure the book does not print.
#
# None means "no subject in this reference", and those pages are REPORTED
# rather than dropped quietly. Kuzushi has no entry of its own, so the source's
# kuzushi material sits with tai-sabaki, which is how the book pairs them.
SUBJECT_BY_PAGE = {
    '90': 'guides/bowing-and-the-judogi',
    '91': 'guides/bowing-and-the-judogi',   # split below: the belt half is its own guide
    '92': 'skills/shisei',
    '93': 'skills/shisei',
    '94': 'skills/standard-grip',           # split below: the second half is footwork
    '95': 'skills/standard-grip',
    '96': 'skills/tai-sabaki',
    '97': 'skills/tai-sabaki',
    '98': None,                             # an overview of all three ukemi at once
    '99': None,                             # the same, for the teaching of them
    '100': 'skills/ushiro-ukemi',
    '101': 'skills/ushiro-ukemi',
    '102': 'skills/ushiro-ukemi',
    '103': 'skills/ushiro-ukemi',
    '104': 'skills/yoko-ukemi',
    '105': 'skills/tai-sabaki',
    '106': 'skills/yoko-ukemi',
    '107': 'skills/shintai',
    '108': 'skills/mae-mawari-ukemi',
    '109': 'skills/tai-sabaki',
    '110': None,                            # bridging prose about throwing in general
    '111': None,                            # Step 6 names techniques, not a skill
    '112': None, '113': None, '114': None,  # katame-waza basics: posture, body
    '115': None, '116': None, '117': None,  # movement, entries and turnovers, none
                                            # of which has a subject here yet
}

# Where one page speaks about two subjects, the block its second subject starts
# at. Everything from that block to the end of the page goes to the second.
SPLITS = {
    '91': ('(3) How to tie the belt', 'guides/tying-your-belt'),
    '94': ('(2) Advancing and retreating movements', 'skills/shintai'),
    # The forward half of this page introduces yoko-ukemi and mae-mawari-ukemi
    # together and belongs to neither on its own; the backward half is
    # ushiro-ukemi and nothing else.
    '98': ('Backward ukemi', 'skills/ushiro-ukemi'),
}

# A heading that introduces the book's own safety wording rather than a step.
SAFETY_TITLES = ('the "maitta" signal', 'examples of dangerous positions')


def undecorate(title):
    """The source quotes a term in 「」 and brackets an aside in <>, and the
    translation carried both across as ASCII punctuation. As a heading they are
    decoration: strip them so the heading is the term itself."""
    t = title.strip()
    t = re.sub(r'^[<"\u201c\u300c]\s*', '', t)
    t = re.sub(r'\s*[>"\u201d\u300d]$', '', t)
    return t.strip()


def tidy(text):
    t = re.sub(r'\s*[—―]\s*', ': ', text)
    t = re.sub(r':\s*:', ':', t)
    return re.sub(r'\s+', ' ', t).strip()


def clean(line):
    """Unlike the technique pages, the blockquotes here are mostly KEYS to a
    diagram: "Panel 1: Heading: Movement to the left and right. Footprints
    numbered..." says nothing without the diagram and reads as noise beside the
    prose. The exception is the book's own "Point:" callouts, which are
    teaching instructions and among the most useful lines on the page. So a
    blockquote survives only if it is one of those."""
    quoted = line.strip().startswith('>')
    t = line.strip()
    t = re.sub(r'^>\s*', '', t)
    t = re.sub(r'^\[[^\]]*\]\s*', '', t)
    t = t.replace('**', '')
    if quoted and not re.match(r'^\s*Point:', t.replace('**', ''), re.I):
        return ''
    t = re.sub(r'\b(Caption|Label|Labels|Side tab|Running head):\s*', '', t)
    t = tidy(t)
    return t if len(t.split()) >= 3 else ''


def heading_of(raw):
    m = re.match(r'^#{2,4}\s*(.+?)\s*$', raw)
    if m:
        return m.group(1), ''
    m = re.match(r'^○\s*\*{0,2}(.+?)\*{0,2}\s*$', raw)
    if m:
        return m.group(1), ''
    m = re.match(r'^\*\*(.+?)\*\*\s*(.*)$', raw)
    if m:
        return m.group(1), m.group(2).strip()
    return None


def blocks(md):
    out, cur = [], None
    for line in md.split('\n'):
        raw = line.rstrip()
        if not raw.strip():
            continue
        h = None if raw.startswith('>') else heading_of(raw)
        if h:
            first = clean(h[1]) if h[1] else ''
            cur = {'title': undecorate(tidy(h[0].replace('**', ''))), 'lines': ([first] if first else [])}
            out.append(cur)
        elif cur is not None:
            text = clean(raw)
            if text:
                cur['lines'].append(text)
    return [b for b in out if b['lines']]


def main():
    recs = [json.loads(l) for l in open(PACK)]
    ids = [r['record_id'] for r in recs]
    pages = recs[ids.index(FIRST):ids.index(LAST) + 1]

    bySubject = collections.OrderedDict()
    unassigned = []
    for r in pages:
        page = r['printed_page']
        subject = SUBJECT_BY_PAGE.get(page, None)
        split = SPLITS.get(page)
        switched = False
        for b in blocks(r.get('text_en_markdown') or ''):
            if split and b['title'].startswith(split[0]):
                switched = True
            target = split[1] if (split and switched) else subject
            if not target:
                unassigned.append((page, b['title']))
                continue
            kind = 'safety' if b['title'].lower() in SAFETY_TITLES else 'coaching'
            bySubject.setdefault(target, {'sections': [], 'pages': {}})
            bySubject[target]['sections'].append({
                'kind': kind,
                'heading': {'en': b['title']},
                'prose': {'en': ' '.join(b['lines'])},
                'pages': [{'recordId': r['record_id'], 'printedPage': page,
                           'jaSource': r.get('ja_source')}],
            })
            bySubject[target]['pages'][r['record_id']] = r

    for target, data in bySubject.items():
        kind, slug = target.split('/')
        directory = os.path.join(OUT, kind)
        os.makedirs(directory, exist_ok=True)
        for section in data['sections']:
            for value in (section['heading']['en'], section['prose']['en']):
                if '—' in value or '―' in value:
                    raise SystemExit(f'{target}: em dash survived tidy(): {value[:80]}')
        doc = {
            'source': {
                'sourceId': 'mext-2013',
                'jurisdiction': 'JP',
                'pathway': 'compulsory-school-pe',
                'population': 'whole-cohort',
                'evidenceLabel': 'authority',
                'translationStatus': 'machine-assisted, unreviewed',
            },
            'sections': data['sections'],
            'sourcePages': [{
                'recordId': r['record_id'],
                'printedPage': r['printed_page'],
                'textJa': r.get('text_ja') or '',
                'jaSource': r.get('ja_source'),
                'figureTextConfidence': r.get('figure_text_confidence'),
            } for r in data['pages'].values()],
        }
        with open(os.path.join(directory, f'{slug}.json'), 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
            fh.write('\n')

    print(f'{"subject":34} {"sections":>8} {"pages":>6}')
    for target, data in bySubject.items():
        print(f'{target:34} {len(data["sections"]):8} {len(data["pages"]):6}')
    print(f'\nNOT ASSIGNED: {len(unassigned)} blocks on pages '
          f'{sorted(set(p for p, _ in unassigned), key=int)}')
    for page, title in unassigned[:6]:
        print(f'   p{page}: {title[:70]}')

main()
