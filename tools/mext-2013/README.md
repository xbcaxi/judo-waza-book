# MEXT 2013 import

`import.py` built `perspectives/mext/techniques/*.json` from a page-level source
pack of the MEXT 2013 school judo guidebook.

## It runs once, and what it wrote is content

Those twenty files are editable content from the moment they landed. The English
in them is machine translation that no Japanese-capable reviewer has read, so
the expected next change to them is a person correcting prose by hand. Re-running
this would throw that away.

It is kept because the method should be inspectable and because the import may
need repeating against a corrected pack, not because the output is generated
data in the sense `competition-stats/` is. Nothing in CI runs it.

## What it needs

The source pack, which is NOT in this repository: 201 records, one per PDF page,
with the publisher's own Japanese text layer, a separate OCR pass, the OCR of
text baked into figures, and an English working translation. The path is at the
top of the script.

    python3 tools/mext-2013/import.py perspectives/mext/techniques

## What it decides, so that a reader of the output knows

- The twenty techniques are listed explicitly against the slug each belongs to.
  Matching is longest-name-wins on a word boundary, because "ko-uchi-gari"
  contains "o-uchi-gari" and a substring test files every ko-uchi-gari page
  under o-uchi-gari.
- Sections are anchored on the headings, which the source uses consistently.
  A heading the table does not know stops the run rather than being dropped.
- Photo captions become prose; the bracketed stage direction naming the
  photograph does not, because the picture is not here.
- Em dashes become colons. The site that renders this fails its own build on
  one, and every em dash in this source separates a label from what it
  introduces.
- The Japanese is carried per PAGE, entire and unsegmented, never paired to an
  English paragraph. Pairing is a judgement, and a wrong pairing would be
  invisible.
