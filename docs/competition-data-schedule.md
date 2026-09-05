# Scheduled competition data updates

`.github/workflows/update-competition-data.yml` runs on a schedule as of
2026-09-05, and by hand whenever asked. This is why the schedule is what it
is, and what the first live runs still have to prove.

## Not monthly

GitHub evicts an Actions cache after seven days without access.

The response cache is 1.5 GB across 112,043 files. A warm run asks the IJF only
for competitions it has not seen. A monthly run always starts cold: about
36,000 requests at 350 ms, three and a half hours.

The cache is too large to commit or to keep on a branch.

## Five days, current year

Five days keeps the cache inside the seven-day eviction window.

Cron cannot express it, so `0 3 */5 * *` is the 1st, 6th, 11th, 16th, 21st and
26th at 03:00 UTC. Every gap is five days except the month's last, which is
three to six depending on the month's length. Six is still inside the window.
There is NOT room for a skipped run, which an earlier draft of this note
claimed: two missed runs in a row is eleven days and a cold cache. The cost of
that is one slow crawl, not lost data, because the cache only ever accelerates
a fetch the IJF would serve again.

`--from-year` is the current year on scheduled runs. New competitions only
appear there, so it is about fifty competitions and twenty minutes. Aggregation
reads the whole cache, so the output still covers 2016 to date.

A scheduled event carries no inputs, so the `workflow_dispatch` defaults do not
apply to it and the crawl step supplies its own: the current year and 350 ms.
The manual trigger still wins wherever somebody typed something, which is how a
full fetch from 2016 is asked for.

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

The guard passes on real data. Its failing path has not been exercised.

## Remaining

Watch the first scheduled runs. Three things are still unproven in Actions: no
crawl cache has ever been saved there, so the first run is a cold fetch of the
current year and the second is the first warm one; the shrink guard's failing
path has never fired; and nothing yet says whether a scheduled run that opens
the `ijf-data-refresh` branch is noticed by anyone, since it waits for a human
to raise the pull request.
