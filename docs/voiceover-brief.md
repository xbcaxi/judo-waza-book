# Japanese pronunciation recordings for Waza Book

## What this is

Waza Book is a free, open judo technique reference. Every technique carries its
Japanese name, and we want a native speaker to say each name so a learner can
hear it rather than guess from the romaji. The recordings go on a public
website and in a public content repository.

**244 short recordings. Every one is a single word or a short compound name.**
No sentences, no narration. Total spoken content is under 1,700 characters.

This is HALF a job. The other half is annotation, and the two go together:
`pronunciation-annotation-brief.md` asks for the pitch accent and an English
respelling from the same sheet. Commission both from one person where you can,
because the person who can tell you a name's accent is the person who should be
saying it. They can also be commissioned separately.

## The sheet

`wazabook-pronunciation.csv`, one row per recording. Regenerate it with
`npm run pronunciation`; it is not committed, because it is built from the
collections and would otherwise be a second copy of every Japanese name.

| Column | What it is |
| --- | --- |
| `file` | The exact filename to return, including its folder |
| `romaji` | Roman-letter spelling, for your reference |
| `kanji` | The Japanese written form |
| `kana` | The reading. **Where this is filled in, it is the authority** |
| `ipa`, `accent` | Filled for a handful. Mostly blank, and the annotation half of the job is to fill them |
| `english` | What the word means, for context only. Do not read it |
| `notes` | Read this. See "The one real trap" below |
| `also_used_for` | Ignore. Internal bookkeeping |

**243 of the 244 now carry a reading, so this is no longer a gap to fill but
one to check.** They were not all established the same way, and the sheet says
which for each: taken from a dictionary, composed from parts that were, or
inferred from the romaji. The composed and inferred ones are marked, and if a
reading is wrong we would far rather hear it from you than ship it.

There is one row with no reading at all, `Migi and hidari`, because the glossary
holds two words in one entry. Skip it.

## The one real trap

Kana cannot mark where one word ends and the next begins, so `こうち` is both
**ko-uchi** (two words: small, inner) and a single long `kōchi`. In judo it is
always the first. Fifteen rows are marked `SAY AS TWO PARTS` in `notes` for
this reason.

The clearest example is `Ko-uchi-gari` (小内刈): it is **ko-uchi-gari**, not
`kōchi-gari`. Same for `O-uchi-gari` (大内刈), which is **ō-uchi-gari**.

Where a row is flagged, follow the hyphens in the `romaji` column for the word
boundaries, and the `kanji` column will confirm it. Please do not read these as
long vowels, and please do not over-separate them either: they are one name
said naturally, not three words with pauses.

## How to record

- **Native Japanese speaker.** Standard Tokyo pitch accent.
- **Natural pace**, as you would say the word to a student. Not slow, not
  over-enunciated. One take per word, said once.
- **Mono WAV**, 48 kHz or 44.1 kHz, 16-bit or 24-bit. No MP3.
- **Clean and dry.** No music, no reverb, no compression beyond what you need
  for a consistent level. Light noise reduction is fine.
- **Trim the silence** at both ends to roughly 100 ms.
- **Consistent loudness** across all files. Around -16 LUFS, or peaks near
  -3 dBFS, whichever you work in.
- **Name every file exactly as the `file` column says**, keeping the folder
  structure (`techniques/`, `glossary/`, `classification/`, `skills/`). A
  single zip is perfect.

## What is there already, and why you are replacing it

There is a synthesised set on the site today: Azure's `ja-JP-NaokiNeural`,
generated as a floor rather than an answer. It is honest about what it is on
every page that carries it. Your recordings replace it, name by name or all at
once, and nothing on the site has to change for that to happen: the player
reads whatever files are present.

Two things the machine cannot do, which is the whole reason for commissioning
you. It cannot be told a pitch accent, because no Japanese phone set either
engine accepts will carry one. And it guesses at compounds: fed the kanji for
juji-gatame it says *juji-KATAME*, and fed the kanji for nage-no-kata it can
say *tō no katachi*. Every reading is now stated to stop it doing that, which
is exactly why checking those readings matters.

## Rights, and please read this before accepting

The recordings will be published on a public website and committed to a public
repository under a **Creative Commons BY-NC-SA 4.0** licence. That means anyone
may copy and reuse them non-commercially, with attribution, under the same
licence.

**Please confirm you are happy to grant that before you start.** We cannot use
recordings we are not allowed to redistribute, and we would rather find out
now than after the work is done. We are glad to credit you by name on the site,
or to keep you anonymous, whichever you prefer. Tell us which.

## Questions

Anything unclear, ask before recording rather than guessing. Getting fifteen
names subtly wrong is much more expensive than one message.
<suggestions@wazabook.com> reaches us.
