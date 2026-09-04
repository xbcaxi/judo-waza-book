import test from 'node:test';
import assert from 'node:assert/strict';
import { ContestShape, SHIDO_WINDOW_SECONDS } from '../lib/shape.mjs';
import { extractScoringEvents } from '../lib/extract.mjs';

const slice = { sex: 'f', weight: '-48', tier: 'ijf-tour', age: 'senior', year: 2026 };
const resolve = (name) => name.toLowerCase();

const score = (ijfName, actorId, seconds) => ({
  ijfName, score: 'waza-ari', side: null, minute: '2', actorId,
  country: null, videoOffset: null, seconds, timeReal: null,
});
const shido = (actorId, seconds, kind = 'shido') => ({ kind, actorId, minute: '2', seconds, reason: 'false-attack' });
const contest = (over = {}) => ({ round_name: 'Final', duration: '00:04:00', gs: '0', id_winner: 1, media: null, ...over });

const shape = ({ events, penalties, over = {} }) => {
  const s = new ContestShape();
  s.add({ contest: contest(over), slice, events, penalties, decision: null, resolve });
  return s.result().shido_response;
};

test('the contest clock reaches the penalty, which is what dates it', () => {
  const { penalties } = extractScoringEvents({
    fight_duration: '240',
    events: [{ time_sc: '73.5', actors: [{ id_person: 9 }], tags: [{ name: 'False-Attack', code_short: 'False-Attack', group_name: 'Shido' }] }],
  });
  assert.equal(penalties.length, 1);
  assert.equal(penalties[0].seconds, 73.5);
  assert.equal(penalties[0].minute, '2');
});

test('a score inside the window is counted against the shido before it', () => {
  const rows = shape({ events: [score('Uchi-mata', 2, 100)], penalties: [shido(1, 70)] });
  assert.deepEqual(rows, [{
    ...slice, technique: 'uchi-mata', scored: 1, by_named_athlete: 0, by_other_athlete: 1, unattributed: 0, shidos: 1,
  }]);
});

test('the same score by the athlete the shido names lands in the other column', () => {
  const rows = shape({ events: [score('Uchi-mata', 1, 100)], penalties: [shido(1, 70)] });
  assert.equal(rows[0].by_named_athlete, 1);
  assert.equal(rows[0].by_other_athlete, 0);
});

test('a score outside the window belongs to no shido, and the shido still counts', () => {
  const rows = shape({ events: [score('Uchi-mata', 2, 70 + SHIDO_WINDOW_SECONDS + 1)], penalties: [shido(1, 70)] });
  assert.deepEqual(rows, []);
});

test('the edge of the window is inside it', () => {
  const rows = shape({ events: [score('Uchi-mata', 2, 70 + SHIDO_WINDOW_SECONDS)], penalties: [shido(1, 70)] });
  assert.equal(rows[0].scored, 1);
});

test('a score before the shido is not an answer to it', () => {
  assert.deepEqual(shape({ events: [score('Uchi-mata', 2, 40)], penalties: [shido(1, 70)] }), []);
});

/* The nearest shido owns the score: two shidos inside a minute of each other
 * would otherwise both claim it and double the count. */
test('a score is counted once, against the most recent shido', () => {
  const rows = shape({ events: [score('Uchi-mata', 2, 100)], penalties: [shido(1, 50), shido(2, 90)] });
  assert.equal(rows[0].scored, 1);
  assert.equal(rows[0].by_named_athlete, 1);
  assert.equal(rows[0].shidos, 2);
});

/* Both end the contest, so there is no exchange after them to measure. */
test('the third-shido marker and a direct hansoku-make are not read', () => {
  assert.deepEqual(shape({ events: [score('Uchi-mata', 2, 100)], penalties: [shido(1, 70, 'third-shido')] }), []);
  assert.deepEqual(shape({ events: [score('Uchi-mata', 2, 100)], penalties: [shido(1, 70, 'hansoku-make')] }), []);
});

/* A shido at the buzzer leaves nothing to follow it and would make the
 * denominator say a chance existed where none did. */
test('a shido given as the contest ends is not counted as an opportunity', () => {
  const rows = shape({
    events: [score('Uchi-mata', 2, 100)],
    penalties: [shido(1, 70), shido(2, 240)],
    over: { duration: '00:04:00' },
  });
  assert.equal(rows[0].shidos, 1);
});

test('a shido with no clock cannot date a score and is dropped', () => {
  assert.deepEqual(shape({ events: [score('Uchi-mata', 2, 100)], penalties: [shido(1, null)] }), []);
});

test('a score with nobody named is counted and left out of the split', () => {
  const rows = shape({ events: [score('Uchi-mata', null, 100)], penalties: [shido(1, 70)] });
  assert.equal(rows[0].scored, 1);
  assert.equal(rows[0].unattributed, 1);
  assert.equal(rows[0].by_named_athlete + rows[0].by_other_athlete, 0);
});

test('the denominator counts shidos in the slice, not answers to them', () => {
  const s = new ContestShape();
  s.add({ contest: contest(), slice, events: [score('Uchi-mata', 2, 100)], penalties: [shido(1, 70)], decision: null, resolve });
  s.add({ contest: contest(), slice, events: [], penalties: [shido(1, 30), shido(2, 90)], decision: null, resolve });
  const rows = s.result().shido_response;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scored, 1);
  assert.equal(rows[0].shidos, 3);
});

test('a technique the map does not carry keeps its row, with a null technique', () => {
  const s = new ContestShape();
  s.add({ contest: contest(), slice, events: [score('Something-New', 2, 100)], penalties: [shido(1, 70)], decision: null, resolve: () => null });
  assert.equal(s.result().shido_response[0].technique, null);
});
