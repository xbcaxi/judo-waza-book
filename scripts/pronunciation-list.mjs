/* ---------------------------------------------------------------------------
 * PRONUNCIATION SHEET · run with `npm run pronunciation`
 *
 * One row per Japanese name this reference says out loud, from whichever
 * collection owns it, as a CSV a voice artist can work from and a synthesiser
 * can read. See docs/pronunciation.md for what to do with it.
 *
 * The sheet is GENERATED and gitignored. It is derived from the collections
 * and nothing else, so it can never be the authority for anything: a name is
 * wrong in the technique file or it is not wrong.
 *
 * A word said in two places is recorded ONCE. Which collection owns the
 * recording is decided by the order the collections are read below, and the
 * `also_used_for` column keeps the mapping for everything that points at it.
 * ------------------------------------------------------------------------ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (dir) => fs.readdirSync(path.join(ROOT, dir))
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(fs.readFileSync(path.join(ROOT, dir, f), 'utf8')) }));

const en = (v) => (typeof v === 'string' ? v : v?.en ?? '');

/* The classification tree and the fixed vocabulary, copied from
   src/lib/gokyo.ts. Small, stable, and not worth importing across a module
   that pulls in astro:content. */
const CLASSIFICATION = [
  ['nage-waza', 'Nage-waza', '投技', 'throwing techniques'],
  ['tachi-waza', 'Tachi-waza', '立技', 'standing techniques'],
  ['te-waza', 'Te-waza', '手技', 'hand techniques'],
  ['koshi-waza', 'Koshi-waza', '腰技', 'hip techniques'],
  ['ashi-waza', 'Ashi-waza', '足技', 'foot and leg techniques'],
  ['sutemi-waza', 'Sutemi-waza', '捨身技', 'sacrifice techniques'],
  ['ma-sutemi-waza', 'Ma-sutemi-waza', '真捨身技', 'rear sacrifice techniques'],
  ['yoko-sutemi-waza', 'Yoko-sutemi-waza', '横捨身技', 'side sacrifice techniques'],
  ['katame-waza', 'Katame-waza', '固技', 'grappling techniques'],
  ['osaekomi-waza', 'Osaekomi-waza', '抑込技', 'hold-downs'],
  ['shime-waza', 'Shime-waza', '絞技', 'strangles'],
  ['kansetsu-waza', 'Kansetsu-waza', '関節技', 'joint locks'],
  ['atemi-waza', 'Atemi-waza', '当身技', 'striking techniques'],
  ['ude-ate', 'Ude-ate', '腕当', 'arm strikes'],
  ['ashi-ate', 'Ashi-ate', '足当', 'leg strikes'],
];
const GOKYO_SETS = [
  ['dai-ikkyo', 'Dai-ikkyo', '第一教', 'first set of the Gokyo'],
  ['dai-nikyo', 'Dai-nikyo', '第二教', 'second set of the Gokyo'],
  ['dai-sankyo', 'Dai-sankyo', '第三教', 'third set of the Gokyo'],
  ['dai-yonkyo', 'Dai-yonkyo', '第四教', 'fourth set of the Gokyo'],
  ['dai-gokyo', 'Dai-gokyo', '第五教', 'fifth set of the Gokyo'],
];
const VOCABULARY = [
  ['gokyo-no-waza', 'Gokyo no waza', '五教の技', 'the five sets of teaching'],
  ['renraku-waza', 'Renraku-waza', '連絡技', 'combination techniques'],
  ['kaeshi-waza', 'Kaeshi-waza', '返技', 'counter techniques'],
  ['ne-waza', 'Ne-waza', '寝技', 'groundwork'],
  ['ukemi', 'Ukemi', '受身', 'breakfalls'],
  ['kumi-kata', 'Kumi-kata', '組み方', 'gripping'],
];

/* Kana cannot mark a morpheme boundary, so こうち is both ko-uchi and a long
   "kouchi". That only BITES where the two vowels either side of the hyphen
   are a pair Japanese also writes as a long vowel: o+u, o+o, e+i, i+i, u+u,
   a+a. Every other pair (i+o in Tai-otoshi, e+a in Ude-ate) is unambiguous
   in kana and needs no warning - flagging those too would train the reader
   to ignore the column. */
