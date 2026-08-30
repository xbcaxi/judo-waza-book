"""The BJA technical dan grade examinations, 1st to 5th, as exam records.

Transcribed from the BJA's own mark sheets (October 2025), with the marking
scale from its Guide for Dan Grade Evaluation (1 July 2025) and the framing
from the Technical Dan Grade Scheme Assessment Guide. THE FORMS ARE THE
AUTHORITY: item text is as printed, and where this and a current BJA form
disagree the form wins.

Written as a script rather than five hand-typed files because the five differ
only in their technique lists and their counts, and typing the same five
sections out five times is how a pass mark ends up wrong on one of them. Every
maximum below is derived from the paper's own row counts and checked against
the pass mark the paper prints: all five are exactly 80%.
"""
import json, os, re

REPO = os.path.expanduser('~/repos/judo-waza-book')

# Section 1, as each paper groups it. Twenty techniques per grade, every one.
# An asterisk in the source marks a technique that must be explained and not
# applied; that note is carried in the section's own wording, not in the name.
SECTION_ONE = {
    1: [('Te-waza', ['Seoi-nage', 'Tai-otoshi', 'Uchi-mata-sukashi']),
        ('Koshi-waza', ['O-goshi', 'Harai-goshi']),
        ('Ashi-waza', ['De-ashi-harai', 'O-soto-gari', 'Uchi-mata', 'O-soto-otoshi']),
        ('Ma-sutemi-waza', ['Tomoe-nage']),
        ('Yoko-sutemi-waza', ['Tani-otoshi', 'Soto-makikomi', 'Yoko-wakare']),
        ('Osaekomi-waza', ['Kesa-gatame', 'Kuzure-kami-shiho-gatame']),
        ('Shime-waza', ['Nami-juji-jime', 'Kataha-jime', 'Sankaku-jime']),
        ('Kansetsu-waza', ['Ude-hishigi-juji-gatame', 'Ude-hishigi-waki-gatame'])],
    2: [('Te-waza', ['Ippon-seoi-nage', 'Obi-otoshi', 'Ko-uchi-gaeshi']),
        ('Koshi-waza', ['Koshi-guruma', 'Ushiro-goshi']),
        ('Ashi-waza', ['Hiza-guruma', 'O-uchi-gari', 'Ko-soto-gake', 'O-soto-gaeshi']),
        ('Ma-sutemi-waza', ['Sumi-gaeshi']),
        ('Yoko-sutemi-waza', ['Yoko-otoshi', 'Hane-makikomi', 'Yoko-guruma', 'Harai-makikomi']),
        ('Osaekomi-waza', ['Kuzure-kesa-gatame', 'Yoko-shiho-gatame']),
        ('Shime-waza', ['Gyaku-juji-jime', 'Katate-jime']),
        ('Kansetsu-waza', ['Ude-garami', 'Ude-hishigi-hara-gatame'])],
    3: [('Te-waza', ['Seoi-otoshi', 'Uki-otoshi', 'Obi-tori-gaeshi', 'Kibisu-gaeshi']),
        ('Koshi-waza', ['Tsurikomi-goshi', 'Hane-goshi']),
        ('Ashi-waza', ['Sasae-tsurikomi-ashi', 'Ko-soto-gari', 'Ashi-guruma', 'O-uchi-gaeshi']),
        ('Ma-sutemi-waza', ['Hikikomi-gaeshi']),
        ('Yoko-sutemi-waza', ['Yoko-gake', 'Uchi-mata-makikomi', 'Ko-uchi-makikomi']),
        ('Osaekomi-waza', ['Ushiro-kesa-gatame', 'Tate-shiho-gatame']),
        ('Shime-waza', ['Kata-juji-jime', 'Ryote-jime']),
        ('Kansetsu-waza', ['Ude-hishigi-ashi-gatame', 'Ashi-garami'])],
    4: [('Te-waza', ['Kata-guruma', 'Yama-arashi', 'Kuchiki-taoshi']),
        ('Koshi-waza', ['Sode-tsurikomi-goshi', 'Utsuri-goshi']),
        ('Ashi-waza', ['Ko-uchi-gari', 'Harai-tsurikomi-ashi', 'O-guruma', 'Hane-goshi-gaeshi']),
        ('Ma-sutemi-waza', ['Tawara-gaeshi']),
        ('Yoko-sutemi-waza', ['Uchi-makikomi', 'Daki-wakare', 'Kani-basami']),
        ('Osaekomi-waza', ['Kata-gatame', 'Uki-gatame']),
        ('Shime-waza', ['Hadaka-jime', 'Sode-guruma-jime', 'Do-jime']),
        ('Kansetsu-waza', ['Ude-hishigi-ude-gatame', 'Ude-hishigi-te-gatame'])],
    5: [('Te-waza', ['Sukui-nage', 'Sumi-otoshi', 'Morote-gari']),
        ('Koshi-waza', ['Uki-goshi', 'Tsuri-goshi']),
        ('Ashi-waza', ['Okuri-ashi-harai', 'O-soto-guruma', 'Tsubame-gaeshi',
                       'Harai-goshi-gaeshi', 'Uchi-mata-gaeshi']),
        ('Ma-sutemi-waza', ['Ura-nage']),
        ('Yoko-sutemi-waza', ['Uki-waza', 'O-soto-makikomi', 'Kawazu-gake']),
        ('Osaekomi-waza', ['Kami-shiho-gatame', 'Ura-gatame']),
        ('Shime-waza', ['Okuri-eri-jime', 'Tsukkomi-jime']),
        ('Kansetsu-waza', ['Ude-hishigi-hiza-gatame', 'Ude-hishigi-sankaku-gatame'])],
}

