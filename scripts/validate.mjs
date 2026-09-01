/* ---------------------------------------------------------------------------
 * VALIDATE · run with `npm run validate` · what CI runs on every PR
 *
 * Three passes over the content, all reported together:
 *   1. JSON Schema: every file against the schema for its collection
 *      (techniques, skills, sequences, guides, exams, grading-schemes).
 *   2. Naming and shape: technique filenames are lowercase hyphenated romaji
 *      and match their own nameRomaji; aliases must not collide with real
 *      slugs; every technique carries the canonical field set in canonical
 *      order, an unwritten field being null rather than absent, and every
 *      sequence carries its own seven fields the same way.
 *   3. Cross-file integrity, which JSON Schema cannot see: every slug in a
 *      grade's techniqueSlugs exists; grade slugs are unique within a scheme;
 *      at most one video per technique is `recommended`; every glossary
 *      term a syllabus item names exists; a reference link is
 *      an http(s) url and listed once; a video pasted as a URL is answered
 *      with the platform/id entry it should have been; every technique
 *      with an `image` field has media/techniques/<slug>.webp; every exam
 *      item's technique slugs exist; the cross-field invariants JSON Schema
 *      cannot express (a throw needs its wazaType, a banned technique needs
 *      its note and carries no steps, an exam's marks add up); and the
 *      provenance counts printed in NOTICE.md against the real ones, because
 *      a rights document that has quietly drifted is worse than none.
 * ------------------------------------------------------------------------ */
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVideoUrl, entryFor } from './video-url.mjs';
import { knownTiers } from '../tools/ijf-results/lib/tiers.mjs';

