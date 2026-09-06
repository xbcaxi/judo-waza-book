/* ---------------------------------------------------------------------------
 * SHRINK CHECK · refuse to publish an aggregation that lost rows
 *
 *   node tools/ijf-results/shrink-check.mjs [file...]
 *
 * Compares each file on disk with the copy committed at HEAD and exits
 * nonzero if any table lost more than a tenth of its rows. Defaults to the
 * two files the aggregation writes. A file with nothing committed to compare
 * against is reported and skipped, which is what a first run looks like.
 *
 * The judgement lives in lib/shrink.mjs and is tested there; this file is the
 * git and process half.
 * ------------------------------------------------------------------------ */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { describe, shrinkage } from './lib/shrink.mjs';

const DEFAULT_FILES = [
  'competition-stats/ijf-technique-frequency.json',
  'competition-stats/ijf-contest-shape.json',
];

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_FILES;
const problems = [];

for (const file of files) {
  const now = JSON.parse(await readFile(file, 'utf8'));
  let before;
  try {
    /* maxBuffer because the shape file is tens of megabytes. */
    before = JSON.parse(execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 1 << 30 }));
  } catch {
    console.log(`${file}: nothing committed to compare against, so nothing to check.`);
    continue;
  }
  for (const problem of shrinkage(before, now)) problems.push(`${file} ${describe(problem)}`);
}

if (problems.length > 0) {
  console.error('The aggregation is materially smaller than what is committed:');
  for (const line of problems) console.error(`  ${line}`);
  console.error('\nThat is what a part-restored cache looks like. Nothing has been published.');
  process.exit(1);
}
console.log('No table lost more than a tenth of its rows.');