const LONG_VOWEL_PAIRS = new Set(['ou', 'oo', 'ei', 'ii', 'uu', 'aa']);
const boundaryRisk = (romaji) => {
  const parts = romaji.toLowerCase().split(/[-\s]/);
  for (let i = 0; i < parts.length - 1; i++) {
    const pair = parts[i].slice(-1) + parts[i + 1].slice(0, 1);
    if (LONG_VOWEL_PAIRS.has(pair)) return true;
  }
  return false;
};

const rows = [];
const push = (collection, id, romaji, kanji, kana, english) => {
  if (!romaji) return;
  rows.push({
    file: `${collection}/${id}.wav`,
    collection, id,
    romaji: romaji.trim(),
    kanji: (kanji ?? '').trim(),
    kana: (kana ?? '').trim(),
    english: (english ?? '').replace(/\s+/g, ' ').trim().slice(0, 90),
    notes: boundaryRisk(romaji) ? 'SAY AS TWO PARTS - see brief' : '',
  });
};

/* Order matters: the first collection to claim a word owns the recording, and
   later collections point at it. Techniques first because they are what the
   site says most; the glossary next because a term there is a real entry with
   its own anchor; the fixed vocabulary after that; skills last, since the
   Japanese in a skill name is almost always a word one of the others owns. */
for (const { id, data } of read('techniques')) {
  push('techniques', id, data.nameRomaji, data.nameJa, data.nameKana, en(data.gloss));
}
for (const { id, data } of read('glossary')) {
  push('glossary', id, data.term, data.kanji, data.kana, en(data.meaning));
}
for (const [id, romaji, kanji, english] of CLASSIFICATION) push('classification', id, romaji, kanji, '', english);
for (const [id, romaji, kanji, english] of GOKYO_SETS) push('classification', id, romaji, kanji, '', english);
for (const [id, romaji, kanji, english] of VOCABULARY) push('classification', id, romaji, kanji, '', english);
/* Kata BEFORE skills and after the vocabulary: a form's name is its own word,
   not one a technique owns, and three of the eleven are known here only by
   romaji so they carry no kanji to say. A collection added after this script
   was written is invisible to it, which is how eight forms with Japanese names
   would have shipped with no audio at all. */
for (const { id, data } of read('kata')) {
  push('kata', id, data.name, data.nameJa ?? '', '', '');
}
for (const { id, data } of read('skills')) {
  const english = en(data.name);
  push('skills', id, data.nameRomaji, data.nameJa, data.nameKana,
    english.toLowerCase() === (data.nameRomaji ?? '').toLowerCase() ? '' : english);
}

/* A word said in two places is recorded once. Keyed on the spoken form. */
const seen = new Map();
const unique = [];
for (const row of rows) {
  const key = `${row.romaji.toLowerCase()}|${row.kanji}`;
  if (seen.has(key)) { seen.get(key).also.push(row.file); continue; }
  row.also = [];
  seen.set(key, row);
  unique.push(row);
}

const csv = (v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const header = ['file', 'romaji', 'kanji', 'kana', 'english', 'notes', 'also_used_for'];
const out = [header.join(',')];
for (const r of unique) out.push(header.map((h) => csv(h === 'also_used_for' ? r.also.join(' ') : String(r[h] ?? ''))).join(','));

const dest = process.argv[2] ?? 'wazabook-pronunciation.csv';
fs.writeFileSync(dest, out.join('\n') + '\n');

const byCollection = {};
for (const r of unique) byCollection[r.collection] = (byCollection[r.collection] ?? 0) + 1;
const noKana = unique.filter((r) => !r.kana);
const risky = unique.filter((r) => r.notes);
console.log(`${unique.length} rows written to ${dest} (${rows.length - unique.length} duplicates merged)`);
for (const [c, n] of Object.entries(byCollection)) console.log(`  ${c.padEnd(16)} ${n}`);
console.log(`\nrows with kana already: ${unique.length - noKana.length}`);
console.log(`rows needing kana back: ${noKana.length}`);
console.log(`boundary-risk names   : ${risky.length}`);
console.log(`total characters      : ${unique.reduce((n, r) => n + (r.kana || r.romaji).length, 0)}`);
