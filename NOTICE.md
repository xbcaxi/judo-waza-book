# Rights, provenance and removal requests

This project is a community judo reference. Its **words and data are written
for it and shared freely for non-commercial use**. Its **images are a different matter**, and this
page exists to say so plainly and to give anyone who owns one a fast, no
argument route to have it taken down.

## If you own something here

**Ask us to remove it and we will.** You do not need to prove ownership to a
lawyer's standard, send a formal notice, or explain why. A short message
naming the file is enough.

**Open a removal request:** use the
[Content removal request](../../issues/new?template=content-removal.yml)
issue form. It asks for the file, who you are and what you would like done.
If you would rather not use GitHub, or the material is sensitive, email
<rights@wazabook.com>. You do not need a GitHub account to have something
removed.

**What we commit to:**

- We aim to acknowledge within **7 days** and remove within **14**, and
  usually much sooner. Say it is urgent and it goes to the front. This is a
  volunteer project, and a deadline it can meet is worth more than a shorter
  one it cannot.
- Removal is the default. We will not ask you to justify the request, and we
  will not argue fair dealing at you.
- If you would prefer **attribution or a licence** instead of removal, say so
  and we will do that: a credit line, a link to your site, whatever you ask.
- We will tell you when it is done, and the file leaves the published site at
  the next build.

**One honest limitation.** This is a public Git repository, so a removed file
stays in the commit history unless the history is rewritten. If you need it
gone from history too, say so in the request and we will rewrite and
force-push. Anyone who has already cloned or forked the repository has their
own copy, which we cannot reach. That is a property of Git, not a position we
are taking.

## What is licensed, and what is not

| Part | Licence |
| --- | --- |
| Text, narration, translations and all JSON content data | [CC BY-NC-SA 4.0](LICENSE) |
| `scripts/**` and `schema/*.schema.json` (the validator, the URL parser, the machine contract) | [MIT](scripts/LICENSE) |
| `media/**` (illustrations and syllabus sheets) | **NOT licensed by this project.** See below |

The distinctions matter, for two different reasons.

The project can only license what it owns, and the data is genuinely ours:
the step-by-step narrations, the receiving notes and the transcriptions were
written for this reference. The image files were not, and we are not passing
on rights we do not hold. If you are reusing this repository, **take the data
and supply your own images.**

The code is separate because it is code. A validator and a URL parser are not
judo, Creative Commons advises against using its licences for software, and a
NonCommercial term on a schema file would obstruct the people most likely to
build something useful with this. Take those under MIT and do as you like.

## What we mean by non-commercial

The licence defines NonCommercial as use "not primarily intended for or
directed towards commercial advantage or monetary compensation". That wording
settles less than it looks like it does, so here is the project's own
position, in plain English.

**Yes, go ahead, and you do not need to ask:**

- A club, school, university or federation using this in teaching, **including
  one that charges membership or mat fees**. Charging for lessons is how judo
  clubs exist; it is not what this licence is here to stop.
- A coach preparing a session, printing a grade's technique list, or reading
  the narrations to a class, **including a coach who is paid to be there**.
- A candidate revising for a grading, and anyone helping them.
- Translating the content, or building a free app, site, deck or handout on
  it, for judoka to use at no charge.
- Research, teaching materials and academic writing.

**No, please ask first:**

- Selling the data, or any product built on it: a paid app, a book, a course,
  a subscription site.
- Reproducing it on a site whose main business is advertising or lead
  generation.
- Including it in a dataset that is sold or licensed on, including for
  training machine learning models.
- Any use where this reference is the thing being charged for.

**If you are not sure, ask.** Open an issue and describe what you want to do,
or email <rights@wazabook.com> if you would rather not have the conversation
in public, which most commercial ones are. The project can grant a separate
commercial licence, and would rather talk than have you guess or walk away.
A "no" here is a starting point, not a door closing.

