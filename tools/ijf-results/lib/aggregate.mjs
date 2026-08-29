/* ---------------------------------------------------------------------------
 * AGGREGATE · cached contest records to the committed frequency data
 *
 * Pure: takes the records the crawl cached (each one competition + category
 * context wrapped around a raw contest response) and the two hand-maintained
 * configuration files, returns exactly what ijf-technique-frequency.json
 * should hold plus everything the maintainer needs to hear about - unmapped
 * technique names, competitions no tier rule matched, unrecognised age
 * groups. The CLI decides whether those findings are fatal.
 * ------------------------------------------------------------------------ */
import { ageGroup, decideByPenalty, extractScoringEvents, hasTaggedEvents } from './extract.mjs';
import { ContestShape } from './shape.mjs';
import { tierFor } from './tiers.mjs';

/* Rows are sorted before writing so a re-run over the same cache produces
 * the same bytes and a refresh reads as a diff, not a rewrite. The score
 * axis happens to sort meaningfully as plain text (ippon, waza-ari, yuko);
 * an unmapped technique (null, permissive mode only) sorts last so the gaps
 * sit together at the bottom of the file. */
const rowKey = (row) => [row.technique ?? '￿', row.ijf_name, row.sex, row.weight,
  row.tier, row.age, row.year, row.minute, row.side, row.score].join('|');
const denominatorKey = (row) => [row.sex, row.weight, row.tier, row.age, row.year].join('|');
const decisionKey = (row) => [row.sex, row.weight, row.tier, row.age, row.year, row.minute, row.by].join('|');
export const compareBy = (key) => (a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);

/* The map is keyed by IJF technique name, and the live API's casing does not
 * always match what was written down: the map carries "Kata-guruma" while
 * the API sends "Kata-Guruma". Matching case-insensitively costs nothing and
 * stops a casing drift being reported as an unmapped technique. Rows still
 * record the API's spelling verbatim. */
function indexMap(map) {
  const index = new Map();
  for (const [name, slug] of Object.entries(map)) index.set(name.toLowerCase(), slug);
  return index;
}

/* The statistics window. The crawl reaches back to 2016 because that is where
 * the freely watchable footage is - the IJF published to YouTube until about
 * 2022 and to its own subscription player afterwards - but event tagging is
 * unreliable before 2020, and folding badly tagged contests into a ranking
 * would quietly degrade every figure on the site.
 *
 * So the two uses are separated. A ranking needs reliable tagging; a clip only
 * needs to exist and be watchable. Contests older than this contribute their
 * FOOTAGE and nothing else: no row, no denominator, no penalty, no rank. */
export const STATS_FROM_YEAR = 2020;

