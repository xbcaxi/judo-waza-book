# IJF competition results

Sources technique **scoring frequency** from the IJF public API
(`data.ijf.org`) and aggregates it into `competition-stats/ijf-technique-frequency.json`,
which the website reads at build time. Scoring frequency, not attempt
frequency: the API only reliably records scoring events, and any
presentation should say so.

The approach is ported from [judoole/judostats](https://github.com/judoole/judostats)
(no formal licence; ported, not vendored), with one deliberate difference:
katame-waza are kept, because Waza Book's syllabus covers ne-waza, where
judostats discards holds, strangles and armlocks wholesale.

## Running it

```sh
npm run ijf:crawl        # hours, on the first full run - that is deliberate
npm run ijf:aggregate    # offline, seconds, repeatable
npm run validate         # the committed output must pass like everything else
```

The crawl fills `cache/` (gitignored) with every raw response and never
touches `competition-stats/`; the aggregation reads only the cache and never touches the
network. Interrupt the crawl freely - every response is cached as it lands
and the next run resumes. Useful flags on `crawl.mjs`: `--from-year`
(default 2020; tagging is unreliable before then), `--max <n>` for a sanity
run, `--delay <ms>` between requests (default 350 - be polite, there is no
published rate limit), `--force` to re-fetch. Competitions that ended within
the last 60 days are re-crawled automatically, because the IJF adds event
tags after the fact (`--recrawl-days` adjusts this).

**Or run it from GitHub:** the `IJF crawl` workflow
(`.github/workflows/update-competition-data.yml`, manual trigger) runs the same fetch on a
GitHub-hosted runner, which is where a full crawl from 2020 belongs: it
takes hours, and nobody should hold a laptop open for it. It keeps the raw
cache between runs via `actions/cache`, so if the crawl outlasts the job
limit or some requests fail, re-run and it resumes; when the strict
aggregation succeeds and validates, the refreshed data lands on the
`ijf-data-refresh` branch for a human to open a pull request from. For a
first sanity run, set the `max` input to 3.

The aggregation FAILS on any IJF technique name missing from
`competition-stats/ijf-technique-map.json`, printing the names by count: add them to the
map (several IJF names may share one slug) and re-run. `--permissive` writes
anyway with `technique: null` for looking at fresh data; validation rejects
its output, so it cannot be committed by accident.

It also reports, without failing: competitions no tier rule in
`competition-stats/ijf-competition-tiers.json` matched (extend the rules or add an
override by `id_competition`), unrecognised age-group labels, and tagged
events that named a technique without a scoring group.

## Cache layout

```
cache/competitions.json                      raw competition list
cache/<id>/categories.json                   raw categories_full response
cache/<id>/contests-<id_weight>.json         raw contest list
cache/<id>/contest-<code>.json               { competition, category, response }
cache/<id>/done.json                         crawled completely, and when
```

## What the first real run established

The importer was written against the design note and the judostats code
without ever reaching the API. It has since been run for real, over three
2026 competitions and 736 contests, and the field contract was wrong in
ways worth recording. `lib/extract.mjs` and the end-to-end mock now encode
the live shapes rather than the assumed ones.

**Times.** There is no `time` field. `time_sc` is the contest clock in
decimal seconds and counts UP; `time_real` is wall-clock including matte
stoppages and must not be used for the minute axis (a contest that goes the
full four minutes ends with a last event at `time_sc` 234 and `time_real`
426.77). `is_gs` flags golden score outright, so it never has to be inferred
from the clock, which keeps running through it. `fight_duration` carries the
contest's own regular-time length. Before this was found, every event
produced `minute: "unknown"` and the axis was empty while still validating.

**Ages.** The competition list abbreviates (`sen`, `jun`, `cad`, `u23`);
a contest spells it out (`Seniors`). Both are read, and the contest wins.
`u23` is a real IJF category and is now in the schema.

**Penalties.** The timeline logs only the first TWO shidos as shido events
and records the third as its own `HSK (3rd shido)` event. Counting to three
therefore never fires, and `actors[0]` on shido events frequently disagrees
with the athlete the marker names, so it cannot be trusted to say who was
penalised. The marker decides; accumulation survives only as a fallback.
Over the 736-contest sample this is the difference between finding 18
penalty endings and 38. Direct hansoku-make is also flagged on the contest
itself as `hsk_w` / `hsk_b`.

**Cancellations.** A downgrade on review is ONE event carrying both the
cancelled score and the technique that replaced it, in the surviving score's
group (`Cancel Waza-ari` and `O-soto-gaeshi`, both "Yuko"). Cancel-named
tags are dropped before the technique is read, or the surviving score goes
with them.

**Direction.** The tag's `group_name` mirrors the score rather than saying
"Direction", so the side is read from `code_short`. It is present on 351 of
395 scores; the gaps are overwhelmingly ne-waza. No technique name was seen
to embed left or right.

The `side` axis is **read as the direction the throw went**. That is a
maintainers' decision, not something the IJF documents: the tag could as
easily mean the thrower's dominant side, and telling the two apart needs
footage, not more data. It is recorded here so that a later look at video
knows what it is checking, and so that anything presenting this axis says
"the direction of the throw" rather than implying the IJF said so.

**Non-techniques.** `Fusen-Gachi` (a walkover) arrives in the "Ippon" group
without anybody being thrown; it and `Kiken-Gachi` are excluded by
`code_short`, since mapping them would put phantom ippons against a
technique.

**Casing.** The API sends `Kata-Guruma` where the map says `Kata-guruma`.
Both the aggregation and `scripts/validate.mjs` resolve the map
case-insensitively.

**Tiers.** `rank_name` is the tier field the design note hoped for: every
competition carries one, from a closed set of 24 (Grand Slam, European Open,
Olympic Games, Kata Tournament and so on). `competition-stats/ijf-competition-tiers.json`
now matches it exactly in `rankRules`, and the old name-substring rules
remain underneath it as the fallback for a rank the table has not been
taught. This is what reaches an event whose title says nothing a rule
matched, which is why Commonwealth Games Glasgow 2026 used to fall to the
default.

### Still open

- **What proportion of contests carry tagged events, by tier.** The first
  evidence is stark, though it is one competition per tier: ijf-tour 338 of
  338 contests tagged, continental 81 of 188, continental-open 92 of 210.
  If a wider crawl holds that shape, then outside the IJF world tour fewer
  than half the contests carry tags, and a per-100-contests figure for those
  tiers describes IJF tagging effort as much as it describes judo. The
  `tagged` denominators carry this per slice; any presentation should divide
  by `tagged`, not by `contests`.
- **What the direction tag means**, as above: assumed, not confirmed.

## Visually impaired judo is not in this data

There is nothing to split out. Of 1037 competitions the IJF list carries 11
VI or para events (IBSA Grand Prix and World Cup events, three Paralympic
Games); ten of them report `has_results: "0"` and hold no contests at all.
The single exception, Paralympic Games Tokyo 2020, returns its contests but
every one of them has an empty timeline: sampling all 16 contests in -60kg
found zero events, tagged or otherwise. A VI slice would be an empty column,
so the importer does not pretend to offer one.

Two things to know if that ever changes. IBSA events are NOT identifiable by
`rank_name` - they are filed as "European Open", "Asian Open" or "Grand
Prix" like any other event - so a tier rule would have to match
`competition_code`, which prefixes them `gp_ibsa_`, `wcup_ibsa_`, `ibsa` or
`para_`/`pg_`. And IBSA runs its own competitions and its own records, so
the data, if it exists anywhere, is more likely to be theirs than the IJF's.

## Terms

Competition data is sourced from the International Judo Federation via
data.ijf.org and remains IJF property; see NOTICE.md. Contests link back to
judobase.ijf.org - media is never rehosted. The `competitor.info` endpoint
is deliberately not wrapped: it returns personal data about named
individuals, which frequency work does not need and the knowledge store
must not hold.

## Updating the data locally

    npm run ijf:update

One command for the whole routine: fetch what is new, rebuild both files in
`competition-stats/`, validate them, and report what changed. It never commits;
data reaches `main` by review like everything else.

It is cheap when the cache is warm. The fetch skips any competition already
cached that ended more than 60 days ago, so a routine run asks the IJF only for
genuinely new events and for recent ones whose event tags may still be
arriving. On a quiet day it finishes in seconds and says so.

Two things it does that chaining the steps by hand would not:

- **It refuses to run from a cold or part-restored cache.** Aggregating from
  half a cache writes a SMALLER data file that still validates, and committing
  that would quietly replace good data with less of it.
- **It tells you when the only change is the timestamp.** Both files carry the
  date they were generated, so a run on a quiet day leaves a dirty tree whose
  entire diff is that one line. It says so rather than leaving you to read the
  diff and work it out.

The two steps are still available separately, `npm run ijf:fetch` and
`npm run ijf:aggregate`, and any argument passed to `ijf:update` is forwarded
to the fetch:

    npm run ijf:update -- --from-year 2016
    npm run ijf:update -- --max 3          # a sanity run

The raw cache is gitignored and is the only copy of about 112,000 API
responses. Rebuilding it from nothing is roughly three and a half hours, so it
is worth backing up.

## Scheduled updates

Not built. The workflow is manual only. Monthly is the one interval that cannot
work, because GitHub evicts an unused Actions cache after seven days and the
cache is what makes a run cheap. See
[docs/competition-data-schedule.md](../../docs/competition-data-schedule.md)
for the plan, including two bugs in the publish step worth fixing first.
