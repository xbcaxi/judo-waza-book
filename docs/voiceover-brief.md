# Japanese pronunciation recordings for Waza Book

## What this is

Waza Book is a free, open judo technique reference. Every technique carries its
Japanese name, and we want a native speaker to say each name so a learner can
hear it rather than guess from the romaji. The recordings go on a public
website and in a public content repository.

**230 short recordings. Every one is a single word or a short compound name.**
No sentences, no narration. Total spoken content is under 1,600 characters.

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
| `english` | What the word means, for context only. Do not read it |
| `notes` | Read this. See "The one real trap" below |
| `also_used_for` | Ignore. Internal bookkeeping |

110 rows have kana. **120 do not, and that is where you can help us most:**
please fill the `kana` column in for those rows and return the sheet with the
audio. It takes a native speaker seconds per row and it fixes a gap in our
data permanently. If you would rather not, record them anyway from the kanji
and romaji and say so.

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
