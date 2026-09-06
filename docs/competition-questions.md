# Questions for the competition data

What the IJF aggregation is asked, what it already answers, and what it cannot.

An earlier version of this list was worked out in conversation and never
committed to either repository, so it is lost. This file restarts it from what
the site now answers. Add to it rather than keeping questions in your head.

## Answered

**In my division** (`/competition/what-wins/`)

- What scores here, most frequent first, and how much of the division's scoring
  each technique is.
- How much of a technique's scoring is ippon, how much comes in golden score,
  and how much in normal time.
- How often the athlete who scores with it goes on to win.
- How often the opponent scores back after it, and how often within thirty
  seconds.
- Which of these have I not ticked as learned.
- How is this division lost: what share of recorded endings were penalties,
  when they arrive, and the most-given penalty.
- All of the above filtered by sex, weight, waza, year and score type.

**Holding a lead** (`/competition/score-first/`)

- Does scoring first win, and how much does that change by the minute it lands.
- Does it hold in every division.
- How often does a score come from the athlete who is behind.

**The shape of the sport** (`/competition/`)

- Standing against groundwork, by score type and by sex and by weight.
- How contests are lost, and what the penalties are actually given for.

**Style** (`/competition/national-style/`)

- What does each country score with far more often than the sport does.

## Answered in part

**What techniques are scored after an opponent receives a shido?**

Added 29 August 2026, built 4 September 2026 as the `shido_response` table in
`ijf-contest-shape.json`: what was scored within a minute of a plain shido, by
technique and division, against how many shidos in that division had contest
left to run after them. 12,001 scores follow a shido inside the window, out of
54,103 shidos that had time to be followed, and seoi-nage, o-uchi-gari and
uchi-mata lead it.

THE HALF THAT IS NOT ANSWERED is who was penalised. The IJF names an athlete on
a shido event, but `extract.mjs` had already found those names disagreeing with
the athlete the IJF's own third-shido marker names, so reading them as "the
offender" would be a plausible-sounding error. The table records the split it
can defend instead: 4,866 of those scores came from the athlete the shido names
and 7,135 from the other one. That is the measurement that would settle what
the field means, and it leans the way it would if the named athlete were the
offender, since an athlete who has just been penalised is the one under
pressure. Leaning is not knowing. Two ways to close it: read a set of contests
against their footage, or ask the IJF what `actors[0]` on a shido event is.

Still not built, and each one needs the attribution question closed first:

- What does the penalised athlete score with, having just been warned.
- What does their opponent score with, against someone carrying a shido.
- Does the answer change with the third shido, when the contest is about to end.
  The third shido ends the contest, so this one is about the two that came
  before it rather than about the marker.

The reference the owner supplied sits behind an institutional login and has
still not been read: `https://www.nature.com/articles/s41598-026-46709-1`.

## Asked and not supportable

**Which techniques rescue a losing contest.** Only five techniques have as many
as a hundred scores made when the scoreboard was not level. A ranking would look
authoritative and be noise. The aggregate figure is on `/competition/score-first/`
and the per-technique cut is not.

**Does the draw change what scores.** 21,155 rows and no finding: the top
techniques in a preliminary round and in a final are the same handful. Worth a
sentence somewhere, not a page.
