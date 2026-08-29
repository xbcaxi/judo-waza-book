/* The whole pipeline against a local mock of the IJF API: crawl fills a
 * cache from the mock, aggregate turns the cache into the committed shape,
 * and the result must satisfy the repository's own schema. This is as close
 * to a live run as CI can get, and the mock's shapes are no longer guesses:
 * they were corrected against real responses on the first live crawl (see
 * the importer README). Anything changed here is a claim about the live API. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const toolDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(toolDir, '..', '..');

const tag = (name, group) => ({ name, code_short: name.toLowerCase().replace(/-/g, '_'), group_name: group });
/* Regular time, and the contest clock in decimal seconds counting up. A
 * direction tag's group_name mirrors the score, golden score is flagged by
 * is_gs rather than inferred, and the third shido arrives as its own
 * "HSK (3rd shido)" event after only two plain shidos - all of it as
 * observed on the live API. */
const fight_duration = '240';
const contests = {
  gs_tst2025_0001_m_0073_0001: {
    fight_duration,
    events: [
      { time_sc: '45.00', is_gs: '0', tags: [tag('Uchi-mata', 'Ippon'), tag('Right', 'Ippon')] },
      { time_sc: '130.00', is_gs: '0', tags: [tag('Shido', 'Shido')] },
    ],
  },
  gs_tst2025_0002_m_0073_0002: {
    fight_duration,
    events: [
      { time_sc: '239.00', is_gs: '0', tags: [tag('O-uchi-gari', 'Waza-ari')] },
      { time_sc: '60.00', is_gs: '0', tags: [tag('Shido', 'Shido')], actors: [{ id_person: 222 }] },
      { time_sc: '150.00', is_gs: '0', tags: [tag('Shido', 'Shido')], actors: [{ id_person: 222 }] },
      { time_sc: '270.00', is_gs: '1', tags: [tag('HSK', 'HSK (3rd shido)')], actors: [{ id_person: 222 }] },
    ],
  },
  gs_tst2025_0003_m_0073_0003: {
    fight_duration,
    events: [{ time_sc: '281.00', is_gs: '1', tags: [tag('Kuzure-kesa-gatame', 'Waza-ari-awasete-ippon')] }],
  },
  gs_tst2025_0004_m_0073_0004: {
    fight_duration,
    /* A walkover, which is not a technique, alongside a real score: the
     * aggregation must keep one and drop the other. */
    events: [
      { time_sc: '50.00', is_gs: '0', tags: [tag('Uchi-mata', 'Ippon'), tag('Left', 'Ippon')] },
      { time_sc: '50.00', is_gs: '0', tags: [tag('Fusen-Gachi', 'Ippon')] },
    ],
  },
};

