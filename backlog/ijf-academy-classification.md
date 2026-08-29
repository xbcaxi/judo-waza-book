# Reference check: IJF Academy, Classification of Judo and 100 Kodokan Techniques

Source: the IJF Academy Rise 360 course *Classification of Judo and 100
Kodokan Techniques*, held locally as ten Word documents plus a
`coursedata.json` summary. Terminology in it follows the *Kodokan New
Japanese-English Dictionary of Judo* (Kawamura and Daigo, Kodokan, 2000) and
the Kodokan classification list revised 1 April 2017.

This is reference material only. Nothing from it has been copied into the
reference: its descriptions are not used. What follows is what checking
against it found.

The course carries 134 demonstration videos: 25 on the basics, 99 on the
hundred techniques, and 10 hold-down escapes. All ten lesson classification
slides were read.

The course's videos are served from `articulateusercontent.com`, but they are
not the IJF's own footage. The Kodokan channel labels the same series
"KODOKAN × IJF ACADEMY 100 Techniques", so the course is re-hosting Kodokan
recordings we already link on YouTube. That is why the technique coverage
below comes out at 100 per cent: it is the same footage, checked from the
other end.

## 1. Kodokan video coverage of the hundred

All 100 Kodokan-numbered techniques are present in `techniques/`, each with
the number and three-letter abbreviation the course gives, and **every one of
them already carries a `kodokan` provider video**. There is no gap here. The
course itself has one hole the reference does not: it has no video for 709
Sode-guruma-jime, which we cover.

## 2. Videos in the course with no equivalent here

Twenty of the course's 134 videos cover a subject the reference has no video
for. Section 6 records which of the twenty the Kodokan channel can fill.

### 2.1 Movement fundamentals: no record of any kind (12 videos)

These have no technique, skill, guide or sequence file, and in most cases no
glossary term either. `skills/` cannot hold them as it stands: its `kind`
enum is `ukemi`, `kumi-kata`, `escape`, `turnover`, and none of these fits.
Accepting them would mean a new skill kind, or a new guide.

| Course video | What it demonstrates | Nearest thing here |
| --- | --- | --- |
| Tai-sabaki, Mae-sabaki | 90 degree turn off the front foot | nothing |
| Tai-sabaki, Ushiro-sabaki | 90 degree turn off the rear foot | nothing |
| Tai-sabaki, Mae-mawari-sabaki | 180 degree turn to the front | nothing |
| Tai-sabaki, Ushiro-mawari-sabaki | 180 degree turn to the rear | nothing |
| Ayumi-ashi | ordinary walking step | nothing |
| Tsugi-ashi, forwards | shuffle step, forwards | nothing |
| Tsugi-ashi, sideways | shuffle step, sideways | nothing |
| Tsugi-ashi, rotation | shuffle step, turning | nothing |
| Happo no kuzushi | balance broken in eight directions | nothing |
| Kuzushi, tsukuri, kake (short) | the three parts of a throw | glossary terms only |
| Kuzushi, tsukuri, kake (2) | the same, at length | glossary terms only |
| Mae-ukemi | forward breakfall | `skills/mae-ukemi.json`, `videos: []` |

Suri-ashi (slide stepping), maai, hikite, tsurite, aiyotsu and kenka-yotsu
are defined in the course's first lesson but not filmed. They are listed in
section 4 as glossary gaps rather than video gaps.

`skills/mae-ukemi.json` is the one entry in this group that exists and is
fully written. It is the only ukemi skill with an empty `videos` array:
ushiro-, yoko- and mae-mawari-ukemi all have several.

### 2.2 Concept demonstrations with no home in the schema (6 videos)

Renzoku-waza, renraku-waza and transitions are all covered here as
*instances*: `sequences/` holds 44 combinations, 26 counters, 8 transitions
and 4 chains, most with videos. What is missing is a video of the *idea*,
and glossary terms carry no `videos` field, so there is nowhere to put one.

| Course video | Coverage here |
| --- | --- |
| Renzoku-waza, short and long (2) | `glossary/renzoku-waza.json`, no video field |
| Renraku-waza, short and long (2) | `glossary/renraku-waza.json`, no video field |
| Transitions, Tori-Tori, short and long (2) | 8 transition sequences, all tori-to-tori, several with video |

Transitions Uke-Tori, short and long, are a genuine content gap rather than a
schema one: all eight of our transitions run tori-throws-then-tori-holds. We
document no sequence in which uke, having defended or been thrown, takes the
ground position. That is two more videos, and the subject is not covered.

