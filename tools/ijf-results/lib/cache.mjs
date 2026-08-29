/* ---------------------------------------------------------------------------
 * CACHE · every raw response to disk, so re-aggregation never needs network
 *
 * Layout, under tools/ijf-results/cache/ (gitignored - thousands of contest
 * responses would swamp the repository history on every refresh):
 *
 *   competitions.json               raw competition list
 *   <id_competition>/categories.json         raw categories_full response
 *   <id_competition>/contests-<id_weight>.json  raw contest list response
 *   <id_competition>/contest-<code>.json     { competition, category, response }
 *   <id_competition>/done.json               marker: crawled completely, when
 *
 * Contest files carry the competition and category context alongside the raw
 * response because the aggregation needs sex, weight, year, name and ages,
 * and re-deriving them from the other cached files on every run would tie
 * aggregation to the crawl's directory walk order.
 *
 * That competition snapshot is frozen at crawl time, so the aggregation
 * prefers the competition re-derived from `competitions.json` and keeps the
 * snapshot only as a fallback. Otherwise teaching normaliseCompetition a new
 * field would need a re-crawl to take effect, and a full crawl is hours.
 * ------------------------------------------------------------------------ */
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const defaultCacheDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cache');

/* Contest codes and competition ids come from the API, so they are paths
 * only after being reduced to characters that cannot escape the cache. */
const safe = (name) => String(name).replace(/[^A-Za-z0-9_-]/g, '_');

export class Cache {
  constructor(dir = defaultCacheDir) {
    this.dir = dir;
  }

  path(...parts) {
    const cleaned = parts.map(safe);
    cleaned[cleaned.length - 1] += '.json';
    return path.join(this.dir, ...cleaned);
  }

  async read(...parts) {
    try {
      return JSON.parse(await readFile(this.path(...parts), 'utf8'));
    } catch {
      return null;
    }
  }

  /* Write-then-rename, because a crawl can be killed at any moment (a CI
   * job hitting its time limit, ctrl-C) and a half-written file must never
   * be mistaken for a cached response. */
  async write(parts, data) {
    const file = this.path(...parts);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file + '.tmp', JSON.stringify(data, null, 2) + '\n');
    await rename(file + '.tmp', file);
  }

  /* Every cached contest record, for aggregation. A file that does not
   * parse (from a crawl interrupted before atomic writes, or a bad disk) is
   * reported and skipped: it will be re-fetched, and one broken file must
   * not hold the other twenty thousand hostage. */
  async contestRecords(log = console.error) {
    const records = [];
    let dirs = [];
    try {
      dirs = await readdir(this.dir, { withFileTypes: true });
    } catch {
      return records; // no cache yet
    }
    for (const entry of dirs.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const files = (await readdir(path.join(this.dir, entry.name))).sort();
      for (const file of files) {
        if (!file.startsWith('contest-') || !file.endsWith('.json')) continue;
        try {
          records.push(JSON.parse(await readFile(path.join(this.dir, entry.name, file), 'utf8')));
        } catch (error) {
          log(`cache: skipping unreadable ${entry.name}/${file} (${error.message}); delete it and re-crawl that competition`);
        }
      }
    }
    return records;
  }
}
