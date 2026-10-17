/* ---------------------------------------------------------------------------
 * EDITIONS · how often each penalty reason was given under each rulebook
 *
 * A penalty entry may name older rulebook editions in `sameUnder`, which lets
 * clips refereed under them onto its page. Whether a rule stayed the same is
 * a reading of both rulebooks. What the data can add is a veto: a reason whose
 * rate halves or doubles at an edition boundary was called differently after
 * it, whatever the wording says, so footage from either side cannot stand for
 * the other.
 *
 * Pure: takes the committed frequency and shape files and the rulebook
 * records, returns rates per thousand tagged contests.
 * ------------------------------------------------------------------------ */

/* Halved or doubled. A judgement, not an IJF figure, and here so it can be
 * argued with: tighter, and the 2025 leg-grab rate, which fell by a third
 * under an unchanged shido, would veto a rule nobody changed. */
export const BREAK_RATIO = 2;

/* Below this many calls on either side of a boundary the rate is a handful of
 * referees' decisions, and "same" would be a guess. The data then cannot vouch
 * for the boundary, which counts as a veto: footage is let in on evidence. */
export const MIN_CALLS = 30;

/* The edition in force at the middle of a year. Editions start in January or
 * at the first event of the season, so the middle of the year is the
 * judgement that puts a whole year's contests under one edition. */
export function editionOfYear(year, editions) {
  const day = `${year}-07-01`;
  let governing = null;
  for (const edition of editions) {
    if (!edition.effectiveFrom || edition.effectiveFrom > day) continue;
    if (!governing || edition.effectiveFrom > governing.effectiveFrom) governing = edition;
  }
  return governing?.sourceId ?? null;
}

/* Rates per thousand TAGGED contests, by reason and edition. Tagged rather than
 * all contests, because an untagged contest records no penalty at all and the
 * tagged share grew from year to year. */
export function ratesByEdition({ frequency, shape, editions }) {
  const tagged = new Map();
  for (const row of frequency?.denominators ?? []) {
    const edition = editionOfYear(row.year, editions);
    if (edition) tagged.set(edition, (tagged.get(edition) ?? 0) + row.tagged);
  }
  const counts = new Map();
  for (const row of shape?.penalties ?? []) {
    const edition = editionOfYear(row.year, editions);
    if (!edition || !row.reason) continue;
    const key = `${row.reason}|${edition}`;
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  }
  const rate = (reason, edition) => {
    const contests = tagged.get(edition) ?? 0;
    return contests === 0 ? null : (1000 * (counts.get(`${reason}|${edition}`) ?? 0)) / contests;
  };
  rate.calls = (reason, edition) => counts.get(`${reason}|${edition}`) ?? 0;
  return rate;
}

/* Every boundary between `from` and `to` (older to newer) where a reason's rate
 * halves, doubles, appears or vanishes, or rests on too few calls to say.
 * Boundaries with no contests at all on one side are not judged: the data
 * cannot veto what it does not cover. */
export function breaksBetween(reason, from, to, { rate, editions }) {
  const ordered = [...editions].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
    .map((edition) => edition.sourceId);
  const start = ordered.indexOf(from);
  const end = ordered.indexOf(to);
  if (start === -1 || end === -1 || start >= end) return [];
  const breaks = [];
  for (let at = start; at < end; at += 1) {
    const before = rate(reason, ordered[at]);
    const after = rate(reason, ordered[at + 1]);
    if (before === null || after === null) continue;
    const thin = Math.min(rate.calls?.(reason, ordered[at]) ?? Infinity,
      rate.calls?.(reason, ordered[at + 1]) ?? Infinity) < MIN_CALLS;
    const broken = before === 0 || after === 0
      ? before !== after
      : after / before >= BREAK_RATIO || before / after >= BREAK_RATIO;
    if (broken || thin) breaks.push({ from: ordered[at], to: ordered[at + 1], before, after, thin: thin && !broken });
  }
  return breaks;
}
