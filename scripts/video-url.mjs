/* ---------------------------------------------------------------------------
 * VIDEO URL → ENTRY · run with `npm run video -- <url> [<url> …]`
 *
 * Contributors suggest a video by pasting the URL they have. The stored form
 * is `platform` + `id`, never a URL - see the reasoning in CONTRIBUTING - and
 * splitting one into the other is exactly the mechanical step a person should
 * not be asked to do by hand. This does it, and prints the JSON block to drop
 * into a `videos` array.
 *
 * It is deliberately the ONLY place that knows the shapes YouTube and Vimeo
 * publish: watch links, share links, shorts, embeds, live, player URLs, the
 * timestamp in its four spellings. scripts/validate.mjs imports the same
 * parser so that a pull request which pastes a URL into a file is answered
 * with the entry it should have been, rather than a schema error.
 *
 * Tracking parameters (`si`, `feature`, `pp`) are dropped on the floor: they
 * identify the person who shared the link, and nothing here needs them.
 * ------------------------------------------------------------------------ */

/** Seconds from a timestamp parameter: "90", "90s", "1h2m3s", "2m30s". */
function seconds(value) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !match.slice(1).some(Boolean)) return undefined;
  const [hours, minutes, secs] = match.slice(1).map((part) => Number(part ?? 0) || 0);
  return hours * 3600 + minutes * 60 + secs;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/**
 * Split a watch URL into the stored form.
 * @returns {{platform: string, id: string, start?: number, hash?: string}}
 * @throws {Error} with a message written for the person who pasted it.
 */
export function parseVideoUrl(input) {
  const trimmed = String(input).trim().replace(/^<|>$/g, '');
  let url;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error(`not a URL: ${trimmed}`);
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split('/').filter(Boolean);
  const at = seconds(url.searchParams.get('t') ?? url.searchParams.get('start')
    ?? url.hash.match(/^#t=(.+)$/)?.[1]);

  if (YOUTUBE_HOSTS.has(host)) {
    /* youtu.be/ID, and the /shorts/ID, /embed/ID, /live/ID, /v/ID forms. */
    const id = host.endsWith('youtu.be')
      ? path[0]
      : url.searchParams.get('v')
        ?? (['shorts', 'embed', 'live', 'v'].includes(path[0]) ? path[1] : undefined);
    if (!id) {
      throw new Error(`no video id in ${trimmed} - a playlist or channel link is not a video`);
    }
    if (!/^[\w-]{11}$/.test(id)) {
      throw new Error(`"${id}" is not a YouTube id (they are 11 characters); check ${trimmed}`);
    }
    return { platform: 'youtube', id, ...(at ? { start: at } : {}) };
  }

  if (VIMEO_HOSTS.has(host)) {
    /* vimeo.com/ID, /video-channels/x/ID, /groups/x/videos/ID, player.vimeo.com/video/ID.
     * An unlisted video carries a privacy hash, either as the path segment
     * after the id or as ?h=; it is REQUIRED to play and we cannot store it,
     * so it is returned for the caller to complain about. */
    const digits = path.filter((part) => /^\d+$/.test(part));
    const id = digits[digits.length - 1];
    if (!id) throw new Error(`no video id in ${trimmed}`);
    const after = path[path.indexOf(id) + 1];
    const hash = url.searchParams.get('h') ?? (after && /^[0-9a-f]{6,}$/i.test(after) ? after : undefined);
    return { platform: 'vimeo', id, ...(at ? { start: at } : {}), ...(hash ? { hash } : {}) };
  }

  throw new Error(`${host} is not a platform this reference links to (youtube or vimeo): ${trimmed}`);
}

/** The JSON block to paste into a `videos` array, provider left to the human. */
export function entryFor(parsed, { provider = 'PROVIDER-SLUG', title = 'TITLE' } = {}) {
  const { hash, ...stored } = parsed;
  return {
    provider,
    platform: stored.platform,
    id: stored.id,
    title,
    ...(stored.start ? { start: stored.start } : {}),
  };
}

/* --- command line ---------------------------------------------------------- */
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Usage: npm run video -- <url> [<url> …]');
    console.error('Prints the JSON entry for each, to paste into a "videos" array.');
    process.exit(2);
  }
  let failed = false;
  for (const url of urls) {
    try {
      const parsed = parseVideoUrl(url);
      if (parsed.hash) {
        console.error(`! ${url}\n  This is an UNLISTED Vimeo video: the hash "${parsed.hash}" is part of`);
        console.error('  its address and there is nowhere to store it, so the entry below would');
        console.error('  not play. Ask whoever published it to make it public, or leave it out.');
        failed = true;
      }
      console.log(`${JSON.stringify(entryFor(parsed), null, 2).replace(/^/gm, '  ')},`);
    } catch (error) {
      console.error(`! ${error.message}`);
      failed = true;
    }
  }
  console.error('\nFill in "provider" (a slug from video-providers/) and "title" (as published),');
  console.error('then add "duration", "role", "captions" or "spokenInstruction" if you know them.');
  process.exit(failed ? 1 : 0);
}