// The one dependency. A fresh clone that has not run `npm ci` should be told
// so, rather than shown a module resolution stack trace.
let Ajv;
try {
  ({ default: Ajv } = await import('ajv'));
} catch {
  console.error('Cannot find the validator dependency (ajv).');
  console.error('Install it once with:  npm ci');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ajv = new Ajv({ allErrors: true, strict: false });

// Ajv ships no format implementations, so the `"format": "uri"` the schemas put
// on every url made every run open with a dozen lines of `unknown format "uri"
// ignored` before it said anything useful - the first thing a new contributor
// sees. Registered here rather than by adding ajv-formats, because the one
// dependency is a promise the README makes, and not in the schemas themselves,
// because those are held in step with the website's copies. Checking that a
// link is absolute and http(s) is the link pass's job further down; all this
// has to recognise is a scheme.
ajv.addFormat('uri', /^[a-z][a-z0-9+.-]*:/i);

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function loadDir(dir) {
  const entries = [];
  let names = [];
  try {
    names = (await readdir(path.join(root, dir))).sort();
  } catch {
    return entries; // directory absent: nothing of this kind yet
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(root, dir, name);
    try {
      entries.push({ name, slug: name.replace(/\.json$/, ''), data: await loadJson(file) });
    } catch (error) {
      problems.push(`${dir}/${name}: not valid JSON (${error.message})`);
    }
  }
  return entries;
}

const problems = [];
const validateTechnique = ajv.compile(await loadJson(path.join(root, 'schema/technique.schema.json')));
const validateScheme = ajv.compile(await loadJson(path.join(root, 'schema/scheme.schema.json')));
const validateSequence = ajv.compile(await loadJson(path.join(root, 'schema/sequence.schema.json')));
const validateGuide = ajv.compile(await loadJson(path.join(root, 'schema/guide.schema.json')));
const validateSkill = ajv.compile(await loadJson(path.join(root, 'schema/skill.schema.json')));
const validateKata = ajv.compile(await loadJson(path.join(root, 'schema/kata.schema.json')));
const validateExam = ajv.compile(await loadJson(path.join(root, 'schema/exam.schema.json')));
const validateProvider = ajv.compile(await loadJson(path.join(root, 'schema/provider.schema.json')));
const validateChannel = ajv.compile(await loadJson(path.join(root, 'schema/channel.schema.json')));
const validateTerm = ajv.compile(await loadJson(path.join(root, 'schema/glossary-term.schema.json')));
const validateOrganisation = ajv.compile(await loadJson(path.join(root, 'schema/organisation.schema.json')));
const validatePerspective = ajv.compile(await loadJson(path.join(root, 'schema/perspective.schema.json')));

const techniques = await loadDir('techniques');
const schemes = await loadDir('grading-schemes');
const sequences = await loadDir('sequences');
const guides = await loadDir('guides');
const skills = await loadDir('skills');
const kata = await loadDir('kata');
const exams = await loadDir('exams');
const providers = await loadDir('video-providers');
const channels = await loadDir('video-channels');
const glossary = await loadDir('glossary');
const organisations = await loadDir('organisations');

/* Perspectives are the one nested collection: one directory per
 * organisation, then one directory per kind of thing spoken about, then one
 * file per subject - perspectives/bja/techniques/uchi-mata.json - so the
 * path alone says whose voice this is and what it is about, and technique
 * and exam slugs can never collide. Schemes are the expected next kind;
 * nothing accepts them until something renders them. */
const perspectiveTypes = ['techniques', 'exams', 'skills', 'guides', 'sequences'];
const perspectives = [];
{
  let orgDirs = [];
  try {
    orgDirs = (await readdir(path.join(root, 'perspectives'), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch { /* no perspectives yet */ }
  for (const org of orgDirs) {
    const entries = (await readdir(path.join(root, 'perspectives', org), { withFileTypes: true }))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isDirectory() && perspectiveTypes.includes(entry.name)) {
        for (const file of await loadDir(`perspectives/${org}/${entry.name}`)) {
          perspectives.push({ ...file, org, type: entry.name, name: `${org}/${entry.name}/${file.name}` });
        }
      } else if (entry.isDirectory()) {
        problems.push(`perspectives/${org}/${entry.name}: a perspective speaks about `
          + `${perspectiveTypes.join(' or ')}; "${entry.name}" is not yet a kind anything renders`);
      } else {
        problems.push(`perspectives/${org}/${entry.name}: a perspective is filed by what it is about - `
          + `perspectives/${org}/techniques/<slug>.json or perspectives/${org}/exams/<slug>.json`);
      }
    }
  }
}

const report = (file, validate) => {
  for (const error of validate.errors ?? []) {
    problems.push(`${file}: ${error.instancePath || '/'} ${error.message}`);
  }
};

/* 1 + 2: per-file schema and naming. */
const slugs = new Set(techniques.map((t) => t.slug));
for (const t of techniques) {
  if (!validateTechnique(t.data)) report(`techniques/${t.name}`, validateTechnique);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(t.slug)) {
    problems.push(`techniques/${t.name}: filename must be lowercase romaji with hyphens`);
  }
  const expected = t.data.nameRomaji?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (expected && expected !== t.slug) {
    problems.push(`techniques/${t.name}: filename should be "${expected}.json" to match nameRomaji "${t.data.nameRomaji}"`);
  }
  for (const alias of t.data.aliases ?? []) {
    const aliasSlug = alias.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (slugs.has(aliasSlug) && aliasSlug !== t.slug) {
      problems.push(`techniques/${t.name}: alias "${alias}" collides with existing technique "${aliasSlug}"`);
    }
  }
  const recommended = (t.data.videos ?? []).filter((v) => v.recommended).length;
  if (recommended > 1) {
    problems.push(`techniques/${t.name}: ${recommended} videos are "recommended"; at most one may be`);
  }
}

/* The canonical technique record. Every technique file carries every field,
 * in this order, with a gap written as null (or an empty array) rather than
 * left out: a reader can then see what a complete technique looks like and
 * what this one is still missing, and a contributor knows where their
 * addition goes. JSON Schema enforces the field SET (required, plus
 * additionalProperties false); only code can see the ORDER. */
const techniqueFields = ['nameRomaji', 'nameJa', 'nameKana', 'aliases', 'otherNames', 'gloss',
  'category', 'subCategory', 'wazaType', 'gokyoSet', 'kodokanNumber', 'kodokanAbbr', 'kodokan',
  'banned', 'bannedNote', 'videos', 'ijfAnimation', 'links', 'image', 'about', 'keyPoints',
  'described', 'receiving', 'viNotes', 'resolver', 'variations'];
for (const t of techniques) {
  const keys = Object.keys(t.data);
  /* Anything missing or unexpected has already been reported by the schema;
   * saying it twice in different words helps nobody. */
  if (keys.length !== techniqueFields.length) continue;
  if (keys.some((key, at) => key !== techniqueFields[at])) {
    problems.push(`techniques/${t.name}: fields are out of canonical order; expected `
      + `${techniqueFields.join(', ')}`);
  }
}

/* The Kodokan classification, as the Kodokan draws it: three groups, each
 * divided, and nage-waza divided once more. A technique names its position
 * at every level, so this is the table that says which positions exist. The
 * branches are different depths on purpose - only nage-waza has a third
 * level - and `wazaType` is null wherever the branch ends. Kept identical to
 * KODOKAN_CLASSIFICATION in the site's content-schema.mjs. */
const kodokanClassification = {
  'nage-waza': {
    'tachi-waza': ['te-waza', 'koshi-waza', 'ashi-waza'],
    'sutemi-waza': ['ma-sutemi-waza', 'yoko-sutemi-waza'],
  },
  'katame-waza': { 'osaekomi-waza': [], 'shime-waza': [], 'kansetsu-waza': [] },
  'atemi-waza': { 'ude-ate': [], 'ashi-ate': [] },
};

/* Classification invariants. JSON Schema checks one field at a time and so
 * cannot see these; the site's zod schema enforces the same rules, and the
 * two must agree or a file valid here would fail the build there. */
for (const t of techniques) {
  const isThrow = t.data.category === 'nage-waza';

  /* The three levels must describe one real route down the tree. A technique
   * filed under a parent it does not belong to is exactly the mistake no
   * single-field check can see. */
  const branches = kodokanClassification[t.data.category] ?? {};
  const types = branches[t.data.subCategory];
  if (types === undefined) {
    problems.push(`techniques/${t.name}: "${t.data.subCategory}" is not a division of `
      + `${t.data.category}; it takes one of ${Object.keys(branches).join(', ')}`);
  } else if (types.length === 0 && t.data.wazaType !== null) {
    problems.push(`techniques/${t.name}: ${t.data.subCategory} has no third level, so wazaType must be null`);
  } else if (types.length > 0 && !types.includes(t.data.wazaType)) {
    problems.push(`techniques/${t.name}: every ${t.data.subCategory} technique names what it `
      + `throws with (${types.join(', ')}), not ${t.data.wazaType}`);
  }

  /* The Gokyo no Waza is a set of throws: a hold or a strangle cannot be in it. */
  if (!isThrow && t.data.gokyoSet !== null && t.data.gokyoSet !== undefined) {
    problems.push(`techniques/${t.name}: gokyoSet must be null on ${t.data.category}`);
  }
}

/* A prohibited technique must say what the prohibition is, and the two
 * degrees are not the same thing. "in-competition" means contest rules bar
 * it while judo still teaches, demonstrates and examines it, so it keeps its
 * `described` steps; "yes" means it is not to be applied at all and is
 * documented for RECOGNITION only, with no step-by-step. Both directions are
 * checked, because a bannedNote against "no" means one of the two was edited
 * and the other forgotten. */
for (const t of techniques) {
  if (t.data.banned !== 'no' && !t.data.bannedNote) {
    problems.push(`techniques/${t.name}: banned is "${t.data.banned}" but bannedNote is missing`);
  }
  if (t.data.banned === 'no' && t.data.bannedNote) {
    problems.push(`techniques/${t.name}: bannedNote is set but banned is "no"`);
  }
  if (t.data.banned === 'yes' && t.data.described) {
    problems.push(`techniques/${t.name}: a technique banned outright carries no described steps`);
  }
}

/* The resolver's observable facts pair off with the branch, exactly as the
 * site's zod schema holds them: a throw has a fall and a mechanism and no
 * ground fields, a hold has a position, a strangle a position and an
 * implement, a lock a trapped arm. And confusableWith is a cross-file claim
 * zod cannot see: every slug must exist, none may be the technique itself,
 * and the relation is symmetric - if a spectator cannot tell A from B, they
 * cannot tell B from A either, so one direction on its own means the other
 * file was forgotten. */
{
  const resolverBranchFields = {
    'tachi-waza': ['fall', 'mechanism'],
    'sutemi-waza': ['fall', 'mechanism'],
    'osaekomi-waza': ['groundPosition'],
    'shime-waza': ['groundPosition', 'strangleUses'],
    'kansetsu-waza': ['lock'],
  };
  const confusable = new Map();
  for (const t of techniques) {
    const resolver = t.data.resolver;
    if (!resolver) continue;
    const wanted = resolverBranchFields[t.data.subCategory] ?? [];
    for (const field of ['fall', 'mechanism', 'groundPosition', 'strangleUses', 'lock']) {
      const set = resolver[field] !== null && resolver[field] !== undefined;
      if (wanted.includes(field) && !set) {
        problems.push(`techniques/${t.name}: a ${t.data.subCategory} technique's resolver sets ${field}`);
      } else if (!wanted.includes(field) && set) {
        problems.push(`techniques/${t.name}: resolver ${field} has no meaning on ${t.data.subCategory}, so it must be null`);
      }
    }
    /* lockPress pairs with one lock shape rather than a branch: the
     * arm-straight-body locks are told apart by what does the pressing, and
     * no other lock needs the field. Mirrored in the site's zod schema. */
    const pressed = resolver.lockPress !== null && resolver.lockPress !== undefined;
    if (resolver.lock === 'arm-straight-body' && !pressed) {
      problems.push(`techniques/${t.name}: an arm-straight-body lock says what presses the arm; set resolver.lockPress`);
    } else if (resolver.lock !== 'arm-straight-body' && pressed) {
      problems.push(`techniques/${t.name}: resolver lockPress only has meaning when lock is arm-straight-body, so it must be null`);
    }
    confusable.set(t.slug, new Set(resolver.confusableWith ?? []));
  }
  for (const [slug, lookalikes] of confusable) {
    for (const other of lookalikes) {
      if (!slugs.has(other)) {
        problems.push(`techniques/${slug}.json: resolver confusableWith names unknown technique "${other}"`);
      } else if (other === slug) {
        problems.push(`techniques/${slug}.json: resolver confusableWith lists the technique itself`);
      } else if (!(confusable.get(other)?.has(slug))) {
        problems.push(`techniques/${other}.json: resolver confusableWith should list "${slug}", which lists it; the relation is symmetric`);
      }
    }
  }
}

/* The Kodokan number and its abbreviation travel together, and both are null
 * for a technique outside the hundred the Kodokan recognises. The number's
 * leading digit is the classification it belongs to, so it must agree with
 * the whole path we already record. */
const kodokanGroups = [
  [100, 'nage-waza', 'tachi-waza', 'te-waza'],
  [200, 'nage-waza', 'tachi-waza', 'koshi-waza'],
  [300, 'nage-waza', 'tachi-waza', 'ashi-waza'],
  [400, 'nage-waza', 'sutemi-waza', 'ma-sutemi-waza'],
  [500, 'nage-waza', 'sutemi-waza', 'yoko-sutemi-waza'],
  [600, 'katame-waza', 'osaekomi-waza', null],
  [700, 'katame-waza', 'shime-waza', null],
  [800, 'katame-waza', 'kansetsu-waza', null]];
for (const t of techniques) {
  const { kodokanNumber: number, kodokanAbbr: abbr } = t.data;
  if ((number === null) !== (abbr === null)) {
    problems.push(`techniques/${t.name}: kodokanNumber and kodokanAbbr must both be set or both be null`);
    continue;
  }
  if (number === null) continue;
  const group = kodokanGroups.find(([base]) => number >= base && number < base + 100);
  const path = (a, b, c) => [a, b, c].filter(Boolean).join('/');
  if (group[1] !== t.data.category || group[2] !== t.data.subCategory
      || group[3] !== (t.data.wazaType ?? null)) {
    problems.push(`techniques/${t.name}: Kodokan ${number} is ${path(group[1], group[2], group[3])}`
      + `, but this file says ${path(t.data.category, t.data.subCategory, t.data.wazaType)}`);
  }
}
/* Numbers are unique; abbreviations are NOT, and that is the source's doing,
 * not ours. The IJF/Kodokan classification prints OUG against both o-uchi-
 * gari (305) and o-uchi-gaeshi (318), and KSG against both ko-soto-gari (306)
 * and kami-shiho-gatame (605). We transcribe what the document says rather
 * than invent codes to separate them, so do not "fix" these by guessing. */
{
  const numbers = new Map();
  for (const t of techniques) {
    const number = t.data.kodokanNumber;
    if (number === null) continue;
    if (numbers.has(number)) {
      problems.push(`techniques/${t.name}: Kodokan number ${number} is already on ${numbers.get(number)}`);
    }
    numbers.set(number, t.name);
  }
}

/* Images are file-by-convention: a technique that declares `image` metadata
 * must have the file media/techniques/<slug>.webp alongside it. */
for (const t of techniques) {
  if (!t.data.image) continue;
  try {
    await access(path.join(root, 'media/techniques', `${t.slug}.webp`));
  } catch {
    problems.push(`techniques/${t.name}: has image metadata but media/techniques/${t.slug}.webp does not exist`);
  }
}

/* Providers: whoever filmed the demonstrations. Every video names one, and a
 * video naming a provider that does not exist would render as a blank source
 * and break the reader's ordering, so the reference is checked both ways. */
const providerIds = new Set(providers.map((p) => p.slug));
const orders = new Set();
for (const p of providers) {
  if (!validateProvider(p.data)) report(`video-providers/${p.name}`, validateProvider);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(p.slug)) {
    problems.push(`video-providers/${p.name}: filename must be lowercase with hyphens`);
  }
  if (orders.has(p.data.order)) {
    problems.push(`video-providers/${p.name}: order ${p.data.order} is already taken; the default ranking must be unambiguous`);
  }
  orders.add(p.data.order);
}

