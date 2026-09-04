import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseCompetition, flattenCategories, ageGroup, extractScoringEvents, hasTaggedEvents,
  clockSeconds, minuteOf, decideByPenalty,
} from '../lib/extract.mjs';

/* Shorthand for one timeline event. These fixtures were rewritten against
 * the live API on the first real crawl: `time_sc` is the contest clock in
 * decimal seconds counting up, `is_gs` flags golden score outright, and a
 * direction tag's group_name mirrors the score rather than saying
 * "direction". */
const tag = (name, group, code = name.toLowerCase()) => ({ name, code_short: code, group_name: group });
const event = (...tags) => ({ id_contest_event_type: 3, time_sc: '83.00', is_gs: '0', tags, actors: [] });
const at = (seconds, ...tags) => ({ id_contest_event_type: 4, time_sc: `${seconds}.00`, is_gs: '0', tags, actors: [] });

test('normaliseCompetition prefers the primary field names', () => {
  const c = normaliseCompetition({
    id_competition: 3081, name: 'Guadalajara Grand Prix 2025', comp_year: '2025',
    date_to: '2025-06-15', city: 'Guadalajara', ages: ['Seniors'], has_results: '112',
    rank_name: 'Grand Prix',
  });
  assert.deepEqual(c, {
    id: '3081', name: 'Guadalajara Grand Prix 2025', year: 2025,
    dateTo: '2025-06-15', city: 'Guadalajara', ages: ['Seniors'], hasResults: true,
    rankName: 'Grand Prix',
  });
});

/* A list shape without the rank falls back to the name rules rather than
 * inventing a level. */
test('normaliseCompetition tolerates a list that carries no rank', () => {
  assert.equal(normaliseCompetition({ id_competition: 1 }).rankName, null);
});

/* The live list reports has_results as a count in a string, "0" meaning
 * nothing to crawl: not yet held, or an event that never has contests. A
 * list that omits the field entirely is treated as having none, so a
 * changed list shape shows up as an empty crawl rather than as thousands of
 * requests for empty contest lists. */
test('normaliseCompetition reads has_results as the crawlable flag', () => {
  const of = (has_results) => normaliseCompetition({ id_competition: 1, has_results }).hasResults;
  assert.equal(of('112'), true);
  assert.equal(of(112), true);
  assert.equal(of('0'), false);
  assert.equal(of(0), false);
  assert.equal(of(undefined), false);
});

test('normaliseCompetition falls back to the older field names', () => {
  const c = normaliseCompetition({ id: 12, nm: 'Tokyo 1964', year: 1964, dt_end: '1964-10-23', loc: 'Tokyo' });
  assert.equal(c.id, '12');
  assert.equal(c.name, 'Tokyo 1964');
  assert.equal(c.year, 1964);
  assert.equal(c.dateTo, '1964-10-23');
  assert.equal(c.city, 'Tokyo');
  assert.deepEqual(c.ages, []);
});

test('normaliseCompetition tolerates a gap rather than inventing values', () => {
  const c = normaliseCompetition({ id_competition: 5 });
  assert.equal(c.id, '5');
  assert.equal(c.name, null);
  assert.equal(c.year, null);
});

test('flattenCategories turns the gender-grouped object into a flat list', () => {
  const flat = flattenCategories({
    1: { gender: 'm', categories: { 1: '-60', 2: '-66' } },
    2: { gender: 'f', categories: { 8: '-48' } },
  });
  assert.deepEqual(flat, [
    { idWeight: '1', name: '-60', gender: 'm' },
    { idWeight: '2', name: '-66', gender: 'm' },
    { idWeight: '8', name: '-48', gender: 'f' },
  ]);
});

test('ageGroup recognises the documented labels and refuses to guess', () => {
  assert.equal(ageGroup(['Seniors']), 'senior');
  assert.equal(ageGroup(['Juniors']), 'junior');
  assert.equal(ageGroup(['Cadets']), 'cadet');
  assert.equal(ageGroup(['Veterans']), 'veteran');
  assert.equal(ageGroup(['Juniors', 'Seniors']), 'senior');
  assert.equal(ageGroup([]), 'other');
  assert.equal(ageGroup(['Masters']), 'other');
});

/* The competition list abbreviates where a contest spells it out. Both
 * dialects were observed live; "sen" is 1033 of the 1037 competitions. */
