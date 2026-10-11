/* ---------------------------------------------------------------------------
 * PENALTY EDITIONS · run with `npm run penalties:editions`
 *
 * Every penalty reason in the IJF feed, its rate under each recorded rulebook
 * edition, and whether the data vetoes treating consecutive editions as the
 * same rule. The starting point for filling a penalty's `sameUnder`: a "same"
 * here is necessary, not sufficient, and the rule text has to agree.
 * ------------------------------------------------------------------------ */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { breaksBetween, ratesByEdition } from '../tools/ijf-results/lib/editions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const editions = [];
for (const file of await readdir(path.join(root, 'reference'))) {
  if (!file.startsWith('ijf-sor-') || !file.endsWith('.json')) continue;
  const record = await loadJson(`reference/${file}`);
  if (record.effectiveFrom) editions.push({ sourceId: record.sourceId, effectiveFrom: record.effectiveFrom });
}
editions.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));

const frequency = await loadJson('competition-stats/ijf-technique-frequency.json');
const shape = await loadJson('competition-stats/ijf-contest-shape.json');
const rate = ratesByEdition({ frequency, shape, editions });

const totals = new Map();
for (const row of shape.penalties) if (row.reason) totals.set(row.reason, (totals.get(row.reason) ?? 0) + row.count);
const reasons = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));

console.log(`Rate per 1000 tagged contests, by rulebook edition (${editions.map((e) => e.sourceId).join(', ')}).`);
console.log('A boundary marked "break" or "too few" is one the data vetoes for sameUnder.\n');
for (const reason of reasons) {
  const rates = editions.map((edition) => {
    const value = rate(reason, edition.sourceId);
    return value === null ? '     -' : value.toFixed(1).padStart(6);
  }).join(' ');
  const breaks = editions.length < 2 ? [] : breaksBetween(reason, editions[0].sourceId, editions.at(-1).sourceId, { rate, editions });
  const verdict = breaks.length === 0 ? 'same'
    : breaks.map((found) => `${found.thin ? 'too few' : 'break'} at ${found.to}`).join(', ');
  console.log(`${reason.padEnd(32)} ${rates}  ${verdict}`);
}
if (editions.length < 2) console.log('\nOnly one edition is recorded in reference/, so nothing can be compared yet.');
