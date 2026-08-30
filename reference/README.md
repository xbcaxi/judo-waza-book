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

