import test from 'node:test';
import assert from 'node:assert/strict';
import { ContestShape, median, parseMedia } from '../lib/shape.mjs';
import { contestSeconds, roundGroup } from '../lib/extract.mjs';

const slice = { sex: 'f', weight: '-48', tier: 'ijf-tour', age: 'senior', year: 2026 };
const resolve = (name) => name.toLowerCase();

/* One scoring event as extractScoringEvents hands it over. */
const score = (ijfName, actorId, { seconds = 60, minute = '2', s = 'waza-ari', country = 'GBR', timeReal = null } = {}) =>
  ({ ijfName, score: s, side: null, minute, actorId, country, videoOffset: null, seconds, timeReal });

const contest = (over = {}) => ({
  round_name: 'Round of 16', duration: '00:03:20', gs: '0', id_winner: 1, media: null, ...over,
});

/* round_name is the only usable depth. The numeric `round` carries "Bronze",
 * "Final" and "Round 1" under the same value on the live data, which is why
 * nothing here reads it. */
test('roundGroup reads the name, and everything early is preliminary', () => {
  assert.equal(roundGroup('Final'), 'final');
  assert.equal(roundGroup('Bronze'), 'bronze');
  assert.equal(roundGroup('Semi-Final'), 'semi-final');
  assert.equal(roundGroup('Quarter-Final'), 'quarter-final');
  assert.equal(roundGroup('Repechage'), 'repechage');
  assert.equal(roundGroup('Round of 32'), 'preliminary');
  assert.equal(roundGroup('Round 1'), 'preliminary');
  assert.equal(roundGroup(null), 'unknown');
});

test('contestSeconds reads the HH:MM:SS the contest carries', () => {
  assert.equal(contestSeconds('00:06:31'), 391);
  assert.equal(contestSeconds('00:00:00'), 0);
  assert.equal(contestSeconds('01:00:00'), 3600);
  assert.equal(contestSeconds(null), null);
  assert.equal(contestSeconds('6:31'), null);
});

test('parseMedia splits platform, id and start, or refuses', () => {
  assert.deepEqual(parseMedia('yawebtv*YpRTvhCxz0*00:00:08'),
    { platform: 'yawebtv', id: 'YpRTvhCxz0', start: 8 });
  assert.deepEqual(parseMedia('yt*eEbjz0RDbwc*00:00:00'),
    { platform: 'yt', id: 'eEbjz0RDbwc', start: 0 });
  /* Half a reference is worse than none: it would link somewhere wrong. */
  assert.equal(parseMedia('yt*eEbjz0RDbwc'), null);
  assert.equal(parseMedia(''), null);
  assert.equal(parseMedia(null), null);
});

test('median takes the middle, and averages the pair when there is no middle', () => {
  assert.equal(median([10, 30, 20]), 20);
  assert.equal(median([10, 20, 30, 40]), 25);
  assert.equal(median([]), null);
});

/* The difference between a technique that scores and one that wins: the same
 * throw, the same category, one contest won and one lost. */
test('conversion separates scoring from winning', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest({ id_winner: 1 }),
    slice,
    events: [score('Uchi-mata', 1)],
    penalties: [], decision: null, resolve,
  });
  shape.add({
    contest: contest({ id_winner: 2 }),
    slice,
    events: [score('Uchi-mata', 1)],
    penalties: [], decision: null, resolve,
  });
  const [row] = shape.result().conversion;
  assert.equal(row.technique, 'uchi-mata');
  assert.equal(row.won, 1);
  assert.equal(row.lost, 1);
});

/* The scoreboard is read BEFORE the score is added, because the question is
 * what the athlete was chasing when they threw. Athlete 2 scores first, so
 * athlete 1's closing waza-ari is thrown from behind. */
test('trailing reads the board as it stood the moment before the score', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest({ id_winner: 1 }),
    slice,
    events: [
      score('Ko-uchi-gari', 2, { seconds: 30, minute: '1' }),
      score('Uchi-mata', 1, { seconds: 230, minute: '4' }),
    ],
    penalties: [], decision: null, resolve,
  });
  const rows = shape.result().trailing;
  assert.equal(rows.length, 1, 'only the closing minute is recorded');
  assert.equal(rows[0].technique, 'uchi-mata');
  assert.equal(rows[0].minute, '4');
  assert.equal(rows[0].behind, 1);
  assert.equal(rows[0].level, 0);
  assert.equal(rows[0].ahead, 0);
});