/* Videos: shared by techniques, skills and sequences, so checked in one pass. */
const withVideos = [
  ...techniques.map((t) => [`techniques/${t.name}`, t.data.videos ?? []]),
  ...skills.map((k) => [`skills/${k.name}`, k.data.videos ?? []]),
  ...sequences.map((q) => [`sequences/${q.name}`, q.data.videos ?? []]),
  ...guides.map((g) => [`guides/${g.name}`, g.data.videos ?? []]),
  ...perspectives.map((p) => [`perspectives/${p.name}`, p.data.videos ?? []]),
  ...kata.map((k) => [`kata/${k.name}`, k.data.videos ?? []]),
];
const usedProviders = new Set();
for (const [where, videos] of withVideos) {
  const seen = new Set();
  for (const video of videos) {
    /* A video is stored as platform + id, so that the same demonstration has
     * ONE spelling however it was shared, and so that no share link's
     * tracking parameter can ride along. A contributor pasting the URL they
     * had is the expected mistake and not a foolish one: answer it with the
     * entry they should have written rather than a schema error. */
    const pasted = video.url ?? (typeof video.id === 'string' && video.id.includes('/') ? video.id : null);
    if (pasted) {
      try {
        const parsed = parseVideoUrl(pasted);
        const suggestion = JSON.stringify(entryFor(parsed, { provider: video.provider ?? 'PROVIDER-SLUG', title: video.title ?? 'TITLE' }));
        problems.push(`${where}: a video is stored as "platform" and "id", never a URL. `
          + `Replace it with ${suggestion}${parsed.hash ? ' (and note this is an UNLISTED Vimeo video: its privacy hash cannot be stored, so it would not play)' : ''}`);
      } catch (error) {
        problems.push(`${where}: ${error.message}`);
      }
      continue;
    }
    usedProviders.add(video.provider);
    if (!providerIds.has(video.provider)) {
      problems.push(`${where}: video names unknown provider "${video.provider}"`);
    }
    const key = `${video.platform}:${video.id}:${video.start ?? ''}`;
    if (seen.has(key)) {
      problems.push(`${where}: the same video is listed twice (${key})`);
    }
    seen.add(key);
  }
  if (videos.filter((v) => v.recommended).length > 1) {
    problems.push(`${where}: more than one video is "recommended"`);
  }
}
for (const p of providers) {
  if (!usedProviders.has(p.slug)) {
    problems.push(`video-providers/${p.name}: no video references this provider; remove it or add its videos`);
  }
}

const guideIds = new Set(guides.map((g) => g.slug));

/* Glossary: the words a syllabus asks about. Terms resolve INTO the book
 * (techniques whose names contain them, the guide that covers them), and
 * syllabus items resolve OUT to them, so both directions are checked. */
const termIds = new Set(glossary.map((t) => t.slug));
const kataIds = new Set(kata.map((k) => k.slug));
const termWords = new Map();
for (const t of glossary) {
  if (!validateTerm(t.data)) report(`glossary/${t.name}`, validateTerm);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(t.slug)) {
    problems.push(`glossary/${t.name}: filename must be lowercase with hyphens`);
  }
  for (const slug of t.data.techniques ?? []) {
    if (!slugs.has(slug)) problems.push(`glossary/${t.name}: unknown technique "${slug}"`);
  }
  for (const id of t.data.guides ?? []) {
    if (!guideIds.has(id)) problems.push(`glossary/${t.name}: unknown guide "${id}"`);
  }
  const word = t.data.term.toLowerCase();
  if (termWords.has(word)) {
    problems.push(`glossary/${t.name}: "${t.data.term}" is already defined in ${termWords.get(word)}`);
  }
  termWords.set(word, t.name);
}

/* Channels: somewhere to go looking, never ranked. A channel that is also a
 * provider is fine (the federation channel and its indexed grading videos
 * are different things), but the same URL twice is a duplicate. */
const channelUrls = new Set();
for (const c of channels) {
  if (!validateChannel(c.data)) report(`video-channels/${c.name}`, validateChannel);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(c.slug)) {
    problems.push(`video-channels/${c.name}: filename must be lowercase with hyphens`);
  }
  try {
    const parsed = new URL(c.data.url);
    if (parsed.protocol !== 'https:') problems.push(`video-channels/${c.name}: url must be https`);
  } catch {
    problems.push(`video-channels/${c.name}: url is not parseable`);
  }
  if (channelUrls.has(c.data.url)) problems.push(`video-channels/${c.name}: this channel is listed twice`);
  channelUrls.add(c.data.url);
}

/* Reference links: pages to read, not demonstrations. ajv here has no
 * format vocabulary, so the "uri" format in the schema is ignored and the
 * URL is checked in code instead - an http(s) absolute URL, listed once. */
let linkCount = 0;
for (const t of techniques) {
  const seen = new Set();
  for (const link of t.data.links ?? []) {
    linkCount += 1;
    let parsed;
    try {
      parsed = new URL(link.url);
    } catch {
      problems.push(`techniques/${t.name}: link "${link.title}" has an unparseable url "${link.url}"`);
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      problems.push(`techniques/${t.name}: link "${link.title}" is not an http(s) url`);
    }
    if (seen.has(link.url)) {
      problems.push(`techniques/${t.name}: the same link is listed twice (${link.url})`);
    }
    seen.add(link.url);
  }
}
for (const s of schemes) {
  for (const grade of s.data.grades ?? []) {
    const seen = new Set();
    for (const link of grade.links ?? []) {
      linkCount += 1;
      try {
        const parsed = new URL(link.url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          problems.push(`grading-schemes/${s.name}: ${grade.slug} link "${link.title}" is not an http(s) url`);
        }
      } catch {
        problems.push(`grading-schemes/${s.name}: ${grade.slug} link "${link.title}" has an unparseable url`);
        continue;
      }
      if (seen.has(link.url)) {
        problems.push(`grading-schemes/${s.name}: ${grade.slug} lists the same link twice (${link.url})`);
      }
      seen.add(link.url);
    }
  }
}
for (const p of providers) {
  if (!p.data.homepage) continue;
  try {
    const parsed = new URL(p.data.homepage);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      problems.push(`video-providers/${p.name}: homepage is not an http(s) url`);
    }
  } catch {
    problems.push(`video-providers/${p.name}: homepage is not a parseable url`);
  }
}

/* Skills: the examined things that are not techniques - breakfalls,
 * gripping, escapes, turnovers. Every one must narrate itself, because a
 * skill with no steps is exactly the gap this collection exists to close. */
