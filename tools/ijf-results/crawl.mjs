/* ---------------------------------------------------------------------------
 * CRAWL · fetch competitions, categories and contests into the local cache
 *
 *   node tools/ijf-results/crawl.mjs [options]
 *
 *   --from-year <n>     earliest competition year to crawl (default 2020:
 *                       event tagging is sparse before ~2015 and unreliable
 *                       before 2020)
 *   --max <n>           stop after this many competitions (a sanity run)
 *   --delay <ms>        pause between API requests (default 350)
 *   --recrawl-days <n>  re-crawl competitions that ended within the last n
 *                       days even when already cached, because the IJF adds
 *                       event tags after the fact (default 60)
 *   --force             re-fetch everything, cached or not
 *
 * The crawl only fills the cache; it never touches competition-stats/. Run
 * aggregate.mjs afterwards - that step is offline and repeatable.
 * A first full crawl from 2020 takes hours at this request rate; that is
 * deliberate. Interrupt it freely: every response is cached as it lands,
 * and the next run resumes where this one stopped.
 * ------------------------------------------------------------------------ */
import { parseArgs } from 'node:util';
import { IjfClient } from './lib/api.mjs';
import { Cache } from './lib/cache.mjs';
import { normaliseCompetition, flattenCategories, hasTaggedEvents } from './lib/extract.mjs';

const { values: options } = parseArgs({
  options: {
    'from-year': { type: 'string', default: '2020' },
    max: { type: 'string' },
    delay: { type: 'string', default: '350' },
    'recrawl-days': { type: 'string', default: '60' },
    force: { type: 'boolean', default: false },
    cache: { type: 'string' },
  },
});

const fromYear = Number(options['from-year']);
const maxCompetitions = options.max ? Number(options.max) : Infinity;
const recrawlMs = Number(options['recrawl-days']) * 24 * 60 * 60 * 1000;

const client = new IjfClient({ delayMs: Number(options.delay) });
const cache = new Cache(options.cache);
const failures = [];

/* The list itself is cached for aggregation's benefit, but a crawl wants
 * the live one: new competitions are the whole point of a re-run. */
const rawList = await client.competitionList();
if (!rawList) {
  console.error('Could not fetch the competition list; nothing to do. Retry later.');
  process.exit(1);
}
await cache.write(['competitions'], rawList);

/* Competitions with no results are dropped before anything is fetched.
 * Newest-first means the head of the list is scheduled-but-not-held events,
 * and each one otherwise costs a categories call plus a contest-list call
 * per weight - about fifteen requests to be told the contest list is empty.
 * The same flag also drops training camps, refereeing seminars and kata
 * tournaments, which are in the list and never have contests. */
const all = rawList
  .map(normaliseCompetition)
  .filter((c) => c.id && c.name && c.year !== null && c.year >= fromYear);
const competitions = all
  .filter((c) => c.hasResults)
  /* Newest first: the recent competitions are the ones still gaining tags,
   * and the ones a partial run should prioritise. */
  .sort((a, b) => (b.year - a.year) || String(b.dateTo).localeCompare(String(a.dateTo)));

console.log(`${competitions.length} competitions with results from ${fromYear} on `
  + `(${all.length - competitions.length} without results skipped).`);

let crawled = 0;
let contestsFetched = 0;

for (const competition of competitions) {
  if (crawled >= maxCompetitions) break;

  /* A done-marker means the competition was crawled to the end with no
   * failed request. Recent competitions are re-crawled regardless, because
   * event tags arrive after the event. */
  const done = await cache.read(competition.id, 'done');
  const endedAt = Date.parse(competition.dateTo ?? '');
  const recent = !Number.isFinite(endedAt) || Date.now() - endedAt < recrawlMs;
  const refetch = options.force || (done && recent);
  if (done && !recent && !options.force) continue;

  crawled += 1;
  console.log(`[${crawled}] ${competition.name} (${competition.year}, id ${competition.id})`);
  let failed = false;

  const rawCategories = refetch ? null : await cache.read(competition.id, 'categories');
  const categories = rawCategories ?? await client.categories(competition.id);
  if (!categories) { failures.push(`${competition.id}: categories`); continue; }
  await cache.write([competition.id, 'categories'], categories);

  for (const category of flattenCategories(categories)) {
    const listKey = [competition.id, `contests-${category.idWeight}`];
    const cachedList = refetch ? null : await cache.read(...listKey);
    const contestList = cachedList ?? await client.contests(competition.id, category.idWeight);
    if (!contestList) { failures.push(`${competition.id}/${category.idWeight}: contest list`); failed = true; continue; }
    await cache.write(listKey, contestList);

    const codes = (contestList.contests ?? [])
      .map((c) => c.contest_code_long ?? c.code)
      .filter(Boolean);

    /* One contest's detail, cache first. Returns the contest object or null;
     * null is a failure, an empty response is "no data" and cached as such. */
    const fetchDetail = async (code) => {
      const key = [competition.id, `contest-${code}`];
      if (!refetch) {
        const cached = await cache.read(...key);
        if (cached) return cached.response?.contests?.[0] ?? {};
      }
      const response = await client.contestDetail(code);
      if (!response) return null;
      contestsFetched += 1;
      await cache.write(key, { competition, category, response });
      return response.contests?.[0] ?? {};
    };

    /* The judostats heuristic: sample the first three contests, and if none
     * carries a single tagged event, the category is untagged - skip it
     * rather than spend thousands of calls confirming emptiness. */
    const sample = [];
    for (const code of codes.slice(0, 3)) {
      const contest = await fetchDetail(code);
      if (contest === null) {
        failures.push(`${competition.id}/${code}: contest detail`);
        failed = true;
      }
      sample.push(contest);
    }
    if (!sample.some((contest) => contest && hasTaggedEvents(contest))) continue;

    for (const code of codes.slice(3)) {
      if (await fetchDetail(code) === null) {
        failures.push(`${competition.id}/${code}: contest detail`);
        failed = true;
      }
    }
  }

  if (!failed) {
    await cache.write([competition.id, 'done'], { crawled: new Date().toISOString(), dateTo: competition.dateTo });
  }
}

console.log(`Done: ${crawled} competitions visited, ${contestsFetched} contest details fetched, `
  + `${client.requests} API requests.`);
if (failures.length > 0) {
  console.error(`${failures.length} request(s) failed and will be retried next run:\n- ${failures.slice(0, 20).join('\n- ')}`
    + (failures.length > 20 ? `\n- ... and ${failures.length - 20} more` : ''));
  process.exitCode = 1;
} else {
  console.log('Now aggregate: node tools/ijf-results/aggregate.mjs');
}
