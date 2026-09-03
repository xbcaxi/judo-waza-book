# Contributing

Thank you. This reference improves through small, focused pull requests, and
CI validates every file against the schema mechanically, so review is about
the judo, not the JSON.

Ground rules, then a template for each kind of change.

The quickest way in: every content page on the site ends with "Suggest a
change on GitHub", linking straight to the file that page is built from.
GitHub forks this repository and opens the pull request for you.

## Ground rules

- **One concern per pull request.** A video suggestion, a translation, one
  technique, one scheme. Small PRs merge fast.
- **English (`"en"`) is the required fallback** in every localised field.
  Other languages are welcome in the same PR or a later one.
- **Aliases and other names are different things.** `aliases` is for the
  SAME Japanese name romanised differently ("Tsuri-komi-goshi"); what
  another vocabulary calls the technique goes in `otherNames` with its
  `system` ("armbar" with system `bjj`, "fireman's carry" with system
  `wrestling`) and, where the match is approximate, a note saying how.
  New system slugs (e.g. `sambo`) need no schema change.
- **Romaji slugs are canonical and permanent.** The filename in `techniques/`
  is the identity every grade list and every URL depends on; do not rename
  one. Alternative spellings belong in that technique's `aliases`.
- **Say where facts come from** in the PR description when adding or
  correcting substance: a book, a federation syllabus, a named instructor's
  video. "My club does it differently" is a fine reason for a scheme file,
  not for changing a technique's canonical description.
- **Write for the ear as well as the eye.** Visually impaired judoka are a
  primary audience and screen readers deliver this content; the `described`
  field is their demonstration. Follow the describing-movement style guide
  below.
- **Courtesy is not optional**, here any more than on the mat. The
  [code of conduct](CODE_OF_CONDUCT.md) is the Contributor Covenant, and a
  report goes to <rights@wazabook.com>.
- **Licence:** by contributing you agree your contribution is licensed under
  [CC BY-NC-SA 4.0](LICENSE), like everything here, and that the project may
  publish it under that licence or any later licence the project adopts for
  the whole reference. A contribution to `scripts/**` or `schema/` is licensed
  under [MIT](scripts/LICENSE) instead, which is what covers the code. That second half is not boilerplate: without it, a
  licence change later would need every past contributor's consent, and one
  unreachable contributor freezes the project. You keep the copyright in what
  you write.

Validate locally before pushing, if you like - CI runs exactly this:

```sh
npm ci
npm run validate
```

## Suggest a video (the most wanted PR)

**The short route: paste the link.** Open a
[video suggestion](../../issues/new?template=video-suggestion.yml), say which
technique it demonstrates, and paste the URL exactly as you copied it. A
maintainer turns it into an entry. You are not expected to know, or care,
that the reference stores a video as a platform and an id rather than as a
link.

No GitHub account, or would rather not make one? Email the link and the
technique to <suggestions@wazabook.com> and it reaches the same place. A good
demonstration is worth having however it arrives.

If you would rather send the change yourself, read on - and let the tooling
do the fiddly part:

```
npm run video -- "https://www.youtube.com/watch?v=iUpSu5J-bgw&t=1430s"
```

which prints the entry, timestamp converted and share-tracking stripped, to
paste into the file. Then edit the technique, skill or sequence file and add
it to the `videos` array:

```json
{
  "provider": "kodokan",
  "platform": "youtube",
  "id": "dQw4w9WgXcQ",
  "title": "Uchi-mata",
  "duration": "2:41",
  "role": "basic principles",
  "lang": "ja"
}
```

`provider` is a slug from `video-providers/`; add a file there if yours is new.
`platform` is `youtube` or `vimeo`, and `id` is that platform's own id - the
part after `watch?v=` or `vimeo.com/`, not the whole URL. For one long lesson
chaptered across several techniques, add `"start": 29` (seconds) and link the
moment the technique begins.

Paste a URL into the file by mistake and the validator will not simply refuse
it: it prints the entry you should have written, converted, for you to paste
over the top. The two reasons the URL is not what gets stored: a share link
carries a tracking parameter identifying whoever shared it, and the same
video has half a dozen spellings (`youtu.be/X`, `watch?v=X`, `&list=…`), so
storing the id is what lets us catch the same demonstration listed twice.

