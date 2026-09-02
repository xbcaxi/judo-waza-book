# Working on this repo with an AI assistant

This is the canonical judo content. It is rendered by a separate, private site
repository, which reads this one.

If you are using Claude Code, Copilot, Cursor or anything similar here, read
this first. It applies to you as much as to the tool.

## Repo profile

git-profile: simple

## This repository is public, all of it, always

Everything committed here must be fit for 100% public consumption: any
judoka, federation, rights holder or journalist reading any file, on any
branch that gets merged. That includes docs/. Working documents that carry
internal analysis, strategy, legal risk framing, pricing thinking or
anything else written for the project rather than for the public belong in
the private site repository's docs/, never here. When in doubt, it goes
there: this repo holds the judo, the sources, and documents the public is
meant to read.

## Content is judo, and judo has to be right

Every technique, grade and sequence in here is something a person will be
examined on. A plausible-sounding error is worse than a missing field.

- Do not invent technique names, Japanese readings, gradings or syllabus
  contents. If a fact is not in a source you can name, leave the field out.
- `nameJa`, `nameKana` and `kodokanNumber` come from the Kodokan's own lists.
  Do not guess kanji. `reference/kodokan-definitions-2022.json` is the
  transcribed source and the validator checks the technique files against it.
- The book leads with the name a dojo uses, so where the Kodokan prints
  something else it goes in the technique's `kodokan` field rather than
  replacing ours.
- Grading syllabuses are transcribed from the federation's published document
  and nothing else. Do not merge two federations' requirements.
- Where sources disagree, say so in the field rather than picking one.

A sequence is not two techniques written one after the other. The first
technique manufactures the condition for the second, and the condition is
something the judoka feels: a widened base, weight settling back, a post, a
step recovered. Name that condition in `described`, and say in `about` what
opening the first technique creates and how the second uses it. "Do this,
then this" is the wrong shape even when both halves are correct.

## Run the validator before you open anything

    npm run validate

It checks the JSON Schemas in `schema/`, cross-file references, naming, and
that every image and video a file claims actually exists. CI runs the same
command, so a PR that fails it will not be reviewed.

    npm test

Covers the IJF importer in `tools/ijf-results/`.

## Do not hand-edit generated data

`competition-stats/*.json` comes from the IJF importer. Change the importer and
regenerate:

    npm run ijf:update

That fetches what is new, rebuilds both files, validates and reports. It
refuses to run from a cold or part-restored cache.

## Images

`media/` holds the artwork. Every `image` field needs a matching file and an
honest `provenance`:

- `own` for artwork made for this project.
- `licensed` where there is a licence or permission to point at.
- `third-party` where it belongs to someone else.
- `unknown` where the origin was never recorded.

Do not upgrade a file's provenance without evidence. `NOTICE.md` carries the
counts and has to agree with the content; the validator checks this.

Original artwork is welcome and is the most useful contribution here. See
`scripts/build-movement-diagrams.mjs` for an example.

## Writing

- British English. No em dashes.
- The Voice subsection of `CONTRIBUTING.md`'s style guide is the house voice
  for every prose field, and for comments and docs here too. Read it before
  writing any of them.
- Commit messages and PR bodies are one plain sentence saying what the change
  does. No reasons, no context, no bullet lists.
- Comments say what the code does and any constraint that is not obvious. One
  sentence of why at most.

## Branching

EVERY change happens on a branch, never straight on `main`. That includes a
one-word typo, a single field, and anything you were about to decide was too
small to be worth branching for. There is no size below which this stops
applying.

Three names, and nothing else:

- `feature/<slug>` for new content or a new capability.
- `fix/<slug>` for a correction to something already here.
- `claude/<slug>` for work an assistant started, which is what Claude Code
  names its own branches. It was not listed here until September 2026 and the
  branches were arriving anyway.

Push the branch rather than leaving it local. A branch that exists on one
machine is a branch nobody else can see, which defeats both reasons for the
rule.

Some changes here need a matching change in the private site repository, schema
changes among them. Open the content half and it will be paired up before it
lands.
