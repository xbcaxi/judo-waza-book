/* ---------------------------------------------------------------------------
 * UPDATE COMPETITION DATA · run with `npm run ijf:update`
 *
 * The whole local routine in one command: fetch what is new, rebuild the two
 * data files, validate them, and say what actually changed.
 *
 * WHY A SCRIPT AND NOT THREE CHAINED NPM SCRIPTS. Two of the four steps are
 * judgement, and chaining would skip both. Aggregation must not overwrite good
 * committed data with a smaller file, and the person running this needs to see
 * the size of the change before they commit it. So this checks the cache before
 * fetching and compares the result against what is committed afterwards.
 *
 * IT NEVER COMMITS. It leaves the working tree dirty and tells you what to look
 * at. Data reaches main by review like everything else.
 *
 * CHEAP WHEN WARM. The fetch skips any competition already cached that ended
 * more than 60 days ago, so a routine run asks the IJF only for genuinely new
 * events and for recent ones whose event tags may still be arriving. With a
 * warm cache that is usually seconds. From an empty cache it is about three and
 * a half hours, which is why the cache is worth backing up.
 * ------------------------------------------------------------------------ */
import { spawn } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDirectory = path.join(root, 'tools/ijf-results/cache');
const STATS = ['ijf-technique-frequency.json', 'ijf-contest-shape.json'];

/* Below this the cache is not warm enough to trust an aggregation from it. The
 * real cache holds about 112,000 files; a few hundred means a restore that did
 * not finish, or a cache that was never populated. Aggregating from that would
 * produce a smaller file that still validates, and committing it would be the
 * worst outcome this script can have. */
const CACHE_FLOOR = 50_000;

/* No `shell: true`. It is the reflex on Windows and it is wrong here: the
 * command is process.execPath, which on Windows lives under Program Files,
 * and a shell splits that path at the space. Spawning the executable
 * directly needs no shell and no quoting. */
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code}`)));
});

async function countFiles(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) total += await countFiles(path.join(directory, entry.name));
    else total += 1;
  }
  return total;
}

async function tableSizes() {
  const sizes = {};
  for (const name of STATS) {
    const file = path.join(root, 'competition-stats', name);
    try {
      const data = JSON.parse(await readFile(file, 'utf8'));
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) sizes[`${name}:${key}`] = value.length;
      }
    } catch {
      sizes[`${name}:MISSING`] = 0;
    }
  }
  return sizes;
}

const say = (message) => console.log(`\n── ${message}`);

/* --- 1. is the cache warm enough to be worth anything? ------------------- */
say('Checking the cache');
let cached = 0;
try {
  await stat(cacheDirectory);
  cached = await countFiles(cacheDirectory);
} catch {
  cached = 0;
}
console.log(`   ${cached.toLocaleString('en-GB')} files in tools/ijf-results/cache`);

if (cached === 0) {
  console.log('\n   The cache is empty. A first fetch from 2016 is about 36,000 requests');
  console.log('   and three and a half hours. That is fine, but do it deliberately:');
  console.log('\n     node tools/ijf-results/crawl.mjs\n');
  console.log('   Restoring a backup first is faster. See the README beside the archive.');
  process.exit(1);
}
if (cached < CACHE_FLOOR) {
  console.error(`\n   Only ${cached.toLocaleString('en-GB')} cached files, under the ${CACHE_FLOOR.toLocaleString('en-GB')} floor.`);
  console.error('   Aggregating from a part-restored cache writes a SMALLER data file that');
  console.error('   still validates, which is the one failure worth stopping for.');
  console.error('   Restore the cache backup fully, or re-fetch, before running this.');
  process.exit(1);
}

const before = await tableSizes();

/* --- 2. fetch what is new ------------------------------------------------ */
say('Fetching new competitions from the IJF');
console.log('   Anything cached and older than 60 days is skipped, so this is usually quick.\n');
await run(process.execPath, ['tools/ijf-results/crawl.mjs', ...process.argv.slice(2)]);

/* --- 3. rebuild the two data files --------------------------------------- */
say('Rebuilding competition-stats/');
await run(process.execPath, ['tools/ijf-results/aggregate.mjs']);

/* --- 4. validate before anyone commits ----------------------------------- */
say('Validating');
await run(process.execPath, ['scripts/validate.mjs']);

/* --- 5. say what changed, in the terms that matter ----------------------- */
say('What changed');
const after = await tableSizes();
const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
let shrank = false;
let moved = false;
for (const key of keys) {
  const was = before[key] ?? 0;
  const now = after[key] ?? 0;
  if (was === now) continue;
  moved = true;
  const delta = now - was;
  /* A table losing rows is not automatically wrong - a re-tagged contest can
   * move rows between tables - but it is never routine, and it is the shape a
   * truncated cache takes. Named so it cannot be committed by reflex. */
  if (delta < 0) shrank = true;
  console.log(`   ${delta > 0 ? '+' : ''}${delta.toLocaleString('en-GB')}  ${key}  (${was.toLocaleString('en-GB')} → ${now.toLocaleString('en-GB')})`);
}
if (!moved) console.log('   Nothing moved. The IJF has published nothing new since the last run.');

/* THE FILES ARE REWRITTEN EVERY RUN, whether or not anything changed, because
 * they carry the date they were generated. A run on a quiet day therefore
 * leaves a dirty tree whose entire diff is that one line, and committing it
 * would put a data refresh in the history that refreshed nothing. Said
 * plainly, because "nothing moved" beside a modified file otherwise reads as
 * a contradiction. */
const diff = await new Promise((resolve) => {
  let out = '';
  const child = spawn('git', ['diff', '--numstat', '--', 'competition-stats/'], { cwd: root });
  child.stdout.on('data', (chunk) => { out += chunk; });
  child.on('error', () => resolve(null));
  child.on('close', () => resolve(out.trim()));
});

const changed = diff ? diff.split(/\r?\n/).filter(Boolean) : [];
/* One line added and one removed in every touched file is the timestamp and
 * nothing else. */
const onlyTimestamp = changed.length > 0 && changed.every((line) => /^1\t1\t/.test(line));

console.log('');
if (changed.length === 0) {
  console.log('The data files are unchanged. Nothing to commit.');
} else if (onlyTimestamp && !moved) {
  console.log('The only change in either file is the date it was generated, so there is');
  console.log('nothing worth committing. To drop it:');
  console.log('');
  console.log('   git checkout -- competition-stats/');
} else {
  console.log('Nothing has been committed. Review the diff, then commit on a branch:');
  console.log('   git diff --stat competition-stats/');
  if (shrank) {
    console.log('');
    console.log('   A TABLE GOT SMALLER. Check that before committing: it is what a');
    console.log('   part-restored cache looks like, and the data on main is currently good.');
  }
}
