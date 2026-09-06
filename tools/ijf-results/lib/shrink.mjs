/* ---------------------------------------------------------------------------
 * SHRINK · does a fresh aggregation still describe as much judo as the
 * committed one?
 *
 * A SMALLER FILE THAT STILL VALIDATES is the failure worth stopping for, and
 * the schema cannot catch it: a half-restored cache produces a perfectly
 * well-formed dataset covering a fraction of the sport, and publishing it
 * would quietly replace good data with less of it. It has already happened
 * once locally, when a test fixture overwrote the real shape file with 7 rows
 * in place of 70,372.
 *
 * Growth is unbounded and fine. A drop of more than a tenth in any table means
 * something went wrong upstream.
 *
 * Pure, like the rest of lib/: given the two parsed files it returns the
 * tables that lost too much. shrink-check.mjs does the reading and the exit
 * code, so this half can be tested, which the copy inlined in the workflow
 * could not be.
 * ------------------------------------------------------------------------ */

/* A tenth. Anything at or above this fraction of the committed row count
 * passes. */
export const TOLERANCE = 0.9;

/* Only tables that had rows to lose are compared. An empty or non-array
 * table in the committed file says nothing about whether the new one is
 * whole, and a table that is new in the fresh file is growth. */
export function shrinkage(before, now, { tolerance = TOLERANCE } = {}) {
  const problems = [];
  for (const [table, rows] of Object.entries(before ?? {})) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const after = Array.isArray(now?.[table]) ? now[table].length : 0;
    if (after < rows.length * tolerance) {
      problems.push({ table, before: rows.length, after });
    }
  }
  return problems;
}

export const describe = ({ table, before, after }) => `${table}: ${before} rows -> ${after}`;
