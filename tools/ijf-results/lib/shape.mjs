/* ---------------------------------------------------------------------------
 * SHAPE · the contest-level tallies that sit beside the technique frequencies
 *
 * ijf-technique-frequency.json answers one question well: how often does each
 * technique score, for whom. It cannot answer the questions that are about the
 * CONTEST rather than the score - what wins in a final as opposed to the round
 * of 32, which techniques end contests rather than merely scoring in them, what
 * athletes are actually penalised for, how often a division goes to golden
 * score. All of that is already in the cached responses and none of it was
 * being read.
 *
 * This accumulates it into a second committed file rather than widening the
 * first. Two reasons. The frequency file has a schema the website already
 * reads, and that schema is one of the files held in step across the two
 * repositories, so widening it is a change in both. And the two files answer
 * different shapes of question: one is keyed by score, the other by contest,
 * and joining them at read time is clearer than interleaving them at write
 * time.
 *
 * Pure, like everything else here: fed one contest at a time, returns totals.
 * ------------------------------------------------------------------------ */
import { contestSeconds, roundGroup } from './extract.mjs';

/* Its own comparator rather than aggregate.mjs's. Importing that one would
 * make the two modules circular, since aggregate drives this one. */
const compareBy = (key) => (a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);

/* An unmapped technique (permissive mode only) sorts last, so the gaps sit
 * together at the bottom of the file exactly as they do in the frequency
 * table. */
const UNMAPPED = '￿';

const sliceOf = (r) => [r.sex, r.weight, r.tier, r.age, r.year].join('|');
const roundKey = (r) => [sliceOf(r), r.round, r.technique ?? UNMAPPED, r.score].join('|');
const conversionKey = (r) => [sliceOf(r), r.technique ?? UNMAPPED].join('|');
const penaltyKey = (r) => [sliceOf(r), r.minute, r.reason ?? UNMAPPED].join('|');
const countryKey = (r) => [r.sex, r.age, r.year, r.country, r.technique ?? UNMAPPED].join('|');
const firstScoreKey = (r) => [sliceOf(r), r.minute].join('|');
const outcomeKey = (r) => sliceOf(r);
const exampleKey = (r) => [r.technique ?? UNMAPPED, r.sex, r.weight, r.contest, r.seconds].join('|');
const responseKey = (r) => [sliceOf(r), r.technique ?? UNMAPPED].join('|');
const trailingKey = (r) => [sliceOf(r), r.minute, r.technique ?? UNMAPPED].join('|');

/* An answer within half a minute of the contest restarting is a different
 * event from one three minutes later. Thirty seconds is a judgement, not a
 * rule the IJF sets, and it is here rather than buried so it can be argued
 * with. */
export const FAST_ANSWER_SECONDS = 30;

/* Only the closing minute and golden score are recorded for the trailing
 * question, because that IS the question: what works when you are behind and
 * running out of contest. Recording every minute would multiply the file for
 * rows nobody asked for. */
const CLOSING_MINUTES = new Set(['4', 'gs']);

/* Waza-ari is the only score that accumulates. Ippon ends the contest, so it
 * never contributes to a state anybody scores from afterwards, and yuko has
 * not counted since 2017 - it survives here only because older cached
 * competitions carry the flag. */
const SCORE_VALUE = new Map([['ippon', 0], ['waza-ari', 1], ['yuko', 0]]);

/* Clips are kept PER TECHNIQUE AND CATEGORY rather than per technique, because
 * "seen in competition" is only useful if it is seen in YOUR division. A -52
 * woman being shown three clips of a +100 man is being shown that the technique
 * exists, which she knew.
 *
 * Two per category: one to watch, one to check the first was not a fluke. Times
 * fourteen senior categories, that is at most 28 per technique and about 3,000
 * across the reference, spread over 91 technique shards.
 *
 * The cap used to be three per technique taken in whatever order the cache
 * happened to be read in, which produced 236 YouTube clips against 30 on the
 * IJF's own player when the contests themselves run 89% the other way. That was
 * luck rather than a rule, and it is now a rule. */
