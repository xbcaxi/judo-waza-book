"""Take out of the backlog whatever now has a home on a kata record.

Run AFTER import-videos.py. Kept separate from it so that import-videos can be
re-run: it reads the backlog, and a script that pruned its own input could only
ever be run once, which is how fourteen recordings stayed missing through a
"fix" that appeared to work.
"""
import json, os, glob

REPO = os.path.expanduser('~/repos/judo-waza-book')
attached = {v['id'] for f in glob.glob(REPO + '/kata/*.json')
            for v in json.load(open(f))['videos']}
print(f'{len(attached)} video ids are on a kata record')

p = REPO + '/backlog/video-candidates.json'
d = json.load(open(p))
key = None if isinstance(d, list) else next(k for k, v in d.items() if isinstance(v, list))
items = d if key is None else d[key]
kept = [v for v in items if v['id'] not in attached]
print(f'video-candidates: {len(items)} -> {len(kept)}')
if key is None:
    json.dump(kept, open(p, 'w'), ensure_ascii=False, indent=1)
else:
    d[key] = kept
    if 'count' in d:
        d['count'] = len(kept)
    json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)

p = REPO + '/backlog/kodokan-unlinked.json'
d = json.load(open(p))
kept = [v for v in d if v['id'] not in attached]
print(f'kodokan-unlinked: {len(d)} -> {len(kept)}')
json.dump(kept, open(p, 'w'), ensure_ascii=False, indent=1)

p = REPO + '/backlog/rfejyda-kata-videos.json'
if os.path.exists(p):
    d = json.load(open(p))
    left = [v for v in d['links'] if v['id'] not in attached]
    print(f'rfejyda-kata-videos: {len(d["links"])} -> {len(left)}')
    if not left:
        os.remove(p)
        print('  removed: nothing left waiting')
