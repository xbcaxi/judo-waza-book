# The spoken names

244 files, one per row of the pronunciation sheet, served from `/images/audio/`
on the site.

**These are synthesised, not recorded.** Azure AI Speech, voice
`ja-JP-NaokiNeural`, generated 2026-08-30, at `ogg-24khz-16bit-mono-opus`. A
listener deserves to know they are hearing a machine, and a future contributor
deserves to know these are replaceable: `docs/voiceover-brief.md` is the brief
for commissioning a human recording, which remains the better answer and can
replace these file by file.

`SOURCE.tsv` records exactly what was fed to the engine for each file, so a
spot-check is reading a record rather than guessing.

## What they were made from

243 of the 244 were given a stated reading in kana rather than the kanji. That
matters more than it sounds: fed 十字固 the analyser does not apply the rendaku
and says *juji-katame*, and fed 投の形 it can say *tō no katachi*. Every reading
is established in `reference/japanese-readings.json`, which records for each one
whether it was looked up, composed from parts that were, or taken from this
book's own romaji.

Fifteen names carry an 80 ms break at the morpheme boundary, because kana alone
cannot separate ko-uchi from kōchi. They are the ones to listen to first.

## Known soft spots

Two readings are marked NEEDS CONFIRMING and their audio inherits that:
Shinmeisho no waza and Seiryoku-Zenyo-Kokumin-Taiiku, both long vowels the
romaji does not mark.

One file, `glossary/name-migi-hidari`, is still made from kanji because the
glossary entry holds two words in one term, 右・左. It wants splitting in the
glossary rather than a reading.

Nothing on the site plays these yet. A player is the next piece of work.
