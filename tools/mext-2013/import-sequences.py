"""MEXT 2013, printed 148 to 152: renraku-henka, the linked and varied techniques.

Run once. Emits a perspective for every pair this reference already documents
as a sequence, and a backlog entry for every pair it does not, because a
sequence record is canonical content and this source reaches us as machine
translation nobody has reviewed. What the source DOES give for every pair is
the defensive reaction that opens the second technique, which is exactly the
thing AGENTS.md says a sequence must name and the hardest part to write.
"""
import json, os, re, sys

PACK = os.path.expanduser("~/Downloads/Japan Judo docs/mext-2013-source-pack/pages.jsonl")
OUT = sys.argv[1]
FIRST, LAST = 'mext-2013/1333611_10/p008', 'mext-2013/1333611_10/p012'

# Which section of the chapter each page carries, and therefore what kind of
# relationship its pairs are. The book groups them; nothing is inferred from
# the technique names.
GROUP = {
    '148': ('combination', 'Linking nage-waza, applied in the same direction'),
    '149': ('combination', 'Linking nage-waza, applied in different directions'),
    '150': ('counter', 'Varying nage-waza: countering the opponent'),
    '151': ('katame-link', 'Linking katame-waza'),
    '152': ('transition', 'Linking from nage-waza into katame-waza'),
}

# Page 151 carries two sections, and they are different relationships between
# the same pairs of holds: (3) links from your own hold into another when uke
# reacts, (4) escapes uke's hold into one of your own. Reading both as "katame"
# would file two different things under one name.
SUBSECTION = {
    'Varying katame-waza': ('katame-counter', 'Varying katame-waza: escaping into your own hold'),
}

def tidy(text):
    t = re.sub(r'\s*[—―]\s*', ': ', text)
    return re.sub(r'\s+', ' ', t).strip()

def slugify(name):
    n = name.strip().lower()
    n = re.sub(r'\s*\([^)]*\)', '', n)          # drop the English gloss
    n = n.replace('ō', 'o').replace('ū', 'u')
    n = re.sub(r"^(opponent's|your own|the opponent's)\s+", '', n)
    n = re.sub(r'[^a-z0-9]+', '-', n).strip('-')
    return n

def main():
    recs = [json.loads(l) for l in open(PACK)]
    ids = [r['record_id'] for r in recs]
    pages = recs[ids.index(FIRST):ids.index(LAST) + 1]

    pairs = []
    for r in pages:
        page = r['printed_page']
        kind, groupLabel = GROUP[page]
        current = None
        for raw in (r.get('text_en_markdown') or '').split('\n'):
            line = raw.strip()
            if not line:
                continue
            sub = re.match(r'^#{2,4}\s*\(\d\)\s*(.+?)\s*$', line)
            if sub:
                for key, value in SUBSECTION.items():
                    if sub.group(1).startswith(key):
                        kind, groupLabel = value
                continue
            m = re.match(r'^[①-⑳]\s*(.+?)\s*$', line)
            if m and '→' in m.group(1):
                title = m.group(1)
                # The counters are written "Countering the opponent's X
                # (opponent's X -> Y)": the pair is inside the parentheses and
                # the words before them are a restatement, so splitting the
                # whole line on the arrow takes the restatement as the first
                # technique.
                inner = re.search(r'\(([^()]*→[^()]*)\)', title)
                if inner:
                    title = inner.group(1)
                left, right = [part.strip() for part in title.split('→', 1)]
                current = {
                    'kind': kind, 'group': groupLabel,
                    'fromName': tidy(left), 'toName': tidy(right),
                    'from': slugify(left), 'to': slugify(right),
                    'trigger': None, 'ukemi': None, 'note': None,
                    'recordId': r['record_id'], 'printedPage': page,
                }
                pairs.append(current)
                continue
            if not current:
                continue
            body = re.sub(r'^>\s*', '', line).replace('**', '').strip()
            if body.startswith('[') or not body:
                continue
            if body.lower().startswith("uke's cooperation:"):
                current['trigger'] = tidy(body.split(':', 1)[1])
            elif body.lower().startswith('how to take the breakfall:'):
                current['ukemi'] = tidy(body.split(':', 1)[1])
            elif body.lower().startswith('(note)'):
                current['note'] = tidy(body)
            elif body.startswith('Tori ') or body.startswith('When uke') or body.startswith('After throwing'):
                current['summary'] = tidy(body)
    json.dump(pairs, open(OUT, 'w'), ensure_ascii=False, indent=2)
    print(f'{len(pairs)} pairs')
    for p in pairs:
        print(f"  p{p['printedPage']} [{p['kind']:11}] {p['from']} -> {p['to']}")
        if p.get('summary'): print(f"        {p['summary'][:96]}")

main()