export const EXAMPLES_PER_CATEGORY = 2;

/* Which clip wins when more than two are available, in order.
 *
 * WATCHABLE FIRST. The IJF moved its footage from YouTube to its own player
 * around 2023, and that player needs a subscription. A clip the reader cannot
 * open is not a demonstration, so a free one is preferred even when it is
 * older. This is a judgement about readers rather than about judo, and it is
 * written here rather than buried in a comparator.
 *
 * THEN IPPON, because a technique that ended the contest is the clearest
 * version of it.
 *
 * THEN THE MOST RECENT, so that where everything else is equal the reader sees
 * current judo rather than the first thing crawled. */
/* How deep in the draw, as a number. A final is better footage than a round of
 * 64 for the same reason a final is better judo: both athletes are the best in
 * the room and the technique had to work against real resistance. */
const ROUND_DEPTH = new Map([
  ['final', 0], ['bronze', 1], ['semi-final', 2], ['quarter-final', 3],
  ['repechage', 4], ['preliminary', 5], ['unknown', 6],
]);

/* Which competition it was. The IJF's own ranking of its calendar, coarsened:
 * an ippon at the Olympics is a better demonstration than an ippon at a
 * continental open, and a reader looking for "what this looks like when it
 * works" should be shown the former first. */
const TIER_DEPTH = new Map([
  ['olympic', 0], ['worlds', 1], ['masters', 2], ['ijf-tour', 3],
  ['continental', 4], ['continental-open', 5],
]);

function clipRank(clip) {
  return [
    /* WATCHABLE FIRST. The IJF moved its footage off YouTube around 2023 and
     * its own player needs a subscription, so a free clip is preferred even
     * when it is older. A clip the reader cannot open is not a demonstration.
     * This is a judgement about readers rather than about judo. */
    clip.platform === 'yt' ? 0 : 1,
    clip.score === 'ippon' ? 0 : clip.score === 'waza-ari' ? 1 : 2,
    TIER_DEPTH.get(clip.tier) ?? 9,
    ROUND_DEPTH.get(clip.round) ?? 9,
    -clip.year,
  ];
}

/**
 * Which two clips a slot keeps, out of everything ranked.
 *
 * The best one always. For the second, the best clip from a DIFFERENT
 * COMPETITION where one exists, and only otherwise the next best overall.
 *
 * Ranking alone gave both slots to the same afternoon 154 times out of 1,056
 * filled pairs, because a well-covered event that produced several good clips
 * won on every key in clipRank. Two clips exist to show the technique working
 * twice, against different opponents on different days; two from one event show
 * it working once, twice.
 *
 * Variety is a TIE-BREAK and not a rank: it never promotes a worse clip above
 * the best one, it only decides which clip joins it. A technique with footage
 * from a single event still gets its pair.
 *
 * Written for a pair, which is what EXAMPLES_PER_CATEGORY has always been. A
 * null competition matches nothing, including another null, so an untitled
 * clip is never assumed to share an event with anything.
 */
function pickPair(sorted) {
  const [first, ...rest] = sorted;
  if (!first) return [];
  const elsewhere = rest.find((clip) => clip.competition && clip.competition !== first.competition);
  return elsewhere ? [first, elsewhere] : sorted.slice(0, EXAMPLES_PER_CATEGORY);
}

const better = (a, b) => {
  const ra = clipRank(a); const rb = clipRank(b);
  for (let i = 0; i < ra.length; i += 1) if (ra[i] !== rb[i]) return ra[i] - rb[i];
  return 0;
};

/* "yawebtv*YpRTvhCxz0*00:00:08" - platform, that platform's own id, and how
 * far into the recording the contest starts. Returns null for anything that
 * does not split into exactly those three parts, because a half-parsed media
 * reference is worse than none. */
