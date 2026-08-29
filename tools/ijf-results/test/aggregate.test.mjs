import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate } from '../lib/aggregate.mjs';

const map = { 'Uchi-mata': 'uchi-mata', 'O-uchi-gari': 'o-uchi-gari', 'Kesa-gatame': 'kesa-gatame' };
const tiers = {
  rules: [{ match: 'Grand Slam', tier: 'ijf-tour' }],
  overrides: {},
  default: 'other',
};

/* These fixture events carry no time and no direction tag, so every row
 * lands in minute "unknown" and side "unknown"; the buckets themselves are
 * extract.test.mjs's business. */
const tag = (name, group) => ({ name, code_short: name.toLowerCase(), group_name: group });
const contestWith = (...events) => ({ contests: [{ events: events.map((tags) => ({ tags })) }] });

const paris = { id: '100', name: 'Paris Grand Slam 2025', year: 2025, dateTo: '2025-02-02', city: 'Paris', ages: ['Seniors'] };
const m73 = { idWeight: '3', name: '-73', gender: 'm' };
const f48 = { idWeight: '8', name: '-48', gender: 'f' };

test('scoring events are counted into rows keyed by every axis', () => {
  const records = [
    { competition: paris, category: m73, response: contestWith([tag('Uchi-mata', 'Ippon')], [tag('Uchi-mata', 'Ippon')]) },
    { competition: paris, category: m73, response: contestWith([tag('Uchi-mata', 'Waza-ari')]) },
    { competition: paris, category: f48, response: contestWith([tag('O-uchi-gari', 'Ippon')]) },
  ];
  const { rows, coverage } = aggregate(records, { map, tiers });
  assert.deepEqual(rows, [
    { technique: 'o-uchi-gari', ijf_name: 'O-uchi-gari', sex: 'f', weight: '-48', tier: 'ijf-tour', age: 'senior', year: 2025, minute: 'unknown', side: 'unknown', score: 'ippon', count: 1 },
    { technique: 'uchi-mata', ijf_name: 'Uchi-mata', sex: 'm', weight: '-73', tier: 'ijf-tour', age: 'senior', year: 2025, minute: 'unknown', side: 'unknown', score: 'ippon', count: 2 },
    { technique: 'uchi-mata', ijf_name: 'Uchi-mata', sex: 'm', weight: '-73', tier: 'ijf-tour', age: 'senior', year: 2025, minute: 'unknown', side: 'unknown', score: 'waza-ari', count: 1 },
  ]);
  assert.deepEqual(coverage, {
    from_year: 2025, to_year: 2025, competitions: 1, contests: 3,
    /* Nothing was excluded from this fixture, and the block is still present:
     * a reader of the committed file should never have to work out whether
     * zero exclusions means none happened or means the field is missing. */
    stats_from_year: 2020,
    excluded: { paralympic_contests: 0, pre_window_contests: 0 },
  });
});

test('denominators count every contest, and separately the tagged ones', () => {
  const records = [
    { competition: paris, category: m73, response: contestWith([tag('Uchi-mata', 'Ippon')]) },
    { competition: paris, category: m73, response: contestWith() }, // decided on penalties, say
    { competition: paris, category: m73, response: { contests: [{ events: [{ tags: [] }] }] } }, // untagged
  ];
  const { denominators } = aggregate(records, { map, tiers });
  assert.deepEqual(denominators, [
    { sex: 'm', weight: '-73', tier: 'ijf-tour', age: 'senior', year: 2025, contests: 3, tagged: 1 },
  ]);
});

