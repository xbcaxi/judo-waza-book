import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUrl, IjfClient } from '../lib/api.mjs';

test('buildUrl writes the params[...] convention the API expects', () => {
  const url = new URL(buildUrl({ action: 'contest.find', id_competition: 3081, id_weight: 2 }));
  assert.equal(url.origin + url.pathname, 'https://data.ijf.org/api/get_json');
  assert.equal(url.searchParams.get('params[action]'), 'contest.find');
  assert.equal(url.searchParams.get('params[id_competition]'), '3081');
  assert.equal(url.searchParams.get('params[id_weight]'), '2');
});

test('a successful response is parsed JSON', async () => {
  const client = new IjfClient({
    delayMs: 0,
    fetchImpl: async () => new Response('{"contests":[]}', { status: 200 }),
    log: () => {},
  });
  assert.deepEqual(await client.contestDetail('x'), { contests: [] });
});

test('a client error is null immediately: the API will say no again', async () => {
  let calls = 0;
  const client = new IjfClient({
    delayMs: 0,
    fetchImpl: async () => { calls += 1; return new Response('nope', { status: 404 }); },
    log: () => {},
  });
  assert.equal(await client.get({ action: 'x' }), null);
  assert.equal(calls, 1);
});

test('a server error is retried, then null - which means retry later, not no data', async () => {
  let calls = 0;
  const client = new IjfClient({
    delayMs: 0,
    retries: 2,
    fetchImpl: async () => { calls += 1; return new Response('boom', { status: 500 }); },
    log: () => {},
  });
  assert.equal(await client.get({ action: 'x' }), null);
  assert.equal(calls, 3);
});

test('a network error that recovers on retry succeeds', async () => {
  let calls = 0;
  const client = new IjfClient({
    delayMs: 0,
    retries: 2,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new Error('socket hang up');
      return new Response('[]', { status: 200 });
    },
    log: () => {},
  });
  assert.deepEqual(await client.competitionList(), []);
  assert.equal(calls, 2);
});