Nothing in this section overrides the licence itself: where the two differ,
[CC BY-NC-SA 4.0](LICENSE) is what governs. It is here because the licence
answers "what are the terms" and this answers "am I allowed to do the thing I
actually want to do", and most people arrive with the second question.

## How to credit this project

The licence requires attribution but leaves the form of it to us, so here is
the request. Credit **The Judo Waza Book**, link to
<https://wazabook.com>, and name the licence. Copy and paste:

> Technique data from [The Judo Waza Book](https://wazabook.com), used under
> [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

As plain text, where you cannot link:

```
Technique data from The Judo Waza Book (wazabook.com),
used under CC BY-NC-SA 4.0.
```

If you changed anything, say so: the licence asks you to indicate
modifications, and "adapted from" is enough. Put the credit wherever a reader
would reasonably look for it - a footer, an about page, a deck description, a
credits screen. You do not have to credit every page or every card
individually.

Two things attribution is **not**: it is not permission to suggest this
project endorses you or your product (Section 2(a)(6) of the licence), and it
does not extend to the images, which are not ours to license and are covered
by the section above.

## Where the images came from

Every image declaration carries a `provenance` field, so the position on each
file is recorded rather than implied:

| Value | Meaning | Count today |
| --- | --- | --- |
| `own` | Made for this project by someone who holds the rights | 3 |
| `licensed` | Used under a licence or permission we can point at | 0 |
| `third-party` | Known to belong to someone else, used in good faith pending permission | 33 |
| `unknown` | Origin not established | 65 |

**The 65 `unknown` files** come from a club reference document compiled over
many years from many sources; the original sources were not recorded, and the
project owner cannot now identify them. They are published in good faith as a
non-commercial teaching aid, marked honestly rather than passed off as ours,
and they will be removed or replaced on request. Replacing them with
purpose-made illustrations is an open goal of the project, and a contribution
of original artwork is among the most useful pull requests we could receive.

**The 3 `own` files** are the movement diagrams on the shisei, tai-sabaki and
shintai skills: footprints and arrows, drawn for this project by
`scripts/build-movement-diagrams.mjs` and owing nothing to anyone. They are the
first of the purpose-made illustrations the paragraph above calls an open goal,
and they are SVG rather than webp because a line drawing should be vector.

**The 33 `third-party` files** are identified: 22 are British Judo Association
syllabus sheets, 9 are JudoScotland's, and two technique illustrations carry
the watermarks of Bill Nauta / Encino Judo Club and judosport.net. They are reproduced so that judoka can study their own
federation's syllabus, with the source named on the page. Permission has not
been sought, and any of these rights holders can have their material removed
by asking.

## Videos are links, not copies

Demonstration videos are **linked and embedded from the platform they were
published on** (YouTube, Vimeo) or linked to the publisher's own site. No
video is copied, rehosted or downloaded, and playback happens on the
platform's own player under the platform's terms, with the view counting to
the publisher. If you would prefer your video not be linked from here at all,
the same removal route applies and we will unlink it.

## Competition data

The technique frequency statistics in `competition-stats/` are aggregated from the
**International Judo Federation's** public API at data.ijf.org. The
underlying competition records remain the IJF's property; what is committed
here is aggregate counts (how often a technique scored, by category and
year), not the records themselves. Contests are linked back to
judobase.ijf.org rather than any media being copied or rehosted, no
competitor profile data is stored, and the importer keeps a modest request
rate. If the IJF would prefer this use ended, the removal route above
applies as it does to everything else.

## Names, terms and syllabuses

Japanese technique names, their kanji, and the classification of techniques
are facts and are not claimed by anyone. Grading syllabuses are transcribed
as published, with the source document named, because the list of what a
grading requires is factual. The prose describing how to perform each
technique is the project's own writing, not a reproduction of anyone's manual.

## Trade marks

British Judo Association, JudoScotland, Kodokan, the International Judo
Federation and other organisations named here own their names and marks. This
project is independent of all of them, is not endorsed by any of them, and
uses their names only to identify whose syllabus, examination or material is
being described.