### 2.3 Hold-down escapes: not a video gap, but a writing gap

The course films an escape from each of the ten Kodokan hold-downs. **All ten
of those Kodokan escape videos are already linked here**, on the ten
hold-down technique files, not in `skills/`. There is no video gap.

What is missing is the written escape. Our ten escape skills cluster on six
holds:

| Hold | Kodokan escape video | Written escape skill |
| --- | --- | --- |
| 601 Kesa-gatame | linked | two |
| 602 Kuzure-kesa-gatame | linked | one |
| 603 Ushiro-kesa-gatame | linked | **none** |
| 604 Kata-gatame | linked | **none** |
| 605 Kami-shiho-gatame | linked | one |
| 606 Kuzure-kami-shiho-gatame | linked | **none** |
| 607 Yoko-shiho-gatame | linked | two |
| 608 Tate-shiho-gatame | linked | one |
| 609 Uki-gatame | linked | **none** |
| 610 Ura-gatame | linked | **none** |

Five holds have the Kodokan showing the escape and nothing written to go with
it. Kata-gatame is the one that matters most: a green-belt hold in most
syllabuses with no escape recorded against it. Uki-gatame and Ura-gatame were
only added to the classification in 2017, so their absence is understandable.

Because the video is already in hand, each of these five is a self-contained
piece of work: watch the linked Kodokan clip, write the skill, attach the
same video to it.

## 3. Taxonomy

The course's master classification slide gives three groups: nage-waza
(tachi-waza splitting into te-, koshi- and ashi-waza; sutemi-waza splitting
into ma- and yoko-sutemi-waza), katame-waza (osaekomi-, shime- and
kansetsu-waza) and atemi-waza (ude-ate and ashi-ate).

Our `category` enum is `nage-waza`, `osaekomi-waza`, `shime-waza`,
`kansetsu-waza`, and `wazaType` carries the five throwing families. This
flattens the tachi/sutemi and katame parent levels, but loses nothing: each
parent is derivable from the child, and `glossary/` already defines
tachi-waza, sutemi-waza and katame-waza as terms. No change needed.

The per-family counts all agree: 16 te-waza, 10 koshi-waza, 21 ashi-waza, 5
ma-sutemi-waza, 16 yoko-sutemi-waza, 10 osaekomi-waza, 12 shime-waza, 10
kansetsu-waza.

Two things the slides carry that we do not:

**Atemi-waza is absent from the glossary.** The classification's third branch
is not defined anywhere here, nor are ude-ate and ashi-ate. Judo does not
contest striking, but a reference that documents the Kodokan classification
should be able to say what the branch it omits is.

**The prohibited marking disagrees on two techniques.** The te-waza slide
prints in red the techniques barred by contest rules: obi-otoshi,
obi-tori-gaeshi, kata-guruma, morote-gari, sukui-nage, kuchiki-taoshi and
kibisu-gaeshi. We mark five of those `in-competition`. We mark **107
Obi-otoshi** and **111 Obi-tori-gaeshi** as `banned: "no"`. The Kodokan
description of obi-otoshi is explicit that the free hand scoops the upper leg
from behind, which is a direct attack on the leg and hansoku-make under
current IJF rules, so `in-competition` looks right for it on the source's own
words. Obi-tori-gaeshi is the weaker case and turns on which form is meant;
it is worth a decision either way.

The other prohibition markings agree. The course flags kani-basami and
kawazu-gake "not in examination" on the yoko-sutemi slide, do-jime on the
shime slide and ashi-garami on the kansetsu slide, which is exactly the set
we carry as `banned: "yes"`.

## 4. Meaning: where the descriptions disagree

None of the course's prose is used here. What follows is only where checking
our meaning against the Kodokan dictionary's suggests we may have it wrong.

### 4.1 Substantive: worth checking on the mat

**111 Obi-tori-gaeshi.** The Kodokan calls it "an informal variation of the
sacrifice known as hikikomi-gaeshi": tori sacrifices and rolls uke over. Our
`about` describes a standing lift and turn over backwards, with no sacrifice
at all. These are different throws. This is the largest single discrepancy
found.

**505 Uchi-makikomi.** The Kodokan has tori thrusting the hips "outside the
direction of the throw" from an ippon-seoi-nage position. Ours says the body
rotates "inside uke's arm rather than outside it". As written the two read as
opposites, and one of them is describing soto-makikomi.

