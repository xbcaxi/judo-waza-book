import test from 'node:test';
import assert from 'node:assert/strict';
import { tierFor, knownTiers } from '../lib/tiers.mjs';

const config = {
  rankRules: {
    'Grand Slam': 'ijf-tour',
    'European Open': 'continental-open',
    Commonwealth: 'continental',
  },
  rules: [
    { match: 'Olympic', tier: 'olympic' },
    { match: 'World Championships', tier: 'worlds' },
    { match: 'Grand Slam', tier: 'ijf-tour' },
    { match: 'Open', tier: 'continental-open' },
  ],
  overrides: { 3081: 'ijf-tour' },
  default: 'other',
};

/* The IJF's own rank for the event, matched exactly. This is what reaches
 * an event whose TITLE says nothing a rule matches: "Commonwealth Games
 * Glasgow 2026" fell to the default until rank_name was read. */
test('the event rank decides, ahead of anything in the name', () => {
  assert.deepEqual(tierFor({ id: '1', name: 'Commonwealth Games Glasgow 2026', rankName: 'Commonwealth' }, config),
    { tier: 'continental', matched: true });
  /* The name says Grand Slam, the rank says European Open; the rank wins. */
  assert.deepEqual(tierFor({ id: '2', name: 'Not really a Grand Slam', rankName: 'European Open' }, config),
    { tier: 'continental-open', matched: true });
});

test('the rank is matched exactly, never as a substring', () => {
  assert.deepEqual(tierFor({ id: '3', name: 'Nothing here', rankName: 'grand slam' }, config),
    { tier: 'other', matched: false });
});

test('the name rules catch a rank the table has not been taught', () => {
  assert.deepEqual(tierFor({ id: '1', name: 'Paris GRAND SLAM 2025', rankName: 'Some New Rank' }, config),
    { tier: 'ijf-tour', matched: true });
  assert.deepEqual(tierFor({ id: '2', name: 'World Championships Seniors 2025', rankName: null }, config),
    { tier: 'worlds', matched: true });
});

test('an override beats the rank and every rule', () => {
  assert.deepEqual(tierFor({ id: '3081', name: 'Something the rules would misread Open', rankName: 'European Open' }, config),
    { tier: 'ijf-tour', matched: true });
});

test('no match falls to the default and says so', () => {
  assert.deepEqual(tierFor({ id: '9', name: 'Kata Tournament 2025' }, config),
    { tier: 'other', matched: false });
});

test('a missing name is a default, not a crash', () => {
  assert.deepEqual(tierFor({ id: '9', name: null }, config), { tier: 'other', matched: false });
});

test('knownTiers lists everything the configuration can produce', () => {
  assert.deepEqual([...knownTiers(config)].sort(),
    ['continental', 'continental-open', 'ijf-tour', 'olympic', 'other', 'worlds']);
});
