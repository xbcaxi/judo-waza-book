"""The Kodokan's own kata textbooks, as structure only.

WHAT IS TAKEN AND WHAT IS NOT. These textbooks are the Kodokan Judo Institute's
official English translations and carry "All Rights Reserved" with no
permitted-use wording. What is recorded here is the STRUCTURE each one sets
out: the named sets in order, the named items in each in order, and the
adoption or amendment dates printed on its title page. The instructional text
and the several hundred photographs are the Kodokan's expressive work and are
not reproduced; every kata page cites the textbook and sends the reader to it.

The structure below was read off each PDF by hand and checked against its own
"Names of the techniques" listing. It is written out rather than parsed because
seven documents are not worth a fragile parser and because a mis-ordered kata
is a failed grading.

Run once. Its output is content thereafter.
"""
import json, os, re

REPO = os.path.expanduser('~/repos/judo-waza-book')
BASE = 'https://kdkjd.org/wp-content/uploads/'

# slug: (pdf url path, adopted, amended, [(set name, [item names...])])
BOOKS = {
    'nage-no-kata': (
        '2024/07/Kata-textbook-Nage-no-Kata-2nd-20150415.pdf',
        'Adopted on April 10th, 1960', 'Amended on November 1st, 2005', [
            ('Te-waza', ['Uki-otoshi', 'Seoi-nage', 'Kata-guruma']),
            ('Koshi-waza', ['Uki-goshi', 'Harai-goshi', 'Tsurikomi-goshi']),
            ('Ashi-waza', ['Okuri-ashi-harai', 'Sasae-tsurikomi-ashi', 'Uchi-mata']),
            ('Ma-sutemi-waza', ['Tomoe-nage', 'Ura-nage', 'Sumi-gaeshi']),
            ('Yoko-sutemi-waza', ['Yoko-gake', 'Yoko-guruma', 'Uki-waza']),
        ]),
    'katame-no-kata': (
        '2024/10/katame_no_kata.pdf',
        'Adopted on April 10th, 1960', 'Amended on February 1st, 2006', [
            ('Osaekomi-waza', ['Kesa-gatame', 'Kata-gatame', 'Kami-shiho-gatame',
                               'Yoko-shiho-gatame', 'Kuzure-kami-shiho-gatame']),
            ('Shime-waza', ['Kata-juji-jime', 'Hadaka-jime', 'Okuri-eri-jime',
                            'Kataha-jime', 'Gyaku-juji-jime']),
            ('Kansetsu-waza', ['Ude-garami', 'Ude-hishigi-juji-gatame',
                               'Ude-hishigi-ude-gatame', 'Ude-hishigi-hiza-gatame',
                               'Ashi-garami']),
        ]),
    'kime-no-kata': (
        '2024/07/kime_no_kata.pdf',
        'Revised on July 7th, 1977', 'Amended on June 1st, 2006', [
            ('Idori (Set 1)', ['Ryote-dori', 'Tsukkake', 'Suri-age', 'Yoko-uchi',
                               'Ushiro-dori', 'Tsukkomi', 'Kiri-komi', 'Yoko-tsuki']),
            ('Tachiai (Set 2)', ['Ryote-dori', 'Sode-tori', 'Tsukkake', 'Tsuki-age',
                                 'Suri-age', 'Yoko-uchi', 'Ke-age', 'Ushiro-dori',
                                 'Tsukkomi', 'Kiri-komi', 'Nuki-gake', 'Kiri-oroshi']),
        ]),
    'ju-no-kata': (
        '2024/07/ju_no_kata.pdf',
        'Revised on July 7th, 1977', 'Amended on June 1st, 2007', [
            ('Dai-ikkyo (Set 1)', ['Tsuki-dashi', 'Kata-oshi', 'Ryote-dori',
                                   'Kata-mawashi', 'Ago-oshi']),
            ('Dai-nikyo (Set 2)', ['Kiri-oroshi', 'Ryokata-oshi', 'Naname-uchi',
                                   'Katate-dori', 'Katate-age']),
            ('Dai-sankyo (Set 3)', ['Obi-tori', 'Mune-oshi', 'Tsuki-age',
                                    'Uchi-oroshi', 'Ryogan-tsuki']),
        ]),
    'kodokan-goshin-jutsu': (
        '2024/07/goshin_jutsu.pdf', None, None, [
            ('Unarmed section: when held',
             ['Ryote-dori', 'Hidari-eri-dori', 'Migi-eri-dori', 'Kataude-dori',
              'Ushiro-eri-dori', 'Ushiro-jime', 'Kakae-dori']),
            ('Unarmed section: when attacked from a distance',
             ['Naname-uchi', 'Ago-tsuki', 'Ganmen-tsuki', 'Mae-geri', 'Yoko-geri']),
            ('Weapons section: against a dagger',
             ['Tsukkake', 'Choku-tsuki', 'Naname-tsuki']),
            ('Weapons section: against a staff',
             ['Furi-age', 'Furi-oroshi', 'Morote-tsuki']),
            ('Weapons section: against a pistol',
             ['Shomen-zuke', 'Koshi-gamae', 'Haimen-zuke']),
        ]),
    'koshiki-no-kata': (
        '2025/01/Koshiki-no-Kata.pdf',
        'Revised on April 11th, 1990', 'Amended on October 1st, 2008', [
            ('Omote', ['Tai', 'Yume-no-uchi', 'Ryoku-hi', 'Mizu-guruma', 'Mizu-nagare',
                       'Hiki-otoshi', 'Ko-daore', 'Uchi-kudaki', 'Tani-otoshi',
                       'Kuruma-daore', 'Shikoro-dori', 'Shikoro-gaeshi', 'Yu-dachi',
                       'Taki-otoshi']),
            ('Ura', ['Mi-kudaki', 'Kuruma-gaeshi', 'Mizu-iri', 'Ryu-setsu',
                     'Saka-otoshi', 'Yuki-ore', 'Iwa-nami']),
        ]),
    # The five movements are numbered and NOT named: the textbook calls them
    # Ippon-me to Gohon-me and gives no technique name for any of them.
    'itsutsu-no-kata': (
        '2025/01/Itsutsu-no-Kata.pdf',
        'Revised on June 15th, 1992', 'Amended on October 1st, 2008', [
            ('The five movements',
             ['Ippon-me', 'Nihon-me', 'Sanbon-me', 'Yonhon-me', 'Gohon-me']),
        ]),
}

