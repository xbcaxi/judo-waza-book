# Video pipeline

Finds YouTube demonstrations for the sequences and the grip-sets, cheaply,
and produces a sheet for a person to review. Nothing reaches the repository
until a reviewer has approved it, and then only through `apply_approved.py`,
which writes one video entry into one record at a time.

Ported from the owner's `judo-video-pipeline` bundle of September 2026, with
two changes the bundle's handoff asked for and one this repository needed:

- **The repository is the source of edges and names.** The bundle parsed its
  catalogue markdown; the catalogue has been imported into `sequences/` and
  `grips/`, and those reviewed files are what `extract_edges.py` reads. Kanji,
  spellings and aliases come from `techniques/*.json` rather than a table
  kept here.
- **The existing video map is loaded first.** Every video a technique record
  already carries goes into the database as `method: existing`, with the
  technique it belongs to. The matcher then refuses to offer a
  single-technique clip as a partial match, which is the false positive the
  bundle would otherwise have produced for every edge naming that technique,
  across the whole Kodokan series.
- **A pairing that is itself a technique needs no video.** A sequence whose
  answer is a named technique (o-soto-gari countered by o-soto-gaeshi)
  carries `resolvesTo`, and the technique's page has the demonstration. The
  matcher and the searcher skip these; the review sheet shows them as done.

## Quota

YouTube Data API v3 gives 10,000 units a day. `search.list` costs 100, so a
hundred searches; listing a channel's uploads and fetching details cost 1 per
50 videos. So the allowlisted channels are indexed in full for a few hundred
units, edges are matched locally at no cost, and search quota goes only on
the gaps, in priority order.

## Running it

```sh
pip install -r requirements.txt
export YT_API_KEY=...            # Google Cloud console, YouTube Data API v3

python extract_edges.py          # the edges and the existing videos, from the repository
python seed_shortlist.py         # the hand-curated shortlist in data/
python index_channels.py --details
python match_edges.py            # local; no quota
python search_gaps.py            # up to search_daily_budget searches a day
python review.py export --top 3  # review.csv
# mark status approved or rejected, and start_s where the sequence sits inside a longer video, then:
python review.py import review.csv
python review.py approved        # approved.json
python apply_approved.py --dry-run
python apply_approved.py         # writes into sequences/ and grips/
npm run validate                 # from the repository root
```

`extract_edges.py` can be run again at any time; it replaces the edges and
keeps the priorities and decisions. Set a priority to steer the search:

```sh
sqlite3 candidates.sqlite "UPDATE edges SET priority=10 WHERE type='counter'"
```

## Conventions

- Edge slug: `<src>__<kind>__<dst>` with the repository's own slugs, e.g.
  `o-uchi-gari__combination__tai-otoshi`. Kinds are the sequence kinds
  (`combination`, `counter`, `transition`, `chain`) plus `grip-throw`.
- A counter's `src` is the attacked technique and `dst` the answer, as in
  the sequence file.
- A grip edge's `src` is `grip:<slug>` from `grips/`.
- Candidate `method`: `existing` (already on a record), `manual` (the
  shortlist), `title` (both names in the title), `partial` (one in the title,
  one in the description), `search` (from `search.list`).
- `start_s` is the second at which the sequence appears in a longer video
  and becomes `start` on the record.

## The shortlist

`data/shortlist.csv` and `data/video-shortlist-first-30.md` are the owner's
first thirty edges with candidate URLs, kept as they were written. The seeder
translates their names and kinds to the repository's, and reports any row
whose edge has no sequence file rather than inventing one.

## Known gaps

- Gonosen-no-kata recordings cover twelve counters in one video and need a
  `start_s` per counter on review.
- Paid channels (Fighting Films+, Judo Fanatics) cannot be embedded; only
  their public uploads are indexed.
- The English word list in `common.py` is short; add words as titles turn
  them up.
