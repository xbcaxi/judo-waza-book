# Reference

Documents other people publish, transcribed so that this repository can be
checked against them. Nothing here is written by this project, and nothing here
is edited to fit the content: if a file disagrees with a technique, the
technique is what gets looked at.

Each file records where it came from and when it was read, so a later edition
can be told from the one that was actually used.

## kodokan-definitions-2022.json

The Kodokan's *Definitions of Judo Techniques*, 1 October 2022: its own name and
one-sentence definition for the hundred techniques it recognises and the ten
groups of its classification.

This is the authority for what a technique is called. The book leads with the
name a dojo uses, so `Juji-gatame` stays on the page while the Kodokan prints
`Ude-hishigi-juji-gatame`; the Kodokan's name is recorded in the technique's
`kodokan` field rather than replacing ours. `npm run validate` checks that the
two files still agree and that every Kodokan name appears on its technique as
the name or an alias.

Ten techniques in this book have no entry here. They are names the Kodokan does
not use, either because it folds the technique into another one or because the
name belongs to contest usage rather than the classification.

## mext-2013.json

The MEXT 2013 school judo guidebook as a DOCUMENT record rather than a
transcription: publisher, edition, the page it is published from, and the
thirteen PDFs it is split into with the URL of each.

It exists so that a citation can be built. Every perspective under
`perspectives/mext/` carries the record id and printed page of the page it came
from, and this file is what turns those into a link to MEXT's own copy at the
right page. The URLs here are the source of truth: `tools/mext-2013/` derives
everything else from them, and if MEXT moves a file this is the one place to
change.

The page images in `media/mext-2013/` are rendered from the same PDFs. They are
third-party and marked as such on every reference to them.

## ijf-sor-2026.json

The refereeing rules of the IJF's *Sport and Organisation Rules*, 2026 edition,
as a DOCUMENT record rather than a transcription: publisher, edition, when it
was read, and the articles this repository cites with a line on what each one
settles.

Nothing from the rulebook is reproduced. A technique's `contest` field carries a
paraphrase written for this book and points here by `sourceId`, with the article
numbers the paraphrase came from, so any claim can be checked against the IJF's
own copy and the whole reference can be re-dated in one file when the next
edition lands.

That mattered more than it sounds. Competition rules change with the Olympic
cycle, and technique entries written under an older rulebook went on asserting a
hansoku-make for the leg grabs when this edition gives a shido. Rules recorded
without their edition do not announce that they have gone stale.

`landingPage` is null: the edition was read from the IJF's published explanatory
guide PDF and the canonical URL has not been confirmed. Filling it in is a
useful small pull request.

## judo-sequences-2026.json

The project owner's catalogue of which technique follows, answers or continues
which, with the reaction of uke that makes the second possible, as a DOCUMENT
record: what it is, when it was read, the fixed lists of triggers and directions
it defines, and what it leaves out.

It is the `source` of the 397 sequences imported on 2026-09-04 and the
authority for the `trigger` and `direction` fields on any sequence. It carries
the catalogue's own note that renraku-waza and renzoku-waza are drawn
differently by different sources, which is why this repository records the
physical direction rather than choosing a word. The edges it describes that a
sequence record cannot hold are listed in `backlog/judo-sequences-unmodelled.json`.

## kumikata-schema-2026.json

The project owner's model of gripping as data, as a DOCUMENT record: the grip
targets, the roles of each hand, the two stance situations, the actions of a
grip exchange and the phases they fall into. It names the coaching systems its
vocabulary came from and reproduces none of their material.

It is the `source` of the `grips/` collection, of the kumi-kata skills that
describe grip plans and grip breaks, and of the gripping terms added to the
glossary on 2026-09-04. The actions are recorded in English because Japanese
terminology for them is less settled than for throws.

## japanese-readings.json

Readings for the terms whose romaji does not pin down the pronunciation. Almost
always that is an unmarked long vowel: "Dojo" is どじょ or どうじょう and the
romaji cannot say which, so a synthesiser guesses and guesses wrong.

Fifteen entries, each recording HOW it was established. `looked-up` means taken
from the entry named, `derived` means worked out from the romaji plus a
confirmed component, and two are marked NEEDS CONFIRMING and surface as a flag
on the sheet until somebody settles them.

It also carries IPA and pitch accent where a source gives them, and those are
for the HUMAN recording rather than the synthesiser. No Japanese phone set
either engine accepts can be told an accent, and accent is exactly what
separates ko-uchi from kōchi: it is the one thing a recorded voice can give
that a generated one cannot.

Coverage is uneven by nature. Wiktionary has a full entry for 道場 and none for
崩上四方固, so most rows carry a blank, which is the honest answer.

## bongard-aide-memoire-2006.json

Daniel Bongard's *Judo aide-mémoire*, version 3.3 of May 2006: a French A5
booklet of 128 pages that draws every technique, combination, counter, escape
and ground entry it covers as a strip of frames, with the names the Fédération
Suisse de Judo and the Kodokan use.

This is an INDEX, not a transcription. It records what the booklet illustrates,
page by page, mapped to this book's slugs, so that a name or a pairing can be
cited to it as existing. None of the drawings is reproduced and nothing in the
record says how a technique is done. A sequence cited to it carries an `about`
written from this book's own technique records; the booklet supplies the
pairing and the page. The names it prints that the Kodokan does not use are
recorded on the technique each maps to, and the mapping is in the record's
`names` list. Twenty-three unnamed ground entries and the escapes from every
hold, strangle and armlock are inventoried by page and count, because they are
what the booklet has and this book does not yet. `npm run validate` checks that
every slug the record points at exists.
