"""Give every cited page its PDF locator and its rendered image.

The section that makes a claim already names the page it came from; this adds,
once per page rather than once per claim, what is needed to SHOW that page: the
file and page number inside it, and the image rendered from it. The URL is not
stored here. It is built from reference/mext-2013.json, which is the one place
a moved file has to be corrected.
"""
import json, glob, os

REPO = os.path.expanduser('~/repos/judo-waza-book')
PACK = os.path.expanduser('~/Downloads/Japan Judo docs/mext-2013-source-pack/pages.jsonl')
pack = {json.loads(l)['record_id']: json.loads(l) for l in open(PACK)}

CREDIT = 'Ministry of Education, Culture, Sports, Science and Technology (MEXT), Japan'
touched = missing = 0
for path in sorted(glob.glob(REPO + '/perspectives/mext/*/*.json')):
    doc = json.load(open(path))
    changed = False
    for page in doc.get('sourcePages', []):
        r = pack[page['recordId']]
        name = f"{r['pdf_file'][:-4]}-p{r['pdf_page']:03d}.jpg"
        if not os.path.exists(os.path.join(REPO, 'media/mext-2013', name)):
            missing += 1
            continue
        page['pdfFile'] = r['pdf_file']
        page['pdfPage'] = r['pdf_page']
        page['image'] = {
            'file': f'mext-2013/{name}',
            'alt': {'en': f"Page {r['printed_page']} of the MEXT judo teaching guide, "
                          'in Japanese, with photograph sequences of the technique.'},
            'provenance': 'third-party',
            'credit': CREDIT,
            'source': 'reference/mext-2013.json',
        }
        changed = True
    if changed:
        with open(path, 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2); fh.write('\n')
        touched += 1
print(f'{touched} perspective files given page locators and images; {missing} pages had no image')
