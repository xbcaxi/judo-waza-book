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

## Open

**What techniques are scored after an opponent receives a shido?**

Added 29 August 2026. Reference supplied by the owner and not yet read, since
it sits behind an institutional login:
`https://www.nature.com/articles/s41598-026-46709-1`

Buildable. The aggregation keeps penalties and scores in separate tables with
no per-contest link between them, so it cannot be answered from the committed
data today. The extractor holds both event streams for a contest, and the
`response` table already measures "was this score answered within thirty
seconds", so the same shape applies: a table of techniques scored within N
seconds of a shido, split by whether the scorer or the penalised athlete threw.

Worth splitting the question when it is built:

- What does the penalised athlete score with, having just been warned.
- What does their opponent score with, against someone carrying a shido.
- Does the answer change with the third shido, when the contest is about to end.

## Asked and not supportable

**Which techniques rescue a losing contest.** Only five techniques have as many
as a hundred scores made when the scoreboard was not level. A ranking would look
authoritative and be noise. The aggregate figure is on `/competition/score-first/`
and the per-technique cut is not.

**Does the draw change what scores.** 21,155 rows and no finding: the top
techniques in a preliminary round and in a final are the same handful. Worth a
sentence somewhere, not a page.
