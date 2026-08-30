"""MEXT 2013, printed page 173: the nage-waza safety table, onto the six
technique perspectives it names.

Run once. Appends to files that already exist, so it is not idempotent: it
refuses to run twice by checking for the page it is about to add.

A PROHIBITION IS NOT ADVICE, and the table keeps them apart in its own wording.
Every bullet in the prevention column that uses the word "prohibit" states
something a teacher must not allow at all; the rest are things to work on. They
are kept as two sections for that reason, and the book's own sentences are
carried unaltered so a reader can see which is which for themselves.
"""
import json, os, re, sys

PACK = os.path.expanduser("~/Downloads/Japan Judo docs/mext-2013-source-pack/pages.jsonl")
RECORD = 'mext-2013/1333611_12/p011'
TARGET = os.path.expanduser('~/repos/judo-waza-book/perspectives/mext/techniques')

# What the table calls each technique, against the slug it belongs to. The
# table uses macrons where the file names do not.
SLUGS = {
    'tai-otoshi': 'tai-otoshi', 'ō-goshi': 'o-goshi', 'o-goshi': 'o-goshi',
    'hiza-guruma': 'hiza-guruma', 'ō-soto-gari': 'o-soto-gari', 'o-soto-gari': 'o-soto-gari',
    'sasae-tsurikomi-ashi': 'sasae-tsurikomi-ashi', 'ko-uchi-gari': 'ko-uchi-gari',
}

def tidy(text):
    t = re.sub(r'\s*[—―]\s*', ': ', text.replace('**', ''))
    return re.sub(r'\s+', ' ', t).strip()

def bullets(cell):
    return [tidy(p) for p in cell.split('○') if tidy(p)]

def main():
    rec = next(json.loads(l) for l in open(PACK) if json.loads(l)['record_id'] == RECORD)
    rows = []
    for line in (rec.get('text_en_markdown') or '').split('\n'):
        if not line.strip().startswith('|'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) != 3 or set(''.join(cells)) <= set('-: '):
            continue
        if cells[0].lower().startswith('nage-waza'):
            continue
        rows.append(cells)

    gathered = {}
    for name, hazard, prevention in rows:
        key = re.sub(r'\*\*|\s*\([^)]*\)', '', name).strip().lower()
        slug = SLUGS.get(key)
        if not slug:
            raise SystemExit(f'no slug for table row "{name}"')
        entry = gathered.setdefault(slug, {'hazards': [], 'prohibited': [], 'advice': []})
        entry['hazards'] += bullets(hazard)
        for b in bullets(prevention):
            (entry['prohibited'] if 'prohibit' in b.lower() else entry['advice']).append(b)

    page = {'recordId': RECORD, 'printedPage': rec['printed_page'], 'jaSource': rec['ja_source']}
    for slug, entry in gathered.items():
        path = os.path.join(TARGET, f'{slug}.json')
        doc = json.load(open(path))
        if any(RECORD == p['recordId'] for s in doc['sections'] for p in s.get('pages', [])):
            raise SystemExit(f'{slug}: page {rec["printed_page"]} is already on this file')

        def section(heading, items):
            if not items:
                return None
            body = {'kind': 'safety', 'heading': {'en': heading}, 'pages': [dict(page)]}
            # Two or more become a list, which a screen reader announces with a
            # count and lets the reader step through; one is a sentence.
            if len(items) > 1:
                body['steps'] = {'en': items}
            else:
                body['prose'] = {'en': items[0]}
            return body

        for heading, items in (
            ('Accidents to watch for', entry['hazards']),
            ('Prohibited outright', entry['prohibited']),
            ('Points for safe instruction', entry['advice']),
        ):
            s = section(heading, items)
            if s:
                doc['sections'].append(s)
        doc['sourcePages'].append({
            'recordId': RECORD, 'printedPage': rec['printed_page'],
            'textJa': rec.get('text_ja') or '', 'jaSource': rec['ja_source'],
            'figureTextConfidence': rec['figure_text_confidence'],
        })
        with open(path, 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        print(f'{slug:22} hazards {len(entry["hazards"])}  prohibited {len(entry["prohibited"])}  advice {len(entry["advice"])}')

main()