test('an unmapped name is reported and, in strict mode, kept out of the rows', () => {
  const records = [
    { competition: paris, category: m73, response: contestWith([tag('Some-new-label', 'Ippon')], [tag('Uchi-mata', 'Ippon')]) },
  ];
  const strict = aggregate(records, { map, tiers });
  assert.deepEqual([...strict.unmapped.entries()], [['Some-new-label', 1]]);
  assert.deepEqual(strict.rows.map((r) => r.technique), ['uchi-mata']);

  const permissive = aggregate(records, { map, tiers, permissive: true });
  assert.deepEqual(permissive.rows.map((r) => r.technique), ['uchi-mata', null]);
  assert.equal(permissive.rows[1].ijf_name, 'Some-new-label');
});

test('a competition no tier rule matches is reported alongside its default', () => {
  const kata = { ...paris, id: '200', name: 'Kodokan Kata Festival' };
  const records = [{ competition: kata, category: m73, response: contestWith() }];
  const result = aggregate(records, { map, tiers });
  assert.deepEqual([...result.unmatchedCompetitions.entries()], [['200', 'Kodokan Kata Festival']]);
  assert.equal(result.denominators[0].tier, 'other');
});

test('an unrecognised age group is recorded as other and reported', () => {
  const masters = { ...paris, id: '300', name: 'Masters Invitational', ages: ['Masters'] };
  const records = [{ competition: masters, category: m73, response: contestWith() }];
  const result = aggregate(records, { map, tiers });
  assert.equal(result.denominators[0].age, 'other');
  assert.deepEqual([...result.unrecognisedAges.keys()], ['Masters']);
});

/* The contest states its own age group and wins where it has one; the
 * competition list, which abbreviates, is the fallback. */
test('the age group comes from the contest, falling back to the competition', () => {
  const short = { ...paris, id: '400', ages: ['u23'] };
  const fromList = aggregate([{ competition: short, category: m73, response: contestWith() }], { map, tiers });
  assert.equal(fromList.denominators[0].age, 'u23');

  const response = { contests: [{ age: 'Juniors', events: [] }] };
  const fromContest = aggregate([{ competition: short, category: m73, response }], { map, tiers });
  assert.equal(fromContest.denominators[0].age, 'junior');
  assert.equal(fromContest.unrecognisedAges.size, 0);
});

/* The live timeline logs two shidos and then its own third-shido marker,
 * so this is the shape that actually decides a contest on penalties. */
test('a contest ended by the third-shido marker lands in decisions, timed', () => {
  const shido = (id, time_sc) => ({ time_sc, is_gs: '0', tags: [tag('Shido', 'Shido')], actors: [{ id_person: id }] });
  const response = {
    contests: [{
      fight_duration: '240',
      events: [shido(1, '60.00'), shido(2, '150.00'),
        { time_sc: '300.00', is_gs: '1', tags: [tag('HSK', 'HSK (3rd shido)')], actors: [{ id_person: 2 }] }],
    }],
  };
  const result = aggregate([{ competition: paris, category: m73, response }], { map, tiers });
  assert.deepEqual(result.decisions, [
    { sex: 'm', weight: '-73', tier: 'ijf-tour', age: 'senior', year: 2025, minute: 'gs', by: 'third-shido', count: 1 },
  ]);
  assert.deepEqual(result.rows, []);
  assert.equal(result.unattributedShidos, 0);
});

/* Casing drift between the map and the API is not an unmapped technique.
 * The map says "Kesa-gatame"; the API has been seen to send "Kata-Guruma"
 * where the map says "Kata-guruma". */
test('a technique name matches the map whatever its casing', () => {
  const records = [{ competition: paris, category: m73, response: contestWith([tag('KESA-GATAME', 'Ippon')]) }];
  const result = aggregate(records, { map, tiers });
  assert.equal(result.unmapped.size, 0);
  assert.equal(result.rows[0].technique, 'kesa-gatame');
  /* The row still records what the API actually sent. */
  assert.equal(result.rows[0].ijf_name, 'KESA-GATAME');
});

test('an unattributed shido is reported, never guessed into a decision', () => {
  const response = { contests: [{ events: [{ tags: [tag('Shido', 'Shido')] }] }] };
  const result = aggregate([{ competition: paris, category: m73, response }], { map, tiers });
  assert.equal(result.unattributedShidos, 1);
  assert.deepEqual(result.decisions, []);
});

