/* ---------------------------------------------------------------------------
 * EXTRACT · pure functions from IJF API shapes to the importer's own records
 *
 * Everything here is deliberately free of I/O so the tests can feed it
 * fixture responses. The field fallbacks exist because the API has changed
 * shape at least once (see the design note): the first name in each pair is
 * the one observed to work, the alternative is kept so an old cached
 * response still parses.
 * ------------------------------------------------------------------------ */

/* One competition from `competition.get_list`. `id` is kept as a string
 * because it is a key (cache directory names, tier overrides), never a
 * number to do arithmetic on.
 *
 * `hasResults` is the list's own answer to "is there anything to crawl
 * here": observed on the live API as "0" for every not-yet-held event and
 * for held events that have no contests at all (training camps, refereeing
 * seminars, kata tournaments, IBSA events), and a nonzero count everywhere
 * there are real contests. Absent means false: a list shape that does not
 * carry the field should not silently crawl everything. */
export function normaliseCompetition(raw) {
  const id = raw.id_competition ?? raw.id;
  const year = Number(raw.comp_year ?? raw.year);
  const ages = raw.ages ?? raw.ev_typ;
  return {
    id: id === null || id === undefined ? null : String(id),
    name: raw.name ?? raw.nm ?? null,
    year: Number.isFinite(year) ? year : null,
    dateTo: raw.date_to ?? raw.dt_end ?? null,
    city: raw.city ?? raw.loc ?? null,
    ages: Array.isArray(ages) ? ages : [],
    hasResults: String(raw.has_results ?? '0') !== '0',
    /* The IJF's own name for the level of the event ("Grand Slam",
     * "European Open", "Olympic Games"). Every competition on the live list
     * carries one, from a closed set of 24, which makes it a far better
     * tier source than reading the competition's title. */
    rankName: raw.rank_name ?? null,
  };
}

/* `competition.categories_full` returns an object keyed by gender group,
 * each holding its own inner object of id_weight to label. Flatten to the
 * list the crawl loop actually wants. */
export function flattenCategories(raw) {
  const flat = [];
  for (const group of Object.values(raw ?? {})) {
    if (!group || typeof group !== 'object') continue;
    for (const [idWeight, name] of Object.entries(group.categories ?? {})) {
      flat.push({ idWeight, name, gender: group.gender ?? null });
    }
  }
  return flat;
}

/* Age labels come in two dialects, both seen on the live API: the
 * competition list abbreviates ("sen", "jun", "cad", "u23"), while a contest
 * spells it out ("Seniors"). Both are accepted, matched as whole tokens so
 * "sen" cannot be found inside an unrelated word. Anything unrecognised
 * becomes "other" rather than a guess, and the aggregator reports it so the
 * table can be extended once a real value is seen. Where several groups
 * appear, the most senior wins. */
const AGE_LABELS = new Map([
  ['sen', 'senior'], ['senior', 'senior'], ['seniors', 'senior'],
  ['u23', 'u23'],
  ['jun', 'junior'], ['junior', 'junior'], ['juniors', 'junior'],
  ['cad', 'cadet'], ['cadet', 'cadet'], ['cadets', 'cadet'],
  ['vet', 'veteran'], ['veteran', 'veteran'], ['veterans', 'veteran'],
]);
const AGE_SENIORITY = ['senior', 'u23', 'junior', 'cadet', 'veteran'];

export function ageGroup(ages) {
  const found = new Set((ages ?? [])
    .flatMap((age) => String(age).toLowerCase().split(/[^a-z0-9]+/))
    .map((token) => AGE_LABELS.get(token))
    .filter(Boolean));
  return AGE_SENIORITY.find((group) => found.has(group)) ?? 'other';
}

const DIRECTIONS = new Set(['left', 'right']);