export function parseMedia(media) {
  const parts = String(media ?? '').split('*');
  if (parts.length !== 3 || !parts[0] || !parts[1]) return null;
  const start = contestSeconds(parts[2]);
  return { platform: parts[0], id: parts[1], start: start ?? 0 };
}

function tally(map, key, row, add) {
  const existing = map.get(key) ?? { ...row };
  add(existing);
  map.set(key, existing);
}

/* The middle value, or the mean of the two middle values. Contests of zero
 * length are dropped by the caller: a walkover is recorded as a contest that
 * lasted no time, and letting those into the median would say a division
 * finishes faster than anybody actually fights. */
export function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export class ContestShape {
  constructor() {
    this.rounds = new Map();
    this.conversion = new Map();
    this.penalties = new Map();
    this.countries = new Map();
    this.firstScore = new Map();
    this.outcomes = new Map();
    this.examples = new Map();
    this.exampleSlots = new Map();
    this.durations = new Map();
    this.response = new Map();
    this.trailing = new Map();
    this.unattributedScores = 0;
  }

  /**
   * Every clip one contest can offer, and nothing else. The entry point for a
   * contest older than the statistics window.
   */
  harvestClips({ contest, slice, events, resolve }) {
    const media = parseMedia(contest?.media);
    if (!media) return;
    for (const event of events) {
      const technique = resolve(event.ijfName);
      if (!technique) continue;
      this.addClip({ contest, slice, technique, event, media });
    }
  }

  /**
   * Just the clips from one contest, without any of the accounting.
   *
   * Separate because the crawl reaches further back than the statistics do.
   * Event tagging is unreliable before 2020, so a contest from 2016 must not
   * touch a frequency, a rank or a penalty count - but its FOOTAGE is as good
   * as any, and better than most, because the IJF published to YouTube until
   * about 2022 and to its own subscription player afterwards. A ranking needs
   * reliable tagging; a clip only needs to exist and be watchable.
   */
  addClip({ contest, slice, technique, event, media }) {
    /* Recomputed here rather than passed in, so this method stands alone: it
     * is called on its own for contests older than the statistics window, and
     * a parameter the caller had to remember would eventually be forgotten. */
    const round = roundGroup(contest?.round_name);

    /* One technique, in one division, as it was actually done.
     *
     * TWO ADDRESSES, and they answer different questions. `contest` is the
     * contest_code_long, which is the path segment JudoBase routes on:
     * judobase.ijf.org/#/competition/contest/<contest>. That works for every
     * contest in the crawl whatever platform holds its footage, and it sends
     * the reader to the IJF's own site rather than reproducing anything,
     * which is the position NOTICE.md already takes.
     *
     * `seconds` is where the throw sits in the recording, and it is derived
     * rather than guessed at now that the arithmetic has been checked against
     * real footage: media start + time_real + video_offset. time_real is wall
     * clock including every matte stoppage, which is why it and not the
     * contest clock matches video position - this contest ends at 3:54 on the
     * mat and at 6:00 in the recording.
     *
     * video_offset and video_offset_out are a five-second window either side,
     * so this lands five seconds BEFORE the throw. Deliberately: someone
     * learning a technique needs the grip fight and the entry, not the
     * landing. Verified on gs_isr2022_m_p100_0023, where the two seoi-nage
     * resolve to 4:49 and 6:04 and both are the throw. */
    if (media && technique && event.actorId !== null) {
      const slot = `${technique}|${slice.sex}|${slice.weight}`;
      const held = this.exampleSlots.get(slot) ?? [];
      const real = event.timeReal;
      const row = {
        technique,
        score: event.score,
        sex: slice.sex,
        weight: slice.weight,
        age: slice.age,
        year: slice.year,
        contest: contest?.contest_code_long ?? null,
        /* What to CALL the clip, now that it is not called after anybody.
         * The occasion and the outcome do the work a name would have done,
         * and rank it too: "Ippon, Olympic Games final, men's -73, 2021". */
        competition: contest?.competition_name ?? null,
        round,
        tier: slice.tier,
        platform: media.platform,
        id: media.id,
        seconds: real === null ? null : Math.max(0, Math.round(media.start + real + (event.videoOffset ?? 0))),
      };
      if (row.contest && row.seconds !== null) {
        held.push(row);
        held.sort(better);
        /* Selected from the union on every push rather than truncated first,
         * which is what lets a two-clip buffer stay correct: the pair kept is
         * always the best clip and the best from another competition, so a
         * later arrival can only improve it. */
        this.exampleSlots.set(slot, pickPair(held));
      }
    }
  }

  /**
   * One contest. `events` and `penalties` are what extractScoringEvents
   * returned, `decision` what decideByPenalty made of them, and `resolve`
   * turns an IJF technique name into this reference's slug (or null).
   */
  add({ contest, slice, events, penalties, decision, resolve }) {
    const round = roundGroup(contest?.round_name);
    const seconds = contestSeconds(contest?.duration);
    const winner = contest?.id_winner === null || contest?.id_winner === undefined
      ? null : String(contest.id_winner);
    const media = parseMedia(contest?.media);

    /* How the contest ended, and how long it took. Golden score is believed
     * from the contest's own flag first, then from its timeline: a response
     * shape that carries `is_gs` on the events but no `gs` on the contest is
     * still a contest that went to golden score, and reading only the one
     * field would quietly report none. A contest that ends
     * with neither a score nor a penalty decision is a walkover or a
     * withdrawal; it is counted separately rather than being quietly folded
     * into either, because it is not judo happening. */
    const wentToGoldenScore = String(contest?.gs ?? '0') === '1'
      || events.some((event) => event.minute === 'gs')
      || penalties.some((penalty) => penalty.minute === 'gs');
    tally(this.outcomes, outcomeKey(slice), {
      ...slice, contests: 0, golden_score: 0, by_score: 0, by_penalty: 0, no_contest: 0, seconds_p50: null,
    }, (row) => {
      row.contests += 1;
      if (wentToGoldenScore) row.golden_score += 1;
      if (decision) row.by_penalty += 1;
      else if (events.length > 0) row.by_score += 1;
      else row.no_contest += 1;
    });
    if (seconds !== null && seconds > 0) {
      const key = outcomeKey(slice);
      const list = this.durations.get(key) ?? [];
      list.push(seconds);
      this.durations.set(key, list);
    }

    /* What athletes are actually penalised for, and when. Every penalty
     * counts, not only the one that ended the contest: a shido that costs
     * nothing still says what a referee in this category is watching for. */
    for (const penalty of penalties) {
      tally(this.penalties, penaltyKey({ ...slice, minute: penalty.minute, reason: penalty.reason }),
        { ...slice, minute: penalty.minute, reason: penalty.reason, kind: penalty.kind, count: 0 },
        (row) => { row.count += 1; });
    }

    /* Waza-ari on the board, per athlete, walked forward through the contest
     * so that each score knows what the scoreboard said the moment before it
     * landed. */
    const board = new Map();
    const leaderExcept = (actorId) => {
      let best = 0;
      for (const [id, total] of board) if (String(id) !== String(actorId) && total > best) best = total;
      return best;
    };

    let first = true;
    for (const [index, event] of events.entries()) {
      const technique = resolve(event.ijfName);
      const won = winner !== null && event.actorId !== null && String(event.actorId) === winner;
      if (event.actorId === null) this.unattributedScores += 1;

      /* What wins where in the draw. Medal-round judo against preliminary
       * judo is the cut coaches ask for and nobody publishes. */
      tally(this.rounds, roundKey({ ...slice, round, technique, score: event.score }),
        { ...slice, round, technique, score: event.score, count: 0 },
        (row) => { row.count += 1; });

      /* Scored and went on to win, against scored and went on to lose. The
       * difference between a technique that puts points on the board and a
       * technique that finishes contests. */
      if (winner !== null && event.actorId !== null) {
        tally(this.conversion, conversionKey({ ...slice, technique }),
          { ...slice, technique, won: 0, lost: 0 },
          (row) => { if (won) row.won += 1; else row.lost += 1; });
      }

      /* National styles, without naming anybody. The country is on the event
       * itself, so this needs no join and no athlete identity. */
      if (event.country) {
        tally(this.countries, countryKey({
          sex: slice.sex, age: slice.age, year: slice.year, country: event.country, technique,
        }), {
          sex: slice.sex, age: slice.age, year: slice.year, country: event.country, technique, count: 0,
        }, (row) => { row.count += 1; });
      }

      /* What it costs to score. Not a counter-attack rate: judo restarts from
       * standing after a score, so the opponent's answer is the next exchange
       * rather than a counter to the throw that just landed. What this does
       * measure is whether scoring with a technique tends to invite an
       * immediate reply, which is the closest the data gets to risk, and it
       * is honest about being that rather than something stronger. Only
       * scores the contest continued past are counted, since an ippon cannot
       * be answered. */
      const next = events[index + 1];
      if (next) {
        const answered = next.actorId !== null && event.actorId !== null
          && String(next.actorId) !== String(event.actorId);
        const gap = next.seconds !== null && event.seconds !== null
          ? next.seconds - event.seconds : null;
        tally(this.response, responseKey({ ...slice, technique }),
          { ...slice, technique, continued: 0, answered: 0, answered_fast: 0 },
          (row) => {
            row.continued += 1;
            if (answered) {
              row.answered += 1;
              if (gap !== null && gap <= FAST_ANSWER_SECONDS) row.answered_fast += 1;
            }
          });
      }

      /* Behind, level or ahead when the score landed, in the closing minute
       * and golden score only. The scoreboard is read BEFORE this score is
       * added, because the question is what the athlete was chasing when they
       * threw, not what they had once it counted. */
      if (CLOSING_MINUTES.has(event.minute) && event.actorId !== null) {
        const mine = board.get(String(event.actorId)) ?? 0;
        const theirs = leaderExcept(event.actorId);
        const state = mine > theirs ? 'ahead' : mine < theirs ? 'behind' : 'level';
        tally(this.trailing, trailingKey({ ...slice, minute: event.minute, technique }),
          { ...slice, minute: event.minute, technique, behind: 0, level: 0, ahead: 0 },
          (row) => { row[state] += 1; });
      }
      if (event.actorId !== null) {
        const key = String(event.actorId);
        board.set(key, (board.get(key) ?? 0) + (SCORE_VALUE.get(event.score) ?? 0));
      }

      /* Does the first score win? Asked by minute, because scoring first in
       * the opening minute and scoring first in golden score are different
       * propositions entirely. */
      if (first && winner !== null && event.actorId !== null) {
        first = false;
        tally(this.firstScore, firstScoreKey({ ...slice, minute: event.minute }),
          { ...slice, minute: event.minute, won: 0, lost: 0 },
          (row) => { if (won) row.won += 1; else row.lost += 1; });
      }

      this.addClip({ contest, slice, technique, event, media });
    }
  }

  result() {
    const outcomes = [...this.outcomes.values()].map((row) => ({
      ...row,
      seconds_p50: median(this.durations.get(outcomeKey(row)) ?? []),
    }));
    return {
      rounds: [...this.rounds.values()].sort(compareBy(roundKey)),
      conversion: [...this.conversion.values()].sort(compareBy(conversionKey)),
      outcomes: outcomes.sort(compareBy(outcomeKey)),
      penalties: [...this.penalties.values()].sort(compareBy(penaltyKey)),
      countries: [...this.countries.values()].sort(compareBy(countryKey)),
      first_score: [...this.firstScore.values()].sort(compareBy(firstScoreKey)),
      response: [...this.response.values()].sort(compareBy(responseKey)),
      trailing: [...this.trailing.values()].sort(compareBy(trailingKey)),
      examples: [...this.exampleSlots.values()].flat().sort(compareBy(exampleKey)),
      unattributedScores: this.unattributedScores,
    };
  }
}