test('ageGroup reads the abbreviated labels the competition list uses', () => {
  assert.equal(ageGroup(['sen']), 'senior');
  assert.equal(ageGroup(['jun']), 'junior');
  assert.equal(ageGroup(['cad']), 'cadet');
  assert.equal(ageGroup(['u23']), 'u23');
  assert.equal(ageGroup(['U23']), 'u23');
  assert.equal(ageGroup(['jun', 'sen']), 'senior');
});

/* Whole tokens only: a label that merely contains the letters of a code is
 * not that code. */
test('ageGroup matches whole tokens, not substrings', () => {
  assert.equal(ageGroup(['Sennight Invitational']), 'other');
  assert.equal(ageGroup(['Cadence Cup']), 'other');
});

/* Every scoring event also carries who scored it, where they compete from and
 * where the moment sits in the footage. These fixtures name no actors and
 * carry no video, so all three are null; spelled out once here rather than
 * repeated into every expectation below. */
const unattributed = { actorId: null, country: null, videoOffset: null, timeReal: null };

/* The direction tag's group_name is the SCORE, not "Direction"; the side is
 * read from code_short, which is what the live data supports. */
test('a plain ippon with a direction tag, timed into its minute', () => {
  const { events } = extractScoringEvents({
    events: [event(tag('Uchi-mata', 'Ippon', 'uchi-mata'), tag('Right', 'Ippon', 'right'))],
  });
  assert.deepEqual(events, [{ ijfName: 'Uchi-mata', score: 'ippon', side: 'right', minute: '2', seconds: 83, ...unattributed }]);
});

test('clockSeconds reads the decimal-second strings the API sends', () => {
  assert.equal(clockSeconds('206.77'), 206.77);
  assert.equal(clockSeconds('0.00'), 0);
  assert.equal(clockSeconds(240), 240);
  assert.equal(clockSeconds(undefined), null);
  assert.equal(clockSeconds(''), null);
  assert.equal(clockSeconds('soon'), null);
});

test('minuteOf buckets the contest clock: minutes 1-4, then golden score', () => {
  const at_ = (time_sc) => minuteOf({ time_sc, is_gs: '0' });
  assert.equal(at_('0.00'), '1');
  assert.equal(at_('59.00'), '1');
  assert.equal(at_('60.00'), '2');
  assert.equal(at_('239.00'), '4');
  /* The last act of regular time is still regular time. */
  assert.equal(at_('240.00'), '4');
  assert.equal(at_('240.01'), 'gs');
  assert.equal(minuteOf({ time_sc: null, is_gs: '0' }), 'unknown');
  assert.equal(minuteOf({}), 'unknown');
});

/* The clock keeps running through golden score, so the flag - not the
 * number - is what separates it. A 375-second event is golden score even
 * though the same reading in a longer contest would not be. */
test('minuteOf believes the is_gs flag over the clock', () => {
  assert.equal(minuteOf({ time_sc: '375.00', is_gs: '1' }), 'gs');
  assert.equal(minuteOf({ time_sc: '30.00', is_gs: '1' }), 'gs');
  assert.equal(minuteOf({ time_sc: '1401.00', is_gs: '1' }), 'gs');
});

/* Regular time is read from the contest rather than hardcoded, so a
 * five-minute contest does not report its fifth minute as golden score.
 * Minutes are capped at "4" because that is what the schema admits. */
test('minuteOf takes the regular-time boundary from the contest', () => {
  const { events } = extractScoringEvents({
    fight_duration: '300',
    events: [at(290, tag('Uchi-mata', 'Ippon', 'uchi-mata'))],
  });
  assert.equal(events[0].minute, '4');
  assert.equal(minuteOf({ time_sc: '290.00', is_gs: '0' }, 300), '4');
  assert.equal(minuteOf({ time_sc: '290.00', is_gs: '0' }, 240), 'gs');
});

test('untagged events and penalty events carry no technique', () => {
  const { events } = extractScoringEvents({
    events: [
      { tags: [] },
      { time_sc: '120.00' },
      event(tag('Shido', 'Shido')),
      event(tag('Non-combativity', 'Non-combativity')),
    ],
  });
  assert.deepEqual(events, []);
});

test('waza-ari-awasete-ippon counts as ippon, checked before plain waza-ari', () => {
  const { events } = extractScoringEvents({
    events: [event(tag('O-uchi-gari', 'Waza-ari-awasete-ippon', 'o-uchi-gari'))],
  });
  assert.equal(events[0].score, 'ippon');
});

