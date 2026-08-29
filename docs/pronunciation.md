# Generating the name audio with Google Cloud Text-to-Speech

Every technique carries its Japanese name and most people cannot say it from
the romaji. This is how the audio gets made.

Two scripts do the work. `npm run pronunciation` builds the sheet from the
collections; `npm run pronunciation:audio` turns the sheet into audio. The
sheet is gitignored because it is derived: a name is wrong in the technique
file or it is not wrong.

**A human recording is the better answer** and `docs/voiceover-brief.md` is
the brief for commissioning one. What follows is the synthesised floor: good
enough to ship, and replaced file by file as real recordings arrive.

## 1. Set up the Google side

1. Go to <https://console.cloud.google.com> and create a project, or pick one.
2. Enable **Cloud Text-to-Speech API** for it. Search the API library for
   "Text-to-Speech" and press Enable.
3. Attach a **billing account**. The API refuses to run without one even inside
   the free allowance.
4. **APIs & Services → Credentials → Create credentials → API key.**
5. Press **Edit API key** and restrict it: under *API restrictions* choose
   "Restrict key" and tick Cloud Text-to-Speech API only. An unrestricted key
   that leaks is a bill.
6. Copy the key somewhere safe. Do not commit it.

## 2. Check the cost before you run anything

The whole job is **under 1,600 characters of Japanese**, once. Google bills
text-to-speech per character with a monthly free allowance that is several
orders of magnitude larger than this, and the higher-quality voice tiers cost
more per character than the standard ones. Confirm the current figures on the
pricing page rather than taking a number from me:
<https://cloud.google.com/text-to-speech/pricing>

At this size the tier you pick is a quality decision, not a cost one. Use the
best voice available.

## 3. Check you are allowed to publish the output

This matters more than the cost, and it is the same question you already
answer for every image in the repo.

Read the **Service Specific Terms** for Cloud Text-to-Speech
(<https://cloud.google.com/terms/service-terms>) and satisfy yourself that
redistributing the generated audio in a public repository under CC BY-NC-SA is
permitted. The constraint to look for specifically is the standard prohibition
on using synthesised output to train a competing speech model, which does not
affect you, as against any restriction on redistribution, which would.

If it checks out, give the audio a provenance line the way `imageRef` already
demands one, recording that it is machine-generated, by which engine and voice,
and on what date. A listener deserves to know they are hearing a synthesiser,
and a future contributor deserves to know these are replaceable.

## 4. Pick a voice by ear

```
export GOOGLE_TTS_KEY=...
npm run pronunciation:audio -- --voices
```

That asks the API what ja-JP voices exist today rather than trusting a name
written into a script months ago. Generate a handful of names with two or three
candidates and listen before committing to one.

```
GOOGLE_TTS_VOICE=ja-JP-Neural2-B npm run pronunciation:audio -- wazabook-pronunciation.csv /tmp/try
```

## 5. Run it

```
export GOOGLE_TTS_KEY=...
npm run pronunciation
npm run pronunciation:audio
```

You get `media/audio/techniques/*.opus` and the three other folders, plus
`media/audio/SOURCE.tsv` recording exactly what was fed to the engine for each
file. Keep that file: it is how a spot-check becomes reading a record rather
than guessing.

## 6. Listen to fifteen files before trusting any of them

The script feeds the engine **kanji**, not kana, everywhere it can. That is
deliberate: Google's Japanese voices run a morphological analyser, so 小内刈 is
analysed as 小内 + 刈 and comes out *ko-uchi-gari*, where raw こうちがり can
come out *kōchi-gari*.

For the fifteen rows the sheet flags as boundary risks it does not rely on
that, and emits SSML with an 80 ms break at the morpheme boundary. Those
fifteen are the ones to listen to, because they are the ones an engine is
known to get wrong:

```
grep "SAY AS TWO PARTS" wazabook-pronunciation.csv | cut -d, -f1,2
```

If a break of 80 ms sounds clipped, raise it in `inputFor()`. If the engine
already gets a name right from the kanji, remove the flag from that row.

## What this buys you, and what it does not

You get a complete, consistent, offline set of pronunciations with no runtime
key, no per-play cost and no third-party request from the page, which keeps the
privacy position of the site intact. It is a genuine improvement on nothing.

What it does not buy you is pitch accent you can rely on. Japanese pitch accent
distinguishes meaning, and no current engine gets it right consistently on
proper nouns and compounds, which is most of this list. Treat the generated set
as the floor: good enough to ship, and the thing a human recording replaces
file by file as one becomes available, without any change to the site.
