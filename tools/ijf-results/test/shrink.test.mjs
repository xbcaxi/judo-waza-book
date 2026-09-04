import test from 'node:test';
import assert from 'node:assert/strict';
import { describe, shrinkage, TOLERANCE } from '../lib/shrink.mjs';

const rows = (n) => Array.from({ length: n }, (_, i) => ({ i }));

test('an aggregation the same size or larger passes', () => {
  const before = { rounds: rows(100), penalties: rows(40) };
  assert.deepEqual(shrinkage(before, { rounds: rows(100), penalties: rows(40) }), []);
  assert.deepEqual(shrinkage(before, { rounds: rows(4000), penalties: rows(41) }), []);
});

test('losing a tenth is the edge and still passes', () => {
  assert.deepEqual(shrinkage({ rounds: rows(100) }, { rounds: rows(90) }), []);
});

/* The failing path, which is why this file exists: the guard lived inline in
 * the workflow and only its passing path had ever run. */
test('losing more than a tenth is reported with both counts', () => {
  const problems = shrinkage({ rounds: rows(100) }, { rounds: rows(89) });
  assert.deepEqual(problems, [{ table: 'rounds', before: 100, after: 89 }]);
  assert.equal(describe(problems[0]), 'rounds: 100 rows -> 89');
});

/* The real incident: a fixture overwrote the shape file with 7 rows in place
 * of 70,372, and every table went at once. */
test('a part-restored cache is caught in every table it emptied', () => {
  const before = { rounds: rows(70372), penalties: rows(9000), outcomes: rows(120) };
  const problems = shrinkage(before, { rounds: rows(7), penalties: rows(2), outcomes: rows(120) });
  assert.deepEqual(problems.map((p) => p.table), ['rounds', 'penalties']);
});

test('a table that has gone missing counts as zero rows, not as no answer', () => {
  assert.deepEqual(shrinkage({ rounds: rows(100) }, {}), [{ table: 'rounds', before: 100, after: 0 }]);
  assert.deepEqual(shrinkage({ rounds: rows(100) }, { rounds: null }), [{ table: 'rounds', before: 100, after: 0 }]);
});

/* Coverage is not the question these files answer, so a table with nothing in
 * it to lose says nothing about whether the new file is whole. */
test('a table that was empty or is not a list is not compared', () => {
  assert.deepEqual(shrinkage({ rounds: [], coverage: { contests: 3 } }, {}), []);
});

test('a table new in the fresh aggregation is growth', () => {
  assert.deepEqual(shrinkage({ rounds: rows(10) }, { rounds: rows(10), shido_response: rows(500) }), []);
});

test('the tolerance is a tenth and can be tightened per call', () => {
  assert.equal(TOLERANCE, 0.9);
  assert.deepEqual(shrinkage({ rounds: rows(100) }, { rounds: rows(95) }, { tolerance: 1 }), [
    { table: 'rounds', before: 100, after: 95 },
  ]);
});