test('a null or empty response contributes nothing rather than crashing', () => {
  const records = [
    { competition: paris, category: m73, response: null },
    { competition: paris, category: m73, response: { contests: [] } },
  ];
  const { rows, coverage } = aggregate(records, { map, tiers });
  assert.deepEqual(rows, []);
  assert.equal(coverage.contests, 0);
});

test('output order is deterministic whatever order the cache walked in', () => {
  const records = [
    { competition: paris, category: f48, response: contestWith([tag('Kesa-gatame', 'Ippon')]) },
    { competition: paris, category: m73, response: contestWith([tag('Uchi-mata', 'Ippon')]) },
  ];
  const forward = aggregate(records, { map, tiers });
  const reversed = aggregate([...records].reverse(), { map, tiers });
  assert.deepEqual(forward.rows, reversed.rows);
  assert.deepEqual(forward.denominators, reversed.denominators);
});

/* THE STATISTICS WINDOW. The crawl reaches back to 2016 because that is where
 * the freely watchable footage is, but event tagging is unreliable before 2020
 * and a badly tagged contest must not move a ranking. So an older contest
 * contributes its FOOTAGE and nothing else: no row, no denominator, no
 * coverage, and no failure for naming a technique the map has never seen. */
test('a contest older than the window gives up its clips and nothing else', () => {
  const old2018 = { id: '77', name: 'Paris Grand Slam 2018', year: 2018, dateTo: '2018-02-11', city: 'Paris', ages: ['Seniors'] };
  const withVideo = (...events) => ({
    contests: [{
      round_name: 'Final',
      contest_code_long: 'gs_fra2018_m_0073_0100',
      competition_name: 'Paris Grand Slam 2018',
      media: 'yt*abc123def45*00:00:09',
      events: events.map((tags) => ({
        tags, time_real: '100.00', video_offset: '-5.00', actors: [{ actor_type: 'competitor', id_person: '1' }],
      })),
    }],
  });

  const result = aggregate([
    { competition: paris, category: m73, response: contestWith([tag('Uchi-mata', 'Ippon')]) },
    { competition: old2018, category: m73, response: withVideo([tag('Uchi-mata', 'Ippon')]) },
  ], { map, tiers });

  /* Only the 2025 contest is counted anywhere. */
  assert.equal(result.coverage.contests, 1);
  assert.equal(result.coverage.competitions, 1);
  assert.equal(result.coverage.from_year, 2025);
  assert.equal(result.coverage.excluded.pre_window_contests, 1);
  assert.equal(result.rows.reduce((n, row) => n + row.count, 0), 1);
  assert.equal(result.denominators.length, 1);

  /* But its footage is kept, and dated to the year it happened rather than to
   * the window. */
  const clips = result.shape.examples;
  assert.equal(clips.length, 1);
  assert.equal(clips[0].year, 2018);
  assert.equal(clips[0].contest, 'gs_fra2018_m_0073_0100');
  assert.equal(clips[0].technique, 'uchi-mata');
  assert.equal(clips[0].seconds, 104, 'media start 9 + time_real 100 + offset -5');
});

/* An unmapped name in an out-of-window contest is not a failure: nothing from
 * that contest reaches a ranking, so there is nothing for the map to fix. */
test('an unmapped technique outside the window does not stop the run', () => {
  const old2017 = { id: '78', name: 'Paris Grand Slam 2017', year: 2017, dateTo: '2017-02-11', city: 'Paris', ages: ['Seniors'] };
  const { unmapped } = aggregate([
    { competition: old2017, category: m73, response: contestWith([tag('Nobody-Has-Mapped-This', 'Ippon')]) },
  ], { map, tiers });
  assert.equal(unmapped.size, 0);
});
