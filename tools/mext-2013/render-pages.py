"""Render every MEXT page this reference cites, once, into the content repo.

110 dpi. Measured rather than guessed: at that size a page is about 910x1290
and 120 KB, and the photo sequences and the coloured callouts are legible,
which is the whole reason for showing the page at all.
"""
import json, glob, os, subprocess, sys, collections

REPO = os.path.expanduser('~/repos/judo-waza-book')
PDFS = os.path.expanduser('~/Downloads/Japan Judo docs')
PACK = os.path.join(PDFS, 'mext-2013-source-pack/pages.jsonl')
OUT = os.path.join(REPO, 'media/mext-2013')

pack = {json.loads(l)['record_id']: json.loads(l) for l in open(PACK)}

cited = collections.OrderedDict()
for path in sorted(glob.glob(REPO + '/perspectives/mext/*/*.json')):
    for page in json.load(open(path)).get('sourcePages', []):
        cited.setdefault(page['recordId'], None)

os.makedirs(OUT, exist_ok=True)
byFile = collections.defaultdict(list)
for recordId in cited:
    r = pack[recordId]
    byFile[r['pdf_file']].append(r)

total = 0
for pdf, records in sorted(byFile.items()):
    for r in records:
        name = f"{pdf[:-4]}-p{r['pdf_page']:03d}"
        target = os.path.join(OUT, f'{name}.jpg')
        if os.path.exists(target):
            total += os.path.getsize(target)
            continue
        subprocess.run([
            'pdftoppm', '-f', str(r['pdf_page']), '-l', str(r['pdf_page']),
            '-r', '110', '-jpeg', '-jpegopt', 'quality=72',
            os.path.join(PDFS, pdf), os.path.join(OUT, name),
        ], check=True)
        # pdftoppm appends the page number to the prefix it is given.
        produced = glob.glob(os.path.join(OUT, f'{name}-*.jpg'))
        if len(produced) != 1:
            raise SystemExit(f'{name}: expected one file, got {produced}')
        os.rename(produced[0], target)
        total += os.path.getsize(target)

print(f'{len(cited)} pages rendered into media/mext-2013, {total / 1048576:.1f} MB total')