test('waza-ari and yuko are kept as themselves', () => {
  const { events } = extractScoringEvents({
    events: [
      event(tag('Tai-otoshi', 'Waza-ari', 'tai-otoshi')),
      event(tag('Ko-uchi-gari', 'Yuko', 'ko-uchi-gari')),
    ],
  });
  assert.deepEqual(events.map((e) => e.score), ['waza-ari', 'yuko']);
});

test('a cancelled score is skipped', () => {
  const { events } = extractScoringEvents({
    events: [event(tag('Cancel Ippon', 'Ippon', 'cancel-ippon'))],
  });
  assert.deepEqual(events, []);
});

/* The live API logs a downgrade as ONE event carrying the cancelled score
 * and the technique that replaced it, both in the surviving score's group.
 * Reading the first tag and stopping at the word Cancel threw the surviving
 * yuko away with it. */
test('a score downgraded on review keeps the technique that survived', () => {
  const { events, untallied } = extractScoringEvents({
    events: [at(234, tag('Cancel Waza-ari', 'Yuko', 'cancel_waza_ari'),
      tag('O-soto-gaeshi', 'Yuko', 'o_soto_gaeshi'))],
  });
  assert.deepEqual(events, [{ ijfName: 'O-soto-gaeshi', score: 'yuko', side: null, minute: '4', seconds: 234, ...unattributed }]);
  assert.equal(untallied, 0);
});

/* A walkover and a withdrawal are recorded in the Ippon group without
 * anybody being thrown; counting them would put phantom ippons against a
 * technique. They are not "a technique that failed to score" either, so
 * they must not inflate the untallied count. */
test('a walkover is not a technique and is not an untallied one either', () => {
  const { events, untallied } = extractScoringEvents({
    events: [event(tag('Fusen-Gachi', 'Ippon', 'fusen_gachi')),
      event(tag('Kiken-Gachi', 'Ippon', 'kiken_gachi'))],
  });
  assert.deepEqual(events, []);
  assert.equal(untallied, 0);
});

/* Why a penalty was given is sometimes tagged onto the scoring event that
 * ended the contest rather than onto the penalty. Left in, each one reaches
 * the aggregator as a technique nobody has mapped and stops the run; and
 * "Head-Dive" is a reason for a hansoku-make, not a throw anybody did. */
test('a penalty reason tagged as a technique is dropped, not reported as unmapped', () => {
  const { events, untallied } = extractScoringEvents({
    events: [event(tag('Head-Dive', 'Ippon', 'head_dive')),
      event(tag('Kansetsu waza from tachi waza', 'Ippon', 'kansetsu_tachi'))],
  });
  assert.deepEqual(events, []);
  assert.equal(untallied, 0);
});

/* Only the named tag is dropped: a real technique on the same event still
 * scores, so the set can never quietly swallow a whole contest event. */
test('a real technique alongside a dropped name is still counted', () => {
  const { events } = extractScoringEvents({
    events: [event(tag('Illegal-Joint-Lock', 'Ippon', 'illegal_joint_lock'),
      tag('Uchi-mata', 'Ippon', 'uchi-mata'))],
  });
  assert.deepEqual(events, [{ ijfName: 'Uchi-mata', score: 'ippon', side: null, minute: '2', seconds: 83, ...unattributed }]);
});

test('katame-waza are kept, and the bare osaekomi tag is a marker, not a technique', () => {
  const { events } = extractScoringEvents({
    events: [event(
      tag('Osaekomi', 'Osaekomi', 'osaekomi'),
      tag('Kuzure-kesa-gatame', 'Ippon', 'kuzure-kesa-gatame'),
    )],
  });
  assert.deepEqual(events, [{ ijfName: 'Kuzure-kesa-gatame', score: 'ippon', side: null, minute: '2', seconds: 83, ...unattributed }]);
});

test('a technique tag with no scoring group is not counted, but is reported', () => {
  const { events, untallied } = extractScoringEvents({
    events: [event(tag('Uchi-mata', 'Attempt', 'uchi-mata'))],
  });
  assert.deepEqual(events, []);
  assert.equal(untallied, 1);
});