function mockApi(request, response) {
  const url = new URL(request.url, 'http://localhost');
  const p = (key) => url.searchParams.get(`params[${key}]`);
  let body;
  if (p('action') === 'competition.get_list') {
    body = [
      /* Old and untagged: the year filter must drop it before any further call. */
      { id_competition: 1, name: 'Tokyo Grand Slam 1999', comp_year: 1999, date_to: '1999-12-05', city: 'Tokyo', ages: ['Seniors'], has_results: '112' },
      { id_competition: 2, name: 'Test Grand Slam 2025', comp_year: 2025, date_to: '2025-02-02', city: 'Testville', ages: ['Seniors'], has_results: '112' },
      /* In range and never crawlable: has_results "0" is what the live list
       * gives a scheduled event or a training camp. If the filter let it
       * through, the crawl would visit two competitions and fetch the mock's
       * contests twice over, which every count below would catch. */
      { id_competition: 3, name: 'Test Training Camp 2025', comp_year: 2025, date_to: '2025-03-02', city: 'Testville', ages: ['Seniors'], has_results: '0' },
    ];
  } else if (p('action') === 'competition.categories_full') {
    body = { 1: { gender: 'm', categories: { 3: '-73' } } };
  } else if (p('action') === 'contest.find' && p('contest_code')) {
    body = { contests: [{ code: p('contest_code'), ...contests[p('contest_code')] }] };
  } else if (p('action') === 'contest.find') {
    body = { contests: Object.keys(contests).map((code) => ({ code: code.slice(-4), contest_code_long: code })) };
  } else {
    response.writeHead(404).end();
    return;
  }
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

test('crawl then aggregate, mock API to committed schema', async () => {
  const server = createServer(mockApi);
  await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}/api/get_json`;
  const dir = await mkdtemp(path.join(tmpdir(), 'ijf-results-test-'));

  try {
    const cacheDir = path.join(dir, 'cache');
    const outFile = path.join(dir, 'out.json');
    /* Both outputs go to the temporary directory. Passing only --out once
     * meant the run wrote its four-contest fixture over the real
     * competition-stats/ijf-contest-shape.json, because that path is where
     * --out-shape defaults. Any output this CLI grows needs redirecting here
     * in the same breath as it is added. */
    const shapeFile = path.join(dir, 'shape.json');
    const environment = { ...process.env, IJF_BASE_URL: base };

    const crawl = await run(process.execPath, [
      path.join(toolDir, 'crawl.mjs'), '--cache', cacheDir, '--delay', '0',
    ], { env: environment });
    assert.match(crawl.stdout, /1 competitions with results from 2020 on \(1 without results skipped\)\./);
    assert.match(crawl.stdout, /4 contest details fetched/);

    /* A second run finds everything cached and fetches only the list. */
    const again = await run(process.execPath, [
      path.join(toolDir, 'crawl.mjs'), '--cache', cacheDir, '--delay', '0',
    ], { env: environment });
    assert.match(again.stdout, /0 contest details fetched/);

    const aggregate = await run(process.execPath, [
      path.join(toolDir, 'aggregate.mjs'), '--cache', cacheDir, '--out', outFile,
      '--out-shape', shapeFile,
    ], { env: environment });
    assert.match(aggregate.stdout, /4 rows over 1 competitions and 4 contests/);

    const output = JSON.parse(await readFile(outFile, 'utf8'));
    assert.deepEqual(output.coverage, {
      from_year: 2025, to_year: 2025, competitions: 1, contests: 4,
      stats_from_year: 2020,
      excluded: { paralympic_contests: 0, pre_window_contests: 0 },
    });
    /* The two Uchi-mata ippon both fell in the first minute but to opposite
     * sides, so the side axis keeps them apart; the hold in golden score
     * (with no direction tag - holds may carry none) and the waza-ari at the
     * death of regular time keep their own rows. */
    assert.deepEqual(output.rows.map((r) => [r.technique, r.minute, r.side, r.score, r.count]), [
      ['kuzure-kesa-gatame', 'gs', 'unknown', 'ippon', 1],
      ['o-uchi-gari', '4', 'unknown', 'waza-ari', 1],
      ['uchi-mata', '1', 'left', 'ippon', 1],
      ['uchi-mata', '1', 'right', 'ippon', 1],
    ]);
    assert.deepEqual(output.denominators, [{
      sex: 'm', weight: '-73', tier: 'ijf-tour', age: 'senior', year: 2025, contests: 4, tagged: 4,
    }]);
    /* The three shidos to athlete 222, the third in golden score: one
     * contest decided on penalties, timed to when it happened. */
    assert.deepEqual(output.decisions, [{
      sex: 'm', weight: '-73', tier: 'ijf-tour', age: 'senior', year: 2025, minute: 'gs', by: 'third-shido', count: 1,
    }]);

    /* The contest-level file, from the same run over the same four contests.
     * These fixtures carry no round_name, no contest-level `gs` and no
     * duration, which is the useful case to pin: a response missing those
     * fields must degrade honestly rather than guess. */
    const shape = JSON.parse(await readFile(shapeFile, 'utf8'));
    assert.deepEqual(shape.coverage, output.coverage, 'both files describe the same crawl');
    assert.ok(shape.rounds.length > 0, 'the draw depth of every score is recorded');
    assert.ok(shape.rounds.every((row) => row.round === 'unknown'),
      'no round_name means unknown, never a guess at preliminary');
    const [outcome] = shape.outcomes;
    assert.equal(outcome.contests, 4);
    assert.equal(outcome.by_penalty, 1, 'the contest the third shido ended');
    /* Two contests reached golden score, and the fixture says so only on its
     * events. Reading the contest's own flag alone would have found none. */
    assert.equal(outcome.golden_score, 2);
    assert.equal(outcome.seconds_p50, null, 'no duration on any fixture contest');

    /* Both generated files must satisfy the schemas CI holds the committed
     * ones to, or the first real crawl would fail validation on arrival. */
    const { default: Ajv } = await import('ajv');
    const ajv = new Ajv({ allErrors: true, strict: false });
    const schema = JSON.parse(await readFile(path.join(root, 'schema/ijf-technique-frequency.schema.json'), 'utf8'));
    const valid = ajv.compile(schema);
    assert.ok(valid(output), JSON.stringify(valid.errors, null, 2));
    const shapeSchema = JSON.parse(await readFile(path.join(root, 'schema/ijf-contest-shape.schema.json'), 'utf8'));
    const shapeValid = ajv.compile(shapeSchema);
    assert.ok(shapeValid(shape), JSON.stringify(shapeValid.errors, null, 2));
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