/* Only scores the contest carried on past can be answered, so the last score
 * of a contest is never counted as having gone unanswered. */
test('response counts the reply, and only where there was room for one', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest(),
    slice,
    events: [
      score('Uchi-mata', 1, { seconds: 60 }),
      score('O-soto-gari', 2, { seconds: 80 }),
    ],
    penalties: [], decision: null, resolve,
  });
  const rows = shape.result().response;
  assert.equal(rows.length, 1, 'the closing score has nothing after it');
  assert.equal(rows[0].technique, 'uchi-mata');
  assert.equal(rows[0].continued, 1);
  assert.equal(rows[0].answered, 1);
  assert.equal(rows[0].answered_fast, 1, '20 seconds is inside the fast window');
});

test('an answer well after the score is an answer, but not a fast one', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest(),
    slice,
    events: [
      score('Uchi-mata', 1, { seconds: 30 }),
      score('O-soto-gari', 2, { seconds: 200, minute: '4' }),
    ],
    penalties: [], decision: null, resolve,
  });
  const [row] = shape.result().response;
  assert.equal(row.answered, 1);
  assert.equal(row.answered_fast, 0);
});

/* A walkover has no score and no penalty decision and nobody on the mat. It
 * is counted apart from both so it cannot be read as a contest won on the
 * mat, and its zero length is kept out of the median. */
test('outcomes separate a contest from a walkover, and time only what happened', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest({ duration: '00:04:00' }),
    slice,
    events: [score('Uchi-mata', 1)],
    penalties: [], decision: null, resolve,
  });
  shape.add({
    contest: contest({ duration: '00:00:00' }),
    slice,
    events: [], penalties: [], decision: null, resolve,
  });
  shape.add({
    contest: contest({ duration: '00:06:00', gs: '1' }),
    slice,
    events: [], penalties: [], decision: { by: 'third-shido', minute: 'gs' }, resolve,
  });
  const [row] = shape.result().outcomes;
  assert.equal(row.contests, 3);
  assert.equal(row.by_score, 1);
  assert.equal(row.by_penalty, 1);
  assert.equal(row.no_contest, 1);
  assert.equal(row.golden_score, 1);
  assert.equal(row.seconds_p50, 300, 'the median of 240 and 360, with the walkover excluded');
});

/* Every penalty counts, not only the one that ended the contest: a shido that
 * cost nothing still says what a referee in this category is watching for. */
test('penalties are counted by reason as well as by kind', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest(),
    slice,
    events: [],
    penalties: [
      { kind: 'shido', actorId: 1, minute: '2', reason: 'false_attack' },
      { kind: 'shido', actorId: 2, minute: '2', reason: 'non-combativity' },
      { kind: 'shido', actorId: 1, minute: '2', reason: 'false_attack' },
    ],
    decision: null,
    resolve,
  });
  const rows = shape.result().penalties;
  assert.equal(rows.length, 2);
  const falseAttack = rows.find((r) => r.reason === 'false_attack');
  assert.equal(falseAttack.count, 2);
  assert.equal(falseAttack.kind, 'shido');
});

/* National style needs no athlete identity: the country is on the scoring
 * event itself. */
test('countries come off the event, with no join and no person', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest(),
    slice,
    events: [score('Uchi-mata', 1, { country: 'JPN' }), score('Uchi-mata', 2, { country: 'GEO' })],
    penalties: [], decision: null, resolve,
  });
  const rows = shape.result().countries;
  assert.deepEqual(rows.map((r) => r.country).sort(), ['GEO', 'JPN']);
  assert.ok(rows.every((r) => r.technique === 'uchi-mata' && r.count === 1));
  assert.ok(rows.every((r) => !('weight' in r) && !('tier' in r)),
    'weight and tier are dropped: thin cells, and a step closer to a person');
});