**316 Tsubame-gaeshi.** The Kodokan withdraws the attacked right foot by
bending the knee and then throws with a *left* de-ashi-harai, that is, with
the other foot. Ours has the attacked foot dipping under the sweep and
sweeping back itself. Ours also says "the Kodokan treats it as a form of
de-ashi-harai", but the Kodokan numbers it separately at 316.

**610 Ura-gatame.** The Kodokan has tori with their back to a prone uke,
face up to the ceiling, one arm round the neck and one round the legs,
pressing down with the back. Ours has tori lying across uke's chest facing
their feet. Different holds.

**609 Uki-gatame.** The Kodokan describes it arising from uke defending
juji-gatame, with tori's leg across the neck and under the arm. Ours
describes kneeling at uke's side controlling the near arm. Both are
recognised, but ours does not mention the juji-gatame origin the Kodokan
leads with, which is the reason the technique was added.

**710 Tsukkomi-jime.** The Kodokan describes a single hand gripping the far
collar and thrusting the hand edge into the neck. Ours describes two hands,
one gripping and one driving the near collar across. Low confidence: the
course text may be abbreviated here.

**106 Sukui-nage.** The Kodokan scoops the thighs or buttocks only. Ours
allows "both legs **or the trunk**", which would take in ura-nage territory.

### 4.2 Kodokan's official English differs from our gloss

Sixty-eight of the hundred glosses differ in wording. Most are synonym-level
and ours often reads better in plain English, so this is not a defect list.
Three patterns and a handful of individual cases are worth recording, in case
the reference ever wants to carry the Kodokan's own English alongside its own
plain-English gloss.

Systematic: we render 大 and 小 as "major" and "minor" where the Kodokan uses
"large" and "small"; we render 四方 as "four-quarter" where the Kodokan uses
"four-corner"; and we render the tsurikomi throws in the older
"drawing ankle throw" idiom where the Kodokan uses "lift-pull".

Individually different enough to be worth noting:

| No. | Technique | Kodokan English | Ours |
| --- | --- | --- | --- |
| 113 | Kuchiki-taoshi | one-handed throw-down | single-leg drop |
| 403 | Hikikomi-gaeshi | pulling-down sacrifice throw | pulling-in reversal |
| 509 | Yoko-gake | side body drop | side hook |
| 510 | Daki-wakare | rear trunk turnover | hugging separation |
| 610 | Ura-gatame | back pin | reverse hold |
| 712 | Do-jime | body scissors; trunk strangle | trunk squeeze |

### 4.3 Japanese script

Two `nameJa` values differ from the 2017 Kodokan list:

- **115 Uchi-mata-sukashi.** The Kodokan writes 内股すかし, with the second
  element in hiragana. We write 内股透.
- **805 Waki-gatame.** The Kodokan writes 腕挫腋固, using 腋. We write 脇固,
  using 脇. Both are read *waki* and both are in use, but the official list
  uses 腋.

The eight Ude-hishigi armlocks are recorded here under their short names
(Juji-gatame, Ude-gatame and so on) with the full Kodokan name in `aliases`,
which is correct. The `nameJa` field carries only the short kanji, 十字固
rather than 腕挫十字固, and there is no field for an alternative script form.
Worth noting rather than fixing.

**709 Ryote-jime.** The classification slide writes it "ryo-te-jime". Our
kata-ha-jime and kata-te-jime both carry the compressed spelling as an alias;
ryote-jime carries no alias for the hyphenated one.

## 5. Glossary terms the course defines and we do not

All from the course's first lesson, all things a judoka hears named on the
mat, and none currently in `glossary/`:

Maai (combative interval), hikite (sleeve hand), tsurite (collar hand),
aiyotsu (matched stances), kenka-yotsu (opposite stances), ayumi-ashi,
tsugi-ashi, suri-ashi, tai-sabaki, happo no kuzushi, atemi-waza, ude-ate,
ashi-ate.

Aiyotsu and kenka-yotsu are the most useful of these: gripping cannot be
explained without them, and `skills/gripping-against-opposite-stance.json`
already relies on the idea without having a word for it.

The course notes that happo no kuzushi does not appear in the Kodokan
dictionary at all, so any entry for it should say whose term it is.

## 6. What the Kodokan channel can fill

The Kodokan's YouTube channel (`UCtF6tu7GuZYkZzht5MIv8UQ`, "KODOKAN") holds
242 videos. We link 112 of them. The 130 we do not link were checked against
the gaps above.

### 6.1 Fills a gap in section 2 (2 videos, 9 of the 20 gaps)