/* A kata is named by its romaji, and the filename is that name lowercased,
 * the same rule techniques follow. It is checked because the name is what a
 * syllabus prints and what an exam item resolves to: a file called
 * kodokan-goshin-jutsu.json holding a kata named something else would break
 * that link silently. */
for (const k of kata) {
  if (!validateKata(k.data)) report(`kata/${k.name}`, validateKata);
  const expected = k.data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (expected && expected !== k.slug) {
    problems.push(`kata/${k.name}: filename should be "${expected}.json" to match name "${k.data.name}"`);
  }
}

for (const k of skills) {
  if (!validateSkill(k.data)) report(`skills/${k.name}`, validateSkill);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(k.slug)) {
    problems.push(`skills/${k.name}: filename must be lowercase with hyphens`);
  }
  for (const slug of k.data.techniques ?? []) {
    if (!slugs.has(slug)) problems.push(`skills/${k.name}: unknown technique "${slug}"`);
  }
  /* WEBP OR SVG, and skills are the only collection that may use either.
   *
   * Every other illustration here is a photographed or drawn sequence, and
   * webp is right for those. The movement skills carry footwork diagrams:
   * feet and arrows, drawn by scripts/build-movement-diagrams.mjs, where
   * vector is the correct format rather than a preference. They stay sharp at
   * any size in the lightbox, weigh a few hundred bytes against 20 to 30 KB,
   * and rasterising a line drawing to satisfy a file extension would be
   * choosing the worse file to avoid changing one line here. */
  if (k.data.image) {
    const candidates = ['webp', 'svg'].map((ext) => path.join(root, 'media/skills', `${k.slug}.${ext}`));
    let found = false;
    for (const candidate of candidates) {
      try {
        await access(candidate);
        found = true;
        break;
      } catch { /* try the next extension */ }
    }
    if (!found) {
      problems.push(`skills/${k.name}: has image metadata but neither media/skills/${k.slug}.webp nor .svg exists`);
    }
  }
}

/* Sequences carry a canonical record too, for the same reason techniques do:
 * a combination nobody has narrated yet says so with a null rather than by
 * leaving the field out, and the three written-for-the-ear fields sit in the
 * same order as they do on a technique. JSON Schema enforces the field SET;
 * only code can see the ORDER. */
const sequenceFields = ['kind', 'techniques', 'about', 'described', 'receiving', 'viNotes', 'videos', 'resolver'];

/* Sequences: schema, naming, and every referenced technique must exist. */
for (const q of sequences) {
  const keys = Object.keys(q.data);
  /* Anything missing or unexpected has already been reported by the schema. */
  if (keys.length === sequenceFields.length && keys.some((key, at) => key !== sequenceFields[at])) {
    problems.push(`sequences/${q.name}: fields are out of canonical order; expected `
      + `${sequenceFields.join(', ')}`);
  }
  if (!validateSequence(q.data)) report(`sequences/${q.name}`, validateSequence);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(q.slug)) {
    problems.push(`sequences/${q.name}: filename must be lowercase with hyphens`);
  }
  const categories = [];
  for (const slug of q.data.techniques ?? []) {
    if (!slugs.has(slug)) problems.push(`sequences/${q.name}: unknown technique "${slug}"`);
    else categories.push(techniques.find((t) => t.slug === slug).data.category);
  }
  /* The kind must match what the techniques actually are, or the sequence
   * lists on the wrong page and is described with the wrong vocabulary. */
  if (categories.length === q.data.techniques.length) {
    const throws = categories.map((c) => c === 'nage-waza');
    if (q.data.kind === 'combination' && !throws.every(Boolean)) {
      problems.push(`sequences/${q.name}: a combination is throw into throw; use "transition" or "chain"`);
    }
    if (q.data.kind === 'transition' && !(throws[0] && !throws[throws.length - 1])) {
      problems.push(`sequences/${q.name}: a transition runs from a throw into groundwork`);
    }
    if (q.data.kind === 'chain' && throws.some(Boolean)) {
      problems.push(`sequences/${q.name}: a chain is groundwork only; a throw makes it a transition`);
    }
  }
}

/* Guides: schema, naming, and every section must carry prose or steps
 * (JSON Schema cannot express the either-or). */
for (const g of guides) {
  if (!validateGuide(g.data)) report(`guides/${g.name}`, validateGuide);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(g.slug)) {
    problems.push(`guides/${g.name}: filename must be lowercase with hyphens`);
  }
  (g.data.sections ?? []).forEach((section, index) => {
    if (!section.prose && !section.steps) {
      problems.push(`guides/${g.name}: section ${index + 1} has neither prose nor steps`);
    }
  });
}

const sequenceIds = new Set(sequences.map((q) => q.slug));
const skillIds = new Set(skills.map((k) => k.slug));

/* A syllabus or exam item resolves to techniques and, where the sequences
 * collection documents the whole combination or counter, to a sequence too.
 * Shared by both because both carry the schema's `referenceItem`. */
function checkItem(where, item) {
  for (const slug of item.techniques ?? []) {
    if (!slugs.has(slug)) {
      problems.push(`${where}: item "${item.text}" references unknown technique "${slug}"`);
    }
  }
  for (const id of item.sequences ?? []) {
    if (!sequenceIds.has(id)) {
      problems.push(`${where}: item "${item.text}" references unknown sequence "${id}"`);
    }
  }
  for (const id of item.skills ?? []) {
    if (!skillIds.has(id)) {
      problems.push(`${where}: item "${item.text}" references unknown skill "${id}"`);
    }
  }
  for (const id of item.guides ?? []) {
    if (!guideIds.has(id)) {
      problems.push(`${where}: item "${item.text}" references unknown guide "${id}"`);
    }
  }
  for (const id of item.terms ?? []) {
    if (!termIds.has(id)) {
      problems.push(`${where}: item "${item.text}" references unknown glossary term "${id}"`);
    }
  }
  for (const id of item.kata ?? []) {
    if (!kataIds.has(id)) {
      problems.push(`${where}: item "${item.text}" references unknown kata "${id}"`);
    }
  }
}

/* Exams: schema, naming, and every resolved technique reference must exist.
 * Item `text` stays as printed on the form (its authority); `techniques` is
 * the resolved cross-reference, and an empty list is legitimate where the
 * printed wording is ambiguous or names something not yet documented. */
for (const e of exams) {
  if (!validateExam(e.data)) report(`exams/${e.name}`, validateExam);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(e.slug)) {
    problems.push(`exams/${e.name}: filename must be lowercase with hyphens`);
  }

  /* A replaced examination and its note travel together, as banned and
   * bannedNote do. A form the federation no longer uses is worth keeping -
   * it is what older certificates were awarded against - but a reader who
   * lands on it has to be told so, and told what to prepare against now. */
  if (e.data.status === 'legacy' && !e.data.statusNote) {
    problems.push(`exams/${e.name}: "status": "legacy" needs a statusNote saying what replaced it and from when`);
  }
  if (e.data.statusNote && e.data.status !== 'legacy') {
    problems.push(`exams/${e.name}: statusNote without "status": "legacy"`);
  }
  const sectionSlugs = new Set();
  for (const section of e.data.sections ?? []) {
    if (sectionSlugs.has(section.slug)) {
      problems.push(`exams/${e.name}: duplicate section slug "${section.slug}"`);
    }
    sectionSlugs.add(section.slug);
    for (const group of section.groups ?? []) {
      for (const item of group.items ?? []) {
        checkItem(`exams/${e.name} section "${section.slug}"`, item);
      }
    }
  }

  /* Marks are transcribed from a printed form, where they are the whole
   * point: a pass mark above the maximum, a requirement naming a section the
   * form does not have, or parts that do not sum to the stated total all mean
   * the transcription slipped. */
  for (const level of e.data.levels ?? []) {
    const name = level.label?.en ?? '?';
    if (level.passMark > level.maxMarks) {
      problems.push(`exams/${e.name}: ${name} pass mark ${level.passMark} exceeds its maximum ${level.maxMarks}`);
    }
    for (const requirement of level.requirements ?? []) {
      if (!sectionSlugs.has(requirement.section)) {
        problems.push(`exams/${e.name}: ${name} requirement names unknown section "${requirement.section}"`);
      }
    }
    const marked = (level.requirements ?? []).filter((r) => r.marks !== undefined);
    if (marked.length > 0 && marked.length === (level.requirements ?? []).length) {
      const total = marked.reduce((sum, r) => sum + r.marks, 0);
      if (total !== level.maxMarks) {
        problems.push(`exams/${e.name}: ${name} section marks sum to ${total} but maxMarks says ${level.maxMarks}`);
      }
    }
  }
}