/* One score is one clip. `add` used to carry an inlined copy of addClip's body
 * as well as calling the method, so every clip was offered to its slot twice
 * and the two examples a category is allowed were the same video listed twice:
 * 453 of 515 filled pairs on the real crawl. The slot holds two, so a single
 * score must leave exactly one in it. */
test('a score yields one clip, not the same clip twice', () => {
  const shape = new ContestShape();
  shape.add({
    contest: contest({
      media: 'yt*eEbjz0RDbwc*00:00:10',
      contest_code_long: 'gs_tst2025_0001_f_0048_0001',
      competition_name: 'Test Grand Slam 2025',
    }),
    slice,
    events: [score('Uchi-mata', 1, { timeReal: 90 })],
    penalties: [], decision: null, resolve,
  });
  const { examples } = shape.result();
  assert.equal(examples.length, 1);
  assert.equal(examples[0].technique, 'uchi-mata');
  assert.equal(examples[0].contest, 'gs_tst2025_0001_f_0048_0001');
  /* media start 10 + time_real 90 + no offset. */
  assert.equal(examples[0].seconds, 100);
});

/* Two contests fill the pair with two DIFFERENT clips, which is the whole
 * point of holding two. */
test('a category keeps two distinct examples, one per contest', () => {
  const shape = new ContestShape();
  for (const [code, real] of [['gs_tst2025_0001_f_0048_0001', 90], ['gs_tst2025_0002_f_0048_0002', 120]]) {
    shape.add({
      contest: contest({ media: 'yt*eEbjz0RDbwc*00:00:10', contest_code_long: code, competition_name: 'Test' }),
      slice,
      events: [score('Uchi-mata', 1, { timeReal: real })],
      penalties: [], decision: null, resolve,
    });
  }
  const { examples } = shape.result();
  assert.equal(examples.length, 2);
  assert.equal(new Set(examples.map((e) => e.contest)).size, 2, 'two contests, not one twice');
});

/* Two clips exist to show the technique working twice, on different days. The
 * ranking alone gave both slots to the same event 154 times out of 1,056 filled
 * pairs, because one well-covered competition won on every key. */
test('the pair prefers a second clip from another competition', () => {
  const shape = new ContestShape();
  const add = (code, competition, real, score = 'ippon') => shape.add({
    contest: contest({
      media: 'yt*eEbjz0RDbwc*00:00:10',
      contest_code_long: code,
      competition_name: competition,
    }),
    slice,
    events: [score === 'ippon'
      ? { ijfName: 'Uchi-mata', score: 'ippon', side: null, minute: '2', actorId: 1, country: 'GBR', videoOffset: null, seconds: 60, timeReal: real }
      : score],
    penalties: [], decision: null, resolve,
  });

  /* Two ippon at the Worlds, one at a lesser event. On rank alone both slots
   * go to the Worlds; the tie-break gives the second to the other event. */
  add('a1', 'World Championships 2019', 90);
  add('a2', 'World Championships 2019', 120);
  add('b1', 'Zagreb Grand Prix 2019', 150);

  const { examples } = shape.result();
  assert.equal(examples.length, 2);
  assert.equal(new Set(examples.map((e) => e.competition)).size, 2,
    'two competitions, not the same one twice');
  assert.equal(examples[0].competition, 'World Championships 2019',
    'the best clip is still first: variety breaks ties, it does not outrank');
});

/* A technique with footage from one event only still gets its pair, because
 * variety is a preference and not a requirement. */
test('one competition still fills the pair', () => {
  const shape = new ContestShape();
  for (const [code, real] of [['a1', 90], ['a2', 120]]) {
    shape.add({
      contest: contest({
        media: 'yt*eEbjz0RDbwc*00:00:10',
        contest_code_long: code,
        competition_name: 'Only Event 2019',
      }),
      slice,
      events: [score('Uchi-mata', 1, { timeReal: real })],
      penalties: [], decision: null, resolve,
    });
  }
  const { examples } = shape.result();
  assert.equal(examples.length, 2, 'no alternative, so the pair fills anyway');
});
