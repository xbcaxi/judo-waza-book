/* ---------------------------------------------------------------------------
 * TIERS · resolve a competition to its level from competition-stats/ijf-competition-tiers
 *
 * The live competition list DOES carry the level of the event, in
 * `rank_name`: a closed set of 24 values ("Grand Slam", "European Open",
 * "Olympic Games", "Kata Tournament") present on all 1037 competitions. That
 * is the primary source, keyed exactly.
 *
 * Reading the competition's title survives as a fallback, because it is what
 * catches a value the rank table has not been taught yet, and because the
 * IJF has changed shape before. It was the only source until the first live
 * run, and it is why an event like "Commonwealth Games Glasgow 2026" - whose
 * title says nothing a rule matched - fell to the default.
 * ------------------------------------------------------------------------ */

/* Overrides win, then the event's own rank, then the first rule whose text
 * appears in the name (case-insensitively), then the default. Order in the
 * rule list matters and is the maintainer's to choose. */
export function tierFor(competition, config) {
  const override = config.overrides?.[competition.id];
  if (override) return { tier: override, matched: true };

  const byRank = competition.rankName ? config.rankRules?.[competition.rankName] : undefined;
  if (byRank) return { tier: byRank, matched: true };

  const name = (competition.name ?? '').toLowerCase();
  for (const rule of config.rules ?? []) {
    if (name.includes(rule.match.toLowerCase())) return { tier: rule.tier, matched: true };
  }
  return { tier: config.default, matched: false };
}

/* Every tier the configuration can produce, for validation. */
export function knownTiers(config) {
  return new Set([
    ...Object.values(config.rankRules ?? {}),
    ...(config.rules ?? []).map((rule) => rule.tier),
    ...Object.values(config.overrides ?? {}),
    config.default,
  ]);
}