/* 3: schemes and cross-file integrity. */
for (const s of schemes) {
  if (!validateScheme(s.data)) report(`grading-schemes/${s.name}`, validateScheme);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s.slug)) {
    problems.push(`grading-schemes/${s.name}: filename must be lowercase with hyphens`);
  }
  const seen = new Set();
  for (const grade of s.data.grades ?? []) {
    if (seen.has(grade.slug)) problems.push(`grading-schemes/${s.name}: duplicate grade slug "${grade.slug}"`);
    seen.add(grade.slug);
    for (const slug of grade.techniqueSlugs ?? []) {
      if (!slugs.has(slug)) {
        problems.push(`grading-schemes/${s.name}: grade "${grade.slug}" requires unknown technique "${slug}"`);
      }
    }
    /* Official syllabus items: printed text is the authority, resolved slugs
     * must exist, and the denormalised techniqueSlugs must cover them. */
    const required = new Set(grade.techniqueSlugs ?? []);
    const twice = (grade.techniqueSlugs ?? []).filter((slug, at) => grade.techniqueSlugs.indexOf(slug) !== at);
    if (twice.length > 0) {
      problems.push(`grading-schemes/${s.name}: grade "${grade.slug}" lists ${[...new Set(twice)].join(', ')} more than once`);
    }
    const sectionsSeen = new Set();
    for (const section of grade.syllabus ?? []) {
      if (sectionsSeen.has(section.slug)) {
        problems.push(`grading-schemes/${s.name}: grade "${grade.slug}" has two syllabus sections called "${section.slug}"`);
      }
      sectionsSeen.add(section.slug);
      for (const item of section.items ?? []) {
        checkItem(`grading-schemes/${s.name} grade "${grade.slug}"`, item);
        for (const slug of item.techniques ?? []) {
          if (slugs.has(slug) && !required.has(slug)) {
            problems.push(`grading-schemes/${s.name}: grade "${grade.slug}" syllabus resolves "${slug}" but techniqueSlugs does not list it`);
          }
        }
      }
    }
    if (grade.image) {
      try {
        await access(path.join(root, 'media/grading-schemes', s.slug, `${grade.slug}.webp`));
      } catch {
        problems.push(`grading-schemes/${s.name}: grade "${grade.slug}" has image metadata but media/grading-schemes/${s.slug}/${grade.slug}.webp does not exist`);
      }
    }
  }
  for (const poster of s.data.posters ?? []) {
    try {
      await access(path.join(root, 'media/grading-schemes', s.slug, `${poster.id}.webp`));
    } catch {
      problems.push(`grading-schemes/${s.name}: poster "${poster.id}" declared but media/grading-schemes/${s.slug}/${poster.id}.webp does not exist`);
    }
  }
}

/* Localised prose is an object keyed by BCP 47 language code with `en`
 * required, and the schema accepts ANY other key (that is how a translation
 * lands without a schema change). The cost is that a typo - "english",
 * "EN", "fr_FR" - validates and then silently never renders, because `loc()`
 * only ever looks for a real language tag. This lint is the only thing that
 * would notice. */
const languageTag = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
function lintLanguageKeys(where, node) {
  if (Array.isArray(node)) {
    node.forEach((value) => lintLanguageKeys(where, value));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const values = Object.values(node);
  const isLocalised = 'en' in node && values.length > 0
    && values.every((value) => typeof value === 'string'
      || (Array.isArray(value) && value.every((entry) => typeof entry === 'string')));
  if (isLocalised) {
    for (const key of Object.keys(node)) {
      if (!languageTag.test(key)) {
        problems.push(`${where}: "${key}" is not a language code; localised text is keyed by BCP 47 tag`);
      }
    }
    return;
  }
  values.forEach((value) => lintLanguageKeys(where, value));
}

for (const [dir, entries] of [['techniques', techniques], ['grading-schemes', schemes],
  ['sequences', sequences], ['guides', guides], ['exams', exams],
  ['organisations', organisations], ['perspectives', perspectives]]) {
  for (const entry of entries) lintLanguageKeys(`${dir}/${entry.name}`, entry.data);
}

/* Organisations and their perspectives: a governing body's or club's voice
 * on a technique, layered over the canonical record for readers who opt
 * into that organisation's view. The canonical rule is add-never-override,
 * which the structure enforces (a perspective has nowhere to put a
 * replacement description), and the banned rule inherits: a technique
 * documented for recognition only takes no step-by-step from anyone. */
const organisationIds = new Set(organisations.map((o) => o.slug));
for (const o of organisations) {
  if (!validateOrganisation(o.data)) report(`organisations/${o.name}`, validateOrganisation);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(o.slug)) {
    problems.push(`organisations/${o.name}: filename must be lowercase with hyphens`);
  }
  /* The chain is club, then optionally an affiliate, then the national body
   * - the shape the UK actually has, where the BJA's home-nation
   * associations sit between it and the clubs. The kinds pin each link so
   * the chain can only run upward and cannot cycle: a national body stands
   * alone, an affiliate must say whose it is, and a club hangs off either.
   * A reader's country and offered gradings all derive from walking it. */
  const parent = o.data.parent === undefined ? null
    : organisations.find((p) => p.slug === o.data.parent) ?? null;
  if (o.data.parent !== undefined && !parent) {
    problems.push(`organisations/${o.name}: parent "${o.data.parent}" has no organisations file`);
  }
  if (o.data.kind === 'national-body' && o.data.parent !== undefined) {
    problems.push(`organisations/${o.name}: a national body stands alone; it has no parent`);
  }
  if (o.data.kind === 'affiliate') {
    if (o.data.parent === undefined) {
      problems.push(`organisations/${o.name}: an affiliate must name its national body in "parent"`);
    } else if (parent && parent.data.kind !== 'national-body') {
      problems.push(`organisations/${o.name}: an affiliate's parent must be a national body; "${o.data.parent}" is ${parent.data.kind === 'affiliate' ? 'an' : 'a'} ${parent.data.kind}`);
    }
  }
  if (o.data.kind === 'club' && parent && parent.data.kind === 'club') {
    problems.push(`organisations/${o.name}: a club's parent must be a national body or an affiliate, not another club`);
  }
  if (o.data.homepage) {
    try {
      const parsed = new URL(o.data.homepage);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        problems.push(`organisations/${o.name}: homepage is not an http(s) url`);
      }
    } catch {
      problems.push(`organisations/${o.name}: homepage is not a parseable url`);
    }
  }
  /* An organisation claims its schemes, and the claim is checked both ways:
   * the scheme must exist, and the scheme's own `organisation` string must
   * be this organisation's name - one name, spelled once. */
  for (const id of o.data.schemes ?? []) {
    const scheme = schemes.find((s) => s.slug === id);
    if (!scheme) {
      problems.push(`organisations/${o.name}: scheme "${id}" does not exist`);
    } else if (scheme.data.organisation !== o.data.name) {
      problems.push(`organisations/${o.name}: claims scheme "${id}", but that scheme names its `
        + `organisation "${scheme.data.organisation}", not "${o.data.name}"`);
    }
  }
  for (const id of o.data.exams ?? []) {
    const exam = exams.find((e) => e.slug === id);
    if (!exam) {
      problems.push(`organisations/${o.name}: exam "${id}" does not exist`);
    } else if (exam.data.organisation !== o.data.name) {
      problems.push(`organisations/${o.name}: claims exam "${id}", but that exam names its `
        + `organisation "${exam.data.organisation}", not "${o.data.name}"`);
    }
  }
}

