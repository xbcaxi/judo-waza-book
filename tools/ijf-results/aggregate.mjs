/* ---------------------------------------------------------------------------
 * AGGREGATE · the cached crawl to competition-stats/ijf-technique-frequency.json
 *
 *   node tools/ijf-results/aggregate.mjs [--permissive] [--cache <dir>] [--out <file>]
 *
 * Entirely offline: reads the cache the crawl filled, resolves IJF technique
 * names through competition-stats/ijf-technique-map.json and competition names through
 * competition-stats/ijf-competition-tiers.json, writes the one committed data file.
 *
 * An IJF name the map does not carry FAILS the run and nothing is written:
 * the fix is a line in the map, and a silently dropped technique would be a
 * lie in the statistics. --permissive writes anyway with `technique: null`
 * on the unmapped rows, for looking at fresh data before the map catches up;
 * do not commit its output.
 * ------------------------------------------------------------------------ */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { aggregate } from './lib/aggregate.mjs';
import { Cache } from './lib/cache.mjs';
import { normaliseCompetition } from './lib/extract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const { values: options } = parseArgs({
  options: {
    permissive: { type: 'boolean', default: false },
    cache: { type: 'string' },
    out: { type: 'string', default: path.join(root, 'competition-stats', 'ijf-technique-frequency.json') },
    'out-shape': { type: 'string', default: path.join(root, 'competition-stats', 'ijf-contest-shape.json') },
  },
});

const loadJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const map = await loadJson(path.join(root, 'competition-stats', 'ijf-technique-map.json'));
const tiers = await loadJson(path.join(root, 'competition-stats', 'ijf-competition-tiers.json'));

const cache = new Cache(options.cache);
const records = await cache.contestRecords();
if (records.length === 0) {
  console.error('The cache holds no contests. Run the crawl first: node tools/ijf-results/crawl.mjs');
  process.exit(1);
}

/* The raw competition list, re-normalised now rather than trusting the
 * snapshot each contest file froze at crawl time. Without this, teaching the
 * crawler a new competition field would mean re-crawling to see it. */
const rawList = await cache.read('competitions');
const competitions = new Map((rawList ?? [])
  .map(normaliseCompetition)
  .filter((c) => c.id)
  .map((c) => [c.id, c]));
if (!rawList) {
  console.warn('The cache holds no competition list; falling back to the competition data frozen '
    + 'into each contest file. Re-run the crawl to refresh it.');
}

const result = aggregate(records, { map, tiers, competitions, permissive: options.permissive });

/* Everything the maintainer should hear about, whether or not it is fatal. */
if (result.unmatchedCompetitions.size > 0) {
  console.warn(`${result.unmatchedCompetitions.size} competition(s) matched no tier rule and fell to the default:`);
  for (const [id, name] of result.unmatchedCompetitions) console.warn(`  ${id}  ${name}`);
}
if (result.unrecognisedAges.size > 0) {
  console.warn('Unrecognised age groups (recorded as "other"; extend ageGroup() in lib/extract.mjs):');
  for (const [ages, name] of result.unrecognisedAges) console.warn(`  [${ages}]  e.g. ${name}`);
}
if (result.untallied > 0) {
  console.warn(`${result.untallied} tagged event(s) named a technique but carried no scoring group; not counted.`);
}
if (result.unattributedShidos > 0) {
  console.warn(`${result.unattributedShidos} shido event(s) named no athlete and could not count toward `
    + 'a third-shido decision; penalty-decision figures undercount by up to that much.');
}
if (result.unmapped.size > 0) {
  const listed = [...result.unmapped.entries()].sort((a, b) => b[1] - a[1]);
  console.error(`${result.unmapped.size} IJF technique name(s) are not in competition-stats/ijf-technique-map.json:`);
  for (const [name, count] of listed) console.error(`  ${String(count).padStart(6)}  ${name}`);
  if (!options.permissive) {
    console.error('Add them to the map (several IJF names may share one slug) and re-run.');
    console.error('Nothing was written. To look at the data anyway: --permissive (do not commit its output).');
    process.exit(1);
  }
}

if (result.shape.unattributedScores > 0) {
  console.warn(`${result.shape.unattributedScores} scoring event(s) named no athlete, so they count `
    + 'toward technique frequency but not toward who won with them.');
}

const generated = new Date().toISOString().slice(0, 10);
const source = 'IJF public API, data.ijf.org';

const output = {
  generated,
  source,
  coverage: result.coverage,
  rows: result.rows,
  denominators: result.denominators,
  decisions: result.decisions,
};
await writeFile(options.out, JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, options.out)}: ${result.rows.length} rows over `
  + `${result.coverage.competitions} competitions and ${result.coverage.contests} contests `
  + `(${result.coverage.from_year}-${result.coverage.to_year}).`);

/* The contest-level half: what wins where in the draw, which techniques end
 * contests rather than only scoring in them, what athletes are penalised for,
 * how long a division's contests actually last. Written separately because the
 * frequency file's schema is mirrored in the website repository and these
 * answer a different shape of question. See lib/shape.mjs. */
const shape = {
  generated,
  source,
  coverage: result.coverage,
  rounds: result.shape.rounds,
  conversion: result.shape.conversion,
  outcomes: result.shape.outcomes,
  penalties: result.shape.penalties,
  countries: result.shape.countries,
  first_score: result.shape.first_score,
  response: result.shape.response,
  shido_response: result.shape.shido_response,
  trailing: result.shape.trailing,
  examples: result.shape.examples,
};
await writeFile(options['out-shape'], JSON.stringify(shape, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, options['out-shape'])}: `
  + `${shape.rounds.length} round rows, ${shape.conversion.length} conversion rows, `
  + `${shape.outcomes.length} outcome rows, ${shape.penalties.length} penalty rows, `
  + `${shape.countries.length} country rows, ${shape.shido_response.length} shido-response rows, `
  + `${shape.examples.length} clip(s).`);