export function aggregate(records, {
  map, tiers, competitions: freshCompetitions, permissive = false,
  statsFromYear = STATS_FROM_YEAR,
}) {
  const byName = indexMap(map);
  const rows = new Map();
  const denominators = new Map();
  const decisions = new Map();
  const unmapped = new Map();
  let unattributedShidos = 0;
  const unmatchedCompetitions = new Map();
  const unrecognisedAges = new Map();
  const competitions = new Set();
  const years = [];
  let contests = 0;
  let untallied = 0;
  let excludedParalympic = 0;
  let clipOnlyContests = 0;
  /* The contest-level half of the answer, written to its own file. Fed from
   * inside this loop rather than from a second pass, because walking seventy
   * thousand cached contests twice to tally two things is a waste of the only
   * expensive step here. */
  const shape = new ContestShape();

  for (const record of records) {
    const { category, response } = record;
    const contest = response?.contests?.[0];
    if (!contest) continue;

    /* A cached contest file carries the competition as it was normalised at
     * CRAWL time, which freezes whatever fields the importer knew about then.
     * Prefer the competition re-derived from the cached raw list, so that
     * teaching normaliseCompetition a new field (the tier's `rank_name` was
     * exactly this) costs a re-aggregation and not an eight-hour re-crawl.
     * The frozen snapshot remains the fallback for a cache with no list. */
    const competition = freshCompetitions?.get(record.competition?.id) ?? record.competition;

    const { tier, matched } = tierFor(competition, tiers);
    if (!matched) unmatchedCompetitions.set(competition.id, competition.name);

    /* VI judo is dropped, and it is the one exclusion here that is a judgement
     * rather than arithmetic.
     *
     * Paralympic Games Tokyo 2020 is the ONLY visually impaired event in the
     * IJF's feed carrying results at all - every IBSA World Championship and
     * Grand Prix in the list has has_results = 0 - and across its 39 contests
     * not one event carries a technique tag. So it can never contribute a
     * score, and all it does is add contests to a denominator, which makes
     * every tagging rate it touches look worse than it is and puts a weight
     * class on the page (+70, an IBSA class the IJF does not use) that can
     * never show a row.
     *
     * Excluded rather than kept at zero because a category a reader can select
     * and learn nothing from is worse than one that is not offered. Counted on
     * the way past, and reported in `coverage.excluded`, so that the finding
     * survives: the IJF publishes no technique data for VI judo. That matters
     * to this project more than to most, and it should not be discoverable
     * only by noticing an absence. */
    if (tier === 'paralympic') {
      excludedParalympic += 1;
      continue;
    }


    /* The contest states its own age group and is preferred: it is per
     * contest rather than per competition, and it spells the label out
     * ("Seniors") where the competition list abbreviates ("sen"). The list
     * remains the fallback for a contest that carries none. */
    const ages = contest.age ? [contest.age] : competition.ages;
    const age = ageGroup(ages);
    if (age === 'other' && ages.length > 0) {
      unrecognisedAges.set(ages.join(', '), competition.name);
    }

    const slice = {
      sex: category.gender, weight: category.name, tier, age, year: competition.year,
    };

    const extracted = extractScoringEvents(contest);

    /* Older than the statistics window: take the footage and nothing else.
     *
     * Ahead of the counters, the denominators, the untallied tally and the
     * unmapped report, all of which follow. A 2016 contest must not appear in
     * a coverage figure, must not move a tagging rate, and must not fail the
     * run for naming a technique the map has never seen - because nothing it
     * carries reaches a ranking. Only its clips survive. */
    if (competition.year !== null && competition.year < statsFromYear) {
      shape.harvestClips({
        contest,
        slice,
        events: extracted.events,
        resolve: (ijfName) => byName.get(ijfName.toLowerCase()) ?? null,
      });
      clipOnlyContests += 1;
      continue;
    }

    /* Counted here rather than at the top of the loop, so `coverage` describes
     * what this file HOLDS. Counting an excluded contest would have the
     * coverage block claim contests and competitions the file does not carry. */
    contests += 1;
    competitions.add(competition.id);
    years.push(competition.year);

    /* Denominator: every contest fetched counts, and `tagged` says how many
     * of them carry event tags at all - the honest base for a per-100-
     * contests figure, and the answer to how complete IJF tagging is. */
    const dKey = denominatorKey(slice);
    const d = denominators.get(dKey) ?? { ...slice, contests: 0, tagged: 0 };
    d.contests += 1;
    if (hasTaggedEvents(contest)) d.tagged += 1;
    denominators.set(dKey, d);

    untallied += extracted.untallied;

    /* Contests ended on penalties: the third accumulated shido, or a direct
     * hansoku-make - and, through `minute`, WHEN they end that way, which is
     * where golden score earns its reputation. */
    unattributedShidos += extracted.penalties
      .filter((penalty) => penalty.kind === 'shido' && penalty.actorId === null).length;
    const decision = decideByPenalty(extracted.penalties);
    shape.add({
      contest,
      slice,
      events: extracted.events,
      penalties: extracted.penalties,
      decision,
      resolve: (ijfName) => byName.get(ijfName.toLowerCase()) ?? null,
    });
    if (decision) {
      const row = { ...slice, minute: decision.minute, by: decision.by };
      const key = decisionKey(row);
      const existing = decisions.get(key) ?? { ...row, count: 0 };
      existing.count += 1;
      decisions.set(key, existing);
    }
    for (const { ijfName, score, minute, side } of extracted.events) {
      const technique = byName.get(ijfName.toLowerCase()) ?? null;
      if (technique === null) {
        unmapped.set(ijfName, (unmapped.get(ijfName) ?? 0) + 1);
        if (!permissive) continue; // still recorded above; the CLI will refuse to write
      }
      const row = { technique, ijf_name: ijfName, ...slice, minute, side: side ?? 'unknown', score };
      const key = rowKey(row);
      const existing = rows.get(key) ?? { ...row, count: 0 };
      existing.count += 1;
      rows.set(key, existing);
    }
  }

  /* Categories that recorded no score are NOT pruned here, and the first
   * attempt at this got it wrong. Men's -55 and Open, and women's Open, have
   * tagged contests whose tags are all penalties and never a technique - so
   * dropping the category threw away its penalty decisions with it, and a
   * contest ended on a third shido is a real fact about a division whether or
   * not anybody threw in it.
   *
   * This file records what the IJF published. Deciding which categories are
   * worth OFFERING is the instrument's job, and it is done in the website's
   * profileKeys(), which asks whether a category ever recorded a score before
   * building a shard for it. The data stays faithful; the page declines to
   * offer a menu item it cannot fill. */

  const seenYears = years.filter((y) => Number.isFinite(y));
  return {
    rows: [...rows.values()].sort(compareBy(rowKey)),
    denominators: [...denominators.values()].sort(compareBy(denominatorKey)),
    decisions: [...decisions.values()].sort(compareBy(decisionKey)),
    unattributedShidos,
    coverage: {
      from_year: seenYears.length ? Math.min(...seenYears) : null,
      to_year: seenYears.length ? Math.max(...seenYears) : null,
      competitions: competitions.size,
      contests,
      /* What was left out and why, so the exclusion is not discoverable only
       * by noticing an absence. */
      /* The statistics window. `from_year` above is the earliest year that
       * reaches a ranking; the crawl itself goes back further for footage. */
      stats_from_year: statsFromYear,
      excluded: {
        paralympic_contests: excludedParalympic,
        /* Contests read for their clips alone, being older than the window. */
        pre_window_contests: clipOnlyContests,
      },
    },
    shape: shape.result(),
    unmapped,
    unmatchedCompetitions,
    unrecognisedAges,
    untallied,
  };
}
