import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Cache } from '../lib/cache.mjs';

async function withCache(work) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ijf-cache-test-'));
  try {
    await work(new Cache(dir), dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('write and read round-trip, with no temporary file left behind', () => withCache(async (cache, dir) => {
  await cache.write(['123', 'contest-abc'], { hello: 'world' });
  assert.deepEqual(await cache.read('123', 'contest-abc'), { hello: 'world' });
  assert.deepEqual((await readdir(path.join(dir, '123'))).sort(), ['contest-abc.json']);
}));

test('a missing entry reads as null, not a crash', () => withCache(async (cache) => {
  assert.equal(await cache.read('nope', 'nothing'), null);
}));

test('API-supplied names cannot escape the cache directory', () => withCache(async (cache, dir) => {
  await cache.write(['../evil', 'contest-a/b'], { x: 1 });
  const written = cache.path('../evil', 'contest-a/b');
  assert.ok(written.startsWith(dir + path.sep), `${written} must stay inside ${dir}`);
  assert.deepEqual(await cache.read('../evil', 'contest-a/b'), { x: 1 });
}));

test('contestRecords reads every contest file and skips what does not parse', () => withCache(async (cache, dir) => {
  await cache.write(['1', 'contest-a'], { competition: { id: '1' } });
  await cache.write(['1', 'categories'], { not: 'a contest' });
  await cache.write(['2', 'contest-b'], { competition: { id: '2' } });
  /* A crawl killed mid-write, before writes were atomic - or a bad disk. */
  await mkdir(path.join(dir, '3'), { recursive: true });
  await writeFile(path.join(dir, '3', 'contest-truncated.json'), '{"competition": {"id"');
  const complaints = [];
  const records = await cache.contestRecords((message) => complaints.push(message));
  assert.deepEqual(records.map((r) => r.competition.id), ['1', '2']);
  assert.equal(complaints.length, 1);
  assert.match(complaints[0], /contest-truncated\.json/);
}));
