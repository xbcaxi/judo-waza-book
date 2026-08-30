# Asking a Japanese speaker to annotate the names

The sibling of `voiceover-brief.md`. That one commissions a RECORDING; this one
commissions ANNOTATION, and they remain separate jobs that can go to separate
people. Neither replaces the other: a respelling serves the reader scanning a
syllabus on paper, and a recording serves the one who wants to hear it.

The shareable version, formatted for sending to a stranger, is an Artifact, and
it carries BOTH asks on one page as Part A and Part B, because one person doing
both is the better outcome and a single posting is the way to find them. These
two files stay separate because they are what each half is judged against.
The spreadsheet is not committed: see below.

## What we ask for

Four things per row, matching four columns in the sheet.

1. **Is our reading right?** `y`, or the correct kana. 243 of the 244 names now
   carry a reading, but they were not all established the same way. The sheet
   says which: `looked-up` from a dictionary, `composed` from parts that were,
   `derived` from the romaji, `romaji-is-authority` for a morpheme whose
   standalone dictionary reading differs from the one judo uses. The composed
   and derived ones are marked and are worth checking first.
2. **Pitch accent**, standard Tokyo, in numeral form. This is the thing NO
   synthesiser can be told: neither Google nor Azure accepts an accent for
   Japanese, and accent is exactly what separates ko-uchi from kōchi. It is the
   single most valuable column on the sheet and the reason to commission this
   at all.
3. **An English respelling**, capitals marking stress, in the house style
   `duh-AH-shee-hah-RYE`. For the reader who cannot read kana and will never
   press a play button.
4. **Anything we have wrong.**

## Why we do not derive the respelling ourselves

We tried. A syllable-by-syllable transliteration from kana gets the segments
right and the stress wrong, because Japanese has pitch accent and English has
stress, and there is no rule that converts one to the other. Worse, it flattens
things a speaker knows: `tsukuri` is nearer "tskuri" than "tsu-ku-ri", and no
table of kana says so.

A measured check is on the record: our transliterator, tested against the 110
technique readings we already held, got 22% of them wrong, every failure an
unmarked long vowel. That is why this is a commission and not a script.

## Making the sheet

    npm run pronunciation

writes `wazabook-pronunciation.csv`. The `.xlsx` sent to an annotator is built
from that CSV by hand, with two tabs: the instructions, and 244 rows carrying
seven columns of ours, four empty yellow columns for them, and the file name
each recording must take, which is read from `media/audio/SOURCE.tsv` so that
Part B returns files the site can drop straight in. Match SOURCE.tsv on kana,
stripping the `|` that marks a spoken break, or fifteen boundary names miss.

Neither the CSV nor the sheet is committed: both are derived from the
collections, and a second copy of every Japanese name is a second thing to keep
in step.

## When it comes back

Readings go into `reference/japanese-readings.json` with `how: annotated` and
the annotator named. Accent goes into the same file's `accent` field, which
already exists and is mostly empty. The respelling is new and wants a field of
its own on the record, beside `nameKana`, because it is reader-facing and a
person will want to edit it later.

Nothing goes in unreviewed: a returned sheet is a source like any other, and
where it disagrees with the Kodokan or with a federation's own spelling, say so
in the field rather than picking one.