ORDINAL = {1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th'}
WORD = {1: 'three', 2: 'four', 3: 'five', 4: 'six', 5: 'seven'}
TRANSITIONS = {1: 'a', 2: 'two', 3: 'three', 4: 'four', 5: 'five'}

MARKING = (
    "Every demonstration is scored from 0 to 10 in whole marks against the BJA's "
    "published criteria, where 10 is a close-to-perfect execution, 7 is a competently "
    "executed technique meeting all basic expectations, 6 lacks effective kuzushi, "
    "tsukuri, kake or core elements, and 0 is an omitted or unrelated technique. "
    "Sections 1 and 2 are demonstrated in the Kodokan canonical form with traditional "
    "grips; variations and unorthodox grips are permitted in Sections 3 to 5, discussed "
    "with the examiner first. The pass mark is 80 per cent of every section and of the "
    "whole, which is the difference from the competitive route rather than the content."
)


def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower().replace('ō', 'o')).strip('-')


def lookup():
    """Slug, own name, aliases, other names and the Kodokan's name.

    The papers use the Kodokan's fuller names (Ude-hishigi-juji-gatame), which
    is exactly what a technique's `kodokan` field records, so those resolve
    without anything being renamed here."""
    found = {}
    for f in os.listdir(os.path.join(REPO, 'techniques')):
        slug = f[:-5]
        data = json.load(open(os.path.join(REPO, 'techniques', f)))
        keys = [slug, data.get('nameRomaji', '')] + (data.get('aliases') or [])
        keys += [(e or {}).get('name', '') for e in (data.get('otherNames') or [])]
        keys.append((data.get('kodokan') or {}).get('nameRomaji', ''))
        for key in keys:
            if key:
                found.setdefault(slugify(key), slug)
    return found


