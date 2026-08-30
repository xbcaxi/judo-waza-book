# Generating the name audio with Azure AI Speech

The sibling of `docs/pronunciation.md`. Same sheet, same output layout, a
different engine, so the two can be judged by ear instead of by argument.

Read `docs/pronunciation.md` first. Everything it says about the sheet being
derived, about feeding the engine kanji rather than kana, and about a human
recording being the better answer applies here unchanged.

## What Azure adds, and what it does not

It adds a **custom lexicon**: one file binding a written form to a reading,
referenced by every request, so the engine is told what a compound says rather
than working it out. `npm run pronunciation:lexicon` writes one from the sheet.
It also takes SSML on every request, so rate and pitch are available per name.

**It does not fix the fifteen.** That was the reason for trying Azure and it
does not survive contact with the problem. こうち spells both *ko-uchi* and
*kōchi* with the same kana and the same sounds; what separates them is juncture
and accent, and the ja-JP phone set writes neither. So the Azure script uses
the same 80 ms break at the boundary that the Google one does. The two engines
are doing the same thing there, which is what makes comparing them fair.

Where the lexicon earns its keep is the other failure mode: a kanji compound
the analyser reads as the wrong word entirely. Nothing in this sheet is known
to hit that today, which is why the lexicon is optional.

## 1. Set up the Azure side

1. Create a **Speech** resource in the Azure portal.
2. Take the **key** and the **region** from its Keys and Endpoint page. The
   region is the short form, `uksouth`, not "UK South".
3. There is no separate API enable step and no per-API restriction to set, so
   treat the key as a credential in its own right: it is the whole grant.

## 2. Check the cost and the rights, the same two checks as the other engine

The whole job is 621 characters of Japanese across 240 files, so the voice tier
is a quality decision rather than a cost one. Confirm the current figures
yourself: <https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/>

Then the question that matters more. Satisfy yourself that redistributing the
generated audio in a public repository under CC BY-NC-SA is permitted. The
thing to look for is any restriction on redistribution, as against the usual
prohibition on using output to train a competing model, which does not affect
you. If it checks out, record the engine, the voice and the date the way
`imageRef` already demands for images: a listener deserves to know they are
hearing a synthesiser.

## 3. Pick a voice by ear

```
export AZURE_SPEECH_KEY=...
export AZURE_SPEECH_REGION=uksouth
npm run pronunciation:audio:azure -- --voices
```

That asks the service what ja-JP voices exist today rather than trusting a name
written in a script months ago, and prints the styles each one offers.

```
AZURE_SPEECH_VOICE=ja-JP-NanamiNeural \
  npm run pronunciation:audio:azure -- wazabook-pronunciation.csv /tmp/try-azure
```

Generate the same handful on both engines and listen before committing.

## 4. Run it

```
npm run pronunciation
npm run pronunciation:audio:azure
```

Output lands in `media/audio-azure/`, deliberately NOT `media/audio/`, so a run
of one engine never overwrites the other while you are still choosing. Move the
winner to `media/audio/` when you have decided.

`media/audio-azure/SOURCE.tsv` records exactly what was fed to the engine for
each file, so a spot-check is reading a record rather than guessing.

## 5. The optional lexicon

```
npm run pronunciation:lexicon
```

Writes `wazabook-lexicon.xml`, about 11 KB, 110 entries. Host it at a publicly
reachable URI, then:

```
npm run pronunciation:audio:azure -- --lexicon https://example.com/wazabook-lexicon.xml
```

Azure's limits: 100 KB per file, one locale per lexicon, and a change takes up
to fifteen minutes to be picked up because the file is cached by URI.

## 6. Listen to the fifteen

Unchanged from the other engine, and the whole reason a human recording is
still the better answer. They are the ko-uchi and o-uchi families,
O-soto-otoshi, Yama-arashi, Yoko-otoshi, Waza-ari, Waza-ari-awasete-ippon,
Dai-ikkyo, Ushiro Ukemi and Yoko Ukemi.
