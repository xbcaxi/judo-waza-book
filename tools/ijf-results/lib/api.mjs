/* ---------------------------------------------------------------------------
 * API · the IJF public API client
 *
 * Base URL and the params[...] calling convention are from the design note
 * and the judostats reference implementation; there is no authentication and
 * no published rate limit, so the client is polite by construction: one
 * request at a time, a fixed pause between requests, and a couple of retries
 * with backoff before giving up.
 *
 * Any request that finally fails resolves to null. Null means "retry a later
 * run", never "no data": the crawl records the failure and withholds the
 * competition's done-marker so the next run tries again.
 * ------------------------------------------------------------------------ */

/* Overridable so the end-to-end test (and a wary first run) can point the
 * whole crawl at a local mock instead of the real API. */
export const BASE_URL = process.env.IJF_BASE_URL ?? 'https://data.ijf.org/api/get_json';

export function buildUrl(params) {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`params[${key}]`, String(value));
  }
  return url.toString();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class IjfClient {
  constructor({ delayMs = 350, retries = 2, fetchImpl = globalThis.fetch, log = console.error } = {}) {
    this.delayMs = delayMs;
    this.retries = retries;
    this.fetchImpl = fetchImpl;
    this.log = log;
    this.lastRequestAt = 0;
    this.requests = 0;
  }

  async get(params) {
    const url = buildUrl(params);
    for (let attempt = 0; ; attempt += 1) {
      const wait = this.lastRequestAt + this.delayMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastRequestAt = Date.now();
      this.requests += 1;
      try {
        const response = await this.fetchImpl(url);
        if (response.ok) return await response.json();
        /* A 4xx is the API saying no and will say no again; a 5xx or a
         * dropped connection is worth another try. */
        if (response.status < 500 || attempt >= this.retries) {
          this.log(`ijf: HTTP ${response.status} for ${url}`);
          return null;
        }
      } catch (error) {
        if (attempt >= this.retries) {
          this.log(`ijf: ${error.message} for ${url}`);
          return null;
        }
      }
      await sleep(this.delayMs * 2 ** (attempt + 1));
    }
  }

  competitionList() {
    return this.get({ action: 'competition.get_list' });
  }

  categories(idCompetition) {
    return this.get({ action: 'competition.categories_full', id_competition: idCompetition });
  }

  contests(idCompetition, idWeight) {
    return this.get({
      action: 'contest.find', id_competition: idCompetition, id_weight: idWeight, order_by: 'cnum',
    });
  }

  /* The full timeline. `competitor.info` is deliberately not wrapped here:
   * it returns personal data about named individuals, which the frequency
   * work does not need and the knowledge store must not hold. */
  contestDetail(contestCode) {
    return this.get({
      action: 'contest.find', contest_code: contestCode, part: 'info,score_list,media,events',
    });
  }
}
