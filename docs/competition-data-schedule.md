# Scheduled competition data updates

`.github/workflows/update-competition-data.yml` is manual only. This is what
running it on a schedule needs.

## Not monthly

GitHub evicts an Actions cache after seven days without access.

The response cache is 1.5 GB across 112,043 files. A warm run asks the IJF only
for competitions it has not seen. A monthly run always starts cold: about
36,000 requests at 350 ms, three and a half hours.

The cache is too large to commit or to keep on a branch.

## Five days, current year

Five days keeps the cache inside the eviction window with room for a skipped
run.

Set `--from-year` to the current year on scheduled runs. New competitions only
appear there, so it is about fifty competitions and twenty minutes. Aggregation
reads the whole cache, so the output still covers 2016 to date.

Keep `workflow_dispatch` and its `from_year` input for full fetches.

## Moving the cache path or key

Not needed yet: no crawl cache has ever existed in Actions.

An Actions cache archive records the paths it was created with, so pointing the
action at a new path restores nothing even when the key matches. Migrate in one
run: restore with the old `restore-keys` prefix, move the directory, save under
the new key, then remove the step.

## Fixed 2026-08-29

**Publishing.** The step committed `ijf-technique-frequency.json` only.
`ijf-contest-shape.json` holds the clips, penalties, outcomes and four more
tables the site renders. Both now land together.

**Shrink guard.** A part-restored cache produces a valid file covering a
fraction of the sport. Any table losing more than a tenth of its rows fails the
run.

The guard passes on real data, and its failing path is exercised now: the
rule lives in `tools/ijf-results/lib/shrink.mjs` with tests over both paths,
including the 70,372-rows-to-7 shape the incident had, and the workflow runs
it as `tools/ijf-results/shrink-check.mjs`.

## Remaining

Add `schedule:` at five days, scoped to the current year.