/* How deep in the event a contest was. Read from `round_name`, never from
 * `round`: the numeric field is not a depth. A 800-contest sample has round=0
 * carrying "Bronze", "Final" AND "Round 1", and round=4 carrying both "Round
 * of 32" and "Round 1", so it appears to be a draw-structure index rather
 * than an ordering. The name is unambiguous and closed enough to group.
 *
 * The grouping is what a competitor would recognise: the three medal-round
 * contests are named individually because "what wins in a final" is a
 * different question from "what wins in the last sixteen", and everything
 * from the round of 64 down is preliminary. */
export function roundGroup(roundName) {
  const name = String(roundName ?? '').toLowerCase();
  if (name === 'final') return 'final';
  if (name.includes('bronze')) return 'bronze';
  if (name.includes('semi')) return 'semi-final';
  if (name.includes('quarter')) return 'quarter-final';
  if (name.includes('repechage')) return 'repechage';
  return name ? 'preliminary' : 'unknown';
}

/* A contest's own length, from "HH:MM:SS" to seconds. Zero-length contests
 * are real and meaningless: a walkover or a withdrawal is recorded with
 * duration "00:00:00" and nobody stepped on the mat, so the caller drops
 * them rather than letting them pull an average down. */
export function contestSeconds(duration) {
  const parts = String(duration ?? '').split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/* Regular time where the contest does not state its own: four minutes, for
 * every age group since 2017 and so for the whole of the crawl's default
 * range. */
export const REGULAR_SECONDS = 240;

/* The API gives times as decimal seconds in a string ("206.77"), not as
 * "mm:ss". Null when absent or unparseable. */
export function clockSeconds(value) {
  const seconds = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(seconds)
    ? null : seconds;
}

/* WHEN in the contest the score fell: minute "1" to "4" of regular time, or
 * "gs" for golden score - so an athlete can see what scores in the first
 * minute versus the last versus golden score.
 *
 * Verified against the live API rather than assumed (this is what the
 * README's checklist was for):
 *
 * - `time_sc` is the CONTEST clock in seconds and counts UP. It is not
 *   `time_real`, which is wall-clock time including every matte stoppage:
 *   a contest that goes the full four minutes ends with `duration`
 *   "00:04:00" and a last event at `time_sc` 234 while `time_real` reads
 *   426.77. Using the wrong one would scatter late scores into golden
 *   score.
 * - golden score does not have to be inferred from the clock: `is_gs` says
 *   so outright. `time_sc` keeps running through it (375.00 in a contest
 *   whose `time_sc_gs` reads 135.00), so the flag is checked first.
 * - `fight_duration` carries the contest's own regular-time length, so the
 *   four-minute boundary is read from the data rather than hardcoded, and
 *   pre-2017 five-minute contests fall out correctly.
 *
 * A score at exactly the final second of regular time is the last act of
 * regular time, not golden score. Minutes are capped at "4" because that is
 * what the committed schema admits; a five-minute contest's last minute
 * therefore lands in "4". */
export function minuteOf(event, regularSeconds = REGULAR_SECONDS) {
  if (String(event?.is_gs ?? '0') === '1') return 'gs';
  const seconds = clockSeconds(event?.time_sc);
  if (seconds === null) return 'unknown';
  if (seconds > regularSeconds) return 'gs';
  return String(Math.min(Math.floor(seconds / 60), 3) + 1);
}

/* The scoring value is read from the tags' group_name. The
 * waza-ari-awasete-ippon case must be checked before plain waza-ari, or two
 * waza-ari adding up to ippon would be recorded as the lesser score. */
function scoreOf(tags) {
  const groups = tags.map((tag) => (tag.group_name ?? '').toLowerCase());
  if (groups.some((g) => g.includes('waza-ari-awasete-ippon'))) return 'ippon';
  if (groups.some((g) => g.includes('ippon'))) return 'ippon';
  if (groups.some((g) => g.includes('waza-ari'))) return 'waza-ari';
  if (groups.some((g) => g.includes('yuko'))) return 'yuko';
  return null;
}

/* The sampling heuristic: a category whose first few contests carry no
 * tagged events at all is almost certainly untagged throughout, and not
 * worth thousands of further calls. */
export function hasTaggedEvents(contest) {
  return (contest?.events ?? []).some((event) => (event.tags ?? []).length > 0);
}

/* Outcomes the IJF records with a scoring group but which are not
 * techniques: a walkover and a withdrawal both land as "Ippon" without
 * anybody being thrown. Counting them would put phantom ippons against a
 * technique slug. */
const NON_TECHNIQUES = new Set(['fusen_gachi', 'kiken_gachi']);

/* The same thing one level along: reasons a penalty was given, which the IJF
 * occasionally tags onto the scoring event that ends the contest rather than
 * onto the penalty. Left alone they arrive at the aggregator looking like
 * techniques nobody has mapped, and the run stops on them. They are matched
 * by name because these tags carry no code_short to match on; each appeared
 * once in 72,035 contests, so this is IJF tagging noise, not a category the
 * reference is missing. */
const NON_TECHNIQUE_NAMES = new Set([
  'Head-Dive',
  'Escape-With-Head',
  'Illegal-Joint-Lock',
  'Non-Combativity',
  'Kansetsu waza from tachi waza',
]);

/* Which end-of-contest a penalty tag represents. "HSK (3rd shido)" is the
 * IJF's own marker for hansoku-make by accumulation and is checked first,
 * because the string contains both "hsk" and "shido"; a direct hansoku-make
 * is its own kind of contest end, not a fourth shido. */
function penaltyKind(group) {
  if (group.includes('hsk')) return 'third-shido';
  if (group.includes('hansoku')) return 'hansoku-make';
  return 'shido';
}

/* One contest's timeline to its scoring events and its penalties:
 * { events: [{ ijfName, score, side, minute }],
 *   penalties: [{ kind, actorId, minute }], untallied }.
 *
 * Per event: only tagged events carry technique data. Tags named "Cancel
 * ..." are dropped first, because a cancellation is not always an
 * annulment - the live API logs a downgrade as one event carrying both the
 * cancelled score and the technique that replaced it ("Cancel Waza-ari" and
 * "O-soto-gaeshi", both in group "Yuko"). Reading the first tag and
 * stopping at the word Cancel would throw the surviving yuko away with it.
 * Once they are gone, an event left with no tags at all was a plain
 * annulment.
 *
 * Of what remains: direction tags (left/right) are peeled off as the side,
 * identified by `code_short`, since their `group_name` mirrors the score
 * rather than saying "direction". The side is READ AS the direction the
 * throw went - a maintainers' decision rather than anything the IJF
 * documents, and one only footage can confirm; see the README. Penalty tags
 * (shido, non-combativity,
 * hansoku-make, the third-shido marker) are collected as penalties,
 * attributed to `actors[0]` where the timeline names one. The bare
 * `osaekomi` tag marks the START of a hold and is distinct from the hold's
 * own technique tag, so it is a marker to discard, not a technique to
 * count. The first tag left standing names the technique. An event with a
 * technique but no scoring group is an attempt or annotation, not a score,
 * and frequency here means SCORING frequency - so it is skipped, but
 * counted by the caller so the proportion is visible.
 *
 * Unlike judostats, katame-waza are kept: its "osaekomi" exclusion list
 * actually drops holds, strangles and armlocks, and Waza Book's syllabus
 * covers ne-waza. */
export function extractScoringEvents(contest) {
  const found = [];
  const penalties = [];
  let untallied = 0;
  const regularSeconds = clockSeconds(contest?.fight_duration) ?? REGULAR_SECONDS;
  for (const event of contest?.events ?? []) {
    const tags = (event.tags ?? []).filter((tag) => !(tag.name ?? '').startsWith('Cancel'));
    if (tags.length === 0) continue;
    const minute = minuteOf(event, regularSeconds);
    let side = null;
    const remaining = [];
    for (const tag of tags) {
      const code = (tag.code_short ?? '').toLowerCase();
      const group = (tag.group_name ?? '').toLowerCase();
      if (DIRECTIONS.has(code)) { side = code; continue; }
      if (group.includes('hsk') || group.includes('hansoku') || group.includes('shido')
        || group.includes('non-combativity')) {
        penalties.push({
          kind: penaltyKind(group),
          actorId: event.actors?.[0]?.id_person ?? null,
          minute,
          /* WHY the penalty was given, which the IJF tags individually
           * ("Escape-With-Head", "False-Attack", "Non-Combativity"). The
           * kind says what it cost; this says what was done. Kept as the
           * IJF's own code so the reason table is theirs and not a
           * translation nobody can check. */
          reason: (tag.code_short ?? tag.name ?? '').toLowerCase() || null,
        });
        continue;
      }
      if (code === 'osaekomi' || NON_TECHNIQUES.has(code)) continue;
      if (NON_TECHNIQUE_NAMES.has(tag.name ?? '')) continue;
      remaining.push(tag);
    }
    const name = remaining[0]?.name;
    if (!name) continue;
    const score = scoreOf(tags);
    if (!score) { untallied += 1; continue; }
    const actor = event.actors?.find((a) => a.actor_type === 'competitor') ?? event.actors?.[0];
    found.push({
      ijfName: name,
      score,
      side,
      minute,
      /* Who scored it, where they compete from, and where the moment sits in
       * the contest's footage. All three are on the event already; none of
       * them were being read. `actorId` is what lets a score be checked
       * against `id_winner`, which is the difference between a technique
       * that scores and a technique that wins. */
      actorId: actor?.id_person ?? null,
      country: actor?.country_short ?? null,
      videoOffset: clockSeconds(event.video_offset),
      /* The contest clock, kept alongside the minute it falls in. The minute
       * is what a reader wants; the second is what lets one score be measured
       * against the one before it. */
      seconds: clockSeconds(event.time_sc),
      /* WALL CLOCK, which is a different number and the one video position is
       * measured in. `time_sc` stops for every matte; `time_real` does not, so
       * a contest that ends at 3:54 on the mat ends at 6:00 in the recording.
       * Checked against real footage before anything was built on it. */
      timeReal: clockSeconds(event.time_real),
    });
  }
  return { events: found, penalties, untallied };
}

/* Was the contest ENDED by penalty, and when? One contest gets one
 * decision, and the IJF's own marker is believed ahead of any arithmetic.
 *
 * Counting to three shidos was the original approach and it does not
 * survive the live data: the timeline logs only the first TWO shidos as
 * plain shido events and records the third as an "HSK (3rd shido)" event
 * instead, so accumulation never reaches three on its own. Worse, the two
 * plain shidos frequently name different athletes from the one the marker
 * names, which means `actors[0]` on a shido event cannot be trusted to
 * identify who was penalised. Across a 736-contest sample, counting found
 * 18 penalty endings where the marker finds 38.
 *
 * So: the marker decides, then a direct hansoku-make, and accumulation
 * survives only as a fallback for data that carries neither - older
 * competitions, or a future change of shape. */
export function decideByPenalty(penalties) {
  const marker = penalties.find((penalty) => penalty.kind === 'third-shido');
  if (marker) return { by: 'third-shido', minute: marker.minute };

  const hansoku = penalties.find((penalty) => penalty.kind === 'hansoku-make');
  if (hansoku) return { by: 'hansoku-make', minute: hansoku.minute };

  const shidos = new Map();
  for (const penalty of penalties) {
    if (penalty.kind !== 'shido' || penalty.actorId === null) continue;
    const total = (shidos.get(penalty.actorId) ?? 0) + 1;
    shidos.set(penalty.actorId, total);
    if (total === 3) return { by: 'third-shido', minute: penalty.minute };
  }
  return null;
}