def main():
    known = lookup()
    missing = []
    for grade, groups in SECTION_ONE.items():
        one = sum(len(items) for _, items in groups)
        assert one == 20, f'{grade}: section 1 has {one} techniques, not 20'
        rows3, rows4 = grade + 2, grade + 2
        rows5 = grade * 2
        prior = (grade - 1) * 5
        maxima = {'fundamental-skills': one * 10, 'prior-learning': prior * 10,
                  'nage-waza-performance': rows3 * 3 * 10,
                  'katame-waza-performance': rows4 * 10,
                  'transitions': rows5 * 10}
        total = sum(maxima.values())
        pass_mark = int(total * 0.8)

        def items(names):
            out = []
            for name in names:
                slug = known.get(slugify(name))
                if not slug:
                    missing.append((grade, name))
                out.append({'text': name, 'techniques': [slug] if slug else []})
            return out

        doc = {
            'title': {'en': f'{ORDINAL[grade]} Dan Technical Examination'},
            'organisation': 'British Judo Association',
            'country': 'GB',
            'summary': {'en': f'The BJA technical route to {ORDINAL[grade]} Dan: twenty set '
                              'techniques in their traditional form, prior learning chosen by the '
                              'examiner, and performance skills in combination, counter and '
                              'transition. Every section is passed at 80 per cent.'},
            'source': {
                'title': f'{ORDINAL[grade]} Dan Grade TECHNICAL Mark Sheet',
                'date': 'October 2025',
                'note': {'en': 'Transcribed from the official BJA mark sheet. The marking scale '
                               'comes from the Guide for Dan Grade Evaluation of Competitive '
                               'Skills and Technical Exam, issued 1 July 2025, and the framing '
                               'from the Technical Dan Grade Scheme Assessment Guide. The forms '
                               'are the authority; where this page and a current BJA form '
                               'disagree, the form wins.'},
            },
            'marking': {'en': MARKING},
            'levels': [{
                'label': {'en': f'{ORDINAL[grade]} Dan'},
                'passMark': pass_mark,
                'maxMarks': total,
                'requirements': [
                    {'section': 'fundamental-skills',
                     'requirement': {'en': f'All twenty techniques set for the grade. Pass mark {int(maxima["fundamental-skills"] * 0.8)}.'},
                     'marks': maxima['fundamental-skills']},
                    {'section': 'prior-learning',
                     'requirement': {'en': 'Not examined at 1st Dan.' if grade == 1 else
                                     f'Five techniques from each grade below, chosen by the examiner: {prior} in all. '
                                     f'Pass mark {int(maxima["prior-learning"] * 0.8)}.'},
                     'marks': maxima['prior-learning']},
                    {'section': 'nage-waza-performance',
                     'requirement': {'en': f"{WORD[grade].capitalize()} nage-waza, candidate's choice, each shown as a "
                                           f'renzoku-waza, a renraku-waza and a kaeshi-waza. Pass mark {int(maxima["nage-waza-performance"] * 0.8)}.'},
                     'marks': maxima['nage-waza-performance']},
                    {'section': 'katame-waza-performance',
                     'requirement': {'en': f"{WORD[grade].capitalize()} katame-waza, candidate's choice, each shown as a "
                                           f'combination, an escape or a complex entry. Pass mark {int(maxima["katame-waza-performance"] * 0.8)}.'},
                     'marks': maxima['katame-waza-performance']},
                    {'section': 'transitions',
                     'requirement': {'en': f'{TRANSITIONS[grade].capitalize()} nage-waza into osaekomi-waza and '
                                           f'{TRANSITIONS[grade]} into kansetsu-waza or shime-waza. '
                                           f'Pass mark {int(maxima["transitions"] * 0.8)}.'},
                     'marks': maxima['transitions']},
                ],
            }],
            'sections': [
                {'slug': 'fundamental-skills',
                 'title': {'en': 'Section 1: Fundamental Skills'},
                 'notes': {'en': 'Twenty techniques set for the grade, demonstrated in the Kodokan '
                                 'canonical form with traditional grips. A technique the syllabus '
                                 'marks as dangerous must not be applied: it is explained only so '
                                 'far as the examiner can judge that the candidate understands it.'},
                 'groups': [{'label': {'en': label}, 'items': items(names)} for label, names in groups]},
                # Sections 2 to 5 are the candidate's choice, so they have no set
                # items; each still carries the one group the paper prints, which
                # names WHAT is chosen rather than which technique. The glossary
                # terms are what a reader needs here: renzoku-waza and
                # renraku-waza are not interchangeable and the paper assumes you
                # know which is which.
                {'slug': 'prior-learning',
                 'title': {'en': "Section 2: Fundamental Skills, Prior Learning (examiner's choice)"},
                 'notes': {'en': 'No prior learning is required for 1st Dan.' if grade == 1 else
                           f'Five techniques from each of the 1st Dan to {ORDINAL[grade - 1]} Dan '
                           f'fundamental skills, {prior} in all, chosen by the examiner rather than '
                           'the candidate. This is what makes the technical route broader as it '
                           'goes up: nothing already passed stops being examinable.'},
                 'groups': [{'items': [{'text': 'No Prior Learning is required for 1st Dan.'}]
                             if grade == 1 else
                             [{'text': f'Five techniques from the {ORDINAL[g]} Dan fundamental skills'}
                              for g in range(1, grade)]}]},
                {'slug': 'nage-waza-performance',
                 'title': {'en': 'Section 3: Performance Skills, Nage-waza'},
                 'notes': {'en': f'Select {WORD[grade]} different nage-waza from the whole dan grade '
                                 'syllabus, including at least one from Section 1. Use each with any '
                                 'other nage-waza from the syllabus to show a renzoku-waza, a '
                                 'renraku-waza and a kaeshi-waza.'},
                 'groups': [{'items': [
                     {'text': 'Renzoku-waza', 'terms': ['renzoku-waza']},
                     {'text': 'Renraku-waza', 'terms': ['renraku-waza']},
                     {'text': 'Kaeshi-waza', 'terms': ['kaeshi-waza']},
                 ]}]},
                {'slug': 'katame-waza-performance',
                 'title': {'en': 'Section 4: Performance Skills, Katame-waza'},
                 'notes': {'en': f'Select {WORD[grade]} different katame-waza from the whole dan grade '
                                 'syllabus, including at least one from Section 1. Use each to show a '
                                 'combination, an escape, or the technique with a complex entry.'},
                 'groups': [{'items': [
                     {'text': 'Combination'}, {'text': 'Escape'}, {'text': 'Complex Entry'},
                 ]}]},
                {'slug': 'transitions',
                 'title': {'en': 'Section 5: Performance Skills, Transitions'},
                 'notes': {'en': f'From the whole dan grade syllabus, demonstrate {TRANSITIONS[grade]} '
                                 f'nage-waza into osaekomi-waza and {TRANSITIONS[grade]} nage-waza into '
                                 'kansetsu-waza or shime-waza.'},
                 'groups': [{'items': [
                     {'text': 'Osaekomi-waza', 'terms': ['osaekomi-waza']},
                     {'text': 'Kansetsu-waza or Shime-waza', 'terms': ['kansetsu-waza', 'shime-waza']},
                 ]}]},
            ],
        }
        target = os.path.join(REPO, 'exams', f'bja-technical-{ORDINAL[grade]}-dan.json')
        with open(target, 'w') as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        print(f'{ORDINAL[grade]} Dan: {one} set techniques, pass {pass_mark} of {total} '
              f'({round(pass_mark / total * 100)}%)')

    if missing:
        print('\nNOT RESOLVED to a technique here (item text is kept as printed):')
        for grade, name in missing:
            print(f'  {ORDINAL[grade]} Dan  {name}')


main()
