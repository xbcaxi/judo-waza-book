# BJA technical dan grade examinations

`build.py` wrote `exams/bja-technical-1st-dan.json` through `-5th-dan.json`
from the BJA's own mark sheets.

## Sources

- The five **TECHNICAL Mark Sheets**, October 2025, one per grade. These are
  the authority for the twenty set techniques, the section wording and every
  pass mark.
- **Guide for Dan Grade Evaluation of Competitive Skills and Technical Exam**,
  issued 1 July 2025, for the 0 to 10 marking scale.
- **Technical Dan Grade Scheme Assessment Guide** for the framing: why the
  technical route asks for more, and what Sections 1 and 2 versus 3 to 5 are
  assessing.

All are linked from britishjudo.org.uk/get-started/grading/dan-grade-scheme/.
The PDFs are not in this repository.

## Why a script and not five files

The five papers differ only in their technique lists and their counts. Typing
the same five sections out five times is how one pass mark ends up wrong, so
every maximum is DERIVED from the paper's own row counts and checked against
the pass mark the paper prints. All five come out at exactly 80 per cent:
272/340, 360/450, 448/560, 536/670, 624/780. If a re-run ever disagrees with a
printed pass mark, the paper has changed and the lists here are stale.

## What the numbers are made of

Section 1 is twenty techniques at every grade. Section 2 is five techniques
from each grade below, so nothing already passed stops being examinable.
Section 3 is grade + 2 throws, each shown three ways. Section 4 is grade + 2
holds. Section 5 is grade × 2 transitions. Ten marks each throughout.

## Resolution

All 100 set techniques resolve to a technique page. The papers use the
Kodokan's fuller names, Ude-hishigi-juji-gatame where this book leads with
Juji-gatame, and those resolve through the technique's own `kodokan` field
without anything being renamed.

The item text is kept exactly as the paper prints it, including
`Ude-hishigi-hiza-gatame` rather than our `Hiza-gatame`: the form is the
authority for what a candidate will be asked, and the resolved slug is this
reference's link into itself.