/* And the same both ways round: every exam's `organisation` is a real
 * organisation on file, and every exam an organisation could claim, it
 * does claim. Without the first, an exam's country and its place in the
 * offer-list dangle from an unmatchable string; without the second, the
 * claim lists rot as exams are added. */
{
  const organisationNames = new Map(organisations.map((o) => [o.data.name, o]));
  for (const e of exams) {
    const owner = organisationNames.get(e.data.organisation);
    if (!owner) {
      problems.push(`exams/${e.name}: organisation "${e.data.organisation}" has no organisations/ file; `
        + 'the exam needs an owner for its country and offers to derive from');
    } else if (!(owner.data.exams ?? []).includes(e.slug)) {
      problems.push(`organisations/${owner.name}: does not claim exam "${e.slug}", which names it; add it to "exams"`);
    }
  }
}

/* The family fence for exam perspectives. A technique is canonical and
 * org-neutral, so any organisation may speak on it; an exam is one
 * organisation's document, so only that organisation and the bodies
 * beneath it - its affiliates and their clubs - may speak on it. Walking
 * up the parent chain from the speaker answers "is the owner above me?". */
const inFamilyOf = (orgSlug, ownerName) => {
  const seen = new Set();
  for (let node = organisations.find((o) => o.slug === orgSlug); node && !seen.has(node.slug);) {
    if (node.data.name === ownerName) return true;
    seen.add(node.slug);
    node = organisations.find((o) => o.slug === node.data.parent);
  }
  return false;
};

for (const p of perspectives) {
  if (!organisationIds.has(p.org)) {
    problems.push(`perspectives/${p.name}: no organisations/${p.org}.json; the voice must exist before it speaks`);
  }
  if (!validatePerspective(p.data)) report(`perspectives/${p.name}`, validatePerspective);
  (p.data.sections ?? []).forEach((section, index) => {
    if (!section.prose && !section.steps) {
      problems.push(`perspectives/${p.name}: section ${index + 1} has neither prose nor steps`);
    }
  });
  if (p.type === 'techniques') {
    if (!slugs.has(p.slug)) {
      problems.push(`perspectives/${p.name}: unknown technique "${p.slug}"`);
    }
    const technique = techniques.find((t) => t.slug === p.slug);
    if (technique?.data.banned === 'yes' && (p.data.sections ?? []).some((section) => section.steps)) {
      problems.push(`perspectives/${p.name}: ${p.slug} is documented for recognition only; no perspective may add step-by-step instruction`);
    }
  }
  if (p.type === 'skills' && !skills.some((skill) => skill.slug === p.slug)) {
    problems.push(`perspectives/${p.name}: unknown skill "${p.slug}"`);
  }
  if (p.type === 'guides' && !guides.some((guide) => guide.slug === p.slug)) {
    problems.push(`perspectives/${p.name}: unknown guide "${p.slug}"`);
  }
  if (p.type === 'sequences' && !sequences.some((sequence) => sequence.slug === p.slug)) {
    problems.push(`perspectives/${p.name}: unknown sequence "${p.slug}"`);
  }
  /* A cited page may carry the page itself as an image. Unlike an
   * illustration beside a technique the path is written down rather than
   * derived, so a typo in it is invisible until a reader meets a broken
   * picture where the evidence for a claim should be. */
  for (const page of p.data.sourcePages ?? []) {
    if (!page.image) continue;
    try {
      await access(path.join(root, 'media', page.image.file));
    } catch {
      problems.push(`perspectives/${p.name}: page ${page.printedPage} claims `
        + `media/${page.image.file}, which does not exist`);
    }
  }
  if (p.type === 'exams') {
    const exam = exams.find((e) => e.slug === p.slug);
    if (!exam) {
      problems.push(`perspectives/${p.name}: unknown exam "${p.slug}"`);
    } else if (organisationIds.has(p.org) && !inFamilyOf(p.org, exam.data.organisation)) {
      problems.push(`perspectives/${p.name}: "${p.slug}" is ${exam.data.organisation}'s examination; `
        + `only that organisation and the bodies beneath it may speak on it, and ${p.org} is not among them`);
    }
  }
  const seen = new Set();
  for (const link of p.data.links ?? []) {
    try {
      const parsed = new URL(link.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        problems.push(`perspectives/${p.name}: link "${link.title}" is not an http(s) url`);
      }
    } catch {
      problems.push(`perspectives/${p.name}: link "${link.title}" has an unparseable url "${link.url}"`);
    }
    if (seen.has(link.url)) {
      problems.push(`perspectives/${p.name}: the same link is listed twice (${link.url})`);
    }
    seen.add(link.url);
  }
}

/* Competition statistics: three single files rather than a collection, so
 * loaded by name. The frequency data is generated (tools/ijf-results), the
 * map and the tier rules are maintained by hand, and the three must agree
 * with each other and with the techniques collection: a map entry pointing
 * at a slug that does not exist would silently misfile every score it
 * resolves, which is exactly the failure the map exists to prevent. */
const validateFrequency = ajv.compile(await loadJson(path.join(root, 'schema/ijf-technique-frequency.schema.json')));
const validateContestShape = ajv.compile(await loadJson(path.join(root, 'schema/ijf-contest-shape.schema.json')));
const validateIjfMap = ajv.compile(await loadJson(path.join(root, 'schema/ijf-technique-map.schema.json')));
const validateTiers = ajv.compile(await loadJson(path.join(root, 'schema/ijf-competition-tiers.schema.json')));

async function loadStats(name) {
  try {
    return await loadJson(path.join(root, 'competition-stats', name));
  } catch (error) {
    problems.push(`competition-stats/${name}: cannot load (${error.message})`);
    return null;
  }
}
const ijfMap = await loadStats('ijf-technique-map.json');
const ijfTiers = await loadStats('ijf-competition-tiers.json');
const ijfFrequency = await loadStats('ijf-technique-frequency.json');
const ijfShape = await loadStats('ijf-contest-shape.json');

if (ijfMap && !validateIjfMap(ijfMap)) report('competition-stats/ijf-technique-map.json', validateIjfMap);
if (ijfTiers && !validateTiers(ijfTiers)) report('competition-stats/ijf-competition-tiers.json', validateTiers);
if (ijfFrequency && !validateFrequency(ijfFrequency)) report('competition-stats/ijf-technique-frequency.json', validateFrequency);
if (ijfShape && !validateContestShape(ijfShape)) report('competition-stats/ijf-contest-shape.json', validateContestShape);

/* The Kodokan's published definitions, kept so that a name in this book can be
 * checked against the Kodokan's own without opening the PDF. The book leads
 * with the name a dojo uses, so where the two differ the technique carries the
 * Kodokan's in its `kodokan` field; this checks the two files still agree. */
const validateKodokan = ajv.compile(await loadJson(path.join(root, 'schema/kodokan-definitions.schema.json')));
let kodokanRef = null;
try {
  kodokanRef = await loadJson(path.join(root, 'reference/kodokan-definitions-2022.json'));
} catch (error) {
  problems.push(`reference/kodokan-definitions-2022.json: cannot load (${error.message})`);
}
if (kodokanRef && !validateKodokan(kodokanRef)) report('reference/kodokan-definitions-2022.json', validateKodokan);

if (kodokanRef) {
  const REF = 'reference/kodokan-definitions-2022.json';
  const linked = new Map();
  for (const entry of kodokanRef.techniques) {
    if (entry.technique === null) continue;
    if (!slugs.has(entry.technique)) {
      problems.push(`${REF}: "${entry.nameRomaji}" points at unknown technique "${entry.technique}"`);
    } else if (linked.has(entry.technique)) {
      problems.push(`${REF}: two definitions point at "${entry.technique}"`);
    } else {
      linked.set(entry.technique, entry);
    }
  }
  for (const t of techniques) {
    const entry = linked.get(t.slug);
    const layer = t.data.kodokan;
    if (!entry) {
      if (layer !== null) {
        problems.push(`techniques/${t.name}: has a kodokan name but ${REF} does not define this technique`);
      }
      continue;
    }
    const differs = entry.nameRomaji !== t.data.nameRomaji || entry.nameJa !== t.data.nameJa;
    if (differs && layer === null) {
      problems.push(`techniques/${t.name}: the Kodokan prints "${entry.nameRomaji}" (${entry.nameJa}); set kodokan rather than leaving it null`);
    } else if (!differs && layer !== null) {
      problems.push(`techniques/${t.name}: kodokan repeats the name this file already leads with; it should be null`);
    } else if (layer !== null && (layer.nameRomaji !== entry.nameRomaji || layer.nameJa !== entry.nameJa)) {
      problems.push(`techniques/${t.name}: kodokan says "${layer.nameRomaji}" (${layer.nameJa}) where ${REF} says "${entry.nameRomaji}" (${entry.nameJa})`);
    }
    /* The Kodokan's own name has to be findable on the page, so it is either
     * the name the file leads with or one of its aliases. */
    const known = new Set([t.data.nameRomaji, ...(t.data.aliases ?? [])].map((n) => n.toLowerCase()));
    if (!known.has(entry.nameRomaji.toLowerCase())) {
      problems.push(`techniques/${t.name}: does not carry the Kodokan's "${entry.nameRomaji}" as its name or an alias`);
    }
  }
}