Unlisted videos are not accepted, however good they are. The privacy hash in
an unlisted URL is part of its address rather than its identity, there is
nowhere in the schema to keep it, and the link dies for everyone the moment
the owner regenerates it. Ask whoever published it to make it public. `role` is for providers who publish several
videos per technique ("basic principles", "set ups", "competitive
variations"); leave it out otherwise.

Nothing is ever rehosted here: a video plays on its own platform, under that
platform's terms, with the view counting to whoever published it.

Pick videos for clear, correct form over spectacle. Ordering is by provider,
so you do not need to argue about which is best - `"recommended": true`
exists for a genuinely outstanding demonstration and at most one per entry
may carry it.

Two optional flags help readers who cannot see the footage decide whether to
play it: `"captions": true` when the video has human-authored captions (not
auto-generated), and `"spokenInstruction": true` when the audio alone teaches
the technique. Set them only when true; leaving them out means "unknown".

## Suggest a reference page

A page worth READING about a technique - a federation's own reference entry,
a governing body's classification page - goes in the technique's `links`
array, never in `videos`:

```json
{
  "title": "Uchi-mata on the IJF technique reference",
  "url": "https://judo.ijf.org/techniques/Uchi-mata",
  "source": "International Judo Federation"
}
```

`source` is the organisation's plain name, not a provider slug: the bodies
that publish reference pages are not the channels that publish
demonstrations, and a reader ranking providers should not be offered one with
no videos behind it. The whole URL is stored here, because there is no player
to build one for.

Anything with a player belongs in `videos`, whatever it is called.

## Add a video provider

Create `video-providers/<slug>.json`:

```json
{
  "name": "Kodokan",
  "organisation": "Kodokan Judo Institute",
  "homepage": "https://www.kodokanjudoinstitute.org/",
  "about": { "en": "One or two sentences: who they are and what their videos are good for." },
  "order": 1
}
```

`order` is the DEFAULT position in the demonstrations list, and must be
unique - readers reorder providers for themselves, and this is only what they
see before they choose. Add `"requiresAccount": true` if the videos need a
subscription, so the site can warn rather than send someone into a paywall.
A provider with no videos referencing it fails validation: add the videos in
the same pull request.

## Add a glossary term

`glossary/<slug>.json` holds a word and what it means:

```json
{
  "term": "Matte",
  "kanji": "待て",
  "category": "command",
  "meaning": {
    "en": "Wait. The referee stops the contest temporarily; both judoka stop where they are and return to their starting places."
  },
  "guides": ["referee-commands-and-signals"]
}
```

`category` is one of `command`, `scoring`, `etiquette`, `people`,
`kit-and-place`, `training`, `grading`, `classification` or `name-part`.

`name-part` is the group that earns the page: the pieces technique names are
built from (`o-` major, `gaeshi` reversal, `goshi` hip). One of those entries
explains a dozen technique names at once, so add the piece rather than
repeating the explanation in each technique.

Write the meaning the way you would say it to a beginner at the side of the
mat, and add `techniques` or `guides` where the word does its work. A
syllabus item may resolve to a term through `terms`, which is how "What does
matte mean?" finally has somewhere to point.

## Add a channel worth following

`video-channels/<slug>.json` is for a channel a judoka should know about, whether
or not any single video from it is indexed here:

```json
{
  "name": "Neil Adams",
  "url": "https://www.youtube.com/user/NAEffectiveFighting/featured",
  "country": "GB"
}
```

`country` is where the channel is based, as an ISO 3166-1 alpha-2 code, the
same field a grading scheme and an examination carry so that all three speak
one vocabulary; leave it out for an international body. A channel based in
two places picks the one it broadcasts from, because the field holds one
code. Channels are listed, never ranked: ranking a source that never appears
on a technique page would do nothing. If the channel's videos ARE going to be
indexed technique by technique, it is a provider, not a channel.

## Belts, and belts with a stripe

A grade's `beltColor` is the belt itself. Where a scheme marks progress with
a stripe along the belt rather than a new belt each time, add `beltStripe`:

```json
{
  "slug": "1st-kai",
  "label": { "en": "1st Kai" },
  "beltColor": "white",
  "beltStripe": "red"
}
```

That is how JudoScotland's Kai grades work, for children aged 5 to 7: one
white belt, a new colour each grading, and at 9th Kai a red belt with white.
The palette is `white`, `red`, `yellow`, `orange`, `green`, `blue`,
`purple`, `brown`, `black`; `purple` exists only because a Kai grade uses
it, and it is not a belt in any Kyu or Dan progression.

Say how the colour is WORN on the scheme, not the grade, because a club
marks its whole pathway one way:

```json
{ "beltMark": "stripe" }
```

`stripe` runs down the length of the belt, `tab` is coloured tape at the end
of it. Clubs do both, so a scheme that leaves it out is read as a stripe.

Where a pathway is not regulated centrally, say so in `beltNote`, and say it
in one line: what a reader needs is that the colours here may not be the ones
their club uses. Kai is the case in point - the syllabus is the federation's,
the colours are a club's - and its note is the model:

```json
{ "beltNote": { "en": "Kai is not regulated centrally. Your club's colours may differ." } }
```

## Link the material for a whole GRADING

A federation's grading playlist, or its syllabus document, belongs to the
grade rather than to any technique on it. Grades take the same `links` array
techniques do:

```json
{
  "slug": "3rd-mon",
  "label": { "en": "3rd Mon" },
  "links": [
    {
      "title": "Grading videos for 3rd Mon (from 2nd Mon)",
      "url": "https://www.youtube.com/playlist?list=...",
      "source": "British Judo"
    }
  ]
}
```

## Add or improve a translation

Add your language code to the localised fields of a technique - `gloss`,
`about`, `keyPoints` (always all three key points together):

```json
"gloss": { "en": "inner thigh throw", "fr": "projection par l'intérieur de la cuisse" }
```

Scheme files localise the same way (`name`, `description`, grade `label`s).

## Add a technique

Every technique file has the same twenty-five fields, in the same order,
whether or not anyone has filled them in yet. Copy this and change it:

```json
{
  "nameRomaji": "Uchi-mata",
  "nameJa": "内股",
  "nameKana": "うちまた",
  "aliases": [],
  "otherNames": [],
  "gloss": { "en": "inner thigh throw" },
  "category": "nage-waza",
  "subCategory": "tachi-waza",
  "wazaType": "ashi-waza",
  "gokyoSet": 2,
  "kodokanNumber": 309,
  "kodokanAbbr": "UMA",
  "kodokan": null,
  "banned": "no",
  "bannedNote": null,
  "videos": [],
  "ijfAnimation": "Uchi-mata",
  "links": [],
  "image": null,
  "about": { "en": "One or two sentences: what the technique actually is." },
  "keyPoints": { "en": ["First point", "Second point", "Third point"] },
  "described": { "en": ["First step of the movement.", "Second step.", "The landing, always last."] },
  "receiving": { "en": "What the technique feels like to receive, and how to land." },
  "viNotes": null,
  "resolver": null
}
```

**Nothing is left out.** A field nobody has written yet is `null`, or `[]`
where it is a list - never missing. That is the one rule that makes the rest
of this file worth reading: a technique record shows you what a complete
technique looks like *and* what this one is still short of, so a reader can
see the gap and a contributor knows exactly where their addition goes. The
validator prints the totals on every run ("image unwritten on 43 of 110
techniques"), and holds the field order, so a run of `npm run validate`
tells you both that your file is right and what is still missing everywhere
else. Only `gloss`, `about` and `keyPoints` can never be null: a technique
nobody can describe in a sentence is not yet an entry.

`nameKana` is the name in hiragana, which is how it is actually said. Judo
romanisation drops vowel length, so the romaji cannot tell you that o-soto is
おおそと with a long "oo" or that juji is じゅうじ, and the kanji is a reading
a machine has to guess at. Write the kana that matches this file's own
`nameRomaji`. Kana cannot mark a morpheme boundary, so こうち is both ko-uchi
and the long kouchi; the four ko-uchi techniques are the only names here
where that bites, and anything reading them aloud should say them part by
part.

`ijfAnimation` is the technique's name **in the IJF's spelling**, where the
IJF publishes an animation of it: the page is
`judo.ijf.org/techniques/<name>/animation`. Their spelling rather than ours,
because the two sometimes differ (`Kibishu-gaeshi`, `Kata-Guruma`) and it is
their address to get right. It is `null` for most techniques, because the IJF
animates 42 of the 99 they list, and that null is not a gap anyone can fill.
It is kept out of `videos` deliberately: that list is demonstrations a reader
ranks and chooses between, and one federation's animation is a different kind
of thing.

**Saying the names out loud.** `nameKana` is the reading, and it is what
anything speaking a name should use rather than the romaji: kana gets the
rendaku and the gemination right where a letter-by-letter reading does not.
It cannot mark a morpheme boundary, though, so `こうち` is both **ko-uchi**
and a long `kōchi`, and in judo it is always the first. Follow the hyphens in
the romaji for the boundaries. See `docs/pronunciation.md`.

**The classification is recorded at every level.** `category`, `subCategory`
and `wazaType` are the Kodokan tree, root to leaf, and a technique names its
position on all three rather than leaving a parent to be inferred:

```
nage-waza     tachi-waza      te-waza, koshi-waza, ashi-waza
              sutemi-waza     ma-sutemi-waza, yoko-sutemi-waza
katame-waza   osaekomi-waza, shime-waza, kansetsu-waza
atemi-waza    ude-ate, ashi-ate
```

So uchi-mata is `nage-waza` / `tachi-waza` / `ashi-waza`, and kesa-gatame is
`katame-waza` / `osaekomi-waza` / `null`. Only nage-waza has a third level,
which is why `wazaType` is null on everything else: that null records a level
the classification does not have, not a gap anyone can fill. The validator
checks the whole route, so a technique filed under a parent it does not
belong to fails with the reason.

`gokyoSet` is 1-5 for throws of the Gokyo no Waza and `null` otherwise.
Exactly three key points per language: the discipline is the feature. `banned` is `"no"` on almost
everything; see [Banned techniques](#banned-techniques) before setting it.

`kodokanNumber` and `kodokanAbbr` are the technique's place in the Kodokan
classification, taken from the IJF/Kodokan list: `309` and `"UMA"` for
uchi-mata. They travel together and are both `null` for anything outside the
hundred techniques the Kodokan recognises. Do not invent either: the source
document itself prints `OUG` against both o-uchi-gari and o-uchi-gaeshi, and
`KSG` against both ko-soto-gari and kami-shiho-gatame, so abbreviations are
not unique and are not treated as such.

### The resolver tag

`resolver` is how the site's "What was that technique?" page finds a
technique from a spectator's description, and it records only what a
non-judoka can SEE: which way somebody fell, what did the lifting, where the
attacker was. It never records how a technique is classified or performed;
the classification fields already do that.

Which of its fields apply depends on the branch, and the validator holds the
pairing: a throw sets `fall` and `mechanism`; a hold sets `groundPosition`; a
strangle sets `groundPosition` and `strangleUses`; a lock sets `lock`.
Everything else stays null. `mechanism` is the dominant visual impression
rather than the biomechanical truth - hane-goshi is a hip technique that
reads as a springing leg, and the field records the reading. `counter` is
true where the thrown judoka is the one who attacked first.

`cue` is the one line shown beside the name, written for somebody who has
never trained, and `confusableWith` lists the techniques a spectator
genuinely cannot tell this one from at full speed. The relation is symmetric
and the validator checks both directions: if you add B to A's list, add A to
B's. The enum values live in `schema/technique.schema.json`.

### Filling a gap

Filling one in is the smallest useful pull request there is, and you do not
have to fill in the rest:

- change one `null` to real content, in one file, and open the PR;
- `image` is the exception - it is metadata for a file, so see
  [Technique images](#technique-images);
- **counters and combinations are not fields.** A throw with nothing to
  counter it is not missing a line in its own file: it is missing a file in
  `sequences/`, because a counter belongs to both techniques equally and is
  described once, not twice. If you know the counter to a throw whose page
  shows none, see [Add a combination, counter, transition or
  chain](#add-a-combination-counter-transition-or-chain). The validator
  counts those gaps too, from the other end.

## Describing movement (the style guide)

The `described` steps are the demonstration for a reader who may never see
the video, delivered by their screen reader. Consistency is itself an
accessibility feature, so every narration follows the same conventions:

- **Address the thrower as "you"; the other judoka is "your partner".**
  Never tori/uke inside `described` (they are fine in `about`).
- **Standard right-handed form**, stated nowhere and assumed everywhere; a
  left-handed reader mirrors it. Name sides explicitly every time: "your
  right foot", "their left lapel", never "the other foot".
- **Body-relative directions only.** "Past your left hip", "towards their
  right rear corner", "below their belt line". Never distances in units,
  never compass or stage directions, never "as shown" or "like this".
- **One discrete action per step**, in the order the body performs them. A
  reader should be able to stop after any step and be in a stable, nameable
  position. Four to seven steps is the useful range.
- **Grips first, landing last.** Step one establishes the grips; the final
  step always says where the receiving judoka lands and what supports their
  fall (usually "keep the sleeve").
- **Touch is the vocabulary.** Describe contact and pressure ("the back of
  your thigh brushes theirs", "feel their belt line above yours") rather
  than appearance.
- **`receiving`** narrates the same technique from the other side: the cue
  that the throw is coming, which arm is held, which side to land on, when
  to slap. Safety-critical for someone who cannot preview the fall by
  watching it.
- **`viNotes`** is coaching for visually impaired judoka specifically: how
  the technique changes from the gripped-up start used in VI judo contests,
  and the touch or balance cues that replace visual ones. Write it only from
  real knowledge, and expect VI judoka and coaches to have the last word in
  review.

`techniques/o-goshi.json`, `techniques/uchi-mata.json` and
`techniques/kesa-gatame.json` carry all three fields and are the models.

Sequences carry the same three, under the same rules. There, `described`
runs the pair as one movement and names the reaction that joins them, and
`receiving` is addressed to whoever lands: in a counter, that is the judoka
whose own attack was answered, and saying so ("you are the one attacking
here") is what makes the note usable. `viNotes` says how the switch between
the two techniques is read from contact, since that is what a sequence
gives a visually impaired judoka that a single technique does not.

"Watch", "see" and "look" are ordinary English and blind and partially
sighted judoka use them; there is no need to write around them. What does
not work is `watch` as a method - "watch their foot as they step" tells a
reader to use a channel they may not have - so name the real one instead:
felt through the sleeve, through the mat, at the belt line.

### Voice

A 2026 language audit of the rendered site found the prose strong but
over-consistent: the same mannerisms repeating across unrelated entries
until the voice felt engineered. These rules keep them out. They apply to
every prose field here, and the site repository's `docs/editorial-style.md`
carries the same rules for its side.

- **Name the judoka, the body part, the action.** Techniques do not
  "live", "wait" or "ask". Keep a metaphor only when it improves the
  physical picture more than literal wording would.
- **Reaction, then opening, once.** In a sequence, describe the weight or
  position change the first technique causes and the opening it creates,
  in one place. Vary the sentence shape between entries; never "exactly
  there".
- **Contrast only against a real misconception.** "Not X but Y" earns its
  place when the reader plausibly believes X; otherwise state Y directly.
- **One sentence per job.** The action or result takes one sentence, the
  qualification a second. Semicolons only where the clauses are genuinely
  parallel.
- **Each field has one job.** `about` defines, `described` executes,
  `receiving` gives uke's sensation and safety, `viNotes` the distinct
  non-visual cue. When two fields narrate the same action, delete the
  restatement.
- **End on the instruction or the fact.** No closing flourish ("the throw
  is yours") unless it changes what the reader should do next.
- **Safety is stop condition, action, consequence.** Plainly, once: what
  to feel for, what to do, what happens otherwise. No all caps (the
  validator rejects shouting in prose), no reading of motives. Medical and
  rules wording gets review by a qualified subject expert.

## Add a skill

Not everything a grading examines has a technique name. Breakfalls,
gripping, escapes from a hold and turnovers are taught and examined exactly
like techniques, and they live in `skills/<slug>.json`:

```json
{
  "name": { "en": "Kesa-gatame bridge-and-roll escape" },
  "nameRomaji": "Ushiro Ukemi",
  "nameJa": "後受身",
  "kind": "escape",
  "techniques": ["kesa-gatame"],
  "about": { "en": "One or two sentences: what the skill is and when it applies." },
  "keyPoints": { "en": ["First point", "Second point", "Third point"] },
  "described": { "en": ["First step.", "Second step.", "The finish, always last."] },
  "receiving": { "en": "Optional: what it feels like from the other side." },
  "videos": []
}
```

`kind` is `ukemi`, `kumi-kata`, `escape` or `turnover`. `nameRomaji` and
`nameJa` are for skills judo names in Japanese; leave them out for ones it
names only in English ("bridge-and-roll escape"). `techniques` lists the
techniques the skill is performed against or arrives in. `described` is
REQUIRED on a skill: a skill with no narration is exactly the gap this
collection exists to close.

## Add a combination, counter, transition or chain

Create `sequences/<slug>.json`. `techniques` are existing technique slugs in
order; for a counter, the FIRST is the attack and the last is the answer.
Display names are derived from the technique names, so there is no name
field to keep in step. Pick the `kind` by what the techniques are, which the
validator checks:

| kind | what it is |
| --- | --- |
| `combination` | one throw into another (renraku/renzoku-waza) |
| `counter` | an attack answered with a throw of your own (kaeshi-waza) |
| `transition` | a throw finished on the ground: standing into a hold, strangle or lock |
| `chain` | one groundwork control into the next, no standing phase |

```json
{
  "kind": "combination",
  "techniques": ["o-uchi-gari", "tai-otoshi"],
  "about": { "en": "One or two sentences: why this pair works." },
  "described": { "en": ["First step of the whole sequence.", "Second step.", "The landing, always last."] },
  "receiving": { "en": "The reaction the first technique draws out, the moment it changes, and how to land." },
  "viNotes": { "en": "How the sequence reads from contact, and what changes in VI judo." },
  "videos": []
}
```

A sequence carries the same seven fields in that order, whether or not
anyone has written them yet, exactly as a technique carries its twenty-five:
`described`, `receiving` and `viNotes` are `null` when unwritten, never
missing, and they follow the same conventions as they do on a technique
(see [Describing movement](#describing-movement-the-style-guide)). On a
sequence, `described` narrates the whole thing as one movement, from the
first attack through the reaction to the landing, and `receiving` belongs
to whoever ends up on the mat: for a counter that is the judoka whose
attack was answered, so it is written to the one who attacked.

Name the file after what it does, the way the existing ones are:
`o-uchi-gari-into-tai-otoshi.json`,
`de-ashi-harai-countered-by-ko-uchi-gari.json`.

**This is how a throw gets its counters.** Technique pages show the counters
and combinations that name them, which is why a throw with none shows an
empty section: nobody has written the file yet, and nearly half the throws in
the reference are still in that position. If you know one - your club's
answer to uchi-mata, the combination your coach drills - it is one small
file, and the three narrated fields may all start as `null`, so an `about`
that explains why the pair works is already a complete contribution.
`npm run validate` will tell you which throws are waiting, and counts the
unwritten narrations on the sequences that do exist.

## Add a guide

Create `guides/<slug>.json` with category `essentials`, `refereeing` or
`rules`. Sections carry prose, steps, or both; steps follow the same
write-for-the-ear conventions as technique narrations. Rules content must
defer to the federation rulebook as the authority and say so.

```json
{
  "category": "essentials",
  "title": { "en": "Tying your belt" },
  "summary": { "en": "One or two sentences for listings." },
  "sections": [
    { "heading": { "en": "Step by step" }, "steps": { "en": ["First step.", "Second step."] } },
    { "prose": { "en": "A prose section." } }
  ]
}
```

## Add an examination

Create `exams/<slug>.json` for a real grading examination, transcribed from
the federation's own form. Two rules keep it honest:

- **The printed text is the authority.** Each item's `text` stays exactly as
  the form prints it, hyphenation and all. The `techniques` array alongside
  is our resolved cross-reference; leave it empty when the printed wording is
  ambiguous or names something the book does not yet document, rather than
  guessing.
- **Hyphenation differences can be different techniques.** O-soto-gari and
  O-soto-gake are not spellings of one another. Before resolving an item to
  a slug, check the technique file (and its `aliases`) actually means the
  same waza; when in doubt, leave the item unresolved and open an issue.

`levels` carries the pass mark, maximum marks and per-section requirements
for each grade the exam covers; `sections` carries the set groupings and
items. Record the source form and its date in `source`. `country` is the
federation's ISO 3166-1 alpha-2 code, exactly as a scheme carries it; an
international body's paper belongs to no one country and leaves it off.
`exams/bja-competitive-dan-grade-skills.json` is the model.

When a federation replaces an examination, the transcription stays: it is
what candidates sat and what older certificates were awarded against.
Mark it `"status": "legacy"` and give it a `statusNote` saying what
replaced it and from when, so a reader landing on the old form is told to
prepare against the new one. An examination still in use carries no
`status` at all.

## Technique images

Illustrations live at `media/techniques/<slug>.webp`, matched to the
technique file by name. The `image` field carries the localised `alt` text
(describe what the illustration shows, for a reader who cannot see it) and,
required, a `provenance` value:

| `provenance` | Use it when |
| --- | --- |
| `own` | You made it and hold the rights, and you are licensing it under the project licence |
| `licensed` | It is used under a licence or permission you can point at - name it in `source` |
| `third-party` | It belongs to someone else and is used pending permission |
| `unknown` | Nobody can establish where it came from |

**Only `own` images are covered by the project licence.** Please contribute
those: original artwork to replace the many `unknown` files inherited by this
project is the single most useful contribution it could receive. If you are
adding anything that is not your own work, say so honestly in `provenance`,
name the owner in `credit` and where you got it in `source`, and expect it to
be removed if the owner asks. Do not upload anything you know the owner would
object to.

The validator checks that every declared `image` has its file and that every
image states its provenance. [NOTICE.md](NOTICE.md) explains the wider
position and the removal process.

## What the validator enforces

`npm run validate` (the same thing CI runs) checks more than the JSON Schema
can express, so a PR that passes locally passes in CI. It also finishes by
printing the gaps - how many techniques have no image, no `viNotes`, no
counter recorded against them - which is the fastest way to find something
worth writing:

- **The canonical technique record.** Every technique file carries all
  twenty-five fields, in the canonical order, with unwritten ones null or
  empty. A missing field, a stray field or a field out of order is an error,
  not a style preference: the format is what lets a reader tell a gap from
  an omission.
- **Classification.** `category`, `subCategory` and `wazaType` must be one
  real route down the Kodokan tree, with `wazaType` null exactly where the
  branch ends; `gokyoSet` is null on anything that is not a throw.
- **Banned techniques.** `banned` and `bannedNote` travel together in both
  directions, and a technique banned outright carries no `described` steps
  (see below).
- **Kodokan classification.** `kodokanNumber` and `kodokanAbbr` are both set
  or both null, no number is used twice, and a number agrees with the whole
  classification path the file already records.
- **References.** Every technique slug, sequence id and skill id named by a
  syllabus or exam item exists; a sequence's `kind` matches what its
  techniques actually are; whatever a grade's syllabus resolves also appears in that
  grade's `techniqueSlugs`, which is what drives reader progress.
- **Marks.** An exam's pass mark cannot exceed its maximum, its requirements
  must name real sections, and stated section marks must sum to the total.
- **Replaced examinations.** `"status": "legacy"` and `statusNote` travel
  together, in both directions: an old form must say what replaced it, and
  nothing else may carry the note.
- **Uniqueness.** Grade slugs within a scheme, syllabus section slugs within
  a grade, and technique slugs within a grade list.
- **Media.** Anything declaring an `image` or a poster has the file beside
  it, a third-party image names its owner in `credit`, and a licensed one
  points at the permission in `source`: NOTICE.md's removal promise needs
  something to act on.
- **Links.** A reference link is an absolute http(s) URL and is listed once
  per technique.
- **Language keys.** Localised text is keyed by BCP 47 tag: `fr`, `pt-BR`.
  `"english"` or `"EN"` would validate against the schema and then silently
  never render, so the lint rejects it.

Two conventions worth knowing, both taken from the schema itself:

- **Techniques are the exception to the usual JSON habit**: nothing is
  omitted, ever. Everywhere else - skills, sequences, syllabus and exam
  items - an optional array with a default (an item's `sequences`, a
  skill's `techniques`) is still omitted when empty, and a required array
  (`videos`) is written even when empty.
- `text` on a syllabus or exam item is the federation's wording, verbatim.
  The `techniques`, `sequences`, `skills`, `guides` and `terms` lists beside
  it are our links; leaving one
  empty because the wording names something undocumented is correct, and far
  better than resolving it to an approximation.

## Banned techniques

`banned` has three values, because "prohibited" covers two different things.

`"in-competition"` is a technique contest rules bar while judo carries on
teaching, demonstrating and examining it: standing waki-gatame, and the leg
grabs the IJF ruled out. Write these up in full, `described` steps and all,
and use the `bannedNote` to say exactly what the restriction is and where it
does not apply.

`"yes"` is a technique nobody should apply, in contest or out of it:
ashi-garami, kani-basami, do-jime and kawazu-gake. These are documented for
RECOGNITION. Give them `about` and `keyPoints` that help a reader recognise
and referee the technique, a `bannedNote` saying why and where, and
deliberately no `described` steps. The validator insists on the note and
refuses the steps.

Everything else is `"no"`, and then `bannedNote` must be `null`.

### What the referee does about it: `contest`

`banned` and `bannedNote` answer whether judo applies the technique and why not.
They are not the place to say what a referee gives for it, because those are
different questions that change on different timetables: the technique is the
same one it was in 1935, and the penalty for it changes with the Olympic cycle.
`contest` carries the referee's answer, and is `null` on most techniques.

    "contest": {
      "status": "penalised",
      "note": { "en": "The hand at the heel counts as a leg grab and draws a shido." },
      "sourceId": "ijf-sor-2026",
      "articles": ["18.1.2"]
    }

`status` is `"penalised"` where applying the technique draws a shido,
`"prohibited"` where it draws a direct hansoku-make, and `"conditional"` where
what the referee gives depends on the form, the position or the age group -
standing waki-gatame, which is a shido or a hansoku-make according to the risk,
or uchi-mata, which is entirely legal until somebody dives onto their head. Say
which in the `note`.

Three rules for the note. Write it in this book's own voice: a rulebook is
somebody else's copyright and nothing from one is transcribed here. Lead with
what is legal where most of the technique is - "the throw is legal and scores"
before the exception. And say the rule, not your opinion of it.

`sourceId` names a record in `reference/` and `articles` gives that rulebook's
own article numbers, so a reader can check the claim and a new edition is one
file to replace. The validator refuses a `sourceId` no reference record
declares. If you are citing a rulebook that has no record yet, add one first,
modelled on `reference/ijf-sor-2026.json`.

Do not write a rule down without its edition. Every wrong statement this
reference has carried about competition was once correct.

## Add an organisation's perspective on a technique or an examination

A national body, affiliate or club can say its own piece on a technique -
what its examiners look for, how it teaches the entry, its local safety
rules, what it calls things - or on an examination it owns, without
touching the canonical record. Readers see it only when they opt into that
organisation's view on the site, badged as the organisation's voice;
nothing changes for anyone else.

First the organisation, once, in `organisations/<slug>.json`:

```json
{
  "name": "British Judo Association",
  "kind": "national-body",
  "country": "GB",
  "homepage": "https://www.britishjudo.org.uk/",
  "about": { "en": "One or two sentences: who this organisation is." },
  "schemes": ["bja-mon", "bja-competitive-dan"],
  "exams": ["bja-competitive-1st-dan", "bja-kata-certification"]
}
```

`kind` is `national-body`, `affiliate` or `club`, and `parent` chains them
upward: an affiliate must name its national body (JudoScotland under the
British Judo Association), a club may name its national body or its
affiliate, and a national body stands alone. The kinds are structural, not
display wording - the BJA calls its affiliates the home nations, and the
site shows whatever the organisation itself says. The chain is what everything
derives from - a reader's country comes from the top of it, and opting into
an organisation stacks the perspectives along it. `schemes` and `exams`
list what the organisation owns; ownership means it published the document
transcribed here, and the validator checks each claim against the scheme's
or exam's own `organisation` string, both ways round - an exam whose
organisation has a file must be claimed by it.

Then one file per subject, filed by what it speaks about:
`perspectives/<org>/techniques/<technique-slug>.json` or
`perspectives/<org>/exams/<exam-slug>.json` (schemes are the expected next
kind, once the site renders them):

```json
{
  "sections": [
    {
      "kind": "examining",
      "prose": { "en": "What this organisation's examiners look for, in its own words." }
    },
    {
      "kind": "coaching",
      "steps": { "en": ["First point of the club's teaching entry.", "Second point."] }
    }
  ],
  "videos": [],
  "links": []
}
```

`kind` places and labels the section: `examining`, `coaching`, `safety`,
`terminology` or `context`. Each section carries `prose`, `steps` or both,
localised like everything else; `videos` and `links` follow the same rules
as on techniques (a video is a platform and an id, its provider must exist).

Four rules keep this honest:

- **Add, never override.** A perspective has nowhere to put a replacement
  description, by design. If your organisation believes the canonical
  record is wrong, open a pull request against the technique file, where
  the fix reaches everyone.
- **The banned rule inherits.** A technique documented for recognition only
  (`"banned": "yes"`) takes no step-by-step instruction from anyone,
  perspectives included; the validator refuses it.
- **Anyone may speak on a technique; only the family may speak on an
  exam.** A technique is canonical and org-neutral. An exam is one
  organisation's document, so a perspective on it is accepted only from
  that organisation or a body beneath it - its affiliates and their clubs.
  This is the home for "how to prepare for this examination": the exam
  file itself is a verbatim transcription and deliberately has no field
  for guidance.
- **Whose voice it is stays accountable.** Perspectives merge with the
  organisation's sign-off: once an organisation takes ownership, a
  `CODEOWNERS` rule for `perspectives/<org>/` names its editors as the
  required reviewers. Contributions are licensed CC BY-NC-SA 4.0 like
  everything here - agree that inside your organisation before the first
  file lands.

## Add a grading scheme

Create `grading-schemes/<scheme-id>.json` for your federation's progression:

```json
{
  "name": { "en": "Mon grades" },
  "organisation": "British Judo Association",
  "country": "GB",
  "description": { "en": "One sentence on who grades through this scheme." },
  "grades": [
    {
      "slug": "10th-mon",
      "label": { "en": "10th Mon" },
      "beltColor": "green",
      "techniqueSlugs": ["ashi-guruma", "yoko-otoshi", "tomoe-nage"]
    }
  ]
}
```

Array order is progression order. `beltColor` is one of: white, red, yellow,
orange, green, blue, brown, black. Every slug in `techniqueSlugs` must exist
in `techniques/` - the validator names any that do not. Base the lists on a
published syllabus and cite it in the PR.

When you have the official syllabus document itself, transcribe it: the
scheme takes a `source` (the document's own title and date) and an optional
`order` (display position among schemes, lower first); each grade can carry
a `syllabus` - sections of items whose `text` stays exactly as printed, with
the technique slugs it resolves to alongside, exactly as exam items work.
Skills that are not a single technique (breakfalls, escapes, turnovers,
grips, randori) are items with no resolved slugs; `techniqueSlugs` then
lists every slug the syllabus resolves, since it drives reader progress
tracking. A grade's pictorial sheet goes at
`media/grading-schemes/<scheme-id>/<grade-slug>.webp` with an `image` field (alt
text plus credit) on the grade; scheme-wide summary posters go in the same
directory, declared under `posters`. The same licensing rule as technique
images applies: only contribute what can carry the repository licence, and
always credit the source. `grading-schemes/bja-mon.json` is the model.