TITLE = 'Kodokan KATA Textbook, official English translation'


def main():
    """Resolve a printed name against the slug, the Kodokan's own name for the
    technique, and its aliases. The Kodokan prints Ude-hishigi-juji-gatame
    where this book leads with Juji-gatame, which is exactly what a technique's
    `kodokan` field exists to record, so a textbook naming its own way should
    still find its way home."""
    slugs = {}
    for f in os.listdir(os.path.join(REPO, 'techniques')):
        slug = f[:-5]
        data = json.load(open(os.path.join(REPO, 'techniques', f)))
        keys = [slug, data.get('nameRomaji', '')]
        keys += data.get('aliases', []) or []
        keys += [(entry or {}).get('name', '') for entry in (data.get('otherNames') or [])]
        kodokan = data.get('kodokan') or {}
        keys.append(kodokan.get('nameRomaji', ''))
        for key in keys:
            if key:
                slugs.setdefault(re.sub(r'[^a-z0-9]+', '-', key.lower()).strip('-'), slug)
    resolved = unresolved = 0
    for slug, (path, adopted, amended, sets) in BOOKS.items():
        target = os.path.join(REPO, 'kata', f'{slug}.json')
        doc = json.load(open(target))
        doc['adopted'] = adopted
        doc['amended'] = amended
        doc['sets'] = []
        for name, items in sets:
            entries = []
            for item in items:
                # The printed name is the authority; the technique is this
                # reference's link into itself, and half of these names are
                # attacks rather than techniques, so no match is normal.
                candidate = re.sub(r'[^a-z0-9]+', '-', item.lower()).strip('-')
                hit = slugs.get(candidate)
                entries.append({'text': item, 'techniques': [hit] if hit else []})
                if hit:
                    resolved += 1
                else:
                    unresolved += 1
            doc['sets'].append({'name': name, 'items': entries})
        doc['source'] = {
            'title': TITLE,
            'date': '2026-08-30',
            'note': {'en': 'Sets and the order of the items within them, as the '
                           'Kodokan’s own textbook lists them. Copyright in that '
                           'textbook is the Kodokan Judo Institute’s and its '
                           'instructions and photographs are not reproduced here.'},
        }
        doc['links'] = [{
            'title': f'{doc["name"]}: the Kodokan’s kata textbook',
            'url': BASE + path,
            'source': 'Kodokan Judo Institute',
        }]
        with open(target, 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        total = sum(len(items) for _, items in sets)
        print(f'{slug:30} {len(sets)} set(s), {total:3} item(s)')
    print(f'\n{resolved} item(s) resolve to a technique here, {unresolved} do not')


main()