if (ijfMap) {
  for (const [ijfName, slug] of Object.entries(ijfMap)) {
    if (!slugs.has(slug)) {
      problems.push(`competition-stats/ijf-technique-map.json: "${ijfName}" maps to unknown technique "${slug}"`);
    }
  }
}
if (ijfFrequency && ijfMap && ijfTiers) {
  /* Asked of the importer's own resolver rather than reimplemented here. The
   * two had drifted apart once already - the validator resolved the
   * technique map case-sensitively where the aggregation did not, and
   * failed a file that was correct - and a tier vocabulary counted in two
   * places would drift the same way. */
  const tiersKnown = knownTiers(ijfTiers);
  /* Resolved case-insensitively, exactly as the aggregation resolves it: the
   * IJF's casing drifts from the map's ("Kata-Guruma" against
   * "Kata-guruma"), and a validator stricter than the generator would fail
   * a file that is correct. */
  const mapByName = new Map(Object.entries(ijfMap).map(([name, slug]) => [name.toLowerCase(), slug]));
  const rowKeys = new Set();
  for (const row of ijfFrequency.rows ?? []) {
    const where = `competition-stats/ijf-technique-frequency.json row ${row.ijf_name}/${row.sex}/${row.weight}/${row.year}/${row.score}`;
    /* `technique: null` is the importer's permissive mode, which exists for
     * inspecting fresh data before the map catches up - never for committing. */
    if (row.technique === null) {
      problems.push(`${where}: technique is null; extend the map and re-aggregate without --permissive`);
    } else if (!slugs.has(row.technique)) {
      problems.push(`${where}: unknown technique "${row.technique}"`);
    }
    const resolved = mapByName.get(row.ijf_name?.toLowerCase());
    if (row.technique !== null && resolved !== row.technique) {
      problems.push(`${where}: the map resolves "${row.ijf_name}" to `
        + `"${resolved ?? 'nothing'}", not "${row.technique}"; re-run the aggregation`);
    }
    if (!tiersKnown.has(row.tier)) {
      problems.push(`${where}: tier "${row.tier}" is not one the tier rules can produce`);
    }
    const key = [row.technique, row.ijf_name, row.sex, row.weight, row.tier, row.age, row.year, row.minute, row.side, row.score].join('|');
    if (rowKeys.has(key)) problems.push(`${where}: duplicate row; the aggregation should have summed these`);
    rowKeys.add(key);
  }
  const decisionKeys = new Set();
  for (const row of ijfFrequency.decisions ?? []) {
    const where = `competition-stats/ijf-technique-frequency.json decision ${row.by}/${row.sex}/${row.weight}/${row.year}/${row.minute}`;
    if (!tiersKnown.has(row.tier)) {
      problems.push(`${where}: tier "${row.tier}" is not one the tier rules can produce`);
    }
    const key = [row.sex, row.weight, row.tier, row.age, row.year, row.minute, row.by].join('|');
    if (decisionKeys.has(key)) problems.push(`${where}: duplicate row; the aggregation should have summed these`);
    decisionKeys.add(key);
  }
}

/* Rights position, reported on every run rather than buried in the data.
 * The project licences its text and data; it cannot licence images it does
 * not own, so the count of images whose origin is unestablished is a number
 * the maintainers should see every time, not discover when someone asks. */
const images = [
  ...techniques.filter((t) => t.data.image).map((t) => ['techniques/' + t.name, t.data.image]),
  ...schemes.flatMap((s) => [
    ...s.data.grades.filter((g) => g.image).map((g) => [`grading-schemes/${s.name} ${g.slug}`, g.image]),
    ...(s.data.posters ?? []).map((p) => [`grading-schemes/${s.name} ${p.id}`, p]),
  ]),
  ...skills.filter((k) => k.data.image).map((k) => ['skills/' + k.name, k.data.image]),
];
const byProvenance = {};
for (const [, image] of images) {
  byProvenance[image.provenance] = (byProvenance[image.provenance] ?? 0) + 1;
}
/* NOTICE.md PRINTS THESE COUNTS, and a rights document that disagrees with the
 * data is worse than one that says nothing. The table was written by hand and
 * had already drifted (30 third-party against a real 33) by the time anyone
 * looked, so the numbers are checked here rather than trusted. Change an
 * image's provenance and this fails until NOTICE.md is updated to match. */
const notice = await readFile(path.join(root, 'NOTICE.md'), 'utf8');
for (const value of ['own', 'licensed', 'third-party', 'unknown']) {
  const row = new RegExp(`^\\| \`${value}\` \\|.*\\| (\\d+) \\|$`, 'm').exec(notice);
  if (!row) {
    problems.push(`NOTICE.md: no provenance table row for \`${value}\``);
  } else if (Number(row[1]) !== (byProvenance[value] ?? 0)) {
    problems.push(`NOTICE.md: provenance table says ${row[1]} \`${value}\` image(s), `
      + `the content has ${byProvenance[value] ?? 0}`);
  }
}

/* A file we do not own must say whose it is, or the removal process in
 * NOTICE.md has nothing to act on. `unknown` is exempt: not knowing is the
 * whole point of that value. */
for (const [where, image] of images) {
  if (image.provenance === 'third-party' && !image.credit) {
    problems.push(`${where}: third-party image must name its owner in "credit"`);
  }
  if (image.provenance === 'licensed' && !image.source) {
    problems.push(`${where}: licensed image must point at the licence or permission in "source"`);
  }
}

/* The contest-shape tables, held to the same two rules as the frequency
 * table: every technique slug it names must exist, and every tier must be one
 * the tier rules can actually produce. Both files are generated from the same
 * cache by the same run, so a disagreement between them means the aggregator
 * has drifted from itself, which is worth catching here rather than on a
 * page that quietly renders nothing. */
if (ijfShape && ijfTiers) {
  const tiersKnown = knownTiers(ijfTiers);
  const withTechnique = ['rounds', 'conversion', 'countries', 'response', 'trailing', 'examples'];
  for (const table of withTechnique) {
    for (const row of ijfShape[table] ?? []) {
      const where = `competition-stats/ijf-contest-shape.json ${table} ${row.technique}/${row.sex}/${row.year}`;
      if (row.technique === null) {
        problems.push(`${where}: technique is null; extend the map and re-aggregate without --permissive`);
      } else if (!slugs.has(row.technique)) {
        problems.push(`${where}: unknown technique "${row.technique}"`);
      }
    }
  }
  /* `countries` and `examples` carry no tier by design, so they are not asked
   * for one. */
  for (const table of ['rounds', 'conversion', 'outcomes', 'penalties', 'first_score', 'response', 'trailing']) {
    for (const row of ijfShape[table] ?? []) {
      if (!tiersKnown.has(row.tier)) {
        problems.push(`competition-stats/ijf-contest-shape.json ${table}: tier "${row.tier}" is not one the tier rules can produce`);
      }
    }
  }
}

/* All-caps words in prose are shouting, and the style guide (CONTRIBUTING.md,
 * "Voice") carries the rule: emphasis belongs in the wording. Checked here
 * because a 2026 language audit found eighteen of them, and a lesson caught
 * twice becomes a script's job. Only prose-carrying fields are swept, so
 * transcribed federation text, video titles and link titles are untouched.
 * The allowlist is for genuine acronyms and initialisms, never for emphasis. */
const PROSE_KEYS = new Set(['about', 'described', 'receiving', 'viNotes', 'keyPoints',
  'bannedNote', 'meaning', 'summary', 'statusNote', 'prose', 'steps', 'note']);