test('penalties come out attributed and timed; a cancelled one does not', () => {
  const { events, penalties } = extractScoringEvents({
    events: [
      { time_sc: '70.00', tags: [tag('Shido', 'Shido')], actors: [{ id_person: 11 }] },
      { time_sc: '140.00', tags: [tag('Non-combativity', 'Non-combativity')], actors: [{ id_person: 22 }] },
      { time_sc: '180.00', tags: [tag('Hansoku-make', 'Hansoku-make')], actors: [{ id_person: 11 }] },
      { time_sc: '210.00', tags: [tag('Cancel Shido', 'Shido', 'cancel_shido')], actors: [{ id_person: 11 }] },
      { tags: [tag('Shido', 'Shido')] },
    ],
  });
  assert.deepEqual(events, []);
  /* `reason` is the IJF's own code for what was done, which is what makes a
   * penalty coachable: the kind says what it cost, the reason says why. */
  assert.deepEqual(penalties, [
    { kind: 'shido', actorId: 11, minute: '2', seconds: 70, reason: 'shido' },
    { kind: 'shido', actorId: 22, minute: '3', seconds: 140, reason: 'non-combativity' },
    { kind: 'hansoku-make', actorId: 11, minute: '4', seconds: 180, reason: 'hansoku-make' },
    /* No clock at all, so nothing can be measured from it: the minute is
     * unknown and so is the second. */
    { kind: 'shido', actorId: null, minute: 'unknown', seconds: null, reason: 'shido' },
  ]);
});

/* The IJF's own marker for hansoku-make by accumulation. Its group_name
 * carries both "hsk" and "shido", so the order of the checks is what keeps
 * it from being filed as a fourth ordinary shido. */
test('the third-shido marker is read as an accumulation, not a shido', () => {
  const { penalties } = extractScoringEvents({
    events: [{ time_sc: '300.00', is_gs: '1', tags: [tag('HSK', 'HSK (3rd shido)', 'hsk')], actors: [{ id_person: 7 }] }],
  });
  assert.deepEqual(penalties, [{ kind: 'third-shido', actorId: 7, minute: 'gs', seconds: 300, reason: 'hsk' }]);
});

/* The live timeline logs only the first two shidos as shido events and the
 * third as its own marker, so the marker - not arithmetic - decides. */
test('the marker decides the contest, at its own time', () => {
  const shido = (actorId, minute) => ({ kind: 'shido', actorId, minute });
  assert.deepEqual(decideByPenalty([shido(1, '2'), shido(2, '3'), { kind: 'third-shido', actorId: 2, minute: 'gs' }]),
    { by: 'third-shido', minute: 'gs' });
  assert.equal(decideByPenalty([shido(1, '1'), shido(1, '3')]), null);
  assert.equal(decideByPenalty([]), null);
});

test('a direct hansoku-make decides too, but the marker takes precedence', () => {
  assert.deepEqual(decideByPenalty([{ kind: 'hansoku-make', actorId: 2, minute: '2' }]),
    { by: 'hansoku-make', minute: '2' });
  /* Both logged for the same moment is one contest end, not two. */
  assert.deepEqual(decideByPenalty([{ kind: 'third-shido', actorId: 1, minute: '4' },
    { kind: 'hansoku-make', actorId: 1, minute: '4' }]),
  { by: 'third-shido', minute: '4' });
});

/* Kept as a fallback for data carrying no marker: older competitions, or a
 * future change of shape. It cannot fire on the current API, where only two
 * shido events are ever logged. */
test('three attributed shidos still decide where no marker exists', () => {
  const shido = (actorId, minute) => ({ kind: 'shido', actorId, minute });
  assert.deepEqual(decideByPenalty([shido(1, '1'), shido(1, '3'), shido(2, '3'), shido(1, 'gs')]),
    { by: 'third-shido', minute: 'gs' });
});

test('shidos with no named athlete never accumulate to a decision', () => {
  const anonymous = { kind: 'shido', actorId: null, minute: '2' };
  assert.equal(decideByPenalty([anonymous, anonymous, anonymous]), null);
});

test('hasTaggedEvents drives the category sampling heuristic', () => {
  assert.equal(hasTaggedEvents({ events: [{ tags: [] }] }), false);
  assert.equal(hasTaggedEvents({ events: [] }), false);
  assert.equal(hasTaggedEvents({}), false);
  assert.equal(hasTaggedEvents({ events: [event(tag('Shido', 'Shido'))] }), true);
});
