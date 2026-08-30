# Kodokan kata

Three scripts, run in this order:

    python3 tools/kodokan-kata/import-videos.py     # the records and their recordings
    python3 tools/kodokan-kata/import-structure.py  # sets and order, from the textbooks
    python3 tools/kodokan-kata/prune-backlog.py     # take the housed videos out of backlog/

`import-videos.py` is re-runnable and `prune-backlog.py` is separate for that
reason: a script that pruned its own input could only ever be run once, which
is how fourteen recordings stayed missing through a fix that appeared to work.
Re-running the first two rewrites the eleven records from the backlog files, so
restore those from git first if they have already been pruned.

MATCHING IS ROMAJI AND KANJI. The Kodokan titles its own recordings in either
script: "Nage-no-Kata (English ver.)" beside "投の形（日本語版）", and a Kagami
Biraki ceremony recording that names only the performers and the year. Matching
romaji alone silently dropped every Japanese-language teaching recording and the
whole 2024 ceremony, and left no trace: the records simply looked complete.

`import-structure.py` filled the `sets` on seven kata records from the
Kodokan's own *Kodokan KATA Textbook* series: Nage, Katame, Kime, Ju,
Kodokan Goshin-jutsu, Koshiki and Itsutsu.

## What was taken, and what was not

Those textbooks are the Kodokan Judo Institute's official English translations
and carry "All Rights Reserved" with no permitted-use wording anywhere in them.

Taken: the STRUCTURE. The named sets in order, the named items in each in
order, and the adoption or amendment dates printed on the title page. That is a
list of facts about what the form is, and it is the thing every kata page here
was declaring it did not have.

Not taken: the instructional text and the several hundred photographs, which
are the Kodokan's expressive work. Each kata record carries a link to the
textbook instead, and each page says in as many words that the how is the
Kodokan's and is not reproduced.

## Why the structure is written out rather than parsed

Seven documents are not worth a fragile parser, and a mis-ordered kata is a
failed grading. Each list was read off the PDF's own "Names of the techniques"
page and checked against the body. Re-running the script rewrites `sets`,
`adopted`, `amended`, `source` and `links` on those seven records and touches
nothing else.

## Resolution

An item resolves to a technique here by slug, by the technique's own name, by
its aliases, or by the KODOKAN'S name for it, which is what a technique's
`kodokan` field exists to hold: the textbook prints Ude-hishigi-juji-gatame
where this book leads with Juji-gatame. 31 of the 112 items resolve. The other
81 are attacks rather than techniques (Ryote-dori, Ganmen-tsuki, Furi-age) or
the classical forms of Koshiki-no-kata, and an unresolved item is the normal
case here, never a gap to fill with a guess.

The PDFs are not in this repository. They are linked from each kata record.