**Basic movements** `zbBtzBd9Eg4`, 1:51. Its own description lists the
contents: ayumi-ashi, tsugi-ashi, moving freely in a pair, then mae-sabaki,
ushiro-sabaki, mae-mawari-sabaki and ushiro-mawari-sabaki. That is eight of
the twelve fundamentals gaps in section 2.1, in one clip, from the Kodokan.

**Ukemi** `VoktcQAxEPg`, 4:03. Contents: ushiro-ukemi, yoko-ukemi,
**outen-ukemi**, mae-ukemi, mae-mawari-ukemi, then ushiro-ukemi and
mae-mawari-ukemi in a pair. This fills the empty `videos` array on
`skills/mae-ukemi.json` and gives every other ukemi skill a Kodokan
demonstration, which none of them currently has.

Outen-ukemi (横転受身, the sideways rolling breakfall) is not documented here
at all, and is not in the IJF course either. It is a Kodokan-named breakfall
we are missing.

Both come from the Kodokan, IJF and French Judo Federation *Kodomo-no-Kata*
project, so they are pitched at beginners, which suits the subject.

### 6.2 Gaps the Kodokan channel cannot fill (11 of the 20)

There is no Kodokan video for happo no kuzushi, for kuzushi-tsukuri-kake as a
concept, for renzoku-waza or renraku-waza as concepts, for tori-tori or
uke-tori transitions, or for kumi-kata. If those are wanted, they must come
from another provider or be left as written-only subjects. Happo no kuzushi
is unsurprising: the Kodokan dictionary does not carry the term.

Three videos come close on tai-sabaki without being about it: **体捌き
トレーニング** for nage-waza `bwmLjCbmZAE` 2:06, for katame-waza I
`5Qed-LIErpw` 2:09 and II `QJ-cpktAq40` 1:21. They are body-movement
conditioning drills, Japanese titles and descriptions only.

### 6.3 Not gaps, but worth having anyway

**Eight classification overview videos**, one per waza family, from the same
"KODOKAN × IJF ACADEMY 100 Techniques" series as the hundred: Te-waza
`z5qYfCEcZOU`, Koshi-waza `cgIby7HnKzA`, Ashi-waza `-Xpmgtaypmg`,
Ma-sutemi-waza `LnjW67efl00`, Yoko-sutemi-waza `ml_eSxz8OMo`, Osaekomi-waza
`guJ-HlAKEA8`, Shime-waza `bq3cwrcS1-c`, Kansetsu-waza `QtVipMcTsdw`. Each
matches a `glossary/` term exactly. They cannot be attached today: glossary
entries have no `videos` field.

**Twenty-two "closely resembling waza" videos**, in which the Kodokan
demonstrates two or three similar techniques side by side and explains the
difference, plus an index clip `IqhpUWgAZYk`. These bear directly on section
4: `B18U2SHhQ-s` is Sukui-nage and Obi-otoshi together, `RDIJVm-7tro` is
Sumi-gaeshi and Hikikomi-gaeshi, `ydqHuJWp1LY` is Soto-makikomi and
Uchi-makikomi, `I8Xn3Sz-R7A` is Yoko-guruma and Daki-wakare. Four of the six
substantive discrepancies have a Kodokan video that exists to settle exactly
that question. There is no `role` value or sequence kind for "distinguishes
two techniques", so a home would have to be decided.

**Forty-two kata videos**, including full-length English narrated versions of
Nage-no-Kata `bkhBZzE2HpM`, Katame-no-Kata `e1eAt15CEMY`, Kime-no-Kata
`1-YAOozPQNU`, Ju-no-Kata `Aa0bQ8NLiOw`, Itsutsu-no-Kata `uOs7LNSjYfk`,
Koshiki-no-Kata `n2_zAscgWpo`, Kodokan Goshin-jutsu `ZbjWCm53Osg` and
Seiryoku-Zenyo-Kokumin-Taiiku `uvqxiXiA9eM`, the seven Kodomo-no-Kata grades,
and three years of Kagami Biraki ceremony performances. `backlog/README.md`
records 14 kata recordings waiting for kata coverage to begin; this is a
better and more complete set than those, and it is the Kodokan's own.

**Thirty-two champion technique videos**, the 【講道館柔道「技」】 series and
the named-athlete series (Nomura on seoi-nage, Inoue, Wolf, Arai and others),
10 to 28 minutes each. These are competitive-variation material for
techniques we already document.

**Two teaching videos with English narration**: Dan Grading System
`8tc-kSKuub8` 13:46, and An Introduction to Judo `zW9ouZ4zB3Q` 17:53. The
first bears on `grading-schemes/` and the `dan` glossary entry; the second on
`guides/`.

