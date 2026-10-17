import test from 'node:test';
import assert from 'node:assert/strict';
import { breaksBetween, editionOfYear, ratesByEdition } from '../lib/editions.mjs';

const editions = [
  { sourceId: 'ijf-sor-2018', effectiveFrom: '2018-01-01' },
  { sourceId: 'ijf-sor-2022', effectiveFrom: '2022-01-28' },
  { sourceId: 'ijf-sor-2026', effectiveFrom: '2026-01-01' },
];

test('a year belongs to the edition in force at its middle', () => {
  assert.equal(editionOfYear(2021, editions), 'ijf-sor-2018');
  assert.equal(editionOfYear(2022, editions), 'ijf-sor-2022');
  assert.equal(editionOfYear(2026, editions), 'ijf-sor-2026');
  assert.equal(editionOfYear(2016, editions.slice(1)), null);
});

const frequency = { denominators: [2021, 2022, 2026].map((year) => ({ year, tagged: 1000 })) };
const shape = {
  penalties: [
    { year: 2021, reason: 'steady', count: 100 }, { year: 2022, reason: 'steady', count: 80 },
    { year: 2026, reason: 'steady', count: 120 },
    { year: 2021, reason: 'collapses', count: 100 }, { year: 2022, reason: 'collapses', count: 90 },
    { year: 2026, reason: 'collapses', count: 5 },
    { year: 2026, reason: 'new', count: 50 },
    { year: 2021, reason: 'rare', count: 10 }, { year: 2022, reason: 'rare', count: 10 },
  ],
};
const rate = ratesByEdition({ frequency, shape, editions });

test('rates are per thousand tagged contests in each edition', () => {
  assert.equal(rate('steady', 'ijf-sor-2018'), 100);
  assert.equal(rate('new', 'ijf-sor-2018'), 0);
  assert.equal(rate('steady', 'ijf-sor-2030'), null);
});

test('too few calls to judge is a veto, not a pass', () => {
  const [found] = breaksBetween('rare', 'ijf-sor-2018', 'ijf-sor-2022', { rate, editions });
  assert.equal(found.thin, true);
});

test('a rate that halves, doubles, appears or vanishes is a break', () => {
  assert.deepEqual(breaksBetween('steady', 'ijf-sor-2018', 'ijf-sor-2026', { rate, editions }), []);
  assert.deepEqual(breaksBetween('collapses', 'ijf-sor-2018', 'ijf-sor-2026', { rate, editions })
    .map((found) => found.to), ['ijf-sor-2026']);
  assert.deepEqual(breaksBetween('new', 'ijf-sor-2022', 'ijf-sor-2026', { rate, editions })
    .map((found) => found.from), ['ijf-sor-2022']);
});