const CAPS_ALLOWED = new Set(['IJF', 'BJA', 'BJC', 'BJJ', 'BSJA', 'MEXT', 'RNC',
  'IPA', 'IBSA', 'RFEJYDA', 'USA', 'NGB', 'EJU', 'AJA', 'UKS', 'JSON']);
function sweepCaps(node, where, inProse) {
  if (typeof node === 'string') {
    if (!inProse) return;
    for (const match of node.matchAll(/\b[A-Z]{3,}\b/g)) {
      if (!CAPS_ALLOWED.has(match[0])) {
        problems.push(`${where}: all-caps "${match[0]}" in prose; carry the emphasis in the wording, or add a genuine acronym to the allowlist in validate.mjs`);
      }
    }
  } else if (Array.isArray(node)) {
    for (const item of node) sweepCaps(item, where, inProse);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      sweepCaps(value, where, inProse || PROSE_KEYS.has(key));
    }
  }
}
for (const [dir, entries] of [['techniques', techniques], ['skills', skills],
  ['sequences', sequences], ['guides', guides], ['exams', exams], ['kata', kata],
  ['grading-schemes', schemes], ['glossary', glossary]]) {
  for (const entry of entries) sweepCaps(entry.data, `${dir}/${entry.name}`, false);
}
for (const perspective of perspectives) {
  sweepCaps(perspective.data, `perspectives/${perspective.name}`, false);
}

if (problems.length > 0) {
  console.error(`Validation failed with ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

/* Coverage warning, not a failure: VI usefulness is a project tenet, and a
 * technique that a grading requires but that has no `described` narration is
 * a gap for a visually impaired reader. New techniques may reasonably land
 * before their narration; this keeps the gap visible until it closes. */
const required = new Set(schemes.flatMap((s) => s.data.grades.flatMap((g) => g.techniqueSlugs)));
// Banned techniques are exempt: they are documented for recognition only and
// deliberately carry no step-by-step, even when a kata requires them.
const undescribed = techniques.filter((t) => required.has(t.slug) && !t.data.described && !t.data.banned).map((t) => t.slug);
if (undescribed.length > 0) {
  console.warn(`Warning: ${undescribed.length} technique(s) required by a grading lack a described narration:\n- ${undescribed.join('\n- ')}`);
}

/* The gaps, counted on every run. A canonical technique record means an
 * unwritten field is present and null rather than absent, and that turns
 * "what is missing?" from a reading exercise into a number. Counters and
 * combinations are not fields - they live in sequences/, one file per
 * relationship - so they are counted from the other end: a throw nobody has
 * recorded a counter for is a page with an empty section and an invitation
 * on it. Nothing here fails the build; every line is a pull request waiting
 * to happen. */
const countered = new Set(sequences.filter((q) => q.data.kind === 'counter')
  .map((q) => q.data.techniques[0]));
const inSequence = new Set(sequences.flatMap((q) => q.data.techniques));
const throwsHere = techniques.filter((t) => t.data.category === 'nage-waza' && !t.data.banned);
/* `ijfAnimation` is deliberately NOT counted here. A null there means the IJF
 * publishes no animation of the technique, which is nobody's to fill; a gap
 * is something a contributor could write, and that is not one. */
const gaps = [
  ['nameKana', techniques.filter((t) => !t.data.nameKana).length],
  ['described', techniques.filter((t) => !t.data.described && !t.data.banned).length],
  ['receiving', techniques.filter((t) => !t.data.receiving && !t.data.banned).length],
  ['image', techniques.filter((t) => !t.data.image).length],
  ['viNotes', techniques.filter((t) => !t.data.viNotes).length],
  ['links', techniques.filter((t) => t.data.links.length === 0).length],
  ['videos', techniques.filter((t) => t.data.videos.length === 0).length],
];
console.log('Gaps (not failures - each one is a pull request waiting to happen):');
for (const [field, missing] of gaps) {
  if (missing > 0) {
    console.log(`  ${field.padEnd(10)} unwritten on ${missing} of ${techniques.length} techniques`);
  }
}
/* The same three written-for-the-ear fields, counted on sequences. */
for (const field of ['described', 'receiving', 'viNotes']) {
  const missing = sequences.filter((q) => !q.data[field]).length;
  if (missing > 0) {
    console.log(`  ${field.padEnd(10)} unwritten on ${missing} of ${sequences.length} sequences`);
  }
}
const uncountered = throwsHere.filter((t) => !countered.has(t.slug)).length;
if (uncountered > 0) {
  console.log(`  ${'counters'.padEnd(10)} no counter recorded for ${uncountered} of ${throwsHere.length} throws`);
}
const unrelated = techniques.filter((t) => !inSequence.has(t.slug)).length;
if (unrelated > 0) {
  console.log(`  ${'sequences'.padEnd(10)} ${unrelated} of ${techniques.length} techniques appear in no `
    + 'combination, counter, transition or chain');
}

const owned = byProvenance.own ?? 0;
console.log(`Images: ${images.length} total - ${owned} own, ${byProvenance.licensed ?? 0} licensed, `
  + `${byProvenance['third-party'] ?? 0} third-party, ${byProvenance.unknown ?? 0} unknown.`);
if (images.length > owned) {
  console.log('  Only "own" images are covered by the project licence. See NOTICE.md for the');
  console.log('  provenance policy and the removal route; replacing the rest with original');
  console.log('  artwork is an open goal.');
}

console.log(`Videos: ${withVideos.reduce((n, [, v]) => n + v.length, 0)} across ${providers.length} providers.`);
console.log(`Reference links: ${linkCount} across techniques and grades.`);
console.log(`Channels: ${channels.length} listed, none ranked.`);
console.log(`Glossary: ${glossary.length} terms.`);
if (organisations.length > 0) {
  const onTechniques = perspectives.filter((p) => p.type === 'techniques').length;
  const onExams = perspectives.filter((p) => p.type === 'exams').length;
  const onSkills = perspectives.filter((p) => p.type === 'skills').length;
  const onGuides = perspectives.filter((p) => p.type === 'guides').length;
  const onSequences = perspectives.filter((p) => p.type === 'sequences').length;
  const spoken = [[onTechniques, 'technique'], [onExams, 'exam'], [onSkills, 'skill'], [onGuides, 'guide'], [onSequences, 'sequence']]
    .filter(([count]) => count > 0).map(([count, word]) => `${count} ${word}`);
  console.log(`Organisations: ${organisations.length}, with `
    + `${spoken.length > 0 ? spoken.join(', ') : 'no'} perspective(s); `
    + 'perspectives render only for readers who opt into that organisation\'s view.');
}
if (ijfFrequency) {
  const mapped = ijfMap ? Object.keys(ijfMap).length : 0;
  console.log(ijfFrequency.generated === null
    ? `IJF frequency: not yet crawled; ${mapped} names mapped, ready for the first run of tools/ijf-results.`
    : `IJF frequency: ${ijfFrequency.rows.length} rows over ${ijfFrequency.coverage.competitions} competitions `
      + `(${ijfFrequency.coverage.from_year}-${ijfFrequency.coverage.to_year}), generated ${ijfFrequency.generated}; ${mapped} names mapped.`);
}
if (ijfShape) {
  const shapeRows = ['rounds', 'conversion', 'outcomes', 'penalties', 'countries', 'first_score',
    'response', 'trailing'].reduce((total, key) => total + (ijfShape[key] ?? []).length, 0);
  console.log(`IJF contest shape: ${shapeRows} rows across eight tables, and ${(ijfShape.examples ?? []).length} `
    + 'contest clips. Answers the questions about the contest rather than the score: where in the draw it '
    + 'was won, which techniques end contests, what athletes are penalised for.');
}
if (kodokanRef) {
  const named = techniques.filter((t) => t.data.kodokan !== null).length;
  console.log(`Kodokan definitions: ${kodokanRef.techniques.length} techniques and ${kodokanRef.groups.length} groups `
    + `from the ${kodokanRef.source.issued} document; ${named} technique(s) where the Kodokan's name is not the one this book leads with.`);
}
console.log(`Validated ${techniques.length} techniques, ${skills.length} skills, ${kata.length} kata, ${sequences.length} sequences, ${guides.length} guides, ${exams.length} exams, ${schemes.length} schemes, ${channels.length} channels and ${glossary.length} glossary terms; all checks passed.`);