**Eight training videos** (uchikomi circuits, solo uchikomi, movement
conditioning) with Japanese titles only. They bear on the `uchikomi` and
`tandoku-renshu` glossary terms, and have the same no-video-field problem.

## 7. What needs checking, and by whom

Nothing in this file has been acted on. These are the open questions it
raises, most consequential first.

### Needs a coach or a senior grade to settle on the mat

1. **111 Obi-tori-gaeshi.** Is it the sacrifice the Kodokan describes, or the
   standing throw we describe? Kodokan video `bpc82SrunUU` is already linked
   on the file. If ours is wrong, `about`, `described` and `receiving` all
   change, and the gloss with them.
2. **505 Uchi-makikomi.** Inside or outside uke's arm? Ours and the
   Kodokan's read as opposites, and one of them is soto-makikomi. The
   Kodokan's own comparison video `ydqHuJWp1LY` shows Soto-makikomi and
   Uchi-makikomi side by side and exists to answer this.
3. **316 Tsubame-gaeshi.** Does the withdrawn foot sweep back, or does the
   other foot sweep? Ours says the first, the Kodokan the second. Also
   settle whether calling it "a form of de-ashi-harai" is right when the
   Kodokan numbers it separately at 316.
4. **610 Ura-gatame.** Ours and the Kodokan's describe different holds.
   Kodokan video `eeAHZB0v3XY` is linked on the file.
5. **609 Uki-gatame.** Should the juji-gatame-defence origin the Kodokan
   leads with be in our description?
6. **106 Sukui-nage.** Is "or the trunk" right, or does that stray into
   ura-nage? Comparison videos `zEmRLNpS2j8` and `B18U2SHhQ-s` both feature
   it.
7. **710 Tsukkomi-jime.** One hand or two? Low confidence that the course
   text is complete here, so check the Kodokan video `dKKpnD3eLcY` before
   changing anything.

### Needs a decision from the project owner

8. **107 Obi-otoshi: should `banned` become `in-competition`?** The IJF
   Academy prints it red with the leg grabs, and the Kodokan's own
   description has the free hand scooping the upper leg from behind. On the
   source's own words the answer looks like yes.
9. **111 Obi-tori-gaeshi: same question**, but weaker, and the answer
   depends on question 1 above. Settle 1 first.
10. **Does the reference want to carry the Kodokan's official English**
    alongside its own plain-English gloss? Sixty-eight of the hundred differ.
    Ours often reads better, so this is about whether both belong, not about
    replacing one with the other. If yes, it needs a new field.
11. **Should glossary terms be able to carry videos?** Eight Kodokan
    classification overviews, the training videos and the concept
    demonstrations all have no home without it. This is the single change
    that would unlock the most linked material.
12. **Should `skills` gain a kind for movement fundamentals?** Without one,
    tai-sabaki, ayumi-ashi and tsugi-ashi cannot be recorded even though the
    Kodokan video covering all of them is identified (`zbBtzBd9Eg4`).
13. **Should the classification tree be represented explicitly?** See
    section 3: `category` mixes two levels of the official tree, and
    atemi-waza cannot be recorded at all.
14. **Is it time to start kata coverage?** Forty-two Kodokan kata videos are
    listed in `kodokan-unlinked.json`, including full English narrated
    versions of all seven Kodokan kata. The 14 kata links already waiting in
    `video-candidates.json` were kept for exactly this moment.

### Needs a Japanese reader to confirm

15. **115 Uchi-mata-sukashi `nameJa`**: 内股すかし (Kodokan) or 内股透 (ours)?
16. **805 Waki-gatame `nameJa`**: 腕挫腋固 with 腋 (Kodokan) or 脇固 with 脇
    (ours)?
17. Whether the eight Ude-hishigi armlocks should carry the full kanji
    (腕挫十字固) somewhere, given the romaji alias is already recorded.

### Straightforward work, no checking needed

18. Attach Ukemi `VoktcQAxEPg` to the four ukemi skills, which fills the one
    empty `videos` array in `skills/`.
19. Write escape skills for Kata-gatame, Ushiro-kesa-gatame,
    Kuzure-kami-shiho-gatame, Uki-gatame and Ura-gatame. The Kodokan video
    for each is already linked on the hold's technique file.
20. Add glossary entries for the thirteen terms in section 5, starting with
    aiyotsu and kenka-yotsu.
21. Document outen-ukemi (横転受身), a Kodokan-named breakfall absent here.
22. Add a Uke-Tori transition or two: all eight of ours run tori to tori.
